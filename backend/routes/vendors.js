const express = require('express');
const mongoose = require('mongoose');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { enforceVendorScope } = require('../middleware/vendorAccess');
const { sensitiveOperationsLimiter } = require('../middleware/rateLimiter');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

const router = express.Router();

// Helper function to validate ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id);
};

// GET /api/vendors/workflow-status - Get workflow status counts with proper auth
router.get('/workflow-status', auth.authenticateToken, auth.requireRole(['elika_admin', 'delivery_head', 'finance_team']), asyncHandler(async (req, res) => {
  console.log('Fetching workflow status counts with user:', req.user.id);
  
  try {
    const counts = await Vendor.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statusCounts = {
      pending: 0,
      active: 0,
      inactive: 0,
      rejected: 0
    };
    
    counts.forEach(item => {
      if (statusCounts.hasOwnProperty(item._id)) {
        statusCounts[item._id] = item.count;
      }
    });
    
    res.json({
      success: true,
      data: statusCounts
    });
  } catch (error) {
    console.error('Error fetching workflow status:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch workflow status',
      code: 'WORKFLOW_STATUS_ERROR'
    });
  }
}));

// GET /api/vendors/applications - Get all vendor applications with proper filtering
router.get('/applications', auth.authenticateToken, auth.requireRole(['elika_admin', 'delivery_head']), asyncHandler(async (req, res) => {
  console.log('Fetching all vendor applications for admin user:', req.user.id);
  
  try {
    const applications = await Vendor.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          totalDocuments: { $size: { $ifNull: ['$documents', []] } },
          approvedDocuments: {
            $size: {
              $filter: {
                input: { $ifNull: ['$documents', []] },
                cond: { $eq: ['$$this.status', 'approved'] }
              }
            }
          },
          mandatoryDocumentsApproved: {
            $allElementsTrue: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ['$documents', []] },
                    cond: { $eq: ['$$this.required', true] }
                  }
                },
                in: { $eq: ['$$this.status', 'approved'] }
              }
            }
          }
        }
      },
      {
        $project: {
          id: '$_id',
          vendor_name: '$name',
          vendor_email: { $ifNull: ['$user.email', '$email'] },
          status: { $ifNull: ['$application.status', 'draft'] },
          submitted_at: '$application.submittedAt',
          reviewed_at: '$application.reviewedAt',
          review_notes: '$application.reviewNotes',
          total_documents: '$totalDocuments',
          approved_documents: '$approvedDocuments',
          mandatory_documents_approved: '$mandatoryDocumentsApproved',
          created_at: '$createdAt',
          updated_at: '$updatedAt'
        }
      },
      { $sort: { created_at: -1 } }
    ]);
    
    res.json({
      success: true,
      data: applications
    });
  } catch (error) {
    console.error('Error fetching vendor applications:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch vendor applications',
      code: 'FETCH_APPLICATIONS_ERROR'
    });
  }
}));

