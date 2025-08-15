
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { authenticateToken } = require('../middleware/auth');
const { enforceFileAccess } = require('../middleware/vendorAccess');
const fileUploadService = require('../services/fileUploadService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { withTransaction } = require('../utils/dbTransaction');

const router = express.Router();

// Enhanced document access logging
const logDocumentAccess = async (userId, documentId, vendorId, action, session = null) => {
  // You can implement document access logging here
  console.log(`Document Access: User ${userId} ${action} document ${documentId} for vendor ${vendorId}`);
};

// Secure document download endpoint with enhanced permissions
router.get('/documents/:vendorId/:documentId', 
  authenticateToken, 
  enforceFileAccess,
  asyncHandler(async (req, res) => {
    const { vendorId, documentId } = req.params;
    const userId = req.user.id;
    
    try {
      const result = await withTransaction(async (session) => {
        const Vendor = require('../models/Vendor');
        const vendor = await Vendor.findById(vendorId).session(session);
        
        if (!vendor) {
          throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        const document = vendor.documents.id(documentId);
        if (!document) {
          throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
        }

        // Log document access
        await logDocumentAccess(userId, documentId, vendorId, 'download', session);

        return { vendor, document };
      });

      const { document } = result;

      // Get secure file access URL
      const fileUrl = await fileUploadService.getFileAccessUrl(document.fileUrl);
      
      if (document.fileUrl.includes('amazonaws.com')) {
        // For S3 files, redirect to presigned URL
        res.redirect(fileUrl);
      } else {
        // For local files, serve securely with permission checks
        const filePath = path.join(__dirname, '../../', document.fileUrl);
        
        try {
          // Check file exists and is readable
          await fs.access(filePath, fsSync.constants.R_OK);
          
          // Get file stats for additional security checks
          const stats = await fs.stat(filePath);
          if (!stats.isFile()) {
            throw new AppError('Invalid file type', 400, 'INVALID_FILE_TYPE');
          }
          
          // Set appropriate headers
          res.setHeader('Content-Disposition', `attachment; filename="${document.fileName}"`);
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Length', stats.size);
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          
          // Stream the file
          const fileStream = fsSync.createReadStream(filePath);
          
          fileStream.on('error', (error) => {
            console.error('File stream error:', error);
            if (!res.headersSent) {
              res.status(500).json({
                error: true,
                message: 'Error reading file',
                code: 'FILE_READ_ERROR'
              });
            }
          });
          
          fileStream.pipe(res);
          
        } catch (fileError) {
          console.error('File access error:', fileError);
          throw new AppError('File not accessible', 404, 'FILE_ACCESS_ERROR');
        }
      }
    } catch (error) {
      console.error('Error serving secure document:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to serve document', 500, 'DOCUMENT_SERVE_ERROR');
    }
  })
);

// Health check for file system permissions
router.get('/health/permissions', authenticateToken, asyncHandler(async (req, res) => {
  const checks = [];
  
  // Check upload directories
  const dirs = ['uploads', 'uploads/resumes', 'uploads/invoices', 'uploads/documents'];
  
  for (const dir of dirs) {
    const dirPath = path.join(__dirname, '../../', dir);
    try {
      await fs.access(dirPath, fsSync.constants.R_OK | fsSync.constants.W_OK);
      checks.push({ path: dir, status: 'OK', permissions: 'Read/Write' });
    } catch (error) {
      checks.push({ path: dir, status: 'ERROR', error: error.message });
    }
  }
  
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    permissionChecks: checks
  });
}));

module.exports = router;
