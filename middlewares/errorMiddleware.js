'use strict';

const { sendError } = require('../utils/response');

class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const SEQUELIZE_ERROR_MAP = {
  SequelizeValidationError:           { status: 422 },
  SequelizeUniqueConstraintError:     { status: 409 },
  SequelizeForeignKeyConstraintError: { status: 409 },
  SequelizeDatabaseError:             { status: 400 },
  SequelizeConnectionError:           { status: 503 },
  SequelizeConnectionRefusedError:    { status: 503 },
  SequelizeConnectionTimedOutError:   { status: 503 },
  SequelizeEmptyResultError:          { status: 404 },
  SequelizeTimeoutError:              { status: 503 },
};

const extractValidationErrors = (err) =>
  (err.errors || []).map((e) => ({
    field: e.path || 'unknown',
    message: e.message || 'Invalid value',
  }));

const extractUniqueErrors = (err) => {
  if (!err.fields) return null;
  return Object.keys(err.fields).map((field) => ({
    field,
    message: `${field} already exists`,
  }));
};

const notFoundHandler = (req, res) => {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};

const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  // ═══════════════════════════════════════════════════════
  //  LOG EVERY ERROR IN DEVELOPMENT
  // ═══════════════════════════════════════════════════════
  if (isDev) {
    console.error('\n══════════════════════════════════════════');
    console.error('[ERROR]', err.name || 'UnknownError');
    console.error('Message:', err.message);
    console.error('Status:', err.statusCode || err.status || 500);
    console.error('URL:', req.method, req.originalUrl);
    console.error('User:', req.user?.id || 'anonymous');
    if (err.errors) console.error('Details:', JSON.stringify(err.errors, null, 2));
    if (err.original) console.error('Original:', err.original.message);
    if (err.sql) console.error('SQL:', err.sql);
    if (err.fields) console.error('Fields:', JSON.stringify(err.fields, null, 2));
    if (err.table) console.error('Table:', err.table);
    console.error('Stack:', err.stack);
    console.error('══════════════════════════════════════════\n');
  }

  // ── 1. AppError ────────────────────────────────────────────
  if (err.isOperational && err.name === 'AppError') {
    return sendError(res, err.message, err.statusCode, err.errors, isDev ? err.stack : null);
  }

  // ── 2. Sequelize errors ────────────────────────────────────
  const seqMeta = SEQUELIZE_ERROR_MAP[err.name];
  if (seqMeta) {
    let errors = null;
    let message = err.original?.message || err.message || 'Database error';

    if (err.name === 'SequelizeValidationError') {
      errors = extractValidationErrors(err);
    } else if (err.name === 'SequelizeUniqueConstraintError') {
      errors = extractUniqueErrors(err);
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
      message = `Related resource does not exist${err.table ? ` (table: ${err.table})` : ''}`;
    }

    return sendError(res, isDev ? message : 'A database error occurred', seqMeta.status, errors, isDev ? err.stack : null);
  }

  // ── 3. JWT errors ──────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, isDev ? err.message : 'Invalid or malformed token', 401, null, isDev ? err.stack : null);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, isDev ? err.message : 'Token has expired — please log in again', 401, null, isDev ? err.stack : null);
  }
  if (err.name === 'NotBeforeError') {
    return sendError(res, isDev ? err.message : 'Token is not yet valid', 401, null, isDev ? err.stack : null);
  }

  // ── 4. Multer errors ───────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, err.message || 'File is too large', 413, null, isDev ? err.stack : null);
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return sendError(res, err.message || 'Unexpected file field', 400, null, isDev ? err.stack : null);
  }

  // ── 5. Syntax errors ──────────────────────────────────────
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, err.message || 'Malformed JSON in request body', 400, null, isDev ? err.stack : null);
  }

  // ── 6. Unknown errors ─────────────────────────────────────
  return sendError(
    res,
    isDev ? err.message : 'An unexpected error occurred',
    err.statusCode || 500,
    null,
    isDev ? err.stack : null,
  );
};

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler,
};