// PATCH /api/vendors/applications/:id/status - Update application status with real-time notification
router.patch('/applications/:id/status', 
  auth.authenticateToken, 
  auth.requireRole(['elika_admin']), 
  sensitiveOperationsLimiter, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, reviewNotes } = req.body;
    
    console.log('Updating application status:', { id, status, reviewNotes, adminId: req.user.id });
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid application ID format',
        code: 'INVALID_ID_FORMAT'
      });
    }
    
    const validStatuses = ['draft', 'submitted', 'under_review', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid status value',
        code: 'INVALID_STATUS',
        allowedStatuses: validStatuses
      });
    }
    
    try {
      const vendor = await Vendor.findById(id);
      
      if (!vendor) {
        return res.status(404).json({
          error: true,
          message: 'Application not found',
          code: 'APPLICATION_NOT_FOUND'
        });
      }
      
      // Update application status with proper audit trail
      const previousStatus = vendor.application?.status || 'draft';
      vendor.application = {
        ...vendor.application,
        status,
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
        reviewNotes: reviewNotes || vendor.application?.reviewNotes,
        previousStatus,
        statusHistory: [
          ...(vendor.application?.statusHistory || []),
          {
            status: previousStatus,
            changedTo: status,
            changedAt: new Date(),
            changedBy: req.user.id,
            notes: reviewNotes
          }
        ]
      };
      
      // If approved, also update vendor status
      if (status === 'approved') {
        vendor.status = 'active';
      } else if (status === 'rejected') {
        vendor.status = 'rejected';
      }
      
      await vendor.save();
      
      // Send real-time notification about application status change
      const realtimeService = require('../services/realtimeService');
      realtimeService.notifyApplicationStatusChange(
        vendor._id.toString(),
        vendor._id.toString(),
        status,
        req.user.id,
        reviewNotes
      );
      
      console.log('Application status updated successfully:', {
        vendorId: id,
        newStatus: status,
        previousStatus,
        adminId: req.user.id
      });
      
      res.json({
        success: true,
        message: 'Application status updated successfully',
        data: {
          id: vendor._id,
          status: vendor.application.status,
          reviewedAt: vendor.application.reviewedAt,
          reviewedBy: vendor.application.reviewedBy
        }
      });
    } catch (error) {
      console.error('Error updating application status:', error);
      res.status(500).json({
        error: true,
        message: 'Failed to update application status',
        code: 'UPDATE_APPLICATION_ERROR'
      });
    }
  })
);

// PATCH /api/vendors/:id/status - Update vendor status with real-time notification
router.patch('/:id/status', 
  auth.authenticateToken, 
  auth.requireRole(['elika_admin']), 
  sensitiveOperationsLimiter, 
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    console.log('Updating vendor status:', { id, status, adminId: req.user.id });
    
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid vendor ID format',
        code: 'INVALID_ID_FORMAT'
      });
    }
    
    const validStatuses = ['pending', 'active', 'inactive', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: true,
        message: 'Invalid status value',
        code: 'INVALID_STATUS',
        allowedStatuses: validStatuses
      });
    }
    
    try {
      const vendor = await Vendor.findById(id);
      
      if (!vendor) {
        return res.status(404).json({
          error: true,
          message: 'Vendor not found',
          code: 'VENDOR_NOT_FOUND'
        });
      }
      
      const previousStatus = vendor.status;
      vendor.status = status;
      vendor.updatedAt = new Date();
      
      // Add status change to history
      vendor.statusHistory = [
        ...(vendor.statusHistory || []),
        {
          previousStatus,
          newStatus: status,
          changedAt: new Date(),
          changedBy: req.user.id
        }
      ];
      
      await vendor.save();
      
      // Send real-time notification about vendor status change
      const realtimeService = require('../services/realtimeService');
      realtimeService.notifyVendorStatusChange(
        vendor._id.toString(),
        status,
        req.user.id
      );
      
      console.log('Vendor status updated successfully:', {
        vendorId: id,
        newStatus: status,
        previousStatus,
        adminId: req.user.id
      });
      
      res.json({
        success: true,
        message: 'Vendor status updated successfully',
        data: {
          id: vendor._id,
          status: vendor.status,
          updatedAt: vendor.updatedAt
        }
      });
    } catch (error) {
      console.error('Error updating vendor status:', error);
      res.status(500).json({
        error: true,
        message: 'Failed to update vendor status',
        code: 'UPDATE_STATUS_ERROR'
      });
    }
  })
);

