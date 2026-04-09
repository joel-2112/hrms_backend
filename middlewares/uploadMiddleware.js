'use strict';

/**
 * middlewares/upload.middleware.js
 *
 * Multer upload configurations for every file upload in the system.
 * Each upload type (avatar, document) has its own pre-configured middleware
 * with its own destination folder, size limit, and MIME type whitelist.
 *
 * DYNAMIC DOCUMENT STORAGE:
 * Documents are stored in a shelf-mirroring directory structure:
 *   uploads/documents/{voucherType}/{documentTypeId}/{filename}
 * 
 * Example:
 *   uploads/documents/Employee/550e8400-e29b-41d4-a716-446655440000/doc-abc123.pdf
 *   uploads/documents/SalarySlip/550e8400-e29b-41d4-a716-446655440001/slip-xyz789.pdf
 *
 * This mirrors the logical shelf structure from the database.
 *
 * Usage in routes:
 *
 *   const { uploadDocument, uploadAvatar } = require('../../middlewares/upload.middleware');
 *
 *   // Dynamic document upload (shelf-based)
 *   router.post('/documents',
 *     authenticate,
 *     uploadDocument.single('file'),
 *     documentController.attachDocument,
 *   );
 *
 *   // Avatar upload
 *   router.put('/employees/:id/avatar',
 *     authenticate,
 *     uploadAvatar.single('avatar'),
 *     employeeController.updateAvatar,
 *   );
 *
 * After middleware runs, the uploaded file is available as:
 *   req.file          (single upload)
 *   req.files         (array upload)
 *
 * req.file shape:
 *   {
 *     fieldname     : 'file',
 *     originalname  : 'passport.pdf',
 *     mimetype      : 'application/pdf',
 *     filename      : 'doc-uuid.pdf',
 *     path          : 'uploads/documents/Employee/550e.../doc-uuid.pdf',
 *     size          : 1048576,
 *     shelfPath     : 'Employee/550e8400-e29b-41d4-a716-446655440000',  // added by middleware
 *   }
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
//  DYNAMIC STORAGE FOR DOCUMENTS
//  Creates folder structure based on request body:
//    uploads/documents/{voucherType}/{documentTypeId}/
//  
//  This mirrors the logical shelf organization:
//    - voucherType: Employee, SalarySlip, ExpenseClaim, etc.
//    - documentTypeId: UUID of the document type (shelf)
//  
//  The folder structure makes physical files match the logical
//  document organization, making backups and audits much easier.
// ─────────────────────────────────────────────
const createDocumentStorage = () => {
  return multer.diskStorage({
    destination: (req, _file, cb) => {
      const { voucherType, documentTypeId } = req.body;
      
      // Validate required fields for document upload
      if (!voucherType || !documentTypeId) {
        const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'destination');
        error.message = 'voucherType and documentTypeId are required to determine upload destination';
        return cb(error);
      }

      // Sanitize folder names (remove path traversal attempts)
      const sanitizedVoucherType = voucherType.replace(/[^a-zA-Z0-9_-]/g, '');
      const sanitizedDocumentTypeId = documentTypeId.replace(/[^a-zA-Z0-9_-]/g, '');
      
      // Build dynamic destination path: uploads/documents/{voucherType}/{documentTypeId}/
      const destination = path.join(
        UPLOAD_ROOT,
        'documents',
        sanitizedVoucherType,
        sanitizedDocumentTypeId
      );

      // Ensure the directory exists (recursive: true creates all parent folders)
      fs.mkdirSync(destination, { recursive: true });
      
      // Store the shelf path on req for later use
      req.documentShelfPath = path.join(sanitizedVoucherType, sanitizedDocumentTypeId);
      
      cb(null, destination);
    },
    
    filename: (_req, file, cb) => {
      // Generate unique filename: {prefix}-{uuid}{ext}
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `doc-${uuidv4()}${ext}`;
      cb(null, filename);
    },
  });
};

// ─────────────────────────────────────────────
//  STATIC STORAGE FOR AVATARS
//  Simple flat folder structure:
//    uploads/avatars/
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
//  TEMPORARY STORAGE (for processing before moving)
//  Used when you need to validate files before deciding final location
// ─────────────────────────────────────────────
const createTempStorage = () => {
  const destination = path.join(UPLOAD_ROOT, 'temp');
  fs.mkdirSync(destination, { recursive: true });
  
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, destination),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `temp-${Date.now()}-${uuidv4()}${ext}`;
      cb(null, filename);
    },
  });
};

// ─────────────────────────────────────────────
//  EXPORTED MULTER INSTANCES
// ─────────────────────────────────────────────

/**
 * Document Upload Middleware
 * - Dynamic folder structure based on voucherType + documentTypeId
 * - Max size: 10 MB
 * - Allowed: PDF, Images, Office docs
 * 
 * Usage in routes that have voucherType and documentTypeId in req.body
 */
const uploadDocument = multer({
  storage: createDocumentStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },   // 10 MB
  fileFilter: makeFileFilter(DOCUMENT_MIMES),
});

/**
 * Avatar Upload Middleware
 * - Static folder: uploads/avatars/
 * - Max size: 2 MB
 * - Allowed: JPEG, PNG, WebP, GIF
 */
const uploadAvatar = multer({
  storage: createAvatarStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },    // 2 MB
  fileFilter: makeFileFilter(IMAGE_MIMES),
});

/**
 * Temporary Upload Middleware
 * - Static folder: uploads/temp/
 * - Max size: 10 MB
 * - Use for multi-step uploads (validate then move to final location)
 */
const uploadTemp = multer({
  storage: createTempStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },   // 10 MB
  fileFilter: makeFileFilter(DOCUMENT_MIMES),
});

