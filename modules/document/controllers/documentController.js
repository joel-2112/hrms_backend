'use strict';

const { AppError } = require('../../../middlewares/errorMiddleware');
/**
 * modules/document/controllers/documentController.js
 *
 * Thin controller layer — delegates all business logic to documentService.
 *
 * Every handler is wrapped with catchAsync so unhandled rejections
 * are forwarded to the global error middleware automatically.
 */

const { catchAsync } = require('../../../utils/catchAsync');
const { ok, created, noContent } = require('../../../utils/response');
const documentService = require('../services/documentService');
const path = require('path');
const fs = require('fs');

// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENT TYPES  (the shelves)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/documents/types
 * Admin creates a new document type (shelf label).
 * e.g. "National ID", "Passport", "Employment Contract", "Medical Certificate"
 */
const createDocumentType = catchAsync(async (req, res) => {
  const docType = await documentService.createDocumentType(req.body);

  created(res, {
    message: 'Document type created successfully',
    data: docType,
  });
});

/**
 * GET /api/documents/types
 * List all document types, optionally filtered by category.
 * Query: ?category=Identity&includeDisabled=true
 */
const getAllDocumentTypes = catchAsync(async (req, res) => {
  const { category, includeDisabled } = req.query;

  const types = await documentService.getAllDocumentTypes({
    category,
    includeDisabled: includeDisabled === 'true',
  });

  ok(res, {
    message: 'Document types fetched successfully',
    data: types,
  });
});
/**
 * GET /api/documents/explorer
 * Get the file explorer tree structure
 * Query: ?path=documents/Employee (optional — defaults to root)
 */
const getFileExplorer = catchAsync(async (req, res) => {
  const { path: relativePath } = req.query;
  const tree = await documentService.getFileExplorerTree(relativePath || '');
  
  ok(res, {
    message: 'File explorer tree fetched successfully',
    data: tree,
  });
});

/**
 * GET /api/documents/explorer/directory
 * Get contents of a specific directory
 * Query: ?path=documents/Employee/National-ID
 */
const getDirectoryContents = catchAsync(async (req, res) => {
  const { path: relativePath } = req.query;
  
  if (!relativePath) {
    throw new AppError('path query parameter is required', 422);
  }
  
  const contents = await documentService.getDirectoryContents(relativePath);
  
  ok(res, {
    message: 'Directory contents fetched successfully',
    data: contents,
  });
});
/**
 * GET /api/documents/types/:id
 * Fetch a single document type by ID.
 */
const getDocumentTypeById = catchAsync(async (req, res) => {
  const docType = await documentService.getDocumentTypeById(req.params.id);

  ok(res, {
    message: 'Document type fetched successfully',
    data: docType,
  });
});

/**
 * PATCH /api/documents/types/:id
 * Update shelf metadata — name, category, allowed extensions, etc.
 */
const updateDocumentType = catchAsync(async (req, res) => {
  const updated = await documentService.updateDocumentType(req.params.id, req.body);

  ok(res, {
    message: 'Document type updated successfully',
    data: updated,
  });
});

/**
 * DELETE /api/documents/types/:id
 * Remove a shelf — blocked if documents are filed under it.
 */
const deleteDocumentType = catchAsync(async (req, res) => {
  await documentService.deleteDocumentType(req.params.id);

  noContent(res);
});


// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENTS  (the files on the shelves)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/documents
 * Upload and attach a new document to any module record.
 *
 * Form Data (multipart):
 *   - file:             The actual file
 *   - documentTypeId:   Which shelf this goes on
 *   - voucherType:      Owner module (e.g. "Employee")
 *   - voucherNo:        Owner identifier (e.g. "EMP-2026-0042")
 *   - title:            (optional) Display name
 *   - documentNumber:   (optional) Official document reference number
 *   - issueDate:        (optional) When document was issued
 *   - expiryDate:       (optional) When document expires
 *   - isConfidential:   (optional) Hide from self-service
 *   - notes:            (optional) Internal notes
 */
// In documentController.js — attachDocument function

// In documentController.js — attachDocument

