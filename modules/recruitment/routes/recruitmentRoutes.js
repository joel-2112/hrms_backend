'use strict';

const express = require('express');
const recruitmentController = require('../controllers/recruitmentController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/rbacMiddleware');

const router = express.Router();

// All recruitment routes require authentication (except public endpoints)
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Recruitment
 *     description: Recruitment management - Staffing plans, requisitions, job openings, applicants, interviews, offers
 */

// ════════════════════════════════════════════════════════════════════════════
//  STAFFING PLAN — /recruitment/staffing-plans
// ════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/staffing-plans:
 *   get:
 *     summary: Get all staffing plans
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Filter by company"
 *       - in: query
 *         name: docStatus
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *         description: "0 = Draft, 1 = Submitted/Active"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Staffing plans fetched successfully
 */
router.get(
  '/staffing-plans',
  authorize('hr', 'StaffingPlan', 'canRead'),
  recruitmentController.listStaffingPlans
);

/**
 * @swagger
 * /recruitment/staffing-plans:
 *   post:
 *     summary: Create a new staffing plan (HR/GM only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, companyId, fromDate, toDate, planDetails]
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
 *               fromDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-04-01"
 *               toDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-30"
 *               planDetails:
 *                 type: array
 *                 items:
 *                   type: object
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
 *       403:
 *         description: Access denied
 *       409:
 *         description: Staffing plan already exists
 */
router.post(
  '/staffing-plans',
  authorize('hr', 'StaffingPlan', 'canCreate'),
  recruitmentController.createStaffingPlan
);

/**
 * @swagger
 * /recruitment/staffing-plans/{id}:
 *   get:
 *     summary: Get a specific staffing plan by ID
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staffing plan fetched successfully
 *       404:
 *         description: Staffing plan not found
 */
router.get(
  '/staffing-plans/:id',
  authorize('hr', 'StaffingPlan', 'canRead'),
  recruitmentController.getStaffingPlan
);

/**
 * @swagger
 * /recruitment/staffing-plans/{id}:
 *   put:
 *     summary: Update a staffing plan (Draft only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               planDetails:
 *                 type: array
 *     responses:
 *       200:
 *         description: Staffing plan updated successfully
 *       404:
 *         description: Staffing plan not found
 */
router.put(
  '/staffing-plans/:id',
  authorize('hr', 'StaffingPlan', 'canWrite'),
  recruitmentController.updateStaffingPlan
);

/**
 * @swagger
 * /recruitment/staffing-plans/{id}/submit:
 *   put:
 *     summary: Submit staffing plan for approval (Draft → Submitted)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staffing plan submitted successfully
 *       404:
 *         description: Staffing plan not found
 */
router.put(
  '/staffing-plans/:id/submit',
  authorize('hr', 'StaffingPlan', 'canSubmit'),
  recruitmentController.submitStaffingPlan
);

/**
 * @swagger
 * /recruitment/staffing-plans/{id}/approve:
 *   put:
 *     summary: Approve staffing plan (GM only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staffing plan approved successfully
 *       403:
 *         description: GM access required
 *       404:
 *         description: Staffing plan not found
 */
router.put(
  '/staffing-plans/:id/approve',
  authorize('hr', 'StaffingPlan', 'canApprove'),
  recruitmentController.approveStaffingPlan
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
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Staffing plan cancelled successfully
 *       404:
 *         description: Staffing plan not found
 */
router.put(
  '/staffing-plans/:id/cancel',
  authorize('hr', 'StaffingPlan', 'canDelete'),
  recruitmentController.cancelStaffingPlan
);

// ════════════════════════════════════════════════════════════════════════════
//  JOB REQUISITION — /recruitment/job-requisitions
// ════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/job-requisitions:
 *   get:
 *     summary: Get all job requisitions
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: overallStatus
 *         schema:
 *           type: string
 *           enum: [Draft, Pending HR Review, HR Rejected, Pending GM Review, GM Rejected, Approved, Cancelled]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Job requisitions fetched successfully
 */
router.get(
  '/job-requisitions',
  authorize('hr', 'JobRequisition', 'canRead'),
  recruitmentController.listJobRequisitions
);

/**
 * @swagger
 * /recruitment/job-requisitions:
 *   post:
 *     summary: Create a new job requisition (Department Head)
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
 *     responses:
 *       201:
 *         description: Job requisition created successfully
 *       403:
 *         description: Access denied
 */
router.post(
  '/job-requisitions',
  authorize('hr', 'JobRequisition', 'canCreate'),
  recruitmentController.createJobRequisition
);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}:
 *   get:
 *     summary: Get a specific job requisition
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job requisition fetched successfully
 *       404:
 *         description: Job requisition not found
 */
