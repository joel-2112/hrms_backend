// routes/documentRoutes.js
// Frappe HRMS — Document Routes
'use strict';

const router = require('express').Router();
const {
  createDocumentType,
  getAllDocumentTypes,
  getDocumentTypeById,
  updateDocumentType,
  deleteDocumentType,
  attachDocument,
  getDocumentById,
  getDocumentsByOwner,
  getDocumentsByType,
  searchDocuments,
  updateDocumentMetadata,
  replaceDocument,
  deleteDocument,
  getDocumentVersions,
  getDocumentVersionById,
  getExpiringDocuments,
  setDocumentStatus,
  expireOverdueDocuments,
} = require('../controllers/documentController');

const { uploadDocument } = require('../../../middlewares/uploadMiddleware');

/**
 * @swagger
 * tags:
 *   - name: Documents
 *     description: Document management - Upload, replace, and manage files
 *   - name: DocumentTypes
 *     description: Document type management - Create and manage document categories (shelves)
 *   - name: DocumentVersions
 *     description: Document version history - Track file changes and archives
 *   - name: Compliance
 *     description: Compliance monitoring - Track expiring documents and status
 */

// ─────────────────────────────────────────────────────────────
//  DOCUMENT TYPES  (the shelves)
// ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /documents/document-types:
 *   get:
 *     summary: List all document types
 *     tags: [DocumentTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: "Filter by category (e.g., Compliance, HR, Finance)"
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
 *         description: "Include disabled document types"
 *     responses:
 *       200:
 *         description: Document types fetched successfully
 *   post:
 *     summary: Create a new document type
 *     tags: [DocumentTypes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               isRequired:
 *                 type: boolean
 *               allowedMimeTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Document type created successfully
 *       409:
 *         description: Document type already exists
 */
router
  .route('/document-types')
  .get(getAllDocumentTypes)
  .post(createDocumentType);

/**
 * @swagger
 * /documents/document-types/{id}:
 *   get:
 *     summary: Get a specific document type by ID
 *     tags: [DocumentTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Document type ID"
 *     responses:
 *       200:
 *         description: Document type fetched successfully
 *       404:
 *         description: Document type not found
 *   patch:
 *     summary: Update a document type
 *     tags: [DocumentTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Document type ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               isRequired:
 *                 type: boolean
 *               allowedMimeTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *               disabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Document type updated successfully
 *       404:
 *         description: Document type not found
 *   delete:
 *     summary: Delete a document type
 *     tags: [DocumentTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Document type ID"
 *     responses:
 *       204:
 *         description: Document type deleted successfully
 *       404:
 *         description: Document type not found
 *       409:
 *         description: "Cannot delete - documents exist under this type"
 */
router
  .route('/document-types/:id')
  .get(getDocumentTypeById)
  .patch(updateDocumentType)
  .delete(deleteDocumentType);

// ─────────────────────────────────────────────────────────────
//  COMPLIANCE  (static routes)
// ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /documents/compliance/expiring:
 *   get:
 *     summary: Get expiring documents
 *     tags: [Compliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: withinDays
 *         schema:
 *           type: integer
 *           default: 30
 *         description: "Number of days to look ahead for expiring documents"
 *       - in: query
 *         name: voucherType
 *         schema:
 *           type: string
 *         description: "Filter by voucher type (Employee, SalarySlip, etc.)"
 *       - in: query
 *         name: documentTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Filter by document type"
 *     responses:
 *       200:
 *         description: Expiring documents fetched successfully
 */
router.get('/compliance/expiring', getExpiringDocuments);

/**
 * @swagger
 * /documents/compliance/expire-overdue:
 *   post:
 *     summary: Bulk expire overdue documents
 *     tags: [Compliance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: "Overdue documents marked as expired"
 */
router.post('/compliance/expire-overdue', expireOverdueDocuments);

// ─────────────────────────────────────────────────────────────
//  DOCUMENT SEARCH
// ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /documents/search:
 *   get:
 *     summary: Search documents across the system
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: "Search term for filename, voucher number, or description"
 *       - in: query
 *         name: documentTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Filter by document type"
 *       - in: query
 *         name: voucherType
 *         schema:
 *           type: string
 *         description: "Filter by voucher type"
 *       - in: query
 *         name: voucherNo
 *         schema:
 *           type: string
 *         description: "Filter by voucher number"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Active, Expired, Superseded]
 *         description: "Filter by document status"
 *       - in: query
 *         name: expiringWithinDays
 *         schema:
 *           type: integer
 *         description: "Filter documents expiring within N days"
 *       - in: query
 *         name: isPrivate
 *         schema:
 *           type: boolean
 *         description: "Filter by privacy setting"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Search completed successfully
 */
router.get('/search', searchDocuments);

// ─────────────────────────────────────────────────────────────
//  DOCUMENTS BY OWNER
// ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /documents/owner/{voucherType}/{voucherNo}:
 *   get:
 *     summary: Get all documents for a specific owner record
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: voucherType
 *         required: true
 *         schema:
 *           type: string
 *         description: "Type of record (Employee, SalarySlip, etc.)"
 *       - in: path
 *         name: voucherNo
 *         required: true
 *         schema:
 *           type: string
 *         description: "Record identifier"
 *       - in: query
 *         name: includeExpired
 *         schema:
 *           type: boolean
 *         description: "Include expired documents"
 *     responses:
 *       200:
 *         description: Documents fetched successfully
 */
router.get('/owner/:voucherType/:voucherNo', getDocumentsByOwner);

// ─────────────────────────────────────────────────────────────
//  DOCUMENTS BY TYPE
// ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /documents/type/{documentTypeId}:
 *   get:
 *     summary: Get all documents of a specific type (paginated)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentTypeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Document type ID"
 *       - in: query
 *         name: voucherType
 *         schema:
 *           type: string
 *         description: "Filter by voucher type"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: "Filter by status"
 *       - in: query
 *         name: includeExpired
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Documents fetched successfully
 */
router.get('/type/:documentTypeId', getDocumentsByType);

// ─────────────────────────────────────────────────────────────
//  DOCUMENT VERSIONS
// ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /documents/versions/{versionId}:
 *   get:
 *     summary: Get a specific document version by ID
 *     tags: [DocumentVersions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: versionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Document version ID"
 *     responses:
 *       200:
 *         description: Document version fetched successfully
 *       404:
 *         description: Document version not found
 */
router.get('/versions/:versionId', getDocumentVersionById);

// ─────────────────────────────────────────────────────────────
//  CORE DOCUMENT CRUD
// ─────────────────────────────────────────────────────────────

/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Attach a new document to any HRMS record
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - documentTypeId
 *               - voucherType
 *               - voucherNo
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: "The file to upload"
 *               documentTypeId:
 *                 type: string
 *                 format: uuid
 *                 description: "Document type ID (shelf)"
 *               voucherType:
 *                 type: string
 *                 description: "Type of record (Employee, SalarySlip, etc.)"
 *               voucherNo:
 *                 type: string
 *                 description: "Record identifier"
 *               description:
 *                 type: string
 *                 description: "Document description"
 *               expiryDate:
 *                 type: string
 *                 format: date
 *                 description: "Expiry date (ISO format)"
 *               isPrivate:
 *                 type: boolean
 *                 default: true
 *                 description: "Restrict access to owner and admins"
 *     responses:
 *       201:
 *         description: Document attached successfully
 *       400:
 *         description: "Missing required fields or invalid file type"
 *       404:
 *         description: Document type not found
 *       413:
 *         description: "File too large (max 10MB)"
 */
router.post('/', uploadDocument.single('file'), attachDocument);

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     summary: Get a document by ID with full details
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Document ID"
 *     responses:
 *       200:
 *         description: Document fetched successfully
 *       404:
 *         description: Document not found
 *   delete:
 *     summary: Soft delete a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Document ID"
 *     responses:
 *       204:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 */
router
  .route('/:id')
  .get(getDocumentById)
  .delete(deleteDocument);

/**
 * @swagger
 * /documents/{id}/metadata:
 *   patch:
 *     summary: Update document metadata (not the file)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Document ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               isPrivate:
 *                 type: boolean
 *               status:
 *                 type: string
 *                 enum: [Active, Expired, Superseded]
 *     responses:
 *       200:
 *         description: Document metadata updated successfully
 *       404:
 *         description: Document not found
 */
router.patch('/:id/metadata', updateDocumentMetadata);

/**
 * @swagger
 * /documents/{id}/replace:
 *   post:
 *     summary: Replace the physical file of a document (creates a version)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Document ID"
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: "The new file to replace with"
 *               replacedReason:
 *                 type: string
 *                 description: "Reason for replacement"
 *     responses:
 *       200:
 *         description: "Document replaced successfully - previous version archived"
 *       404:
 *         description: Document not found
 *       413:
 *         description: "File too large (max 10MB)"
 */
router.post('/:id/replace', uploadDocument.single('file'), replaceDocument);

/**
 * @swagger
 * /documents/{id}/status:
 *   patch:
 *     summary: Manually set document status
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Document ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Active, Expired, Superseded]
 *     responses:
 *       200:
 *         description: Document status updated successfully
 *       404:
 *         description: Document not found
 */
router.patch('/:id/status', setDocumentStatus);

/**
 * @swagger
 * /documents/{id}/versions:
 *   get:
 *     summary: Get full version history of a document
 *     tags: [DocumentVersions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Document ID"
 *     responses:
 *       200:
 *         description: Document versions fetched successfully
 *       404:
 *         description: Document not found
 */
router.get('/:id/versions', getDocumentVersions);

module.exports = router;