// GET /api/vendors - Get all vendors
router.get('/', auth.authenticateToken, enforceVendorScope('vendor'), asyncHandler(async (req, res) => {
  console.log('Fetching all vendors');
  
  try {
    const userRoles = req.userRoles || [];
    const isElikaUser = userRoles.some(role => 
      ['elika_admin', 'delivery_head', 'finance_team'].includes(role.role)
    );
    
    let vendors;
    
    if (isElikaUser) {
      // Elika users can see all vendors
      vendors = await Vendor.find()
        .populate('createdBy', 'email profile')
        .sort({ createdAt: -1 });
    } else {
      // Vendor users can only see their own vendor
      vendors = await Vendor.find({ _id: req.vendorId })
        .populate('createdBy', 'email profile')
        .sort({ createdAt: -1 });
    }
    
    res.json({
      success: true,
      vendors: vendors // For backward compatibility
    });
  } catch (error) {
    console.error('Error fetching vendors:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch vendors',
      code: 'FETCH_VENDORS_ERROR'
    });
  }
}));

// GET /api/vendors/:id/application - Get vendor application
router.get('/:id/application', auth.authenticateToken, enforceVendorScope('vendor'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  console.log('Fetching application for vendor:', id);
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid vendor ID format',
      code: 'INVALID_ID_FORMAT'
    });
  }
  
  try {
    const vendor = await Vendor.findById(id);
    
    if (!vendor) {
      return res.status(404).json({
        error: true,
        message: 'Vendor not found',
        code: 'VENDOR_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      application: {
        id: vendor._id,
        vendor_id: vendor._id,
        status: vendor.application?.status || 'draft',
        submitted_at: vendor.application?.submittedAt || null,
        reviewed_at: vendor.application?.reviewedAt || null,
        reviewed_by: vendor.application?.reviewedBy || null,
        review_notes: vendor.application?.reviewNotes || null,
        created_at: vendor.createdAt,
        updated_at: vendor.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching vendor application:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch vendor application',
      code: 'FETCH_APPLICATION_ERROR'
    });
  }
}));

// POST /api/vendors/:id/application/submit - Submit vendor application
router.post('/:id/application/submit', auth.authenticateToken, enforceVendorScope('vendor'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  console.log('Submitting application for vendor:', id);
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid vendor ID format',
      code: 'INVALID_ID_FORMAT'
    });
  }
  
  try {
    const vendor = await Vendor.findById(id);
    
    if (!vendor) {
      return res.status(404).json({
        error: true,
        message: 'Vendor not found',
        code: 'VENDOR_NOT_FOUND'
      });
    }
    
    // Update application status
    vendor.application = {
      ...vendor.application,
      status: 'submitted',
      submittedAt: new Date()
    };
    
    await vendor.save();
    
    res.json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        id: vendor._id,
        vendor_id: vendor._id,
        status: vendor.application.status,
        submitted_at: vendor.application.submittedAt,
        reviewed_at: vendor.application.reviewedAt,
        reviewed_by: vendor.application.reviewedBy,
        review_notes: vendor.application.reviewNotes,
        created_at: vendor.createdAt,
        updated_at: vendor.updatedAt
      }
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to submit application',
      code: 'SUBMIT_APPLICATION_ERROR'
    });
  }
}));

// GET /api/vendors/:id/documents - Get vendor documents
router.get('/:id/documents', auth.authenticateToken, enforceVendorScope('vendor'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  console.log('Fetching documents for vendor:', id);
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid vendor ID format',
      code: 'INVALID_ID_FORMAT'
    });
  }
  
  try {
    const vendor = await Vendor.findById(id);
    
    if (!vendor) {
      return res.status(404).json({
        error: true,
        message: 'Vendor not found',
        code: 'VENDOR_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: vendor.documents || []
    });
  } catch (error) {
    console.error('Error fetching vendor documents:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch vendor documents',
      code: 'FETCH_DOCUMENTS_ERROR'
    });
  }
}));

// GET /api/vendors/:id - Get vendor by ID
router.get('/:id', auth.authenticateToken, enforceVendorScope('vendor'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  console.log('Fetching vendor by ID:', id);
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid vendor ID format',
      code: 'INVALID_ID_FORMAT'
    });
  }
  
  try {
    const vendor = await Vendor.findById(id)
      .populate('createdBy', 'email profile');
    
    if (!vendor) {
      return res.status(404).json({
        error: true,
        message: 'Vendor not found',
        code: 'VENDOR_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: vendor
    });
  } catch (error) {
    console.error('Error fetching vendor:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch vendor',
      code: 'FETCH_VENDOR_ERROR'
    });
  }
}));