router.get(
  '/job-requisitions/:id',
  authorize('hr', 'JobRequisition', 'canRead'),
  recruitmentController.getJobRequisition
);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}/submit:
 *   put:
 *     summary: Submit requisition for HR review
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Requisition submitted successfully
 *       404:
 *         description: Requisition not found
 */
router.put(
  '/job-requisitions/:id/submit',
  authorize('hr', 'JobRequisition', 'canSubmit'),
  recruitmentController.submitJobRequisition
);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}/approve-hr:
 *   put:
 *     summary: HR approves requisition (Level 1)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Requisition approved by HR
 *       404:
 *         description: Requisition not found
 */
router.put(
  '/job-requisitions/:id/approve-hr',
  authorize('hr', 'JobRequisition', 'canApprove'),
  recruitmentController.approveHRRequisition
);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}/reject-hr:
 *   put:
 *     summary: HR rejects requisition
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *       404:
 *         description: Requisition not found
 */
router.put(
  '/job-requisitions/:id/reject-hr',
  authorize('hr', 'JobRequisition', 'canApprove'),
  recruitmentController.rejectHRRequisition
);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}/approve-gm:
 *   put:
 *     summary: GM approves requisition (Level 2) - creates JobOpening
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Requisition approved by GM - JobOpening created
 *       404:
 *         description: Requisition not found
 */
router.put(
  '/job-requisitions/:id/approve-gm',
  authorize('hr', 'JobRequisition', 'canApprove'),
  recruitmentController.approveGMRequisition
);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}/reject-gm:
 *   put:
 *     summary: GM rejects requisition
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *       404:
 *         description: Requisition not found
 */
router.put(
  '/job-requisitions/:id/reject-gm',
  authorize('hr', 'JobRequisition', 'canApprove'),
  recruitmentController.rejectGMRequisition
);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}/cancel:
 *   put:
 *     summary: Cancel a job requisition
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *       404:
 *         description: Requisition not found
 */
router.put(
  '/job-requisitions/:id/cancel',
  authorize('hr', 'JobRequisition', 'canDelete'),
  recruitmentController.cancelJobRequisition
);

// ════════════════════════════════════════════════════════════════════════════
//  JOB OPENING — /recruitment/job-openings
// ════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/job-openings:
 *   get:
 *     summary: Get all job openings (internal)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: designationId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Open, Closed]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Job openings fetched successfully
 */
router.get(
  '/job-openings',
  authorize('hr', 'JobOpening', 'canRead'),
  recruitmentController.listJobOpenings
);

/**
 * @swagger
 * /recruitment/job-openings/public:
 *   get:
 *     summary: Get published job openings (public portal - no auth)
 *     tags: [Recruitment]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Public job openings fetched successfully
 */
router.get(
  '/job-openings/public',
  recruitmentController.listPublicJobOpenings
);

/**
 * @swagger
 * /recruitment/job-openings/{id}:
 *   get:
 *     summary: Get a specific job opening
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job opening fetched successfully
 *       404:
 *         description: Job opening not found
 */
router.get(
  '/job-openings/:id',
  authorize('hr', 'JobOpening', 'canRead'),
  recruitmentController.getJobOpening
);

