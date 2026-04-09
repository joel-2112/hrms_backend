// controllers/documentController.js
// Frappe HRMS — Document Controller
// Ref: https://frappe.io/hr
// Every handler delegates entirely to documentService.
// Error handling  → catchAsync (no try/catch noise in controllers)
// Response shape  → response.js utils (ok, created, noContent, etc.)

'use strict';

const { catchAsync } = require('../../../utils/catchAsync');
const {
  ok,
  created,
  noContent,
  badRequest,
} = require('../../../utils/response');
const documentService = require('../services/documentService');

// ─────────────────────────────────────────────────────────────
//  DOCUMENT TYPES  (the shelves)
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/hrms/document-types
 * Admin creates a new document type (shelf label).
 * e.g. "Employment Contract", "Passport", "Medical Certificate"
 */
const createDocumentType = catchAsync(async (req, res) => {
  const { name, category, description, isRequired, allowedMimeTypes } = req.body;

  if (!name) return badRequest(res, 'Document type name is required');

  const docType = await documentService.createDocumentType({
    name,
    category,
    description,
    isRequired,
    allowedMimeTypes,
  });

  return created(res, docType, 'Document type created successfully');
});

/**
 * GET /api/hrms/document-types
 * List all active document types, optionally filtered by category.
 * Query: ?category=Compliance&includeDisabled=true
 */
const getAllDocumentTypes = catchAsync(async (req, res) => {
  const { category, includeDisabled } = req.query;

  const types = await documentService.getAllDocumentTypes({
    category,
    includeDisabled: includeDisabled === 'true',
  });

  return ok(res, types, 'Document types fetched successfully');
});

/**
 * GET /api/hrms/document-types/:id
 * Fetch a single document type by primary key.
 */
const getDocumentTypeById = catchAsync(async (req, res) => {
  const docType = await documentService.getDocumentTypeById(req.params.id);
  return ok(res, docType, 'Document type fetched successfully');
});

/**
 * PATCH /api/hrms/document-types/:id
 * Update shelf metadata — name, category, allowed mime types, etc.
 */
const updateDocumentType = catchAsync(async (req, res) => {
  const updated = await documentService.updateDocumentType(req.params.id, req.body);
  return ok(res, updated, 'Document type updated successfully');
});

/**
 * DELETE /api/hrms/document-types/:id
 * Remove a shelf — blocked by service if documents are filed under it.
 */
const deleteDocumentType = catchAsync(async (req, res) => {
  await documentService.deleteDocumentType(req.params.id);
  return noContent(res);
});

// ─────────────────────────────────────────────────────────────
//  DOCUMENTS  (the files on the shelves)
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/hrms/documents
 * Attach a new document to any HRMS record.
 *
 * Body must include voucherType + voucherNo to identify the owner
 * without a hard FK — mirrors Frappe's voucher pattern.
 *
 * e.g. attach a passport to Employee EMP-0042:
 *   { voucherType: "Employee", voucherNo: "EMP-0042", ... }
 *
 * In Frappe HR context voucherType maps to doctypes such as:
 *   Employee | Salary Slip | Expense Claim | Appraisal | Job Offer
 */
const attachDocument = catchAsync(async (req, res) => {
  const {
    documentTypeId,
    voucherType,
    voucherNo,
    description,
    expiryDate,
    isPrivate,
  } = req.body;

  // Get file from multer middleware
  const uploadedFile = req.file;
  
  // uploadedById resolved from the authenticated session
  const uploadedById = req.user?.employeeId || req.user?.id || null;

  // Validate required fields
  if (!documentTypeId || !voucherType || !voucherNo) {
    return badRequest(res, 'documentTypeId, voucherType, and voucherNo are required');
  }
  
  if (!uploadedFile) {
    return badRequest(res, 'No file uploaded');
  }

  // Get relative path for database storage
  const { getRelativePath } = require('../../../middlewares/upload.middleware');
  const fileUrl = getRelativePath(uploadedFile);

  const document = await documentService.attachDocument({
    documentTypeId,
    voucherType,
    voucherNo,
    uploadedById,
    fileName: uploadedFile.originalname,      // From multer
    fileUrl,                                   // Generated from multer
    fileSize: uploadedFile.size,               // From multer
    mimeType: uploadedFile.mimetype,           // From multer
    description,
    expiryDate,
    isPrivate,
  });

  return created(res, document, 'Document attached successfully');
});

/**
 * GET /api/hrms/documents/:id
 * Single document — full shelf view (type + uploader + all versions).
 */
const getDocumentById = catchAsync(async (req, res) => {
  const document = await documentService.getDocumentById(req.params.id);
  return ok(res, document, 'Document fetched successfully');
});

/**
 * GET /api/hrms/documents/owner/:voucherType/:voucherNo
 * Browse all documents filed against one HRMS record,
 * grouped by document type (shelf section).
 *
 * e.g. GET /api/hrms/documents/owner/Employee/EMP-0042
 *   → { "Passport": [...], "Employment Contract": [...] }
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

  return ok(res, shelf, `Documents for ${voucherType} ${voucherNo} fetched successfully`);
});

/**
 * GET /api/hrms/documents/type/:documentTypeId
 * All documents of one type across the entire system — paginated.
 * Query: ?voucherType=Employee&status=Active&includeExpired=false&page=1&limit=20
 */
