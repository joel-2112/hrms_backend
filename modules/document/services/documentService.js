'use strict';

const { Op }           = require('sequelize');
const path             = require('path');
const {
  sequelize,
  DocumentType,
  Document,
  DocumentVersion,
  Employee,
}                      = require('../../../models');
const { AppError }     = require('../../../middlewares/errorMiddleware');

// ─────────────────────────────────────────────────────────────
//  PRIVATE HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * The canonical "shelf view" include — always returns the full
 * document context: type (shelf label), uploader (whom), versions (tabs).
 * Used by every single-document fetch so the shape is consistent.
 */
const documentIncludes = [
  {
    model:      DocumentType,
    as:         'DocumentType',
    attributes: ['id', 'name', 'category', 'description'],
  },
  {
    model:      Employee,
    as:         'uploadedBy',
    attributes: ['id', 'firstName', 'lastName', 'employeeNumber'],
  },
  {
    model:   DocumentVersion,
    as:      'versions',
    include: [{
      model:      Employee,
      as:         'replacedBy',
      attributes: ['id', 'firstName', 'lastName'],
    }],
    order:      [['version_number', 'DESC']],
    separate:   true,   // avoids cartesian product on multi-include
  },
];

/**
 * Build a human-readable shelf path string for any document.
 * Format: "DocumentType / voucherType / voucherNo / fileName (vN)"
 * Makes logs and responses instantly scannable.
 */
const buildShelfPath = (doc) =>
  [
    doc.documentType?.name   || 'Unknown Type',
    doc.voucherType          || 'Unknown Owner',
    doc.voucherNo            || '—',
    `${doc.fileName} (v${(doc.versions?.length ?? 0) + 1})`,
  ].join(' / ');

// ─────────────────────────────────────────────────────────────
//  DOCUMENT TYPE  (the shelves)
// ─────────────────────────────────────────────────────────────

/**
 * Create a new shelf label — admin defines document categories
 * dynamically without any code change.
 * e.g. "Employment Contract", "Passport", "Medical Certificate"
 */
const createDocumentType = async ({ name, category, description, isRequired, allowedMimeTypes }) => {
  const exists = await DocumentType.findOne({ where: { name } });
  if (exists) throw new AppError(`Document type "${name}" already exists`, 409);

  return DocumentType.create({
    name,
    category:          category          || null,
    description:       description       || null,
    isRequired:        isRequired        ?? false,
    allowedMimeTypes:  allowedMimeTypes  || [],  // JSONB e.g. ["application/pdf","image/jpeg"]
  });
};

const getAllDocumentTypes = async ({ category, includeDisabled = false } = {}) => {
  const where = {};
  if (!includeDisabled) where.disabled = false;
  if (category) where.category = category;

  return DocumentType.findAll({
    where,
    order: [['category', 'ASC'], ['name', 'ASC']],  // grouped by category = shelf section
  });
};

const getDocumentTypeById = async (id) => {
  const type = await DocumentType.findByPk(id);
  if (!type) throw new AppError('Document type not found', 404);
  return type;
};

const updateDocumentType = async (id, updates) => {
  const type = await DocumentType.findByPk(id);
  if (!type) throw new AppError('Document type not found', 404);
  return type.update(updates);
};

const deleteDocumentType = async (id) => {
  const type = await DocumentType.findByPk(id);
  if (!type) throw new AppError('Document type not found', 404);

  const docCount = await Document.count({ where: { documentTypeId: id } });
  if (docCount > 0)
    throw new AppError(
      `Cannot delete — ${docCount} document(s) filed under this type`,
      409,
    );

  await type.destroy();
};

// ─────────────────────────────────────────────────────────────
//  DOCUMENT  (the files on the shelves)
// ─────────────────────────────────────────────────────────────

/**
 * Attach a new document to any record in any module.
 * The caller passes voucherType + voucherNo to identify
 * the owner without any FK constraint.
 *
 * e.g. attach a passport scan to Employee EMP-0042:
 *   voucherType = "Employee"
 *   voucherNo   = "EMP-0042"
 */
