
const express = require('express');
const Vendor = require('../models/Vendor');
const { authenticateToken, requireRole } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// Get pending document reminders (Admin only)
router.get('/documents/pending-reminders', authenticateToken, requireRole(['elika_admin']), asyncHandler(async (req, res) => {
  try {
    // Get vendors with pending documents
    const vendors = await Vendor.find({
      'documents.status': 'pending'
    }).populate('createdBy', 'email profile.fullName');

    const reminders = [];

    vendors.forEach(vendor => {
      const pendingDocs = vendor.documents.filter(doc => doc.status === 'pending');
      if (pendingDocs.length > 0) {
        pendingDocs.forEach(doc => {
          const daysPending = Math.floor((new Date() - new Date(doc.uploadedAt)) / (1000 * 60 * 60 * 24));
          reminders.push({
            id: `vendor-${vendor._id}-doc-${doc._id}`,
            type: 'document_review',
            title: 'Document Review Pending',
            message: `${vendor.name} has a ${doc.document_type} document pending review for ${daysPending} days`,
            vendorId: vendor._id,
            vendorName: vendor.name,
            documentType: doc.document_type,
            fileName: doc.file_name,
            priority: daysPending > 3 ? 'high' : daysPending > 1 ? 'medium' : 'low',
            daysPending,
            uploadedAt: doc.uploadedAt
          });
        });
      }
    });

    // Sort by priority and days pending
    reminders.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      if (a.priority === 'medium' && b.priority === 'low') return -1;
      if (b.priority === 'medium' && a.priority === 'low') return 1;
      return b.daysPending - a.daysPending;
    });

    res.json({
      success: true,
      reminders: reminders.slice(0, 20) // Limit to 20 most important reminders
    });
  } catch (error) {
    console.error('Error fetching pending document reminders:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch pending document reminders',
      code: 'DOCUMENT_REMINDERS_ERROR'
    });
  }
}));

module.exports = router;
