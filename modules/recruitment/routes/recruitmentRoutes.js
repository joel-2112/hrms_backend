'use strict';

/**
 * modules/recruitment/routes/recruitmentRoutes.js
 *
 * Base path (mounted in app.js):
 *   app.use('/api/recruitment', recruitmentRoutes);
 *
 * All routes require a valid JWT + role permission.
 */

const express                  = require('express');
const recruitmentController                        = require('../controllers/recruitmentController');
const { authenticate }         = require('../../../middlewares/authMiddleware');
const { authorize }            = require('../../../middlewares/rbacMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Recruitment
 *     description: Core recruitment module — staffing plans and job requisitions with approval workflow
 */

// ─────────────────────────────────────────────
//  ALL ROUTES REQUIRE AUTHENTICATION
// ─────────────────────────────────────────────
router.use(authenticate);


// ══════════════════════════════════════════════
//  STAFFING PLAN  —  /recruitment/staffing-plans
// ══════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/staffing-plans:
 *   get:
 *     summary: List staffing plans
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema: { type: string, format: uuid }
 *         description: Filter by company
 *       - in: query
 *         name: docStatus
 *         schema: { type: integer, enum: [0, 1, 2] }
 *         description: "0 = Draft, 1 = Active, 2 = Cancelled"
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Staffing plans fetched successfully
 *   post:
 *     summary: Create a new staffing plan (HR / GM)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, companyId, fromDate, toDate]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Engineering Hiring Plan Q2 2026"
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *                 description: "Null = company-wide plan"
 *               fromDate:
 *                 type: string
 *                 format: date
 *               toDate:
 *                 type: string
 *                 format: date
 *               planDetails:
 *                 type: array
 *                 description: "Headcount targets per designation"
 *                 items:
 *                   type: object
 *                   required: [designationId, numberOfPositions]
 *                   properties:
 *                     designationId:
 *                       type: string
 *                       format: uuid
 *                     numberOfPositions:
 *                       type: integer
 *                     estimatedCostPerPosition:
 *                       type: number
 *     responses:
 *       201:
 *         description: Staffing plan created successfully
 *       422:
 *         description: Validation error — missing required fields or invalid dates
 */
router
  .route('/staffing-plans')
  .get(authorize('recruitment', 'StaffingPlan', 'canRead'),   recruitmentController.listStaffingPlans)
  .post(authorize('recruitment', 'StaffingPlan', 'canCreate'),recruitmentController.createStaffingPlan);

/**
 * @swagger
 * /recruitment/staffing-plans/{id}:
 *   get:
 *     summary: Get a staffing plan by ID
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Staffing plan fetched successfully
 *       404:
 *         description: Staffing plan not found
 *   put:
 *     summary: Update a draft staffing plan
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               fromDate:
 *                 type: string
 *                 format: date
 *               toDate:
 *                 type: string
 *                 format: date
 *               planDetails:
 *                 type: array
 *     responses:
 *       200:
 *         description: Staffing plan updated successfully
 *       422:
 *         description: Only Draft staffing plans can be edited
 */
router
  .route('/staffing-plans/:id')
  .get(authorize('recruitment', 'StaffingPlan', 'canRead'),recruitmentController.getStaffingPlan)
  .put(authorize('recruitment', 'StaffingPlan', 'canWrite'),recruitmentController.updateStaffingPlan);

/**
 * @swagger
 * /recruitment/staffing-plans/{id}/submit:
 *   put:
 *     summary: Submit a draft staffing plan to make it active
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Staffing plan submitted and active
 *       422:
 *         description: Only Draft plans can be submitted
 */
router.put(
  '/staffing-plans/:id/submit',
  authorize('recruitment', 'StaffingPlan', 'canSubmit'),
 recruitmentController.submitStaffingPlan,
);

/**
 * @swagger
 * /recruitment/staffing-plans/{id}/cancel:
 *   put:
 *     summary: Cancel a staffing plan
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Staffing plan cancelled successfully
 *       422:
 *         description: Plan is already cancelled
 */
router.put(
  '/staffing-plans/:id/cancel',
  authorize('recruitment', 'StaffingPlan', 'canWrite'),
 recruitmentController.cancelStaffingPlan,
);

/**
 * @swagger
 * /recruitment/staffing-snapshot:
 *   get:
 *     summary: Get real-time staffing snapshot for a designation (budget check)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: designationId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: departmentId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Staffing snapshot fetched successfully
 *       422:
 *         description: designationId and companyId are required
 */
