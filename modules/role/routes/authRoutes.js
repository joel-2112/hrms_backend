'use strict';

const router = require('express').Router();
const authController = require('../controllers/authController');
const { authenticate, requireSuperUser } = require('../../../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication — register, login, session management, and password
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new HRMS user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Aisha
 *               middleName:
 *                 type: string
 *                 example: null
 *               lastName:
 *                 type: string
 *                 example: Mensah
 *               email:
 *                 type: string
 *                 format: email
 *                 example: aisha.mensah@company.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPass@123
 *               roleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["123e4567-e89b-12d3-a456-426614174000"]
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:        { type: string, format: uuid }
 *                         firstName: { type: string, example: Aisha }
 *                         middleName: { type: string, example: null }
 *                         lastName:  { type: string, example: Mensah }
 *                         email:     { type: string, example: aisha.mensah@company.com }
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/register', authController.register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login and receive a JWT token (set as HTTP-only cookie)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: aisha.mensah@company.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: StrongPass@123
 *     responses:
 *       200:
 *         description: Login successful — token set in HTTP-only cookie
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         user:
 *                           type: object
 *                           properties:
 *                             id:        { type: string, format: uuid }
 *                             firstName: { type: string, example: Aisha }
 *                             lastName:  { type: string, example: Mensah }
 *                             email:     { type: string, example: aisha.mensah@company.com }
 *                         session:
 *                           type: object
 *                           properties:
 *                             id:         { type: string, format: uuid }
 *                             expiresAt:  { type: string, format: date-time }
 *                             deviceInfo:
 *                               type: object
 *                               properties:
 *                                 ip:        { type: string, example: 192.168.1.1 }
 *                                 userAgent: { type: string, example: Mozilla/5.0... }
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Too many failed login attempts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout and clear session cookie
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: allDevices
 *         schema:
 *           type: boolean
 *         description: Set to 'true' to terminate all active sessions
 *     responses:
 *       204:
 *         description: Logout successful
 *       401:
 *         description: Not authenticated
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get the currently authenticated user with current session info
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current session user returned
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         id:             { type: string, format: uuid }
 *                         firstName:      { type: string, example: Aisha }
 *                         lastName:       { type: string, example: Mensah }
 *                         email:          { type: string, example: aisha.mensah@company.com }
 *                         currentSession:
 *                           type: object
 *                           properties:
 *                             id:         { type: string, format: uuid }
 *                             ipAddress:  { type: string, example: 192.168.1.1 }
 *                             userAgent:  { type: string, example: Mozilla/5.0... }
 *                             lastActivityAt: { type: string, format: date-time }
 *                             expiresAt:  { type: string, format: date-time }
 *       401:
 *         description: Missing or invalid token
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @swagger
 * /auth/me/sessions:
 *   get:
 *     summary: Get all active sessions for the authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active sessions
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:             { type: string, format: uuid }
 *                           ipAddress:      { type: string, example: 192.168.1.1 }
 *                           userAgent:      { type: string, example: Mozilla/5.0... }
 *                           lastActivityAt: { type: string, format: date-time }
 *                           createdAt:      { type: string, format: date-time }
 *                           expiresAt:      { type: string, format: date-time }
 *       401:
 *         description: Not authenticated
 */
router.get('/me/sessions', authenticate, authController.getMySessions);

/**
 * @swagger
 * /auth/me/sessions/{sessionId}:
 *   delete:
 *     summary: Terminate a specific active session (cannot terminate current)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The session ID to terminate
 *     responses:
 *       204:
 *         description: Session terminated successfully
 *       400:
 *         description: Cannot terminate current session
 *       404:
 *         description: Session not found
 *       401:
 *         description: Not authenticated
 */
router.delete('/me/sessions/:sessionId', authenticate, authController.terminateMySession);

/**
 * @swagger
 * /auth/change-password:
 *   patch:
 *     summary: Change password for the authenticated user (terminates other sessions)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: StrongPass@123
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: NewerPass@456
 *               terminateAllDevices:
 *                 type: boolean
 *                 default: true
 *                 description: If true, terminates all other active sessions
 *     responses:
 *       204:
 *         description: Password changed successfully
 *       401:
 *         description: Current password is incorrect
 *       422:
 *         description: New password does not meet requirements
 */
router.patch('/change-password', authenticate, authController.changePassword);

// ═══════════════════════════════════════════════════════════════
//  ADMIN ROUTES (require SuperUser)
// ═══════════════════════════════════════════════════════════════

/**
 * @swagger
 * /auth/admin/sessions:
 *   get:
 *     summary: ADMIN - Get all active sessions system-wide
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: List of all active sessions with user details
 *       403:
 *         description: SuperUser access required
 */
router.get('/admin/sessions', authenticate, requireSuperUser, authController.getAllActiveSessions);

/**
 * @swagger
 * /auth/admin/users/{userId}/sessions:
 *   delete:
 *     summary: ADMIN - Force logout a user (terminate all their sessions)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: User force logged out
 *       403:
 *         description: SuperUser access required
 *       404:
 *         description: User not found
 */
router.delete('/admin/users/:userId/sessions', authenticate, requireSuperUser, authController.forceLogoutUser);

module.exports = router;