const express = require('express');
const cors = require('cors');
const app = express();
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');
const roleRoutes = require('./modules/role/routes/roleRoutes');
const authRoutes = require('./modules/role/routes/authRoutes');
const documentRoutes = require('./modules/document/routes/documentRoute');
const organizationRoutes = require('./modules/organization/routes/organizationRoute');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// ── CORS Configuration ──────────────────────────────────────────────
app.use(cors({
    origin: ['https://erp.teamworksc.com', 'http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── SWAGGER UI ─────────────────────────────────────────────
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'HRMS API Docs — Frappe HR',
    swaggerOptions: {
      docExpansion: 'none',
      defaultModelsExpandDepth: 1,
      displayRequestDuration: true,
      filter: true,
      persistAuthorization: true,
    },
  }),
);

app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.get('/', (req, res) => {
  res.send('Welcome to the HRMS API');
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