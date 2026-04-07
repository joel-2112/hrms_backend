'use strict';

/**
 * middlewares/upload.middleware.js
 *
 * Multer upload configurations for every file upload in the system.
 * Each upload type (avatar, document) has its own pre-configured middleware
 * with its own destination folder, size limit, and MIME type whitelist.
 *
 * Usage in routes:
 *
 *   const { uploadAvatar, uploadDocument } = require('../../middlewares/upload.middleware');
 *
 *   // Single avatar
 *   router.put('/employees/:id/avatar',
 *     authenticate,
 *     uploadAvatar.single('avatar'),    // field name must match the form field
 *     employeeController.updateAvatar,
 *   );
 *
 *   // Single document
 *   router.post('/documents',
 *     authenticate,
 *     uploadDocument.single('file'),
 *     documentController.create,
 *   );
 *
 * After middleware runs, the uploaded file is available as:
 *   req.file          (single upload)
 *   req.files         (array upload)
 *
 * req.file shape:
 *   {
 *     fieldname     : 'avatar',
 *     originalname  : 'photo.jpg',
 *     mimetype      : 'image/jpeg',
 *     filename      : 'avatar-uuid.jpg',     ← renamed by diskStorage
 *     path          : 'uploads/avatars/avatar-uuid.jpg',
 *     size          : 204800,
 *   }
 *
 * File size and MIME errors are caught by error.middleware.js
 * (LIMIT_FILE_SIZE → 413, LIMIT_UNEXPECTED_FILE → 400).
 *
 * Install:  npm install multer uuid
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');
const { v4: uuidv4 } = require('uuid');

// ─────────────────────────────────────────────
//  UPLOAD ROOT — relative to project root
// ─────────────────────────────────────────────
const UPLOAD_ROOT = path.join(process.cwd(), 'uploads');

// ─────────────────────────────────────────────
//  STORAGE FACTORY
//
//  Creates a multer DiskStorage for a given sub-folder.
//  Files are renamed to: {prefix}-{uuid}{ext}
//  so original filenames never reach the filesystem.
// ─────────────────────────────────────────────
const makeDiskStorage = (subFolder, prefix) => {
  const destination = path.join(UPLOAD_ROOT, subFolder);

  // Ensure the directory exists at startup
  fs.mkdirSync(destination, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename:    (_req, file, cb) => {
      const ext      = path.extname(file.originalname).toLowerCase();
      const filename = `${prefix}-${uuidv4()}${ext}`;
      cb(null, filename);
    },
  });
};

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
  // MS Office formats
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
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
//  AVATAR UPLOAD
//  Destination : uploads/avatars/
//  Max size    : 2 MB
//  Allowed     : JPEG, PNG, WebP, GIF
// ─────────────────────────────────────────────
const uploadAvatar = multer({
  storage:    makeDiskStorage('avatars', 'avatar'),
  limits:     { fileSize: 2 * 1024 * 1024 },   // 2 MB
  fileFilter: makeFileFilter(IMAGE_MIMES),
});

// ─────────────────────────────────────────────
//  DOCUMENT UPLOAD
//  Destination : uploads/documents/
//  Max size    : 10 MB
//  Allowed     : PDF, JPEG, PNG, WebP, Word, Excel
// ─────────────────────────────────────────────
const uploadDocument = multer({
  storage:    makeDiskStorage('documents', 'doc'),
  limits:     { fileSize: 10 * 1024 * 1024 },   // 10 MB
  fileFilter: makeFileFilter(DOCUMENT_MIMES),
});

// ─────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────

/**
 * getRelativePath(file)
 *
 * Converts req.file.path (absolute) into a path relative to the
 * uploads/ root — this is what gets stored in the DB.
 *
 * Usage in controller:
 *   const filePath = getRelativePath(req.file);
 *   // → 'avatars/avatar-uuid.jpg'
 *   await employeeService.updateAvatar(id, filePath);
 */
const getRelativePath = (file) => {
  return path.relative(UPLOAD_ROOT, file.path).replace(/\\/g, '/');
};

/**
 * deleteFile(relativePath)
 *
 * Deletes a previously uploaded file from disk.
 * Used when replacing an avatar or a document version.
 * Fails silently if the file no longer exists.
 *
 * Usage in service:
 *   await deleteFile(employee.image);  // remove old avatar before saving new one
 */
const deleteFile = (relativePath) => {
  if (!relativePath) return;
  const absPath = path.join(UPLOAD_ROOT, relativePath);
  fs.unlink(absPath, (err) => {
    if (err && err.code !== 'ENOENT') {
      // Log but do not throw — a missing file should never crash a request
      const logger = require('./logger');
      logger.warn('Could not delete file', { path: absPath, error: err.message });
    }
  });
};

module.exports = {
  uploadAvatar,
  uploadDocument,
  getRelativePath,
  deleteFile,
  UPLOAD_ROOT,
};