
const Vendor = require('../models/Vendor');
const Candidate = require('../models/Candidate');
const Invoice = require('../models/Invoice');
const AppError = require('../utils/AppError');
const { withTransaction } = require('../utils/dbTransaction');

// Enhanced vendor scope enforcement with transaction support
const enforceVendorScope = (resourceType) => {
  return async (req, res, next) => {
    try {
      const userRoles = req.userRoles || [];
      const isVendorUser = userRoles.some(role => 
        ['vendor_admin', 'vendor_recruiter'].includes(role.role)
      );
      const isElikaUser = userRoles.some(role => 
        ['elika_admin', 'delivery_head', 'finance_team'].includes(role.role)
      );

      // Elika users have access to all data
      if (isElikaUser) {
        return next();
      }

      // Vendor users must have vendorId and can only access their own data
      if (!isVendorUser || !req.vendorId) {
        throw new AppError('Access denied: Vendor access required', 403, 'VENDOR_ACCESS_DENIED');
      }

      // Add vendor scope validation based on resource type with transaction support
      switch (resourceType) {
        case 'vendor':
          const vendorId = req.params.id || req.params.vendorId;
          if (vendorId && vendorId !== req.vendorId.toString()) {
            throw new AppError('Access denied: Cannot access other vendor data', 403, 'CROSS_VENDOR_ACCESS_DENIED');
          }
          break;

        case 'candidate':
          const candidateId = req.params.candidateId || req.params.id;
          if (candidateId) {
            await withTransaction(async (session) => {
              const candidate = await Candidate.findOne({ candidateId }).session(session);
              if (!candidate || candidate.vendorId.toString() !== req.vendorId.toString()) {
                throw new AppError('Access denied: Candidate not found or not owned by vendor', 403, 'CANDIDATE_ACCESS_DENIED');
              }
              req.candidate = candidate;
            });
          }
          break;

        case 'invoice':
          const invoiceId = req.params.invoiceId || req.params.id;
          if (invoiceId) {
            await withTransaction(async (session) => {
              const invoice = await Invoice.findById(invoiceId).session(session);
              if (!invoice || invoice.vendorId.toString() !== req.vendorId.toString()) {
                throw new AppError('Access denied: Invoice not found or not owned by vendor', 403, 'INVOICE_ACCESS_DENIED');
              }
              req.invoice = invoice;
            });
          }
          break;

        default:
          break;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Enhanced file access middleware with transaction support and better permission checking
const enforceFileAccess = async (req, res, next) => {
  try {
    const userRoles = req.userRoles || [];
    const isElikaUser = userRoles.some(role => 
      ['elika_admin', 'delivery_head', 'finance_team'].includes(role.role)
    );

    // Elika users have access to all files
    if (isElikaUser) {
      return next();
    }

    // Vendor users must have vendorId
    if (!req.vendorId) {
      throw new AppError('Access denied: Vendor access required', 403, 'VENDOR_ACCESS_REQUIRED');
    }

    // Check file ownership based on route with transaction support
    const { candidateId, invoiceId, vendorId, documentId } = req.params;

    await withTransaction(async (session) => {
      if (candidateId) {
        const candidate = await Candidate.findOne({ candidateId }).session(session);
        if (!candidate || candidate.vendorId.toString() !== req.vendorId.toString()) {
          throw new AppError('Access denied: Resume not found or not accessible', 403, 'RESUME_ACCESS_DENIED');
        }
        req.candidate = candidate;
      }

      if (invoiceId) {
        const invoice = await Invoice.findById(invoiceId).session(session);
        if (!invoice || invoice.vendorId.toString() !== req.vendorId.toString()) {
          throw new AppError('Access denied: Invoice not found or not accessible', 403, 'INVOICE_ACCESS_DENIED');
        }
        req.invoice = invoice;
      }

      if (vendorId && documentId) {
        // For vendor documents, ensure the vendor matches the user's vendor
        if (vendorId !== req.vendorId.toString()) {
          throw new AppError('Access denied: Document not accessible', 403, 'DOCUMENT_ACCESS_DENIED');
        }

        const vendor = await Vendor.findById(vendorId).session(session);
        if (!vendor) {
          throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
        }

        const document = vendor.documents.id(documentId);
        if (!document) {
          throw new AppError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
        }

        req.vendor = vendor;
        req.document = document;
      }
    });

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  enforceVendorScope,
  enforceFileAccess
};
