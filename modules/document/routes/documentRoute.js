'use strict';

/**
 * modules/document/routes/documentRoutes.js
 *
 * Document module routes — Document Types (shelves), Documents (files),
 * Verification workflow, Version history, and Compliance monitoring.
 *
 * All routes require authentication (add via index file or here).
 */

const router = require('express').Router();
const documentController = require('../controllers/documentController');
const { uploadDocument } = require('../../../middlewares/uploadMiddleware');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize, action } = require('../../../middlewares/rbacMiddleware');

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: DocumentTypes
 *     description: Document type management — create and manage document categories (shelves)
 *   - name: Documents
 *     description: Document management — upload, replace, verify, and manage files
 *   - name: DocumentVersions
 *     description: Document version history — track file changes and archived copies
 *   - name: DocumentCompliance
 *     description: Compliance monitoring — track expiring and missing documents
 */

// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENT TYPES  (the shelves)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /documents/types:
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
 *         description: Filter by category (Identity, Academic, Employment, Medical, Legal, Other)
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
 *         description: Include disabled document types
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
 *                 example: Passport
 *               category:
 *                 type: string
 *                 enum: [Identity, Academic, Employment, Medical, Legal, Other]
 *                 default: Other
 *               description:
 *                 type: string
 *               isRequired:
 *                 type: boolean
 *                 default: false
 *               hasExpiry:
 *                 type: boolean
 *                 default: false
 *               allowedExtensions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["pdf", "jpg", "png"]
 *               maxFileSizeKb:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Document type created successfully
 *       409:
 *         description: Document type already exists
 */
router
  .route('/types')
  .get(authorize('DocumentType', action.READ), documentController.getAllDocumentTypes)
  .post(authorize('DocumentType', action.CREATE), documentController.createDocumentType);

/**
 * @swagger
 * /documents/types/{id}:
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
 *               hasExpiry:
 *                 type: boolean
 *               allowedExtensions:
 *                 type: array
 *                 items:
 *                   type: string
 *               maxFileSizeKb:
 *                 type: integer
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
 *     responses:
 *       204:
 *         description: Document type deleted successfully
 *       404:
 *         description: Document type not found
 *       409:
 *         description: Cannot delete — documents exist under this type
 */
router
  .route('/types/:id')
  .get(authorize('DocumentType', action.READ), documentController.getDocumentTypeById)
  .patch(authorize('DocumentType', action.WRITE), documentController.updateDocumentType)
  .delete(authorize('DocumentType', action.DELETE), documentController.deleteDocumentType);


// ═════════════════════════════════════════════════════════════════════════════
//  COMPLIANCE  (static routes — must be before /:id)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /documents/compliance/expiring:
 *   get:
 *     summary: Get expiring documents
 *     description: Compliance officer's daily view — documents expiring within N days, grouped by voucherType
 *     tags: [DocumentCompliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: withinDays
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of days to look ahead for expiring documents
 *       - in: query
 *         name: voucherType
 *         schema:
 *           type: string
 *         description: Filter by voucher type (Employee, etc.)
 *       - in: query
 *         name: documentTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by document type
 *     responses:
 *       200:
 *         description: Expiring documents fetched successfully
 */
router.get('/compliance/expiring',
  authorize('Document', action.READ),
  documentController.getExpiringDocuments
);

/**
 * @swagger
 * /documents/compliance/expire-overdue:
 *   post:
 *     summary: Bulk expire overdue documents
 *     description: Marks all documents past their expiry date as Expired. Intended for cron/scheduled jobs.
 *     tags: [DocumentCompliance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue documents marked as Expired
 */
router.post('/compliance/expire-overdue',
  authorize('Document', action.SUBMIT),
  documentController.expireOverdueDocuments
);

/**
 * @swagger
 * /documents/compliance/missing/{voucherType}/{voucherNo}:
 *   get:
 *     summary: Get missing required documents for an owner
 *     description: Returns which required document types are missing for a given record
 *     tags: [DocumentCompliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: voucherType
 *         required: true
 *         schema:
 *           type: string
 *         description: Owner module (e.g. Employee)
 *       - in: path
 *         name: voucherNo
 *         required: true
 *         schema:
 *           type: string
 *         description: Owner identifier (e.g. EMP-2026-0042)
 *     responses:
 *       200:
 *         description: Missing required documents list
 */
router.get('/compliance/missing/:voucherType/:voucherNo',
  authorize('Document', action.READ),
  documentController.getMissingRequiredDocuments
);


// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENT SEARCH (static route — must be before /:id)
// ═════════════════════════════════════════════════════════════════════════════

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
 *         description: Search term for title, filename, document number, or notes
 *       - in: query
 *         name: documentTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: voucherType
 *         schema:
 *           type: string
 *       - in: query
 *         name: voucherNo
 *         schema:
 *           type: string
 *       - in: query
 *         name: uploadedById
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Verified, Rejected, Expired]
 *       - in: query
 *         name: isConfidential
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: expiringWithinDays
 *         schema:
 *           type: integer
 *         description: Filter documents expiring within N days
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
router.get('/search',
  authorize('Document', action.READ),
  documentController.searchDocuments
);


// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENTS BY OWNER (static route — must be before /:id)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /documents/owner/{voucherType}/{voucherNo}:
 *   get:
 *     summary: Get all documents for a specific owner record
 *     description: Returns documents grouped by document type (shelf view)
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: voucherType
 *         required: true
 *         schema:
 *           type: string
 *         description: Type of record (Employee, etc.)
 *       - in: path
 *         name: voucherNo
 *         required: true
 *         schema:
 *           type: string
 *         description: Record identifier (e.g. EMP-2026-0042)
 *       - in: query
 *         name: includeExpired
 *         schema:
 *           type: boolean
 *         description: Include expired documents
 *     responses:
 *       200:
 *         description: Documents fetched successfully
 */
