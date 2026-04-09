// routes/documentRoutes.js
// Frappe HRMS — Document Routes
// Ref: https://frappe.io/hr
//
// Route design follows Frappe HR's voucher-based document model:
//   voucherType  →  Frappe doctype (Employee, Salary Slip, Expense Claim …)
//   voucherNo    →  Frappe document name  (EMP-0042, SAL-0001 …)
//
// Ordering is deliberate — specific static segments (/search,
// /compliance/*) must be declared BEFORE wildcard /:id routes
// so Express doesn't swallow them as param values.

'use strict';

const router = require('express').Router();
const {
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
} = require('../controllers/documentController');

// Upload middleware
const { uploadDocument } = require('../../../middlewares/upload.middleware');

// const { authenticate }   = require('../../../middlewares/authMiddleware');
// const { authorize }      = require('../../../middlewares/rbacMiddleware');
// Uncomment and configure auth/RBAC to match your Frappe role model:
//   HR Manager | HR User | Employee (self-service)

// ─────────────────────────────────────────────────────────────
//  DOCUMENT TYPES  (the shelves)
//  Frappe equivalent: custom DocType registry
// ─────────────────────────────────────────────────────────────

router
  .route('/document-types')
  /**
   * GET  /api/hrms/document-types
   * List all document types — optionally filtered by category.
   * Query: ?category=Compliance&includeDisabled=true
   * Frappe roles: HR Manager, HR User, Employee (read-only)
   */
  .get(getAllDocumentTypes)

  /**
   * POST /api/hrms/document-types
   * Create a new document type (shelf label).
   * Frappe roles: HR Manager only
   */
  .post(createDocumentType);

router
  .route('/document-types/:id')
  /**
   * GET   /api/hrms/document-types/:id  — fetch one type
   * PATCH /api/hrms/document-types/:id  — update metadata
   * DELETE /api/hrms/document-types/:id — remove shelf (blocked if docs exist)
   */
  .get(getDocumentTypeById)
  .patch(updateDocumentType)
  .delete(deleteDocumentType);

// ─────────────────────────────────────────────────────────────
//  COMPLIANCE  (static routes — declared before /:id wildcards)
//  Frappe equivalent: compliance reports & scheduled expiry jobs
// ─────────────────────────────────────────────────────────────

/**
 * GET  /api/hrms/documents/compliance/expiring
 * Documents expiring within N days, grouped by voucherType.
 * Compliance officer's primary daily dashboard view.
 * Query: ?withinDays=30&voucherType=Employee&documentTypeId=uuid
 * Frappe roles: HR Manager, HR User
 */
router.get('/documents/compliance/expiring', getExpiringDocuments);

/**
 * POST /api/hrms/documents/compliance/expire-overdue
 * Bulk-expire all documents past their expiry date.
 * Designed for cron / scheduled worker — not a user-facing action.
 * Frappe roles: System Manager (or service account only)
 */
router.post('/documents/compliance/expire-overdue', expireOverdueDocuments);

// ─────────────────────────────────────────────────────────────
//  DOCUMENT SEARCH  (static — before /:id wildcard)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/hrms/documents/search
 * Cross-module full-text + filter search.
 * Query: ?search=passport&voucherType=Employee&status=Active
 *        &expiringWithinDays=30&isPrivate=false&page=1&limit=20
 * Frappe roles: HR Manager, HR User
 */
router.get('/documents/search', searchDocuments);

// ─────────────────────────────────────────────────────────────
//  DOCUMENTS BY OWNER  (voucher-based — Frappe's core pattern)
//  e.g. all docs filed under Employee EMP-0042
//  GET /api/hrms/documents/owner/Employee/EMP-0042
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/hrms/documents/owner/:voucherType/:voucherNo
 * All documents for one HRMS record, grouped by document type.
 * Frappe equivalent: listing attachments on a doctype record.
 * Query: ?includeExpired=true
 * Frappe roles: HR Manager, HR User, Employee (own record only)
 */
router.get('/documents/owner/:voucherType/:voucherNo', getDocumentsByOwner);

// ─────────────────────────────────────────────────────────────
//  DOCUMENTS BY TYPE  (all docs of one shelf across the system)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/hrms/documents/type/:documentTypeId
 * Paginated list of every document filed under one type.
 * Query: ?voucherType=Employee&status=Active&page=1&limit=20
 * Frappe roles: HR Manager, HR User
 */
router.get('/documents/type/:documentTypeId', getDocumentsByType);

// ─────────────────────────────────────────────────────────────
//  DOCUMENT VERSIONS  (archived tabs — single version by ID)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/hrms/document-versions/:versionId
 * Fetch one specific archived version.
 * Frappe roles: HR Manager, HR User
 */
router.get('/document-versions/:versionId', getDocumentVersionById);

// ─────────────────────────────────────────────────────────────
//  CORE DOCUMENT CRUD  (wildcard /:id — must come after statics)
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/hrms/documents
 * Attach a new document to any HRMS record (voucher pattern).
 * 
 * This endpoint uses uploadDocument middleware which:
 *   - Creates dynamic folder structure: uploads/documents/{voucherType}/{documentTypeId}/
 *   - Validates file type (PDF, images, Office docs)
 *   - Limits file size to 10MB
 *   - Renames file to: doc-{uuid}.{ext}
 *   - Stores file info in req.file
 * 
 * Body (multipart/form-data):
 *   - file: (binary) The actual file to upload
 *   - documentTypeId: UUID of the document type (shelf)
 *   - voucherType: "Employee", "SalarySlip", "ExpenseClaim", etc.
 *   - voucherNo: Record identifier (e.g., "EMP-0042")
 *   - description: (optional) Document description
 *   - expiryDate: (optional) ISO date string
 *   - isPrivate: (optional) true/false (defaults to true)
 * 
 * Frappe roles: HR Manager, HR User, Employee (own record)
 */
router.post(
  '/documents',
  uploadDocument.single('file'),  // 'file' is the field name in the form
  attachDocument
);

router
  .route('/documents/:id')
  /**
   * GET    /api/hrms/documents/:id  — full shelf view (type + uploader + versions)
   * DELETE /api/hrms/documents/:id  — soft-delete (versions preserved for audit)
   */
  .get(getDocumentById)
  .delete(deleteDocument);

/**
 * PATCH /api/hrms/documents/:id/metadata
 * Update description, expiryDate, isPrivate, status.
 * File replacement is intentionally a separate endpoint.
 * Frappe roles: HR Manager, HR User
 */
router.patch('/documents/:id/metadata', updateDocumentMetadata);

/**
 * POST /api/hrms/documents/:id/replace
 * Replace the physical file — archives old file as a DocumentVersion.
 * The ONLY correct way to change a document's file in the system.
 * 
 * This endpoint uses uploadDocument middleware for the new file.
 * 
 * Body (multipart/form-data):
 *   - file: (binary) The new file to replace with
 *   - replacedReason: (optional) Why the file was replaced
 * 
 * Frappe roles: HR Manager, HR User
 */
router.post(
  '/documents/:id/replace',
  uploadDocument.single('file'),
  replaceDocument
);

/**
 * PATCH /api/hrms/documents/:id/status
 * Manually set status: Active | Expired | Superseded.
 * Frappe roles: HR Manager
 */
router.patch('/documents/:id/status', setDocumentStatus);

/**
 * GET /api/hrms/documents/:id/versions
 * Full version history — all archived tabs, newest first.
 * Frappe roles: HR Manager, HR User
 */
router.get('/documents/:id/versions', getDocumentVersions);

module.exports = router;