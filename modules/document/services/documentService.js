'use strict';

/**
 * modules/document/services/documentService.js
 *
 * Universal document filing cabinet — any module can attach files
 * identified by voucherType + voucherNo (no FK constraint).
 *
 * Pattern:
 *   • DocumentType = The Shelf (label on the cabinet)
 *   • Document     = The File (sitting on a shelf)
 *   • DocumentVersion = Archived copy (when file is replaced)
 *
 * Physical storage mirrors logical structure:
 *   uploads/documents/{voucherType}/{documentTypeId}/{filename}
 */

const { Op }           = require('sequelize');
const path             = require('path');
const {
  sequelize,
  DocumentType,
  Document,
  DocumentVersion,
  Employee,
  User,
}                      = require('../../../models');
const { AppError }     = require('../../../middlewares/errorMiddleware');
const { getPaginationOptions, buildMeta } = require('../../../utils/pagination');
const logger           = require('../../../utils/logger');

// ─────────────────────────────────────────────────────────────
//  SHARED INCLUDES
// ─────────────────────────────────────────────────────────────

/** Full context for a single document — what, whom, version tabs */
const DOCUMENT_INCLUDES = [
  {
    model:      DocumentType,
    as:         'documentType',
    attributes: ['id', 'name', 'category', 'description', 'isRequired', 'hasExpiry'],
  },
  {
    model:      Employee,
    as:         'uploadedBy',
    attributes: ['id', 'firstName', 'lastName', 'employeeNumber'],
  },
  {
    model:      DocumentVersion,
    as:         'versions',
    include: [{
      model:      Employee,
      as:         'replacedBy',
      attributes: ['id', 'firstName', 'lastName'],
    }],
    order:      [['versionNumber', 'DESC']],
    separate:   true,
  },
];

/** Minimal context for list queries — avoids over-fetching */
const DOCUMENT_LIST_INCLUDES = [
  {
    model:      DocumentType,
    as:         'documentType',
    attributes: ['id', 'name', 'category'],
  },
  {
    model:      Employee,
    as:         'uploadedBy',
    attributes: ['id', 'firstName', 'lastName', 'employeeNumber'],
  },
];

// ─────────────────────────────────────────────────────────────
//  PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Builds a human-readable path string for any document.
 * Format: "DocumentType / voucherType / voucherNo / fileName"
 */
const buildShelfPath = (doc) => {
  const typeName = doc.documentType?.name || 'Unknown Type';
  const owner    = doc.voucherType || 'Unknown Owner';
  const ownerId  = doc.voucherNo || '—';
  return `${typeName} / ${owner} / ${ownerId} / ${doc.fileName}`;
};

/**
 * Asserts that a DocumentType exists and is not disabled.
 */
const assertDocumentTypeValid = async (documentTypeId) => {
  const docType = await DocumentType.findByPk(documentTypeId);
  if (!docType) throw new AppError('Document type not found', 404);
  if (docType.disabled) throw new AppError(`Document type "${docType.name}" is disabled`, 422);
  return docType;
};

/**
 * Asserts that an Employee exists (for uploadedById / replacedById).
 * Returns the employee or null if the ID is null/undefined.
 */
const assertEmployeeExists = async (employeeId) => {
  if (!employeeId) return null;
  const emp = await Employee.findByPk(employeeId, { attributes: ['id'] });
  if (!emp) throw new AppError('Employee (uploader) not found', 404);
  return emp;
};

/**
 * Generates a unique filename for storage.
 */
const generateStoredFileName = (originalName) => {
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `doc-${timestamp}-${random}${ext}`;
};


// ═════════════════════════════════════════════════════════════
//  DOCUMENT TYPE  (the shelves)
// ═════════════════════════════════════════════════════════════

/**
 * Create a new document type — admin defines what kinds of
 * documents can be uploaded without any code change.
 *
 * e.g. "National ID", "Passport", "Employment Contract", "Medical Certificate"
 */