router.get('/owner/:voucherType/:voucherNo',
  authorize('Document', action.READ),
  documentController.getDocumentsByOwner
);


// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENTS BY TYPE (static route — must be before /:id)
// ═════════════════════════════════════════════════════════════════════════════

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
 *         description: Document type ID
 *       - in: query
 *         name: voucherType
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
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
router.get('/type/:documentTypeId',
  authorize('Document', action.READ),
  documentController.getDocumentsByType
);


// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENT VERSIONS (static route — must be before /:id)
// ═════════════════════════════════════════════════════════════════════════════

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
 *         description: Document version ID
 *     responses:
 *       200:
 *         description: Document version fetched successfully
 *       404:
 *         description: Document version not found
 */
router.get('/versions/:versionId',
  authorize('Document', action.READ),
  documentController.getDocumentVersionById
);


// ═════════════════════════════════════════════════════════════════════════════
//  CORE DOCUMENT CRUD
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /documents:
 *   post:
 *     summary: Upload and attach a new document
 *     description: Attaches a file to any module record identified by voucherType + voucherNo
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
 *                 description: The file to upload
 *               documentTypeId:
 *                 type: string
 *                 format: uuid
 *                 description: Document type (which shelf)
 *               voucherType:
 *                 type: string
 *                 description: Owner module (e.g. Employee)
 *               voucherNo:
 *                 type: string
 *                 description: Owner identifier (e.g. EMP-2026-0042)
 *               title:
 *                 type: string
 *                 description: Display name (defaults to filename)
 *               documentNumber:
 *                 type: string
 *                 description: Official document reference number
 *               issueDate:
 *                 type: string
 *                 format: date
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               isConfidential:
 *                 type: boolean
 *                 default: false
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document attached successfully
 *       400:
 *         description: Missing required fields or invalid file type
 *       404:
 *         description: Document type not found
 *       413:
 *         description: File too large
 */
router.post('/',
  authorize('Document', action.CREATE),
  uploadDocument.single('file'),
  documentController.attachDocument
);

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
 *     responses:
 *       200:
 *         description: Document fetched successfully
 *       404:
 *         description: Document not found
 *   patch:
 *     summary: Update document metadata
 *     description: Updates title, notes, dates, confidential flag. Does NOT change the file.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               documentNumber:
 *                 type: string
 *               issueDate:
 *                 type: string
 *                 format: date
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               isConfidential:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Document updated successfully
 *       404:
 *         description: Document not found
 *   delete:
 *     summary: Soft delete a document
 *     description: Versions are preserved for audit trail
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
 *     responses:
 *       204:
 *         description: Document deleted successfully
 *       404:
 *         description: Document not found
 */
router
  .route('/:id')
  .get(authorize('Document', action.READ), documentController.getDocumentById)
  .patch(authorize('Document', action.WRITE), documentController.updateDocument)
  .delete(authorize('Document', action.DELETE), documentController.deleteDocument);


// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENT VERIFICATION WORKFLOW
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /documents/{id}/verify:
 *   post:
 *     summary: Verify a document
 *     description: HR confirms the document is authentic. Status changes Pending → Verified.
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
 *     responses:
 *       200:
 *         description: Document verified successfully
 *       404:
 *         description: Document not found
 *       422:
 *         description: Document status is not Pending
 */
router.post('/:id/verify',
  authorize('Document', action.SUBMIT),
  documentController.verifyDocument
);

/**
 * @swagger
 * /documents/{id}/reject:
 *   post:
 *     summary: Reject a document
 *     description: HR flags the document as invalid. Status changes Pending → Rejected.
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rejectionReason]
 *             properties:
 *               rejectionReason:
 *                 type: string
 *                 example: "Document is blurry — please re-upload a clear copy"
 *     responses:
 *       200:
 *         description: Document rejected
 *       404:
 *         description: Document not found
 *       422:
 *         description: Document status is not Pending
 */
router.post('/:id/reject',
  authorize('Document', action.SUBMIT),
  documentController.rejectDocument
);

/**
 * @swagger
 * /documents/{id}/expire:
 *   post:
 *     summary: Manually expire a document
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
 *     responses:
 *       200:
 *         description: Document marked as Expired
 *       404:
 *         description: Document not found
 */
router.post('/:id/expire',
  authorize('Document', action.SUBMIT),
  documentController.expireDocument
);


// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENT REPLACEMENT (creates version)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /documents/{id}/replace:
 *   post:
 *     summary: Replace the physical file
 *     description: Archives current file as a DocumentVersion and promotes new file. Status resets to Pending.
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
 *                 description: The new file
 *               changeReason:
 *                 type: string
 *                 description: Reason for replacement (e.g. "Document renewed")
 *     responses:
 *       200:
 *         description: Document replaced — previous version archived
 *       404:
 *         description: Document not found
 */
router.post('/:id/replace',
  authorize('Document', action.WRITE),
  uploadDocument.single('file'),
  documentController.replaceDocument
);


// ═════════════════════════════════════════════════════════════════════════════
//  DOCUMENT VERSIONS (per document)
// ═════════════════════════════════════════════════════════════════════════════

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
 *     responses:
 *       200:
 *         description: Document versions fetched successfully
 *       404:
 *         description: Document not found
 */
router.get('/:id/versions',
  authorize('Document', action.READ),
  documentController.getDocumentVersions
);


// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = router;