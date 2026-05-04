'use strict';

/**
 * middlewares/upload.middleware.js
 *
 * PRODUCTION Multer upload configurations.
 *
 * DOCUMENT STORAGE STRUCTURE:
 *   uploads/documents/{voucherType}/{documentTypeName}/{employeeNumber}/{filename}
 * 
 * Example:
 *   uploads/documents/Employee/National-ID/EMP-2026-0006/eyuel-1714806119579.png
 *   uploads/documents/Employee/Passport/EMP-2026-0006/passport-1714806200000.pdf
 *
 * AVATAR STORAGE:
 *   uploads/avatars/avatar-{uuid}.jpg
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');

// ─────────────────────────────────────────────
//  UPLOAD ROOT
// ─────────────────────────────────────────────
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

// ─────────────────────────────────────────────
//  MIME TYPE FILTERS
// ─────────────────────────────────────────────
const IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const DOCUMENT_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

const makeFileFilter = (allowedMimes) => (_req, file, cb) => {
  if (allowedMimes.has(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    err.message = `File type '${file.mimetype}' is not allowed`;
    cb(err);
  }
};

// ─────────────────────────────────────────────
//  SANITIZE HELPERS
// ─────────────────────────────────────────────

const sanitizeFolderName = (name) => {
  if (!name) return 'unknown';
  return name
    .replace(/[^a-zA-Z0-9_\-\u1200-\u137F]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 60) || 'unknown';
};

const sanitizeFilename = (originalname) => {
  const ext = path.extname(originalname);
  const base = path.basename(originalname, ext);
  
  const sanitized = base
    .replace(/[^a-zA-Z0-9_\-\u1200-\u137F]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80) || 'document';
  
  const timestamp = Date.now();
  return `${sanitized}-${timestamp}${ext.toLowerCase()}`;
};

// ─────────────────────────────────────────────
//  DOCUMENT STORAGE
//  Destination is determined AT UPLOAD TIME
//  from req.body fields (voucherType, documentTypeId, voucherNo)
// ─────────────────────────────────────────────

/**
 * Since multer's destination runs BEFORE body parsing,
 * we use a two-step approach:
 * 1. Multer stores in a flat _incoming folder (always works)
 * 2. Controller immediately moves to proper shelf (readable path)
 * 
 * THIS IS PRODUCTION-READY because:
 * - req.body may not be available during multer's destination()
 * - The controller has full req.body & validation
 * - Files are moved to readable paths before the response
 */
const createDocumentStorage = () => {
  const destination = path.join(UPLOAD_ROOT, 'documents', '_staging');
  fs.mkdirSync(destination, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      try {
        const filename = sanitizeFilename(file.originalname);
        cb(null, filename);
      } catch (err) {
        cb(err);
      }
    },
  });
};

// ─────────────────────────────────────────────
//  AVATAR STORAGE
// ─────────────────────────────────────────────
const createAvatarStorage = () => {
  const destination = path.join(UPLOAD_ROOT, 'avatars');
  fs.mkdirSync(destination, { recursive: true });
  
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `avatar-${uuidv4()}${ext}`;
      cb(null, filename);
    },
  });
};

// ─────────────────────────────────────────────
//  EXPORTED MULTER INSTANCES
// ─────────────────────────────────────────────

const uploadDocument = multer({
  storage: createDocumentStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },   // 10 MB
  fileFilter: makeFileFilter(DOCUMENT_MIMES),
});

const uploadAvatar = multer({
  storage: createAvatarStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },    // 2 MB
  fileFilter: makeFileFilter(IMAGE_MIMES),
});

// ─────────────────────────────────────────────
//  FILE MOVEMENT UTILITIES (used by controllers)
// ─────────────────────────────────────────────

/**
 * moveToShelf(sourcePath, voucherType, documentTypeName, voucherNo, originalName)
 * 
 * Moves a file from _staging to its readable shelf:
 *   uploads/documents/{voucherType}/{documentTypeName}/{voucherNo}/{filename}
 *
 * Returns the relative path for DB storage.
 */
const moveToShelf = (sourcePath, voucherType, documentTypeName, voucherNo, originalName) => {
  const sanitizedVoucher = sanitizeFolderName(voucherType);
  const sanitizedDocType = sanitizeFolderName(documentTypeName);
  const sanitizedVoucherNo = sanitizeFolderName(voucherNo);
  
  const shelfDir = path.join(
    UPLOAD_ROOT, 'documents',
    sanitizedVoucher,
    sanitizedDocType,
    sanitizedVoucherNo
  );
  
  fs.mkdirSync(shelfDir, { recursive: true });
  
  const filename = sanitizeFilename(originalName || path.basename(sourcePath));
  const destPath = path.join(shelfDir, filename);
  
  fs.renameSync(sourcePath, destPath);
  
  return path.relative(UPLOAD_ROOT, destPath).replace(/\\/g, '/');
};

/**
 * getRelativePath(file)
 * Converts req.file.path (absolute) into path relative to uploads/ root.
 */
const getRelativePath = (file) => {
  if (!file || !file.path) return null;
  return path.relative(UPLOAD_ROOT, file.path).replace(/\\/g, '/');
};

/**
 * getFullPath(relativePath)
 * Converts DB relative path back to absolute filesystem path.
 */
const getFullPath = (relativePath) => {
  if (!relativePath) return null;
  return path.join(UPLOAD_ROOT, relativePath);
};

/**
 * deleteFile(relativePath)
 * Deletes a file from disk. Fails silently if not found.
 */
const deleteFile = async (relativePath) => {
  if (!relativePath) return false;
  const absPath = path.join(UPLOAD_ROOT, relativePath);
  try {
    await fs.promises.unlink(absPath);
    return true;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      const logger = require('../utils/logger');
      logger.warn('Could not delete file', { path: absPath, error: err.message });
    }
    return false;
  }
};

/**
 * cleanupEmptyFolders(relativePath)
 * Recursively removes empty folders after file deletion.
 */
const cleanupEmptyFolders = async (relativePath) => {
  const absPath = getFullPath(relativePath);
  if (!absPath || !fs.existsSync(absPath)) return;
  
  const files = await fs.promises.readdir(absPath);
  
  if (files.length === 0) {
    await fs.promises.rmdir(absPath);
    const parentPath = path.dirname(relativePath);
    if (parentPath !== '.' && parentPath !== 'documents' && parentPath !== 'uploads') {
      await cleanupEmptyFolders(parentPath);
    }
  }
};

// ─────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  uploadDocument,
  uploadAvatar,
  
  // File movement
  moveToShelf,
  
  // Path utilities
  getRelativePath,
  getFullPath,
  deleteFile,
  cleanupEmptyFolders,
  
  // Constants
  UPLOAD_ROOT,
};