const createDocumentType = async (data) => {
  const {
    name,
    category = 'Other',
    description,
    isRequired = false,
    hasExpiry = false,
    allowedExtensions,
    maxFileSizeKb,
  } = data;

  if (!name) throw new AppError('name is required', 422);

  // Check uniqueness (model has unique index on name)
  const exists = await DocumentType.findOne({ where: { name } });
  if (exists) throw new AppError(`Document type "${name}" already exists`, 409);

  const docType = await DocumentType.create({
    name,
    category,
    description: description || null,
    isRequired,
    hasExpiry,
    allowedExtensions: allowedExtensions || null,
    maxFileSizeKb: maxFileSizeKb || null,
    disabled: false,
  });

  logger.info('DocumentType created', { id: docType.id, name });
  return docType;
};

/**
 * List all document types — optionally filtered by category.
 */
const getAllDocumentTypes = async ({ category, includeDisabled = false } = {}) => {
  const where = {};
  if (!includeDisabled) where.disabled = false;
  if (category) where.category = category;

  return DocumentType.findAll({
    where,
    order: [['category', 'ASC'], ['name', 'ASC']],
  });
};

/**
 * Get a single document type by ID.
 */
const getDocumentTypeById = async (id) => {
  const docType = await DocumentType.findByPk(id);
  if (!docType) throw new AppError('Document type not found', 404);
  return docType;
};

/**
 * Update a document type.
 */
const updateDocumentType = async (id, data) => {
  const docType = await DocumentType.findByPk(id);
  if (!docType) throw new AppError('Document type not found', 404);

  // If name is being changed, check uniqueness
  if (data.name && data.name !== docType.name) {
    const exists = await DocumentType.findOne({ where: { name: data.name } });
    if (exists) throw new AppError(`Document type "${data.name}" already exists`, 409);
  }

  await docType.update(data);
  logger.info('DocumentType updated', { id, changes: Object.keys(data) });
  return docType;
};

/**
 * Delete a document type — only if no documents are filed under it.
 */
const deleteDocumentType = async (id) => {
  const docType = await DocumentType.findByPk(id);
  if (!docType) throw new AppError('Document type not found', 404);

  const docCount = await Document.count({ where: { documentTypeId: id } });
  if (docCount > 0) {
    throw new AppError(
      `Cannot delete — ${docCount} document(s) are filed under this type`,
      409,
    );
  }

  await docType.destroy();
  logger.info('DocumentType deleted', { id, name: docType.name });
};


// ═════════════════════════════════════════════════════════════
//  DOCUMENT  (the files on the shelves)
// ═════════════════════════════════════════════════════════════

/**
 * Upload and attach a new document to any record in any module.
 *
 * The caller identifies the owner via voucherType + voucherNo:
 *   voucherType = "Employee"   → the module
 *   voucherNo   = "EMP-0042"   → the specific record
 *
 * This is the ONLY way to create a Document — every document
 * is always attached to something.
 */
const attachDocument = async (data) => {
  const {
    documentTypeId,
    voucherType,
    voucherNo,
    uploadedById,
    // File details (from multer middleware)
    originalFileName,
    filePath,        // relative path from uploads/ root
    mimeType,
    fileSize,
    // Optional metadata
    title,
    documentNumber,
    issueDate,
    expiryDate,
    isConfidential = false,
    notes,
  } = data;

  // ── Validate required fields ───────────────────────────────
  if (!documentTypeId) throw new AppError('documentTypeId is required', 422);
  if (!voucherType)    throw new AppError('voucherType is required', 422);
  if (!voucherNo)      throw new AppError('voucherNo is required', 422);
  if (!filePath)       throw new AppError('filePath is required', 422);

  // ── Validate references ────────────────────────────────────
  const docType = await assertDocumentTypeValid(documentTypeId);

  // Validate file extension if the shelf has restrictions
  if (docType.allowedExtensions?.length && mimeType) {
    const ext = path.extname(originalFileName || filePath).toLowerCase().replace('.', '');
    if (!docType.allowedExtensions.includes(ext)) {
      throw new AppError(
        `File extension ".${ext}" is not allowed for "${docType.name}". ` +
        `Allowed: ${docType.allowedExtensions.map(e => `.${e}`).join(', ')}`,
        422,
      );
    }
  }

  // Validate file size if the shelf has a cap
  if (docType.maxFileSizeKb && fileSize) {
    const sizeKb = Math.ceil(fileSize / 1024);
    if (sizeKb > docType.maxFileSizeKb) {
      throw new AppError(
        `File size (${sizeKb} KB) exceeds the maximum of ${docType.maxFileSizeKb} KB for "${docType.name}"`,
        422,
      );
    }
  }

  // Validate uploader if provided
  if (uploadedById) {
    await assertEmployeeExists(uploadedById);
  }

  // ── Create document ────────────────────────────────────────
  const document = await Document.create({
    documentTypeId,
    voucherType,
    voucherNo,
    uploadedById: uploadedById || null,
    title: title || originalFileName || path.basename(filePath),
    documentNumber: documentNumber || null,
    fileName: originalFileName || path.basename(filePath),
    filePath,
    mimeType: mimeType || null,
    fileSizeKb: fileSize ? Math.ceil(fileSize / 1024) : null,
    issueDate: issueDate || null,
    expiryDate: expiryDate || null,
    status: 'Pending',           // Starts as Pending — must be verified
    isConfidential,
    notes: notes || null,
  });

  logger.info('Document attached', {
    documentId: document.id,
    documentType: docType.name,
    voucherType,
    voucherNo,
    shelfPath: buildShelfPath(document),
  });

  // Return with full context
  return Document.findByPk(document.id, { include: DOCUMENT_INCLUDES });
};