// ─────────────────────────────────────────────
//  HELPER FUNCTIONS
// ─────────────────────────────────────────────

/**
 * getRelativePath(file)
 * 
 * Converts req.file.path (absolute) into a path relative to the
 * uploads/ root — this is what gets stored in the DB.
 * 
 * Usage in controller:
 *   const filePath = getRelativePath(req.file);
 *   // → 'documents/Employee/550e8400.../doc-uuid.pdf'
 *   await documentService.attachDocument({ filePath, ...otherData });
 */
const getRelativePath = (file) => {
  if (!file || !file.path) return null;
  return path.relative(UPLOAD_ROOT, file.path).replace(/\\/g, '/');
};

/**
 * getFullPath(relativePath)
 * 
 * Converts a relative path from DB back to absolute filesystem path.
 * 
 * Usage:
 *   const fullPath = getFullPath(document.fileUrl);
 *   fs.readFile(fullPath, ...)
 */
const getFullPath = (relativePath) => {
  if (!relativePath) return null;
  return path.join(UPLOAD_ROOT, relativePath);
};

/**
 * deleteFile(relativePath)
 * 
 * Deletes a previously uploaded file from disk.
 * Used when replacing a document or avatar.
 * Fails silently if the file no longer exists.
 * 
 * Usage in service:
 *   await deleteFile(oldDocument.fileUrl);
 *   await deleteFile(employee.avatarUrl);
 */
const deleteFile = async (relativePath) => {
  if (!relativePath) return false;
  
  const absPath = path.join(UPLOAD_ROOT, relativePath);
  
  try {
    await fs.promises.unlink(absPath);
    return true;
  } catch (err) {
    if (err.code !== 'ENOENT') {
      // Log but do not throw — a missing file should never crash a request
      const logger = require('./logger');
      logger.warn('Could not delete file', { path: absPath, error: err.message });
    }
    return false;
  }
};

/**
 * moveFileToShelf(tempRelativePath, voucherType, documentTypeId, newFilename)
 * 
 * Moves a file from temp folder to its permanent shelf location.
 * Used when you need to process/validate a file before deciding its final location.
 * 
 * Usage:
 *   const finalPath = await moveFileToShelf(
 *     'temp/temp-123.pdf',
 *     'Employee',
 *     '550e8400-e29b-41d4-a716-446655440000',
 *     'final-doc.pdf'
 *   );
 */
const moveFileToShelf = async (tempRelativePath, voucherType, documentTypeId, customFilename = null) => {
  const tempPath = getFullPath(tempRelativePath);
  if (!tempPath) throw new Error('Temp file path is invalid');
  
  // Check if temp file exists
  if (!fs.existsSync(tempPath)) {
    throw new Error(`Temp file not found: ${tempRelativePath}`);
  }
  
  // Sanitize folder names
  const sanitizedVoucherType = voucherType.replace(/[^a-zA-Z0-9_-]/g, '');
  const sanitizedDocumentTypeId = documentTypeId.replace(/[^a-zA-Z0-9_-]/g, '');
  
  // Create destination folder
  const destinationDir = path.join(UPLOAD_ROOT, 'documents', sanitizedVoucherType, sanitizedDocumentTypeId);
  fs.mkdirSync(destinationDir, { recursive: true });
  
  // Generate final filename
  const ext = path.extname(tempPath);
  const finalFilename = customFilename || `doc-${uuidv4()}${ext}`;
  const finalPath = path.join(destinationDir, finalFilename);
  
  // Move file
  await fs.promises.rename(tempPath, finalPath);
  
  // Return relative path for DB storage
  return path.relative(UPLOAD_ROOT, finalPath).replace(/\\/g, '/');
};

/**
 * getDirectorySize(relativePath)
 * 
 * Calculate total size of a directory (useful for quota management)
 * 
 * Usage:
 *   const size = await getDirectorySize('documents/Employee');
 */
const getDirectorySize = async (relativePath) => {
  const absPath = getFullPath(relativePath);
  if (!absPath || !fs.existsSync(absPath)) return 0;
  
  let totalSize = 0;
  const files = await fs.promises.readdir(absPath, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = path.join(absPath, file.name);
    if (file.isDirectory()) {
      totalSize += await getDirectorySize(path.join(relativePath, file.name));
    } else {
      const stats = await fs.promises.stat(filePath);
      totalSize += stats.size;
    }
  }
  
  return totalSize;
};

/**
 * cleanupEmptyFolders(relativePath)
 * 
 * Recursively remove empty folders (useful after deleting files)
 * 
 * Usage:
 *   await cleanupEmptyFolders('documents/Employee/550e8400...');
 */
const cleanupEmptyFolders = async (relativePath) => {
  const absPath = getFullPath(relativePath);
  if (!absPath || !fs.existsSync(absPath)) return;
  
  const files = await fs.promises.readdir(absPath);
  
  if (files.length === 0) {
    await fs.promises.rmdir(absPath);
    // Try to clean parent folder as well
    const parentPath = path.dirname(relativePath);
    if (parentPath !== 'documents' && parentPath !== 'uploads') {
      await cleanupEmptyFolders(parentPath);
    }
  }
};

// ─────────────────────────────────────────────
//  EXPORTS
// ─────────────────────────────────────────────
module.exports = {
  // Multer instances
  uploadDocument,
  uploadAvatar,
  uploadTemp,
  
  // Helper functions
  getRelativePath,
  getFullPath,
  deleteFile,
  moveFileToShelf,
  getDirectorySize,
  cleanupEmptyFolders,
  
  // Constants
  UPLOAD_ROOT,
};