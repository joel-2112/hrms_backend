
const express = require('express');
const app = express();
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');
const roleRoutes = require('./modules/role/routes/roleRoutes');
const authRoutes = require('./modules/role/routes/authRoutes');
const documentRoutes = require('./modules/document/routes/documentRoute');
const organizationRoutes = require('./modules/organization/routes/organizationRoute');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');


// ── Body parsing ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─────────────────────────────────────────────────────────────
//  SWAGGER UI
//  Mounted before your API routes so /api-docs never conflicts
//  with any resource route.
// ─────────────────────────────────────────────────────────────
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'HRMS API Docs — Frappe HR',

    // Keeps the definition collapsed on load — cleaner for large APIs
    swaggerOptions: {
      docExpansion:        'none',      // none | list | full
      defaultModelsExpandDepth: 1,      // show schemas but not deeply nested
      displayRequestDuration: true,     // shows response time on every try-it
      filter:              true,        // enables the search bar
      persistAuthorization: true,       // JWT stays filled after page refresh
    },

    // Optional: swap in your company/Frappe HR brand colours
    customCss: `
      .swagger-ui .topbar { background-color: #1a1a2e; }
      .swagger-ui .topbar-wrapper img { content: url('https://frappe.io/files/frappe-hr-logo.png'); height: 40px; }
    `,
  }),
);
// ── Serve the raw OpenAPI JSON spec (useful for Postman imports) ──
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
// ── Routes ────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/roles', roleRoutes);
app.use('/organizations', organizationRoutes);
app.use('/documents', documentRoutes);

// ── Error handling middleware ─────────────────────────────────
app.use(notFoundHandler);  
app.use(errorHandler);      


module.exports = app;