router.get(
  '/staffing-snapshot',
  authorize('recruitment', 'JobRequisition', 'canCreate'),
 recruitmentController.getStaffingSnapshot,
);


// ══════════════════════════════════════════════
//  JOB REQUISITION  —  /recruitment/job-requisitions
// ══════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/job-requisitions:
 *   get:
 *     summary: List job requisitions
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: departmentId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: overallStatus
 *         schema:
 *           type: string
 *           enum: [Draft, Pending HR Review, HR Rejected, Pending GM Review, GM Rejected, Approved, Cancelled]
 *       - in: query
 *         name: requestedById
 *         schema: { type: string, format: uuid }
 *         description: "Filter by the requesting employee — Department Heads see only their own"
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Job requisitions fetched successfully
 *   post:
 *     summary: Department Head creates a new hiring requisition
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [departmentId, designationId, companyId, reasonForHiring]
 *             properties:
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               designationId:
 *                 type: string
 *                 format: uuid
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               employmentTypeId:
 *                 type: string
 *                 format: uuid
 *               numberOfPositions:
 *                 type: integer
 *                 default: 1
 *               replacementFor:
 *                 type: string
 *                 description: "Name of departing employee (if replacement hire)"
 *               isNewPosition:
 *                 type: boolean
 *                 default: false
 *               reasonForHiring:
 *                 type: string
 *               proposedSalaryMin:
 *                 type: number
 *               proposedSalaryMax:
 *                 type: number
 *               targetHireDate:
 *                 type: string
 *                 format: date
 *               currency:
 *                 type: string
 *                 default: ETB
 *     responses:
 *       201:
 *         description: Job requisition created as Draft
 *       422:
 *         description: Missing required fields
 */
router
  .route('/job-requisitions')
  .get(authorize('recruitment', 'JobRequisition', 'canRead'),  recruitmentController.listJobRequisitions)
  .post(authorize('recruitment', 'JobRequisition', 'canCreate'),recruitmentController.createJobRequisition);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}:
 *   get:
 *     summary: Get a job requisition by ID
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Job requisition fetched successfully
 *       404:
 *         description: Job requisition not found
 */
router
  .route('/job-requisitions/:id')
  .get(authorize('recruitment', 'JobRequisition', 'canRead'),recruitmentController.getJobRequisition);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}/submit:
 *   put:
 *     summary: Department Head submits a Draft requisition to HR for Level 1 review
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Requisition submitted — status changed to Pending HR Review
 *       403:
 *         description: Only the creator can submit this requisition
 *       422:
 *         description: Only Draft requisitions can be submitted
 */
router.put(
  '/job-requisitions/:id/submit',
  authorize('recruitment', 'JobRequisition', 'canSubmit'),
 recruitmentController.submitJobRequisition,
);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}/approve-hr:
 *   put:
 *     summary: HR Manager approves requisition at Level 1 — escalates to GM
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Requisition approved by HR — now Pending GM Review
 *       422:
 *         description: Requisition is not pending HR review
 */
router.put(
  '/job-requisitions/:id/approve-hr',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
 recruitmentController.approveHRRequisition,
);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}/reject-hr:
 *   put:
 *     summary: HR Manager rejects requisition at Level 1
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Requisition rejected by HR
 *       422:
 *         description: reason is required / requisition not pending HR review
 */
router.put(
  '/job-requisitions/:id/reject-hr',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
 recruitmentController.rejectHRRequisition,
);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}/approve-gm:
 *   put:
 *     summary: GM approves requisition at Level 2 — final approval
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Requisition approved by GM
 *       422:
 *         description: Requisition is not pending GM review
 */
router.put(
  '/job-requisitions/:id/approve-gm',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
 recruitmentController.approveGMRequisition,
);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}/reject-gm:
 *   put:
 *     summary: GM rejects requisition at Level 2
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Requisition rejected by GM
 *       422:
 *         description: reason is required / requisition not pending GM review
 */
router.put(
  '/job-requisitions/:id/reject-gm',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
 recruitmentController.rejectGMRequisition,
);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}/cancel:
 *   put:
 *     summary: Cancel a requisition (before approval)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Job requisition cancelled successfully
 *       422:
 *         description: Approved requisition cannot be cancelled
 */
router.put(
  '/job-requisitions/:id/cancel',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
 recruitmentController.cancelJobRequisition,
);

module.exports = router;