const attachDocument = async ({
  documentTypeId,
  voucherType,
  voucherNo,
  uploadedById,
  fileName,
  fileUrl,
  fileSize,
  mimeType,
  description,
  expiryDate,
  isPrivate,
}) => {
  // Validate the document type (the shelf) exists
  const docType = await DocumentType.findByPk(documentTypeId);
  if (!docType) throw new AppError('Document type not found', 404);

  // Validate mime type if the shelf has a restriction
  if (docType.allowedMimeTypes?.length && !docType.allowedMimeTypes.includes(mimeType)) {
    throw new AppError(
      `File type "${mimeType}" is not allowed for "${docType.name}". ` +
      `Allowed: ${docType.allowedMimeTypes.join(', ')}`,
      422,
    );
  }

  const document = await Document.create({
    documentTypeId,
    voucherType,
    voucherNo,
    uploadedById:  uploadedById || null,
    fileName,
    fileUrl,
    fileSize:      fileSize  || null,
    mimeType,
    description:   description || null,
    expiryDate:    expiryDate  || null,
    isPrivate:     isPrivate   ?? true,   // private by default — must explicitly publish
    status:        'Active',
    uploadedAt:    new Date(),
  });

  // Return with full shelf context
  return Document.findByPk(document.id, { include: documentIncludes });
};

/**
 * Get a single document by ID — full shelf view.
 * What + Whom + When + all version tabs.
 */
const getDocumentById = async (id) => {
  const doc = await Document.findByPk(id, { include: documentIncludes });
  if (!doc) throw new AppError('Document not found', 404);
  doc.dataValues.shelfPath = buildShelfPath(doc);
  return doc;
};

/**
 * Browse the shelf for a specific owner record.
 * Returns all documents filed under voucherType + voucherNo,
 * grouped by document type (shelf section).
 *
 * e.g. "Show me everything filed for Employee EMP-0042"
 */
const getDocumentsByOwner = async (voucherType, voucherNo, { includeExpired = false } = {}) => {
  const where = { voucherType, voucherNo };
  if (!includeExpired) {
    where[Op.or] = [
      { expiryDate: null },
      { expiryDate: { [Op.gte]: new Date() } },
    ];
  }

  const documents = await Document.findAll({
    where,
    include: documentIncludes,
    order:   [
      [{ model: DocumentType, as: 'documentType' }, 'category', 'ASC'],
      [{ model: DocumentType, as: 'documentType' }, 'name', 'ASC'],
      ['uploaded_at', 'DESC'],
    ],
  });

  // Group by document type — the shelf view
  return documents.reduce((shelf, doc) => {
    const typeName = doc.documentType?.name || 'Uncategorised';
    if (!shelf[typeName]) shelf[typeName] = [];
    doc.dataValues.shelfPath = buildShelfPath(doc);
    shelf[typeName].push(doc);
    return shelf;
  }, {});
};

/**
 * Browse all documents of a given type across the entire system.
 * e.g. "Show me every Employment Contract on file"
 */
const getDocumentsByType = async (documentTypeId, {
  voucherType,
  status,
  includeExpired = false,
  page  = 1,
  limit = 20,
} = {}) => {
  const type = await DocumentType.findByPk(documentTypeId);
  if (!type) throw new AppError('Document type not found', 404);

  const where = { documentTypeId };
  if (voucherType) where.voucherType = voucherType;
  if (status) where.status = status;
  if (!includeExpired) {
    where[Op.or] = [
      { expiryDate: null },
      { expiryDate: { [Op.gte]: new Date() } },
    ];
  }

  const offset = (page - 1) * limit;
  const { count, rows } = await Document.findAndCountAll({
    where,
    include: documentIncludes,
    order:   [['uploaded_at', 'DESC']],
    limit,
    offset,
  });

  rows.forEach(doc => { doc.dataValues.shelfPath = buildShelfPath(doc); });

  return {
    documentType: type,
    total:        count,
    page,
    totalPages:   Math.ceil(count / limit),
    documents:    rows,
  };
};

/**
 * Search across all documents by any combination of:
 * fileName, voucherType, voucherNo, documentTypeId,
 * uploadedById, status, expiring soon.
 */
