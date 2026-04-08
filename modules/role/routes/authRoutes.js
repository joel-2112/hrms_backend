'use strict';

const router         = require('express').Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../../../middlewares/authMiddleware');

// ── Public ────────────────────────────────────
router.post('/register',       authController.register);
router.post('/login',          authController.login);

// ── Protected ─────────────────────────────────
router.get('/me',              authenticate, authController.getMe);
router.patch('/change-password', authenticate, authController.changePassword);

module.exports = router;