const attachDocument = catchAsync(async (req, res) => {
  const uploadedFile = req.file;

  if (!uploadedFile) {
    throw new AppError('No file uploaded', 422);
  }

  const {
    documentTypeId,
    voucherType,
    voucherNo,
    title,
    documentNumber,
    issueDate,
    expiryDate,
    isConfidential,
    notes,
  } = req.body;

  if (!documentTypeId) throw new AppError('documentTypeId is required', 422);
  if (!voucherType) throw new AppError('voucherType is required', 422);
  if (!voucherNo) throw new AppError('voucherNo is required', 422);

  // Look up document type name for readable folder
  const { LeaveType, DocumentType } = require('../../../models');
  // Actually use the DocumentType model
  const DocumentTypeModel = require('../../../models').DocumentType;
  let documentTypeName = 'Document';
  try {
    const docType = await DocumentTypeModel.findByPk(documentTypeId, { attributes: ['name'] });
    if (docType) documentTypeName = docType.name;
  } catch (err) {
    // Fallback to UUID if lookup fails
    documentTypeName = documentTypeId.substring(0, 8);
  }

  // Move file from _staging to readable shelf
  const { moveToShelf, getRelativePath } = require('../../../middlewares/uploadMiddleware');
  
  // First get the current relative path
  const stagingPath = getRelativePath(uploadedFile);
  
  // Move to: documents/Employee/National-ID/EMP-2026-0006/eyuel-1714806119579.png
  const filePath = moveToShelf(
    uploadedFile.path,
    voucherType,
    documentTypeName,
    voucherNo,
    uploadedFile.originalname
  );

  // Uploader
  let uploadedById = null;
  if (req.user?.id) {
    const { Employee } = require('../../../models');
    const employee = await Employee.findOne({
      where: { userId: req.user.id },
      attributes: ['id'],
    });
    uploadedById = employee?.id || null;
  }

  const document = await documentService.attachDocument({
    documentTypeId,
    voucherType,
    voucherNo,
    uploadedById,
    originalFileName: uploadedFile.originalname,
    filePath,
    mimeType: uploadedFile.mimetype,
    fileSize: uploadedFile.size,
    title: title || null,
    documentNumber: documentNumber || null,
    issueDate: issueDate || null,
    expiryDate: expiryDate || null,
    isConfidential: isConfidential === 'true' || isConfidential === true,
    notes: notes || null,
  });

  // Cleanup staging folder if empty
  const { cleanupEmptyFolders } = require('../../../middlewares/uploadMiddleware');
  await cleanupEmptyFolders(stagingPath).catch(() => {});

  created(res, {
    message: 'Document attached successfully',
    data: document,
  });
});

/**
 * GET /api/documents/:id/file
 * Stream the physical file for preview or download
 */
const downloadDocumentFile = catchAsync(async (req, res) => {
  const document = await documentService.getDocumentById(req.params.id);
  
  if (!document) {
    throw new AppError('Document not found', 404);
  }

  const { getFullPath } = require('../../../middlewares/uploadMiddleware');
  const fullPath = getFullPath(document.filePath);

  if (!fullPath || !fs.existsSync(fullPath)) {
    throw new AppError('File not found on disk', 404);
  }

  // Set headers
  res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
  res.setHeader('Cache-Control', 'private, max-age=3600');

  // Stream the file
  const stream = fs.createReadStream(fullPath);
  stream.pipe(res);
});
/**
 * GET /api/documents/:id
 * Single document — full shelf view (type + uploader + all versions).
 */
const getDocumentById = catchAsync(async (req, res) => {
  const document = await documentService.getDocumentById(req.params.id);

  ok(res, {
    message: 'Document fetched successfully',
    data: document,
  });
});

/**
 * GET /api/documents/owner/:voucherType/:voucherNo
 * Browse all documents filed against one record, grouped by document type.
 *
 * e.g. GET /api/documents/owner/Employee/EMP-2026-0042
 *   → { "Passport": [...], "National ID": [...] }
 *
 * Query: ?includeExpired=true
 */
const getDocumentsByOwner = catchAsync(async (req, res) => {
  const { voucherType, voucherNo } = req.params;
  const { includeExpired } = req.query;

  const shelf = await documentService.getDocumentsByOwner(
    voucherType,
    voucherNo,
    { includeExpired: includeExpired === 'true' },
  );

  ok(res, {
    message: `Documents for ${voucherType} ${voucherNo} fetched successfully`,
    data: shelf,
  });
});

/**
 * GET /api/documents/type/:documentTypeId
 * All documents of one type across the system — paginated.
 *
 * Query: ?voucherType=Employee&status=Verified&page=1&limit=20
 */