/**
 * @swagger
 * /recruitment/job-openings:
 *   post:
 *     summary: Create a new job opening (HR only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobTitle, companyId]
 *             properties:
 *               jobTitle:
 *                 type: string
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               designationId:
 *                 type: string
 *                 format: uuid
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               staffingPlanId:
 *                 type: string
 *                 format: uuid
 *               plannedNumberOfPositions:
 *                 type: integer
 *                 default: 1
 *               description:
 *                 type: string
 *               expectedSalaryFrom:
 *                 type: number
 *               expectedSalaryTo:
 *                 type: number
 *     responses:
 *       201:
 *         description: Job opening created successfully
 *       403:
 *         description: Access denied
 */
router.post(
  '/job-openings',
  authorize('hr', 'JobOpening', 'canCreate'),
  recruitmentController.createJobOpening
);

/**
 * @swagger
 * /recruitment/job-openings/{id}:
 *   patch:
 *     summary: Update a job opening
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobTitle:
 *                 type: string
 *               description:
 *                 type: string
 *               expectedSalaryFrom:
 *                 type: number
 *               expectedSalaryTo:
 *                 type: number
 *     responses:
 *       200:
 *         description: Job opening updated successfully
 *       404:
 *         description: Job opening not found
 */
router.patch(
  '/job-openings/:id',
  authorize('hr', 'JobOpening', 'canWrite'),
  recruitmentController.updateJobOpening
);

/**
 * @swagger
 * /recruitment/job-openings/{id}/publish:
 *   put:
 *     summary: Publish job opening to public portal
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job opening published successfully
 *       404:
 *         description: Job opening not found
 */
router.put(
  '/job-openings/:id/publish',
  authorize('hr', 'JobOpening', 'canSubmit'),
  recruitmentController.publishJobOpening
);

/**
 * @swagger
 * /recruitment/job-openings/{id}/unpublish:
 *   put:
 *     summary: Unpublish job opening from public portal
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job opening unpublished successfully
 *       404:
 *         description: Job opening not found
 */
router.put(
  '/job-openings/:id/unpublish',
  authorize('hr', 'JobOpening', 'canSubmit'),
  recruitmentController.unpublishJobOpening
);

/**
 * @swagger
 * /recruitment/job-openings/{id}/close:
 *   put:
 *     summary: Close a job opening (no more applications)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job opening closed successfully
 *       404:
 *         description: Job opening not found
 */
router.put(
  '/job-openings/:id/close',
  authorize('hr', 'JobOpening', 'canDelete'),
  recruitmentController.closeJobOpening
);

// ════════════════════════════════════════════════════════════════════════════
//  JOB APPLICANT — /recruitment/job-applicants
// ════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/job-applicants:
 *   get:
 *     summary: Get all job applicants (HR only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobOpeningId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Open, Replied, Hold, Accepted, Rejected]
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [Website Listing, Employee Referral, Campaign, Walk In]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Job applicants fetched successfully
 */
router.get(
  '/job-applicants',
  authorize('hr', 'JobApplicant', 'canRead'),
  recruitmentController.listJobApplicants
);

/**
 * @swagger
 * /recruitment/job-applicants:
 *   post:
 *     summary: Submit job application (public - no auth)
 *     tags: [Recruitment]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: referralToken
 *         schema:
 *           type: string
 *         description: Optional referral token for employee referral
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobOpeningId, applicantName, email]
 *             properties:
 *               jobOpeningId:
 *                 type: string
 *                 format: uuid
 *               applicantName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               phone:
 *                 type: string
 *               coverLetter:
 *                 type: string
 *               resumePath:
 *                 type: string
 *               expectedSalary:
 *                 type: number
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *       409:
 *         description: Duplicate application
 */
router.post(
  '/job-applicants',
  recruitmentController.createJobApplicant
);

/**
 * @swagger
 * /recruitment/job-applicants/{id}:
 *   get:
 *     summary: Get a specific job applicant
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job applicant fetched successfully
 *       404:
 *         description: Job applicant not found
 */