/**
 * Get a single document by ID — full shelf view.
 * Returns the document with its type, uploader, and all version tabs.
 */
const getDocumentById = async (id) => {
  const doc = await Document.findByPk(id, { include: DOCUMENT_INCLUDES });
  if (!doc) throw new AppError('Document not found', 404);

  doc.dataValues.shelfPath = buildShelfPath(doc);
  return doc;
};

/**
 * Get all documents attached to a specific owner record.
 *
 * e.g. "Show me every document for Employee EMP-0042"
 *
 * Results are grouped by DocumentType — the "shelf view".
 */
const getDocumentsByOwner = async (voucherType, voucherNo, { includeExpired = false } = {}) => {
  const where = { voucherType, voucherNo };

  // By default, hide documents that are already expired
  if (!includeExpired) {
    where.status = { [Op.ne]: 'Expired' };
  }

  const documents = await Document.findAll({
    where,
    include: DOCUMENT_INCLUDES,
    order: [
      [{ model: DocumentType, as: 'documentType' }, 'category', 'ASC'],
      [{ model: DocumentType, as: 'documentType' }, 'name', 'ASC'],
      ['createdAt', 'DESC'],
    ],
  });

  // Annotate each with shelf path
  documents.forEach(doc => {
    doc.dataValues.shelfPath = buildShelfPath(doc);
  });

  // Group by document type — the shelf view
  return documents.reduce((shelf, doc) => {
    const typeName = doc.documentType?.name || 'Uncategorised';
    if (!shelf[typeName]) shelf[typeName] = [];
    shelf[typeName].push(doc);
    return shelf;
  }, {});
};

/**
 * Browse all documents of a given type across the entire system.
 *
 * e.g. "Show me every Passport on file"
 */
const getDocumentsByType = async (documentTypeId, query = {}) => {
  const { voucherType, status, includeExpired = false } = query;
  const { limit, offset, page } = getPaginationOptions(query);

  const docType = await assertDocumentTypeValid(documentTypeId);

  const where = { documentTypeId };
  if (voucherType) where.voucherType = voucherType;
  if (status)      where.status      = status;
  if (!includeExpired) {
    where.status = { [Op.ne]: 'Expired' };
  }

  const { count, rows } = await Document.findAndCountAll({
    where,
    include: DOCUMENT_LIST_INCLUDES,
    order: [['createdAt', 'DESC']],
    limit,
    offset,
  });

  rows.forEach(doc => {
    doc.dataValues.shelfPath = buildShelfPath(doc);
  });

  return {
    documentType: docType,
    data: rows,
    meta: buildMeta(count, page, limit),
  };
};

/**
 * Search across all documents with rich filters.
 *
 * Filters: search term, documentTypeId, voucherType, voucherNo,
 *          uploadedById, status, isConfidential, expiringWithinDays
 */
