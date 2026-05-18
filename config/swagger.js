// src/config/swagger.js
'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',

    info: {
      title: 'HRMS API — Frappe HR',
      version: '1.0.0',
      description: `
        REST API for the HRMS system built on the Frappe HR module pattern.
        Covers Documents, Employees, Payroll, Leave, Expense Claims and more.
        Reference: https://frappe.io/hr
      `,
      contact: {
        name: 'HRMS Engineering',
        email: 'engineering@yourcompany.com',
      },
    },
    //the servers local and remote server url
    servers: [
      {
        // url:         'https://api.erp.teamworksc.com',
        url: 'http://localhost:3000',
        description: 'Production API',
      },
    ],

    components: {
      // ── Reusable security scheme ──────────────────────────
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Frappe HR session token — HR Manager | HR User | Employee',
        },
      },

      // ── Reusable response envelopes ───────────────────────
      // Mirrors your response.js shape exactly
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation completed successfully' },
            data: {},
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 143 },
                totalPages: { type: 'integer', example: 8 },
              },
            },
          },
        },

        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Resource not found' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'email' },
                  message: { type: 'string', example: 'must be a valid email' },
                },
              },
            },
          },
        },

        // ── Frappe HR core document schemas ─────────────────
        DocumentType: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Employment Contract' },
            category: { type: 'string', example: 'Compliance' },
            description: { type: 'string', example: 'Signed offer and contract docs' },
            isRequired: { type: 'boolean', example: true },
            allowedMimeTypes: {
              type: 'array',
              items: { type: 'string' },
              example: ['application/pdf', 'image/jpeg'],
            },
            disabled: { type: 'boolean', example: false },
          },
        },

        Document: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            documentTypeId: { type: 'string', format: 'uuid' },
            voucherType: { type: 'string', example: 'Employee' },
            voucherNo: { type: 'string', example: 'EMP-0042' },
            fileName: { type: 'string', example: 'passport-scan.pdf' },
            fileUrl: { type: 'string', example: 'https://storage.example.com/docs/passport-scan.pdf' },
            fileSize: { type: 'integer', example: 204800 },
            mimeType: { type: 'string', example: 'application/pdf' },
            description: { type: 'string', example: 'Passport copy for visa processing' },
            expiryDate: { type: 'string', format: 'date', example: '2026-12-31' },
            isPrivate: { type: 'boolean', example: true },
            status: { type: 'string', enum: ['Active', 'Expired', 'Superseded'], example: 'Active' },
            uploadedAt: { type: 'string', format: 'date-time' },
            shelfPath: { type: 'string', example: 'Passport / Employee / EMP-0042 / passport-scan.pdf (v1)' },
          },
        },

        DocumentVersion: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            documentId: { type: 'string', format: 'uuid' },
            versionNumber: { type: 'integer', example: 1 },
            fileName: { type: 'string', example: 'passport-scan-old.pdf' },
            fileUrl: { type: 'string', example: 'https://storage.example.com/docs/passport-scan-old.pdf' },
            replacedReason: { type: 'string', example: 'Passport renewed' },
            replacedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },

    // Apply bearer auth globally — every route requires it by default
    security: [{ bearerAuth: [] }],
  },

  // ── Where swagger-jsdoc scans for @swagger annotations ──
  // Add a new glob here whenever you add a new HRMS module
  apis: [
    './modules/role/routes/*.js',
    './modules/organization/routes/*.js',
    './modules/document/routes/*.js',
    './modules/recruitment/routes/*.js',
    './modules/employee/routes/*.js',
    './modules/payroll/routes/*.js',
    './modules/leave/routes/*.js',
    './modules/attendance/routes/*.js',
    './modules/performance/routes/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;