router.get(
  '/job-applicants/:id',
  authorize('hr', 'JobApplicant', 'canRead'),
  recruitmentController.getJobApplicant
);

/**
 * @swagger
 * /recruitment/job-applicants/{id}/status:
 *   patch:
 *     summary: Update applicant status (HR only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Open, Replied, Hold, Accepted, Rejected]
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Applicant status updated successfully
 *       404:
 *         description: Job applicant not found
 */
router.patch(
  '/job-applicants/:id/status',
  authorize('hr', 'JobApplicant', 'canWrite'),
  recruitmentController.updateApplicantStatus
);

/**
 * @swagger
 * /recruitment/job-applicants/{id}/rate:
 *   put:
 *     summary: Rate an applicant (HR only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 5
 *     responses:
 *       200:
 *         description: Applicant rated successfully
 *       404:
 *         description: Job applicant not found
 */
router.put(
  '/job-applicants/:id/rate',
  authorize('hr', 'JobApplicant', 'canWrite'),
  recruitmentController.rateApplicant
);

// ════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE REFERRAL — /recruitment/employee-referrals
// ════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/employee-referrals:
 *   get:
 *     summary: Get employee referrals (employees see own, HR sees all)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobOpeningId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Accepted, Rejected, In Process]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Employee referrals fetched successfully
 */
router.get(
  '/employee-referrals',
  authorize('hr', 'EmployeeReferral', 'canRead'),
  recruitmentController.listEmployeeReferrals
);

/**
 * @swagger
 * /recruitment/employee-referrals/{id}:
 *   get:
 *     summary: Get a specific employee referral
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Employee referral fetched successfully
 *       404:
 *         description: Employee referral not found
 */
router.get(
  '/employee-referrals/:id',
  authorize('hr', 'EmployeeReferral', 'canRead'),
  recruitmentController.getEmployeeReferral
);

/**
 * @swagger
 * /recruitment/employee-referrals:
 *   post:
 *     summary: Create an employee referral (any employee)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobOpeningId, candidateName, candidateEmail]
 *             properties:
 *               jobOpeningId:
 *                 type: string
 *                 format: uuid
 *               candidateName:
 *                 type: string
 *               candidateEmail:
 *                 type: string
 *                 format: email
 *               candidatePhone:
 *                 type: string
 *               coverNote:
 *                 type: string
 *     responses:
 *       201:
 *         description: Referral submitted successfully
 *       403:
 *         description: Access denied
 */
router.post(
  '/employee-referrals',
  authorize('hr', 'EmployeeReferral', 'canCreate'),
  recruitmentController.createEmployeeReferral
);

/**
 * @swagger
 * /recruitment/employee-referrals/{id}/accept:
 *   put:
 *     summary: HR accepts referral (creates JobApplicant)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Referral accepted - applicant created
 *       404:
 *         description: Referral not found
 */
router.put(
  '/employee-referrals/:id/accept',
  authorize('hr', 'EmployeeReferral', 'canApprove'),
  recruitmentController.acceptEmployeeReferral
);

/**
 * @swagger
 * /recruitment/employee-referrals/{id}/reject:
 *   put:
 *     summary: HR rejects referral
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Referral rejected
 *       404:
 *         description: Referral not found
 */
router.put(
  '/employee-referrals/:id/reject',
  authorize('hr', 'EmployeeReferral', 'canApprove'),
  recruitmentController.rejectEmployeeReferral
);

/**
 * @swagger
 * /recruitment/employee-referrals/{id}/bonus-paid:
 *   put:
 *     summary: Mark referral bonus as paid (HR/Finance)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Referral bonus marked as paid
 *       404:
 *         description: Referral not found
 */
router.put(
  '/employee-referrals/:id/bonus-paid',
  authorize('hr', 'EmployeeReferral', 'canApprove'),
  recruitmentController.markReferralBonusPaid
);