const searchDocuments = async (query = {}) => {
  const {
    search,
    documentTypeId,
    voucherType,
    voucherNo,
    uploadedById,
    status,
    isConfidential,
    expiringWithinDays,
  } = query;

  const { limit, offset, page } = getPaginationOptions(query);

  const where = {};

  if (documentTypeId) where.documentTypeId = documentTypeId;
  if (voucherType)    where.voucherType    = voucherType;
  if (voucherNo)      where.voucherNo      = voucherNo;
  if (uploadedById)   where.uploadedById   = uploadedById;
  if (status)         where.status         = status;
  if (isConfidential !== undefined) where.isConfidential = isConfidential;

  // Full-text search across multiple fields
  if (search) {
    const like = { [Op.iLike]: `%${search}%` };
    where[Op.or] = [
      { title:          like },
      { fileName:       like },
      { documentNumber: like },
      { notes:          like },
    ];
  }

  // "Expiring within N days" — compliance query
  if (expiringWithinDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + parseInt(expiringWithinDays, 10));
    where.expiryDate = {
      [Op.and]: [
        { [Op.ne]: null },
        { [Op.lte]: cutoff },
      ],
    };
    // Only show non-expired, non-rejected documents
    where.status = { [Op.in]: ['Pending', 'Verified'] };
  }

  const { count, rows } = await Document.findAndCountAll({
    where,
    include: DOCUMENT_LIST_INCLUDES,
    order: [
      [{ model: DocumentType, as: 'documentType' }, 'name', 'ASC'],
      ['createdAt', 'DESC'],
    ],
    limit,
    offset,
    distinct: true,
  });

  rows.forEach(doc => {
    doc.dataValues.shelfPath = buildShelfPath(doc);
  });

  return {
    data: rows,
    meta: buildMeta(count, page, limit),
  };
};

/**
 * Update document metadata — title, notes, dates, confidential flag.
 * Does NOT change the file itself. For file replacement, use replaceDocument().
 */
const updateDocument = async (id, data) => {
  const doc = await Document.findByPk(id);
  if (!doc) throw new AppError('Document not found', 404);

  // Only allow updating metadata fields
  const allowedFields = [
    'title', 'documentNumber', 'issueDate', 'expiryDate',
    'isConfidential', 'notes',
  ];

  const updates = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError('No valid fields to update', 422);
  }

  await doc.update(updates);
  logger.info('Document updated', { documentId: id, fields: Object.keys(updates) });

  return Document.findByPk(id, { include: DOCUMENT_INCLUDES });
};

/**
 * Replace a document file — the old file is archived as a version.
 *
 * This is the ONLY way to change the file on a Document record.
 *
 * Flow:
 *   1. Archive current file → DocumentVersion (immutable audit trail)
 *   2. Update Document with new file details
 *   3. Reset status to 'Pending' for re-verification
 */
const replaceDocument = async (id, data) => {
  const {
    replacedById,
    originalFileName,
    filePath,
    mimeType,
    fileSize,
    changeReason,
  } = data;

  if (!filePath) throw new AppError('filePath is required for replacement', 422);

  const doc = await Document.findByPk(id, {
    include: [{ model: DocumentVersion, as: 'versions' }],
  });
  if (!doc) throw new AppError('Document not found', 404);

  // Validate document type is still active
  if (doc.documentTypeId) {
    await assertDocumentTypeValid(doc.documentTypeId);
  }

  // Validate replacement uploader
  if (replacedById) {
    await assertEmployeeExists(replacedById);
  }

  // Determine next version number
  const versionNumber = (doc.versions?.length ?? 0) + 1;

  await sequelize.transaction(async (t) => {
    // 1. Archive the current file as an immutable version
    await DocumentVersion.create({
      documentId:       id,
      replacedById:     replacedById || doc.uploadedById || null,
      versionNumber,
      fileName:         doc.fileName,
      filePath:         doc.filePath,
      mimeType:         doc.mimeType,
      fileSizeKb:       doc.fileSizeKb,
      statusAtArchival: doc.status,
      changeReason:     changeReason || 'File replaced',
    }, { transaction: t });

    // 2. Update document with new file details
    await doc.update({
      title:     originalFileName || path.basename(filePath),
      fileName:  originalFileName || path.basename(filePath),
      filePath,
      mimeType:  mimeType || null,
      fileSizeKb: fileSize ? Math.ceil(fileSize / 1024) : null,
      status:    'Pending',          // Reset — needs re-verification
    }, { transaction: t });
  });

  logger.info('Document replaced', {
    documentId: id,
    versionNumber,
    shelfPath: buildShelfPath(doc),
  });

  return Document.findByPk(id, { include: DOCUMENT_INCLUDES });
};