const getDocumentsByType = catchAsync(async (req, res) => {
  const { documentTypeId } = req.params;
  const { voucherType, status, includeExpired, page, limit } = req.query;

  const result = await documentService.getDocumentsByType(documentTypeId, {
    voucherType,
    status,
    includeExpired: includeExpired === 'true',
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20,
  });

  return ok(res, result, 'Documents fetched successfully', {
    page: result.page,
    totalPages: result.totalPages,
    total: result.total,
  });
});

/**
 * GET /api/hrms/documents/search
 * Full-text + filter search across all documents.
 * Query: ?search=passport&voucherType=Employee&status=Active
 *        &expiringWithinDays=30&isPrivate=false&page=1&limit=20
 */
const searchDocuments = catchAsync(async (req, res) => {
  const {
    search,
    documentTypeId,
    voucherType,
    voucherNo,
    uploadedById,
    status,
    expiringWithinDays,
    isPrivate,
    page,
    limit,
  } = req.query;

  const result = await documentService.searchDocuments({
    search,
    documentTypeId,
    voucherType,
    voucherNo,
    uploadedById,
    status,
    expiringWithinDays,
    isPrivate: isPrivate !== undefined ? isPrivate === 'true' : undefined,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20,
  });

  return ok(res, result, 'Document search completed', {
    page: result.page,
    totalPages: result.totalPages,
    total: result.total,
  });
});

/**
 * PATCH /api/hrms/documents/:id/metadata
 * Update description, expiryDate, isPrivate, or status.
 * File replacement always goes through PATCH /:id/replace.
 */
const updateDocumentMetadata = catchAsync(async (req, res) => {
  const { description, expiryDate, isPrivate, status } = req.body;

  const updated = await documentService.updateDocumentMetadata(req.params.id, {
    description,
    expiryDate,
    isPrivate,
    status,
  });

  return ok(res, updated, 'Document metadata updated successfully');
});

/**
 * POST /api/hrms/documents/:id/replace
 * Replace the physical file — archives old file as a DocumentVersion.
 * This is the ONLY correct way to update a document's file.
 *
 * Flow (handled in service):
 *   1. Snapshot current file → DocumentVersion (archived tab)
 *   2. Promote new file onto Document record
 */
const replaceDocument = catchAsync(async (req, res) => {
  const {
    replacedReason,
    newFileName,
    newFileUrl,
    newFileSize,
    newMimeType,
  } = req.body;

  const replacedById = req.user?.employeeId || req.user?.id || null;

  if (!newFileName || !newFileUrl || !newMimeType) {
    return badRequest(res, 'newFileName, newFileUrl and newMimeType are required');
  }

  const document = await documentService.replaceDocument(req.params.id, {
    replacedById,
    replacedReason,
    newFileName,
    newFileUrl,
    newFileSize,
    newMimeType,
  });

  return ok(res, document, 'Document replaced successfully — previous version archived');
});

/**
 * DELETE /api/hrms/documents/:id
 * Soft-delete a document. Versions are preserved for audit trail.
 */
const deleteDocument = catchAsync(async (req, res) => {
  await documentService.deleteDocument(req.params.id);
  return noContent(res);
});

// ─────────────────────────────────────────────────────────────
//  DOCUMENT VERSIONS  (the archived tabs)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/hrms/documents/:id/versions
 * Full version history for one document — newest first.
 */
const getDocumentVersions = catchAsync(async (req, res) => {
  const versions = await documentService.getDocumentVersions(req.params.id);
  return ok(res, versions, 'Document versions fetched successfully');
});

/**
 * GET /api/hrms/document-versions/:versionId
 * Fetch one specific archived version by its own ID.
 */
const getDocumentVersionById = catchAsync(async (req, res) => {
  const version = await documentService.getDocumentVersionById(req.params.versionId);
  return ok(res, version, 'Document version fetched successfully');
});

// ─────────────────────────────────────────────────────────────
//  COMPLIANCE  (expiry & status monitoring)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/hrms/documents/compliance/expiring
 * Compliance officer's daily view — documents expiring within N days,
 * grouped by voucherType (Employee, Salary Slip, etc.).
 * Query: ?withinDays=30&voucherType=Employee&documentTypeId=uuid
 */
const getExpiringDocuments = catchAsync(async (req, res) => {
  const { withinDays, voucherType, documentTypeId } = req.query;

  const shelf = await documentService.getExpiringDocuments({
    withinDays: withinDays ? parseInt(withinDays) : 30,
    voucherType,
    documentTypeId,
  });

  return ok(res, shelf, 'Expiring documents fetched successfully');
});

/**
 * PATCH /api/hrms/documents/:id/status
 * Manually set a document's status — Active | Expired | Superseded.
 */
const setDocumentStatus = catchAsync(async (req, res) => {
  const { status } = req.body;

  if (!status) return badRequest(res, 'status is required');

  const updated = await documentService.setDocumentStatus(req.params.id, status);
  return ok(res, updated, `Document status set to "${status}"`);
});

/**
 * POST /api/hrms/documents/compliance/expire-overdue
 * Bulk-expire all documents past their expiry date.
 * Intended for scheduled jobs (cron / worker) — not a user-facing action.
 */
const expireOverdueDocuments = catchAsync(async (req, res) => {
  const result = await documentService.expireOverdueDocuments();
  return ok(res, result, `${result.expired} overdue document(s) marked as Expired`);
});

// ─────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────

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
  updateDocumentMetadata,
  replaceDocument,
  deleteDocument,

  // Document Versions
  getDocumentVersions,
  getDocumentVersionById,

  // Compliance
  getExpiringDocuments,
  setDocumentStatus,
  expireOverdueDocuments,
};