// ════════════════════════════════════════════════════════════════════════════
//  INTERVIEW — /recruitment/interviews
// ════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/interviews:
 *   get:
 *     summary: Get all interviews (HR only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobApplicantId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: jobOpeningId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: interviewerId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Scheduled, Under Review, Pending, Cleared, Not Cleared, Cancelled, No Show]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Interviews fetched successfully
 */
router.get(
  '/interviews',
  authorize('hr', 'Interview', 'canRead'),
  recruitmentController.listInterviews
);

/**
 * @swagger
 * /recruitment/interviews/my:
 *   get:
 *     summary: Get interviews assigned to me (interviewer)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: My interviews fetched successfully
 */
router.get(
  '/interviews/my',
  recruitmentController.listMyInterviews
);

/**
 * @swagger
 * /recruitment/interviews:
 *   post:
 *     summary: Schedule an interview (HR only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobApplicantId, jobOpeningId, interviewerId, scheduledOn, name]
 *             properties:
 *               jobApplicantId:
 *                 type: string
 *                 format: uuid
 *               jobOpeningId:
 *                 type: string
 *                 format: uuid
 *               interviewerId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               interviewRound:
 *                 type: integer
 *                 default: 1
 *               interviewType:
 *                 type: string
 *                 enum: [One-on-One, Panel, Technical, HR, Case Study, Group Discussion, Video Call, Phone Screening]
 *                 default: One-on-One
 *               scheduledOn:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: integer
 *               location:
 *                 type: string
 *               panelMembers:
 *                 type: array
 *               skillCriteria:
 *                 type: array
 *     responses:
 *       201:
 *         description: Interview scheduled successfully
 *       403:
 *         description: Access denied
 *       409:
 *         description: Scheduling conflict
 */
router.post(
  '/interviews',
  authorize('hr', 'Interview', 'canCreate'),
  recruitmentController.createInterview
);

/**
 * @swagger
 * /recruitment/interviews/{id}:
 *   get:
 *     summary: Get a specific interview
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Interview fetched successfully
 *       404:
 *         description: Interview not found
 */
router.get(
  '/interviews/:id',
  authorize('hr', 'Interview', 'canRead'),
  recruitmentController.getInterview
);

/**
 * @swagger
 * /recruitment/interviews/{id}:
 *   patch:
 *     summary: Update an interview (reschedule, change panel, etc.)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               scheduledOn:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: integer
 *               location:
 *                 type: string
 *               panelMembers:
 *                 type: array
 *               name:
 *                 type: string
 *               interviewType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Interview updated successfully
 *       404:
 *         description: Interview not found
 */
router.patch(
  '/interviews/:id',
  authorize('hr', 'Interview', 'canWrite'),
  recruitmentController.updateInterview
);

/**
 * @swagger
 * /recruitment/interviews/{id}/cancel:
 *   put:
 *     summary: Cancel an interview
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Interview cancelled successfully
 *       404:
 *         description: Interview not found
 */
router.put(
  '/interviews/:id/cancel',
  authorize('hr', 'Interview', 'canDelete'),
  recruitmentController.cancelInterview
);

/**
 * @swagger
 * /recruitment/interviews/{id}/notify-candidate:
 *   put:
 *     summary: Mark candidate as notified
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Candidate marked as notified
 *       404:
 *         description: Interview not found
 */
router.put(
  '/interviews/:id/notify-candidate',
  authorize('hr', 'Interview', 'canWrite'),
  recruitmentController.markCandidateNotified
);

/**
 * @swagger
 * /recruitment/interviews/{id}/status:
 *   put:
 *     summary: Update interview status
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Scheduled, Under Review, Pending, Cleared, Not Cleared, Cancelled, No Show]
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Interview status updated successfully
 *       404:
 *         description: Interview not found
 */
router.put(
  '/interviews/:id/status',
  authorize('hr', 'Interview', 'canWrite'),
  recruitmentController.updateInterviewStatus
);

