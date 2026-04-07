'use strict';

/**
 * utils/logger.js
 *
 * Structured logger built on Winston.
 * Import this everywhere instead of using console.log directly.
 *
 * Usage:
 *   const logger = require('../utils/logger');
 *   logger.info('Server started', { port: 3000 });
 *   logger.warn('Low balance', { employeeId, balance });
 *   logger.error('Payroll failed', { error: err.message, stack: err.stack });
 *
 * Log levels (low → high priority):
 *   debug < info < warn < error
 *
 * Output:
 *   development → pretty-printed colorized console output
 *   production  → JSON lines to stdout (picked up by log aggregators)
 *
 * Install:  npm install winston
 */

const { createLogger, format, transports } = require('winston');

const { combine, timestamp, errors, json, colorize, printf } = format;

const isDev = process.env.NODE_ENV === 'development';

// ─────────────────────────────────────────────
//  DEVELOPMENT FORMAT
//  Human-readable colorized output:
//  2025-07-01 08:32:11 [INFO] : Server running on port 3000
// ─────────────────────────────────────────────
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    // Print any extra metadata as compact JSON on the same line
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const stackStr = stack ? `\n${stack}` : '';
    return `${ts} [${level}] : ${message}${metaStr}${stackStr}`;
  }),
);

// ─────────────────────────────────────────────
//  PRODUCTION FORMAT
//  Structured JSON — one object per line:
//  { "level":"info", "message":"...", "timestamp":"...", "requestId":"..." }
// ─────────────────────────────────────────────
const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

// ─────────────────────────────────────────────
//  LOGGER INSTANCE
// ─────────────────────────────────────────────
const logger = createLogger({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  format: isDev ? devFormat : prodFormat,
  transports: [
    new transports.Console(),
  ],

  // Prevent Winston from exiting on uncaught errors it logs
  exitOnError: false,
});

// ─────────────────────────────────────────────
//  STREAM — for Morgan HTTP request logging
//
//  Usage in app.js:
//    const morgan  = require('morgan');
//    const logger  = require('./utils/logger');
//    app.use(morgan('combined', { stream: logger.stream }));
// ─────────────────────────────────────────────
logger.stream = {
  write: (message) => logger.http(message.trim()),
};

module.exports = logger;