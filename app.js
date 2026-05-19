const express = require('express');
const cors = require('cors');
const app = express();
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');
const roleRoutes = require('./modules/role/routes/roleRoutes');
const authRoutes = require('./modules/role/routes/authRoutes');
const documentRoutes = require('./modules/document/routes/documentRoute');
const organizationRoutes = require('./modules/organization/routes/organizationRoute');
const recruitmentRoutes = require('./modules/recruitment/routes/recruitmentRoutes');
const employeeRoutes = require('./modules/employee/routes/employeeRoutes');
const leaveRoutes = require('./modules/leave/routes/leaveRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

// ── CORS Configuration ──────────────────────────────────────────────
app.use(cors({
    origin: ['https://client.erp.eyuelkassahun.com', 'http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080',],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());

// ── Body parsing — skip multipart (let multer handle it) ────────────
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return next(); // Let multer handle this
  }
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/recruitment', recruitmentRoutes);
app.use('/employees', employeeRoutes);
app.use('/leaves', leaveRoutes);

// ── Error handling middleware ─────────────────────────────────
app.use(notFoundHandler);  
app.use(errorHandler);

module.exports = app;