/**
 * @swagger
 * /recruitment/interviews/{id}/feedback:
 *   post:
 *     summary: Submit interview feedback (interviewer only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [result]
 *             properties:
 *               skillAssessments:
 *                 type: array
 *               competencyRatings:
 *                 type: array
 *               strengths:
 *                 type: string
 *               weaknesses:
 *                 type: string
 *               recommendation:
 *                 type: string
 *               result:
 *                 type: string
 *                 enum: [Cleared, Not Cleared, On Hold]
 *     responses:
 *       201:
 *         description: Interview feedback submitted successfully
 *       403:
 *         description: Not assigned as interviewer
 *       404:
 *         description: Interview not found
 */
router.post(
  '/interviews/:id/feedback',
  authorize('hr', 'InterviewFeedback', 'canCreate'),
  recruitmentController.submitInterviewFeedback
);

// ════════════════════════════════════════════════════════════════════════════
//  INTERVIEW FEEDBACK — /recruitment/interviews/{interviewId}/feedback
// ════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/interviews/{interviewId}/feedback:
 *   get:
 *     summary: Get all feedback for an interview
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: interviewId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Interview feedback fetched successfully
 *       404:
 *         description: Interview not found
 */
router.get(
  '/interviews/:interviewId/feedback',
  authorize('hr', 'InterviewFeedback', 'canRead'),
  recruitmentController.getInterviewFeedback
);

/**
 * @swagger
 * /recruitment/interview-feedback/{id}:
 *   get:
 *     summary: Get a specific interview feedback by ID
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Interview feedback fetched successfully
 *       404:
 *         description: Interview feedback not found
 */
router.get(
  '/interview-feedback/:id',
  authorize('hr', 'InterviewFeedback', 'canRead'),
  recruitmentController.getInterviewFeedbackById
);

