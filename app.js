
const express = require('express');
const app = express();
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────
const roleRoutes = require('./modules/role/roleRoute');

app.use('/roles', roleRoutes);

// ── Error handling middleware ─────────────────────────────────
app.use(notFoundHandler);  
app.use(errorHandler);      


module.exports = app;