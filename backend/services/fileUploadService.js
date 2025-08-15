
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const s3Service = require('./s3Service');
const env = require('../config/env');

class FileUploadService {
  constructor() {
    this.isS3Mode = env.FILE_STORAGE_MODE === 's3';
    this.setupMulter();
    this.ensureDirectoryPermissions();
  }

  async ensureDirectoryPermissions() {
    if (!this.isS3Mode) {
      const uploadDirs = ['uploads', 'uploads/resumes', 'uploads/invoices', 'uploads/documents'];
      
      for (const dir of uploadDirs) {
        const dirPath = path.join(__dirname, '../../', dir);
        try {
          await fs.access(dirPath);
        } catch (error) {
          await fs.mkdir(dirPath, { recursive: true, mode: 0o755 });
          console.log(`Created directory with proper permissions: ${dirPath}`);
        }
        
        // Ensure proper permissions
        try {
          await fs.chmod(dirPath, 0o755);
        } catch (error) {
          console.warn(`Could not set permissions for ${dirPath}:`, error.message);
        }
      }
    }
  }

  setupMulter() {
    const storage = this.isS3Mode ? multer.memoryStorage() : this.getLocalStorage();
    
    this.upload = multer({
      storage,
      limits: {
        fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
        files: 1
      },
      fileFilter: this.fileFilter.bind(this)
    });
  }

  getLocalStorage() {
    return multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadPath = this.getUploadPath(req.uploadFolder || 'general');
        try {
          await fs.access(uploadPath);
        } catch (error) {
          await fs.mkdir(uploadPath, { recursive: true, mode: 0o755 });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}-${sanitizedName}`);
      }
    });
  }

  getUploadPath(folder) {
    return path.join(__dirname, `../../uploads/${folder}`);
  }

  fileFilter(req, file, cb) {
    const allowedTypes = {
      'application/pdf': true,
      'application/msword': true,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
      'image/jpeg': true,
      'image/jpg': true,
      'image/png': true
    };

    if (!allowedTypes[file.mimetype]) {
      return cb(new Error('Invalid file type. Only PDF, DOC, DOCX, JPG, JPEG, and PNG files are allowed.'));
    }

    cb(null, true);
  }

  async processUploadedFile(file, folder) {
    if (!file) {
      throw new Error('No file provided');
    }

    if (this.isS3Mode) {
      const s3Url = await s3Service.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        folder
      );
      return s3Url;
    } else {
      const filePath = `/uploads/${folder}/${file.filename}`;
      const fullPath = path.join(__dirname, '../../', filePath);
      
      // Set proper file permissions
      try {
        await fs.chmod(fullPath, 0o644);
      } catch (error) {
        console.warn(`Could not set file permissions for ${fullPath}:`, error.message);
      }
      
      return filePath;
    }
  }

  async deleteFile(fileUrl) {
    if (!fileUrl) return;

    if (this.isS3Mode && fileUrl.includes('amazonaws.com')) {
      await s3Service.deleteFile(fileUrl);
    } else if (!this.isS3Mode && fileUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', '..', fileUrl);
      try {
        await fs.access(filePath);
        await fs.unlink(filePath);
        console.log('Local file deleted:', filePath);
      } catch (error) {
        console.warn('File deletion failed:', error.message);
      }
    }
  }

  async getFileAccessUrl(fileUrl) {
    if (!fileUrl) return null;

    if (this.isS3Mode && fileUrl.includes('amazonaws.com')) {
      return await s3Service.getPresignedUrl(fileUrl);
    } else {
      // Verify file exists and has proper permissions
      const filePath = path.join(__dirname, '..', '..', fileUrl);
      try {
        await fs.access(filePath, fsSync.constants.R_OK);
        return fileUrl;
      } catch (error) {
        throw new Error('File not accessible');
      }
    }
  }

  getUploadMiddleware(folder) {
    return (req, res, next) => {
      req.uploadFolder = folder;
      next();
    };
  }
}

module.exports = new FileUploadService();
