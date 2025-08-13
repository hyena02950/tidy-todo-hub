
const express = require('express');
const { authenticateToken, requireVendorAccess, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get vendor dashboard stats
router.get('/vendor-stats', authenticateToken, requireVendorAccess, async (req, res) => {
  try {
    console.log('Fetching vendor stats for vendor:', req.vendorId);
    
    // Initialize default stats
    const defaultStats = {
      activeJobs: 0,
      totalSubmissions: 0,
      shortlistedCandidates: 0,
      pendingInterviews: 0,
      completedJoins: 0,
      pendingInvoices: 0,
      totalEarnings: 0,
      thisMonthEarnings: 0,
      // Legacy fields for compatibility
      totalCandidates: 0,
      candidatesSubmitted: 0,
      scheduledInterviews: 0,
      interviewsScheduled: 0,
      totalInvoices: 0,
      pendingApprovals: 0,
      pendingInvoicesAmount: 0,
      // Add trend data
      jobsTrend: 5,
      candidatesTrend: 12,
      interviewsTrend: 8,
      invoicesTrend: -2
    };

    // Try to load models dynamically to handle missing collections
    let stats = { ...defaultStats };

    try {
      const JobDescription = require('../models/JobDescription');
      stats.activeJobs = await JobDescription.countDocuments({
        assignedVendors: req.vendorId,
        status: 'active'
      }) || 0;
    } catch (error) {
      console.log('JobDescription collection not available:', error.message);
    }

    try {
      const Candidate = require('../models/Candidate');
      stats.totalSubmissions = await Candidate.countDocuments({
        vendorId: req.vendorId
      }) || 0;
      
      stats.shortlistedCandidates = await Candidate.countDocuments({
        vendorId: req.vendorId,
        status: 'shortlisted'
      }) || 0;

      stats.completedJoins = await Candidate.countDocuments({
        vendorId: req.vendorId,
        status: 'hired'
      }) || 0;

      // Set legacy fields
      stats.totalCandidates = stats.totalSubmissions;
      stats.candidatesSubmitted = stats.totalSubmissions;
    } catch (error) {
      console.log('Candidate collection not available:', error.message);
    }

    try {
      const Interview = require('../models/Interview');
      stats.pendingInterviews = await Interview.countDocuments({
        vendorId: req.vendorId,
        status: 'scheduled'
      }) || 0;

      stats.scheduledInterviews = stats.pendingInterviews;
      stats.interviewsScheduled = stats.pendingInterviews;
    } catch (error) {
      console.log('Interview collection not available:', error.message);
    }

    try {
      const Invoice = require('../models/Invoice');
      stats.pendingInvoices = await Invoice.countDocuments({
        vendorId: req.vendorId,
        status: 'pending'
      }) || 0;

      // Calculate total earnings
      const paidInvoices = await Invoice.find({
        vendorId: req.vendorId,
        status: 'paid'
      });
      stats.totalEarnings = paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

      // Calculate this month earnings
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);

      const thisMonthInvoices = await Invoice.find({
        vendorId: req.vendorId,
        status: 'paid',
        paidAt: { $gte: thisMonthStart }
      });
      stats.thisMonthEarnings = thisMonthInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

      stats.totalInvoices = stats.pendingInvoices;
      stats.pendingApprovals = stats.pendingInvoices;
      
      const pendingInvoicesList = await Invoice.find({
        vendorId: req.vendorId,
        status: 'pending'
      });
      stats.pendingInvoicesAmount = pendingInvoicesList.reduce((sum, invoice) => sum + invoice.amount, 0);
    } catch (error) {
      console.log('Invoice collection not available:', error.message);
    }

    console.log('Vendor stats calculated:', stats);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching vendor stats:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch dashboard statistics',
      code: 'FETCH_STATS_ERROR'
    });
  }
});

// Get admin dashboard stats (Elika users only)
router.get('/admin-stats', authenticateToken, requireRole(['elika_admin', 'delivery_head', 'finance_team']), async (req, res) => {
  try {
    console.log('Fetching admin stats');
    
    // Initialize default stats
    let stats = {
      activeJobs: 0,
      totalCandidates: 0,
      candidatesSubmitted: 0,
      scheduledInterviews: 0,
      interviewsScheduled: 0,
      pendingInvoices: 0,
      totalInvoices: 0,
      pendingApprovals: 0,
      pendingInvoicesAmount: 0,
      jobsTrend: 8,
      candidatesTrend: 15,
      interviewsTrend: 10,
      invoicesTrend: 3
    };

    // Try to load models dynamically to handle missing collections
    try {
      const JobDescription = require('../models/JobDescription');
      stats.activeJobs = await JobDescription.countDocuments({ status: 'active' }) || 0;
    } catch (error) {
      console.log('JobDescription collection not available:', error.message);
    }

    try {
      const Candidate = require('../models/Candidate');
      stats.totalCandidates = await Candidate.countDocuments() || 0;
      stats.candidatesSubmitted = stats.totalCandidates;
    } catch (error) {
      console.log('Candidate collection not available:', error.message);
    }

    try {
      const Interview = require('../models/Interview');
      stats.scheduledInterviews = await Interview.countDocuments({ status: 'scheduled' }) || 0;
      stats.interviewsScheduled = stats.scheduledInterviews;
    } catch (error) {
      console.log('Interview collection not available:', error.message);
    }

    try {
      const Invoice = require('../models/Invoice');
      stats.pendingInvoices = await Invoice.countDocuments({ status: 'pending' }) || 0;
      stats.totalInvoices = await Invoice.countDocuments() || 0;
      
      const pendingInvoicesList = await Invoice.find({ status: 'pending' });
      stats.pendingInvoicesAmount = pendingInvoicesList.reduce((sum, invoice) => sum + invoice.amount, 0);
    } catch (error) {
      console.log('Invoice collection not available:', error.message);
    }

    try {
      const Vendor = require('../models/Vendor');
      stats.pendingApprovals = await Vendor.countDocuments({ status: 'pending' }) || 0;
    } catch (error) {
      console.log('Vendor collection not available:', error.message);
    }

    console.log('Admin stats calculated:', stats);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      error: true,
      message: 'Failed to fetch admin dashboard statistics',
      code: 'FETCH_ADMIN_STATS_ERROR'
    });
  }
});

module.exports = router;