const getDocumentsByType = catchAsync(async (req, res) => {
  const { documentTypeId } = req.params;

  const result = await documentService.getDocumentsByType(documentTypeId, req.query);

  ok(res, {
    message: 'Documents fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

/**
 * GET /api/documents/search
 * Full-text + filter search across all documents.
 *
 * Query: ?search=passport&voucherType=Employee&status=Pending
 *        &expiringWithinDays=30&isConfidential=false&page=1&limit=20
 */
const searchDocuments = catchAsync(async (req, res) => {
  const result = await documentService.searchDocuments(req.query);

  ok(res, {
    message: 'Document search completed',
    data: result.data,
    meta: result.meta,
  });
});

/**
 * PATCH /api/documents/:id
 * Update document metadata — title, notes, dates, confidential flag.
 * Does NOT change the file. For file replacement, use POST /:id/replace.
 */
const updateDocument = catchAsync(async (req, res) => {
  const updated = await documentService.updateDocument(req.params.id, req.body);

  ok(res, {
    message: 'Document updated successfully',
    data: updated,
  });
});

/**
 * POST /api/documents/:id/replace
 * Replace the physical file — archives old file as a DocumentVersion.
 *
 * Form Data (multipart):
 *   - file:         The new file
 *   - changeReason: Why the file is being replaced
 */
const replaceDocument = catchAsync(async (req, res) => {
  const { changeReason } = req.body;
  const replacedById = req.employee?.id || null;
  const uploadedFile = req.file;

  const { getRelativePath } = require('../../../middlewares/uploadMiddleware');
  const filePath = getRelativePath(uploadedFile);

  const document = await documentService.replaceDocument(req.params.id, {
    replacedById,
    originalFileName: uploadedFile.originalname,
    filePath,
    mimeType: uploadedFile.mimetype,
    fileSize: uploadedFile.size,
    changeReason,
  });

  ok(res, {
    message: 'Document replaced successfully — previous version archived',
    data: document,
  });
});

/**
 * DELETE /api/documents/:id
 * Soft-delete a document. Versions are preserved for audit trail.
 */
const deleteDocument = catchAsync(async (req, res) => {
  await documentService.deleteDocument(req.params.id);

  noContent(res);
});


// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENT VERIFICATION  (status workflow)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/documents/:id/verify
 * HR verifies a document — confirms it's authentic.
 * Status: Pending → Verified
 */
const verifyDocument = catchAsync(async (req, res) => {
  const verifiedById = req.employee?.id || req.user?.id;

  const document = await documentService.verifyDocument(req.params.id, verifiedById);

  ok(res, {
    message: 'Document verified successfully',
    data: document,
  });
});

/**
 * POST /api/documents/:id/reject
 * HR rejects a document — flags it as invalid/incorrect.
 * Status: Pending → Rejected
 */
const rejectDocument = catchAsync(async (req, res) => {
  const { rejectionReason } = req.body;

  const document = await documentService.rejectDocument(req.params.id, rejectionReason);

  ok(res, {
    message: 'Document rejected',
    data: document,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENT VERSIONS  (the archived tabs — read-only)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/documents/:id/versions
 * Full version history for one document — newest first.
 */
const getDocumentVersions = catchAsync(async (req, res) => {
  const versions = await documentService.getDocumentVersions(req.params.id);

  ok(res, {
    message: 'Document versions fetched successfully',
    data: versions,
  });
});

/**
 * GET /api/documents/versions/:versionId
 * Fetch one specific archived version by its own ID.
 */
const getDocumentVersionById = catchAsync(async (req, res) => {
  const version = await documentService.getDocumentVersionById(req.params.versionId);

  ok(res, {
    message: 'Document version fetched successfully',
    data: version,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  COMPLIANCE  (expiry & missing documents monitoring)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/documents/compliance/expiring
 * Compliance officer's daily view — documents expiring within N days,
 * grouped by voucherType.
 *
 * Query: ?withinDays=30&voucherType=Employee&documentTypeId=uuid
 */
const getExpiringDocuments = catchAsync(async (req, res) => {
  const { withinDays, voucherType, documentTypeId } = req.query;

  const dashboard = await documentService.getExpiringDocuments({
    withinDays: withinDays ? parseInt(withinDays, 10) : 30,
    voucherType,
    documentTypeId,
  });

  ok(res, {
    message: 'Expiring documents fetched successfully',
    data: dashboard,
  });
});

/**
 * POST /api/documents/:id/expire
 * Manually mark a document as Expired.
 */
const expireDocument = catchAsync(async (req, res) => {
  const document = await documentService.expireDocument(req.params.id);

  ok(res, {
    message: 'Document marked as Expired',
    data: document,
  });
});

/**
 * POST /api/documents/compliance/expire-overdue
 * Bulk-expire all documents past their expiry date.
 * Intended for scheduled jobs (cron).
 */
const expireOverdueDocuments = catchAsync(async (req, res) => {
  const result = await documentService.expireOverdueDocuments();

  ok(res, {
    message: `${result.expired} overdue document(s) marked as Expired`,
    data: result,
  });
});

/**
 * GET /api/documents/compliance/missing/:voucherType/:voucherNo
 * Find which required document types an owner is missing.
 *
 * e.g. GET /api/documents/compliance/missing/Employee/EMP-2026-0042
 *   → [{ id: "...", name: "Passport", category: "Identity" }]
 */
const getMissingRequiredDocuments = catchAsync(async (req, res) => {
  const { voucherType, voucherNo } = req.params;

  const missing = await documentService.getMissingRequiredDocuments(voucherType, voucherNo);

  ok(res, {
    message: `Missing required documents for ${voucherType} ${voucherNo}`,
    data: missing,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Document Types
  createDocumentType,
  getAllDocumentTypes,
  getDocumentTypeById,
  updateDocumentType,
  deleteDocumentType,

  // Documents
  attachDocument,
  getDocumentById,
  getDocumentsByOwner,
  getDocumentsByType,
  searchDocuments,
  updateDocument,
  replaceDocument,
  deleteDocument,
  downloadDocumentFile,
  getFileExplorer,
  getDirectoryContents,

  // Verification
  verifyDocument,
  rejectDocument,

  // Document Versions
  getDocumentVersions,
  getDocumentVersionById,

  // Compliance
  getExpiringDocuments,
  expireDocument,
  expireOverdueDocuments,
  getMissingRequiredDocuments,
};