// POST /api/vendors - Create new vendor with real-time notification
router.post('/', auth.authenticateToken, asyncHandler(async (req, res) => {
  console.log('Creating new vendor:', req.body);
  console.log('User from request:', req.user);
  
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      error: true,
      message: 'User authentication required',
      code: 'USER_NOT_AUTHENTICATED'
    });
  }

  try {
    // Validate required fields
    const { name, email, phone, address, contactPerson } = req.body;
    
    if (!name || !contactPerson) {
      return res.status(400).json({
        error: true,
        message: 'Name and contact person are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const vendorData = {
      name,
      email: email || req.user.email,
      phone,
      address,
      contactPerson,
      createdBy: req.user.id,
      status: 'pending'
    };
    
    console.log('Vendor data with createdBy:', vendorData);
    
    const vendor = new Vendor(vendorData);
    await vendor.save();
    
    // Update user role to vendor_admin and link to this vendor
    const user = await User.findById(req.user.id);
    if (user) {
      // Add vendor_admin role with vendorId
      const vendorRole = {
        role: 'vendor_admin',
        vendorId: vendor._id
      };
      
      // Remove any existing vendor roles and add the new one
      user.roles = user.roles.filter(r => !['vendor_admin', 'vendor_recruiter'].includes(r.role));
      user.roles.push(vendorRole);
      
      await user.save();
      console.log('Updated user roles:', user.roles);
    }
    
    await vendor.populate('createdBy', 'email profile');
    
    // Send real-time notification to admins about new vendor registration
    const realtimeService = require('../services/realtimeService');
    realtimeService.notifyNewVendorRegistration(vendor, user);
    
    res.status(201).json({
      success: true,
      data: vendor,
      message: 'Vendor created successfully'
    });
  } catch (error) {
    console.error('Error creating vendor:', error);
    res.status(400).json({
      error: true,
      message: error.message || 'Failed to create vendor',
      code: 'CREATE_VENDOR_ERROR'
    });
  }
}));

// PUT /api/vendors/:id - Update vendor
router.put('/:id', auth.authenticateToken, enforceVendorScope('vendor'), sensitiveOperationsLimiter, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  console.log('Updating vendor:', id, req.body);
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid vendor ID format',
      code: 'INVALID_ID_FORMAT'
    });
  }
  
  try {
    const vendor = await Vendor.findByIdAndUpdate(
      id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('createdBy', 'email profile');
    
    if (!vendor) {
      return res.status(404).json({
        error: true,
        message: 'Vendor not found',
        code: 'VENDOR_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      data: vendor,
      message: 'Vendor updated successfully'
    });
  } catch (error) {
    console.error('Error updating vendor:', error);
    res.status(400).json({
      error: true,
      message: error.message || 'Failed to update vendor',
      code: 'UPDATE_VENDOR_ERROR'
    });
  }
}));

// DELETE /api/vendors/:id - Delete vendor
router.delete('/:id', auth.authenticateToken, auth.requireRole(['elika_admin']), sensitiveOperationsLimiter, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  console.log('Deleting vendor:', id);
  
  if (!isValidObjectId(id)) {
    return res.status(400).json({
      error: true,
      message: 'Invalid vendor ID format',
      code: 'INVALID_ID_FORMAT'
    });
  }
  
  try {
    const vendor = await Vendor.findByIdAndDelete(id);
    
    if (!vendor) {
      return res.status(404).json({
        error: true,
        message: 'Vendor not found',
        code: 'VENDOR_NOT_FOUND'
      });
    }
    
    res.json({
      success: true,
      message: 'Vendor deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to delete vendor',
      code: 'DELETE_VENDOR_ERROR'
    });
  }
}));

module.exports = router;
