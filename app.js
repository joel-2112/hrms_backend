
const express = require('express');
const app = express();
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');
const roleRoutes = require('./modules/role/routes/roleRoutes');
const authRoutes = require('./modules/role/routes/authRoutes');


// ── Body parsing ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/roles', roleRoutes);

// ── Error handling middleware ─────────────────────────────────
app.use(notFoundHandler);  
app.use(errorHandler);      


module.exports = app;