// ════════════════════════════════════════════════════════════════════════════
//  JOB OFFER — /recruitment/job-offers
// ════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/job-offers:
 *   get:
 *     summary: Get all job offers (HR only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobOpeningId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Job offers fetched successfully
 */
router.get(
  '/job-offers',
  authorize('hr', 'JobOffer', 'canRead'),
  recruitmentController.listJobOffers
);

/**
 * @swagger
 * /recruitment/job-offers:
 *   post:
 *     summary: Create a job offer (HR only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobApplicantId, jobOpeningId, offerDate, grossSalary]
 *             properties:
 *               jobApplicantId:
 *                 type: string
 *                 format: uuid
 *               jobOpeningId:
 *                 type: string
 *                 format: uuid
 *               designationId:
 *                 type: string
 *                 format: uuid
 *               offerDate:
 *                 type: string
 *                 format: date
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               proposedJoiningDate:
 *                 type: string
 *                 format: date
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               branchId:
 *                 type: string
 *                 format: uuid
 *               employmentTypeId:
 *                 type: string
 *                 format: uuid
 *               gradeId:
 *                 type: string
 *                 format: uuid
 *               grossSalary:
 *                 type: number
 *               offerTerms:
 *                 type: array
 *               probationPeriodMonths:
 *                 type: integer
 *                 default: 3
 *     responses:
 *       201:
 *         description: Job offer created successfully
 *       403:
 *         description: Access denied
 *       409:
 *         description: Offer already exists for this applicant
 */
router.post(
  '/job-offers',
  authorize('hr', 'JobOffer', 'canCreate'),
  recruitmentController.createJobOffer
);

/**
 * @swagger
 * /recruitment/job-offers/{id}:
 *   get:
 *     summary: Get a specific job offer
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job offer fetched successfully
 *       404:
 *         description: Job offer not found
 */
router.get(
  '/job-offers/:id',
  authorize('hr', 'JobOffer', 'canRead'),
  recruitmentController.getJobOffer
);

/**
 * @swagger
 * /recruitment/job-offers/{id}:
 *   put:
 *     summary: Update a job offer
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               offerDate:
 *                 type: string
 *                 format: date
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               proposedJoiningDate:
 *                 type: string
 *                 format: date
 *               grossSalary:
 *                 type: number
 *               offerTerms:
 *                 type: array
 *     responses:
 *       200:
 *         description: Job offer updated successfully
 *       404:
 *         description: Job offer not found
 */
router.put(
  '/job-offers/:id',
  authorize('hr', 'JobOffer', 'canWrite'),
  recruitmentController.updateJobOffer
);

/**
 * @swagger
 * /recruitment/job-offers/{id}/submit:
 *   put:
 *     summary: Submit job offer for GM approval (HR only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job offer submitted for approval
 *       404:
 *         description: Job offer not found
 */
router.put(
  '/job-offers/:id/submit',
  authorize('hr', 'JobOffer', 'canSubmit'),
  recruitmentController.submitJobOfferForApproval
);

/**
 * @swagger
 * /recruitment/job-offers/{id}/approve:
 *   put:
 *     summary: Approve job offer (GM only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job offer approved
 *       403:
 *         description: GM access required
 *       404:
 *         description: Job offer not found
 */
router.put(
  '/job-offers/:id/approve',
  authorize('hr', 'JobOffer', 'canApprove'),
  recruitmentController.approveJobOffer
);

/**
 * @swagger
 * /recruitment/job-offers/{id}/reject:
 *   put:
 *     summary: Reject a job offer (HR)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [remarks]
 *             properties:
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Job offer rejected successfully
 *       404:
 *         description: Job offer not found
 */
router.put(
  '/job-offers/:id/reject',
  authorize('hr', 'JobOffer', 'canApprove'),
  recruitmentController.rejectJobOffer
);

/**
 * @swagger
 * /recruitment/job-offers/{id}/send:
 *   put:
 *     summary: Send job offer to candidate (HR only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job offer sent to candidate
 *       404:
 *         description: Job offer not found
 */
router.put(
  '/job-offers/:id/send',
  authorize('hr', 'JobOffer', 'canSubmit'),
  recruitmentController.sendJobOffer
);

/**
 * @swagger
 * /recruitment/job-offers/{id}/accept:
 *   put:
 *     summary: Candidate accepts job offer (public - no auth)
 *     tags: [Recruitment]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job offer accepted - appointment letter drafted
 *       404:
 *         description: Job offer not found
 */
router.put(
  '/job-offers/:id/accept',
  recruitmentController.acceptJobOffer
);

/**
 * @swagger
 * /recruitment/job-offers/{id}/decline:
 *   put:
 *     summary: Candidate declines job offer (public - no auth)
 *     tags: [Recruitment]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               declineReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Job offer declined
 *       404:
 *         description: Job offer not found
 */
router.put(
  '/job-offers/:id/decline',
  recruitmentController.declineJobOffer
);

/**
 * @swagger
 * /recruitment/job-offers/{id}/expire:
 *   put:
 *     summary: Expire a job offer
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Job offer expired successfully
 *       404:
 *         description: Job offer not found
 */
router.put(
  '/job-offers/:id/expire',
  authorize('hr', 'JobOffer', 'canWrite'),
  recruitmentController.expireJobOffer
);

// ════════════════════════════════════════════════════════════════════════════
//  APPOINTMENT LETTER — /recruitment/appointment-letters
// ════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/appointment-letters:
 *   get:
 *     summary: Get all appointment letters (HR only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Draft, Issued, Delivered, Acknowledged, Cancelled]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Appointment letters fetched successfully
 */
router.get(
  '/appointment-letters',
  authorize('hr', 'AppointmentLetter', 'canRead'),
  recruitmentController.listAppointmentLetters
);

/**
 * @swagger
 * /recruitment/appointment-letters/{id}:
 *   get:
 *     summary: Get a specific appointment letter
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Appointment letter fetched successfully
 *       404:
 *         description: Appointment letter not found
 */
router.get(
  '/appointment-letters/:id',
  authorize('hr', 'AppointmentLetter', 'canRead'),
  recruitmentController.getAppointmentLetter
);

/**
 * @swagger
 * /recruitment/appointment-letters/{id}/generate:
 *   post:
 *     summary: Generate appointment letter from offer
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               templateKey:
 *                 type: string
 *               signedById:
 *                 type: string
 *                 format: uuid
 *               candidateEmail:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Appointment letter generated successfully
 *       404:
 *         description: Appointment letter not found
 */
router.post(
  '/appointment-letters/:id/generate',
  authorize('hr', 'AppointmentLetter', 'canWrite'),
  recruitmentController.generateAppointmentLetter
);

/**
 * @swagger
 * /recruitment/appointment-letters/{id}/sign:
 *   put:
 *     summary: Sign appointment letter (HR/GM)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Appointment letter signed and issued
 *       404:
 *         description: Appointment letter not found
 */
router.put(
  '/appointment-letters/:id/sign',
  authorize('hr', 'AppointmentLetter', 'canApprove'),
  recruitmentController.signAppointmentLetter
);

/**
 * @swagger
 * /recruitment/appointment-letters/{id}/deliver:
 *   put:
 *     summary: Mark appointment letter as delivered (HR only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deliveryMethod:
 *                 type: string
 *                 enum: [Email, Physical, Portal, WhatsApp]
 *               deliveredOn:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Appointment letter marked as delivered
 *       404:
 *         description: Appointment letter not found
 */
router.put(
  '/appointment-letters/:id/deliver',
  authorize('hr', 'AppointmentLetter', 'canWrite'),
  recruitmentController.markLetterDelivered
);

/**
 * @swagger
 * /recruitment/appointment-letters/acknowledge/{token}:
 *   put:
 *     summary: Candidate acknowledges appointment letter (public - no auth)
 *     tags: [Recruitment]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Acknowledgement token from email
 *     responses:
 *       200:
 *         description: Appointment letter acknowledged
 *       404:
 *         description: Invalid token
 */
router.put(
  '/appointment-letters/acknowledge/:token',
  recruitmentController.acknowledgeAppointmentLetter
);

/**
 * @swagger
 * /recruitment/appointment-letters/{id}/pdf-path:
 *   put:
 *     summary: Set PDF path for appointment letter
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pdfPath]
 *             properties:
 *               pdfPath:
 *                 type: string
 *     responses:
 *       200:
 *         description: PDF path set successfully
 *       404:
 *         description: Appointment letter not found
 */
router.put(
  '/appointment-letters/:id/pdf-path',
  authorize('hr', 'AppointmentLetter', 'canWrite'),
  recruitmentController.setPdfPath
);

/**
 * @swagger
 * /recruitment/appointment-letters/{id}/cancel:
 *   put:
 *     summary: Cancel appointment letter
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Appointment letter cancelled successfully
 *       404:
 *         description: Appointment letter not found
 */
router.put(
  '/appointment-letters/:id/cancel',
  authorize('hr', 'AppointmentLetter', 'canDelete'),
  recruitmentController.cancelAppointmentLetter
);

// ════════════════════════════════════════════════════════════════════════════
//  ONBOARDING TRANSITION — /recruitment/job-applicants/{id}/convert-to-employee
// ════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/job-applicants/{id}/convert-to-employee:
 *   post:
 *     summary: Convert accepted applicant to employee (HR only)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Job applicant ID
 *     responses:
 *       201:
 *         description: Employee created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee:
 *                       type: object
 *                     user:
 *                       type: object
 *                     temporaryPassword:
 *                       type: string
 *                       description: Only returned in non-production environments
 *       409:
 *         description: Employee already exists
 *       422:
 *         description: Applicant not ready for conversion
 */
router.post(
  '/job-applicants/:id/convert-to-employee',
  authorize('hr', 'Employee', 'canCreate'),
  recruitmentController.convertToEmployee
);

module.exports = router;