/**
 * Soft-delete a document.
 * Versions are preserved for audit trail.
 */
const deleteDocument = async (id) => {
  const doc = await Document.findByPk(id);
  if (!doc) throw new AppError('Document not found', 404);

  await doc.destroy();
  logger.info('Document deleted', { documentId: id });
};


// ═════════════════════════════════════════════════════════════
//  DOCUMENT VERIFICATION (status workflow)
// ═════════════════════════════════════════════════════════════

/**
 * Verify a document — HR confirms the document is authentic.
 * Status: Pending → Verified
 */
const verifyDocument = async (id, verifiedById) => {
  const doc = await Document.findByPk(id);
  if (!doc) throw new AppError('Document not found', 404);
  if (doc.status !== 'Pending') {
    throw new AppError(`Cannot verify — document status is "${doc.status}"`, 422);
  }

  await doc.update({
    status: 'Verified',
    verifiedAt: new Date(),
  });

  logger.info('Document verified', { documentId: id, verifiedById });
  return Document.findByPk(id, { include: DOCUMENT_INCLUDES });
};

/**
 * Reject a document — HR flags it as invalid/incorrect.
 * Status: Pending → Rejected
 */
const rejectDocument = async (id, rejectionReason) => {
  if (!rejectionReason) throw new AppError('rejectionReason is required', 422);

  const doc = await Document.findByPk(id);
  if (!doc) throw new AppError('Document not found', 404);
  if (doc.status !== 'Pending') {
    throw new AppError(`Cannot reject — document status is "${doc.status}"`, 422);
  }

  await doc.update({
    status: 'Rejected',
    rejectionReason,
  });

  logger.info('Document rejected', { documentId: id, reason: rejectionReason });
  return Document.findByPk(id, { include: DOCUMENT_INCLUDES });
};


// ═════════════════════════════════════════════════════════════
//  DOCUMENT VERSIONS  (archived tabs — read-only)
// ═════════════════════════════════════════════════════════════

/**
 * Get the full version history for a document — all archived tabs.
 * Ordered newest first for review convenience.
 */
const getDocumentVersions = async (documentId) => {
  const doc = await Document.findByPk(documentId, { attributes: ['id'] });
  if (!doc) throw new AppError('Document not found', 404);

  return DocumentVersion.findAll({
    where: { documentId },
    include: [{
      model:      Employee,
      as:         'replacedBy',
      attributes: ['id', 'firstName', 'lastName', 'employeeNumber'],
    }],
    order: [['versionNumber', 'DESC']],
  });
};

/**
 * Get a specific version by its ID.
 */
const getDocumentVersionById = async (versionId) => {
  const version = await DocumentVersion.findByPk(versionId, {
    include: [
      {
        model:      Document,
        attributes: ['id', 'title', 'fileName', 'voucherType', 'voucherNo'],
      },
      {
        model:      Employee,
        as:         'replacedBy',
        attributes: ['id', 'firstName', 'lastName'],
      },
    ],
  });
  if (!version) throw new AppError('Document version not found', 404);
  return version;
};


// ═════════════════════════════════════════════════════════════
//  COMPLIANCE QUERIES
// ═════════════════════════════════════════════════════════════

/**
 * "Expiry Dashboard" — documents expiring within N days, or already expired.
 *
 * Grouped by voucherType so compliance officers see:
 *   Employee documents, Contract documents, etc.
 *
 * Each document is annotated with daysUntilExpiry (negative = expired).
 */