const searchDocuments = async ({
  search,
  documentTypeId,
  voucherType,
  voucherNo,
  uploadedById,
  status,
  expiringWithinDays,
  isPrivate,
  page  = 1,
  limit = 20,
} = {}) => {
  const where = {};

  if (documentTypeId) where.documentTypeId = documentTypeId;
  if (voucherType)    where.voucherType    = voucherType;
  if (voucherNo)      where.voucherNo      = voucherNo;
  if (uploadedById)   where.uploadedById   = uploadedById;
  if (status)         where.status         = status;
  if (isPrivate !== undefined) where.isPrivate = isPrivate;

  if (search) {
    where[Op.or] = [
      { fileName:    { [Op.iLike]: `%${search}%` } },
      { voucherNo:   { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  // "Expiring within N days" filter — very common compliance query
  if (expiringWithinDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + parseInt(expiringWithinDays));
    where.expiryDate = {
      [Op.between]: [new Date(), cutoff],
    };
  }

  const offset = (page - 1) * limit;
  const { count, rows } = await Document.findAndCountAll({
    where,
    include: documentIncludes,
    order:   [
      [{ model: DocumentType, as: 'DocumentType' }, 'name', 'ASC'],
      ['uploaded_at', 'DESC'],
    ],
    limit,
    offset,
    distinct: true,  // avoid count inflation from multi-include
  });

  rows.forEach(doc => { doc.dataValues.shelfPath = buildShelfPath(doc); });

  return {
    total:     count,
    page,
    totalPages: Math.ceil(count / limit),
    documents: rows,
  };
};

/**
 * Update document metadata — never replaces the file itself.
 * File replacement always goes through replaceDocument().
 */
const updateDocumentMetadata = async (id, {
  description,
  expiryDate,
  isPrivate,
  status,
}) => {
  const doc = await Document.findByPk(id);
  if (!doc) throw new AppError('Document not found', 404);

  return doc.update({ description, expiryDate, isPrivate, status });
};

/**
 * Replace a document file — the old file is archived as a version.
 * This is the ONLY way to change the fileUrl of a document.
 *
 * Flow:
 *   1. Snapshot current file → DocumentVersion (the archived tab)
 *   2. Update Document with the new file details
 *   3. Status stays Active, version count increments
 */
const replaceDocument = async (id, {
  replacedById,
  replacedReason,
  newFileName,
  newFileUrl,
  newFileSize,
  newMimeType,
}) => {
  const doc = await Document.findByPk(id, { include: documentIncludes });
  if (!doc) throw new AppError('Document not found', 404);

  // Validate mime type against the shelf restriction
  if (doc.documentType?.allowedMimeTypes?.length &&
      !doc.documentType.allowedMimeTypes.includes(newMimeType)) {
    throw new AppError(
      `File type "${newMimeType}" is not allowed for "${doc.documentType.name}"`,
      422,
    );
  }

  const versionNumber = (doc.versions?.length ?? 0) + 1;

  await sequelize.transaction(async (t) => {
    // Archive the current file as a version
    await DocumentVersion.create({
      documentId:     id,
      versionNumber,
      fileName:       doc.fileName,
      fileUrl:        doc.fileUrl,
      fileSize:       doc.fileSize,
      mimeType:       doc.mimeType,
      replacedById:   replacedById   || null,
      replacedReason: replacedReason || null,
      replacedAt:     new Date(),
    }, { transaction: t });

    // Promote the new file onto the document record
    await doc.update({
      fileName:   newFileName,
      fileUrl:    newFileUrl,
      fileSize:   newFileSize  || null,
      mimeType:   newMimeType,
      uploadedAt: new Date(),
      status:     'Active',
    }, { transaction: t });
  });

  return Document.findByPk(id, { include: documentIncludes });
};

/**
 * Soft-delete a document (paranoid: true handles the deletedAt stamp).
 * The versions are preserved for audit.
 */
const deleteDocument = async (id) => {
  const doc = await Document.findByPk(id);
  if (!doc) throw new AppError('Document not found', 404);
  await doc.destroy();
};

// ─────────────────────────────────────────────────────────────
//  DOCUMENT VERSIONS  (the archived tabs)
// ─────────────────────────────────────────────────────────────

/**
 * Get the full version history for a document — all archived tabs.
 * Ordered newest first so reviewers immediately see the latest change.
 */
const getDocumentVersions = async (documentId) => {
  const doc = await Document.findByPk(documentId);
  if (!doc) throw new AppError('Document not found', 404);

  return DocumentVersion.findAll({
    where:   { documentId },
    include: [{
      model:      Employee,
      as:         'replacedBy',
      attributes: ['id', 'firstName', 'lastName', 'employeeNumber'],
    }],
    order: [['version_number', 'DESC']],
  });
};

/**
 * Get one specific version by its ID.
 */
const getDocumentVersionById = async (versionId) => {
  const version = await DocumentVersion.findByPk(versionId, {
    include: [
      { model: Document,  attributes: ['id', 'fileName', 'voucherType', 'voucherNo'] },
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

// ─────────────────────────────────────────────────────────────
//  COMPLIANCE QUERIES  (expiry and status monitoring)
// ─────────────────────────────────────────────────────────────

/**
 * "Expiry shelf" — documents expiring within N days or already expired.
 * Grouped by voucherType so HR sees: Employee documents, Contract documents, etc.
 * This is the compliance officer's primary daily view.
 */
const getExpiringDocuments = async ({ withinDays = 30, voucherType, documentTypeId } = {}) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + parseInt(withinDays));

  const where = {
    expiryDate: { [Op.lte]: cutoff },   // includes already expired
    status:     { [Op.ne]: 'Superseded' },
  };
  if (voucherType)    where.voucherType    = voucherType;
  if (documentTypeId) where.documentTypeId = documentTypeId;

  const documents = await Document.findAll({
    where,
    include: documentIncludes,
    order:   [['expiry_date', 'ASC']],  // most urgent first
  });

  // Annotate each with days remaining (negative = already expired)
  const today = new Date();
  documents.forEach(doc => {
    const msLeft = new Date(doc.expiryDate) - today;
    doc.dataValues.daysUntilExpiry = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    doc.dataValues.isExpired       = msLeft < 0;
    doc.dataValues.shelfPath       = buildShelfPath(doc);
  });

  // Group by voucherType — the compliance shelf view
  return documents.reduce((shelf, doc) => {
    const section = doc.voucherType || 'Other';
    if (!shelf[section]) shelf[section] = [];
    shelf[section].push(doc);
    return shelf;
  }, {});
};

/**
 * Mark a document as Expired manually (or set to Active to reinstate).
 */
const setDocumentStatus = async (id, status) => {
  const validStatuses = ['Active', 'Expired', 'Superseded'];
  if (!validStatuses.includes(status))
    throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 422);

  const doc = await Document.findByPk(id);
  if (!doc) throw new AppError('Document not found', 404);
  return doc.update({ status });
};

/**
 * Bulk-expire documents past their expiry date.
 * Designed to be called by a scheduled job (cron / worker).
 * Returns the count of records updated.
 */
const expireOverdueDocuments = async () => {
  const [affectedCount] = await Document.update(
    { status: 'Expired' },
    {
      where: {
        expiryDate: { [Op.lt]: new Date() },
        status:     'Active',
      },
    },
  );
  return { expired: affectedCount };
};

// ─────────────────────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────────────────────

module.exports = {
  // DocumentType  (shelves)
  createDocumentType,
  getAllDocumentTypes,
  getDocumentTypeById,
  updateDocumentType,
  deleteDocumentType,

  // Document  (files)
  attachDocument,
  getDocumentById,
  getDocumentsByOwner,
  getDocumentsByType,
  searchDocuments,
  updateDocumentMetadata,
  replaceDocument,
  deleteDocument,

  // DocumentVersion  (archived tabs)
  getDocumentVersions,
  getDocumentVersionById,

  // Compliance
  getExpiringDocuments,
  setDocumentStatus,
  expireOverdueDocuments,
};