const getExpiringDocuments = async ({ withinDays = 30, voucherType, documentTypeId } = {}) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + parseInt(withinDays, 10));

  const where = {
    expiryDate: {
      [Op.and]: [
        { [Op.ne]: null },
        { [Op.lte]: cutoff },
      ],
    },
    status: { [Op.in]: ['Pending', 'Verified'] },   // only active documents
  };
  if (voucherType)    where.voucherType    = voucherType;
  if (documentTypeId) where.documentTypeId = documentTypeId;

  const documents = await Document.findAll({
    where,
    include: DOCUMENT_INCLUDES,
    order: [['expiryDate', 'ASC']],   // most urgent first
  });

  // Annotate each with days remaining
  const today = new Date();
  documents.forEach(doc => {
    const msLeft = new Date(doc.expiryDate) - today;
    doc.dataValues.daysUntilExpiry = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    doc.dataValues.isExpired       = msLeft < 0;
    doc.dataValues.shelfPath       = buildShelfPath(doc);
  });

  // Group by voucherType — the compliance dashboard view
  return documents.reduce((dashboard, doc) => {
    const section = doc.voucherType || 'Other';
    if (!dashboard[section]) dashboard[section] = [];
    dashboard[section].push(doc);
    return dashboard;
  }, {});
};

/**
 * Mark a document as Expired manually.
 *
 * Also used by the scheduled job to auto-expire overdue documents.
 */
const expireDocument = async (id) => {
  const doc = await Document.findByPk(id);
  if (!doc) throw new AppError('Document not found', 404);
  if (doc.status === 'Expired') {
    throw new AppError('Document is already expired', 422);
  }

  await doc.update({ status: 'Expired' });
  logger.info('Document expired', { documentId: id });
  return doc;
};

/**
 * Bulk-expire all documents past their expiry date.
 * Designed for cron / scheduled job.
 * Returns count of records updated.
 */
const expireOverdueDocuments = async () => {
  const [affectedCount] = await Document.update(
    { status: 'Expired' },
    {
      where: {
        expiryDate: { [Op.lt]: new Date() },
        status:     { [Op.in]: ['Pending', 'Verified'] },
      },
    },
  );
  logger.info('Bulk expiry job completed', { expired: affectedCount });
  return { expired: affectedCount };
};


// ═════════════════════════════════════════════════════════════
//  MISSING DOCUMENTS (compliance — which required docs are absent)
// ═════════════════════════════════════════════════════════════

/**
 * Find which required document types an owner is missing.
 *
 * e.g. "Employee EMP-0042 hasn't uploaded a Passport yet"
 *
 * Returns the list of required DocumentTypes that have no
 * Verified/Pending document for this owner.
 */
const getMissingRequiredDocuments = async (voucherType, voucherNo) => {
  // Get all required document types
  const requiredTypes = await DocumentType.findAll({
    where: { isRequired: true, disabled: false },
    attributes: ['id', 'name', 'category'],
  });

  if (requiredTypes.length === 0) return [];

  // Get all documents this owner has (active only)
  const existingDocs = await Document.findAll({
    where: {
      voucherType,
      voucherNo,
      status: { [Op.in]: ['Pending', 'Verified'] },
    },
    attributes: ['documentTypeId'],
  });

  const existingTypeIds = new Set(existingDocs.map(d => d.documentTypeId));

  // Filter to types the owner doesn't have
  return requiredTypes.filter(type => !existingTypeIds.has(type.id));
};


// ═════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════

module.exports = {
  // DocumentType (shelves)
  createDocumentType,
  getAllDocumentTypes,
  getDocumentTypeById,
  updateDocumentType,
  deleteDocumentType,

  // Document (files)
  attachDocument,
  getDocumentById,
  getDocumentsByOwner,
  getDocumentsByType,
  searchDocuments,
  updateDocument,
  replaceDocument,
  deleteDocument,

  // Verification workflow
  verifyDocument,
  rejectDocument,

  // DocumentVersion (archived tabs)
  getDocumentVersions,
  getDocumentVersionById,

  // Compliance
  getExpiringDocuments,
  expireDocument,
  expireOverdueDocuments,
  getMissingRequiredDocuments,
};