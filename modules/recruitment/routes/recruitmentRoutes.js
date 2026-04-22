'use strict';

/**
 * modules/recruitment/routes/recruitmentRoutes.js
 *
 * Base path (mounted in app.js):
 *   app.use('/api/recruitment', recruitmentRoutes);
 *
 * Public routes (no authenticate):
 *   GET  /job-openings/public
 *   POST /job-applicants
 *   PUT  /appointment-letters/acknowledge/:token
 *
 * All other routes require a valid JWT + role permission.
 */

const express                  = require('express');
const c                        = require('../controllers/recruitmentController');
const { authenticate }         = require('../../../middlewares/authMiddleware');
const { authorize }            = require('../../../middlewares/rbacMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Recruitment
 *     description: End-to-end hiring pipeline — staffing plans through employee onboarding
 */

// ─────────────────────────────────────────────
//  PUBLIC ROUTES  (no JWT required)
//  Must be declared BEFORE router.use(authenticate)
// ─────────────────────────────────────────────

/**
 * @swagger
 * /recruitment/job-openings/public:
 *   get:
 *     summary: List all published job openings (public job portal)
 *     tags: [Recruitment]
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema: { type: string, format: uuid }
 *         description: Filter by company
 *       - in: query
 *         name: departmentId
 *         schema: { type: string, format: uuid }
 *         description: Filter by department
 *       - in: query
 *         name: designationId
 *         schema: { type: string, format: uuid }
 *         description: Filter by designation / job title
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Published job openings fetched successfully
 */
router.get('/job-openings/public', c.listPublicJobOpenings);

/**
 * @swagger
 * /recruitment/job-applicants:
 *   post:
 *     summary: Submit a job application (public — no login required)
 *     tags: [Recruitment]
 *     parameters:
 *       - in: query
 *         name: referralToken
 *         schema: { type: string, format: uuid }
 *         description: "EmployeeReferral ID embedded in a referral link — auto-links source"
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
 *               linkedinUrl:
 *                 type: string
 *               currentSalary:
 *                 type: number
 *               expectedSalary:
 *                 type: number
 *     responses:
 *       201:
 *         description: Application submitted successfully
 *       409:
 *         description: Application from this email already exists for this opening
 *       422:
 *         description: Job opening is closed or not published
 */
router.post('/job-applicants', c.createJobApplicant);

/**
 * @swagger
 * /recruitment/appointment-letters/acknowledge/{token}:
 *   put:
 *     summary: Candidate acknowledges their appointment letter via one-time portal token
 *     tags: [Recruitment]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema: { type: string }
 *         description: Unique token embedded in the candidate's email link
 *     responses:
 *       200:
 *         description: Appointment letter acknowledged successfully
 *       404:
 *         description: Invalid or expired token
 *       409:
 *         description: Letter already acknowledged
 */
router.put('/appointment-letters/acknowledge/:token', c.acknowledgeAppointmentLetter);

// ─────────────────────────────────────────────
//  ALL ROUTES BELOW REQUIRE AUTHENTICATION
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
 *         description: "0 = Draft, 1 = Submitted/Active, 2 = Cancelled"
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
  .get(authorize('recruitment', 'StaffingPlan', 'canRead'),   c.listStaffingPlans)
  .post(authorize('recruitment', 'StaffingPlan', 'canCreate'), c.createStaffingPlan);

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
 */
router
  .route('/staffing-plans/:id')
  .get(authorize('recruitment', 'StaffingPlan', 'canRead'), c.getStaffingPlan);

/**
 * @swagger
 * /recruitment/staffing-plans/{id}/submit:
 *   put:
 *     summary: Submit a draft staffing plan for GM approval
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
 *         description: Staffing plan submitted successfully
 *       422:
 *         description: Only Draft plans can be submitted
 */
router.put(
  '/staffing-plans/:id/submit',
  authorize('recruitment', 'StaffingPlan', 'canSubmit'),
  c.submitStaffingPlan,
);

/**
 * @swagger
 * /recruitment/staffing-plans/{id}/approve:
 *   put:
 *     summary: GM approves a submitted staffing plan — makes it active
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
 *         description: Staffing plan approved and active
 *       422:
 *         description: Only submitted plans can be approved
 */
router.put(
  '/staffing-plans/:id/approve',
  authorize('recruitment', 'StaffingPlan', 'canSubmit'),
  c.approveStaffingPlan,
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
 *                 default: KES
 *     responses:
 *       201:
 *         description: Job requisition created as Draft
 *       422:
 *         description: Missing required fields
 */
router
  .route('/job-requisitions')
  .get(authorize('recruitment', 'JobRequisition', 'canRead'),   c.listJobRequisitions)
  .post(authorize('recruitment', 'JobRequisition', 'canCreate'), c.createJobRequisition);

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
  .get(authorize('recruitment', 'JobRequisition', 'canRead'), c.getJobRequisition);

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
  c.submitJobRequisition,
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
  c.approveHRRequisition,
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
  c.rejectHRRequisition,
);

/**
 * @swagger
 * /recruitment/job-requisitions/{id}/approve-gm:
 *   put:
 *     summary: GM approves requisition at Level 2 — automatically creates a Job Opening
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
 *         description: Requisition approved — JobOpening created and linked
 *       422:
 *         description: Requisition is not pending GM review
 */
router.put(
  '/job-requisitions/:id/approve-gm',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
  c.approveGMRequisition,
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
  c.rejectGMRequisition,
);


// ══════════════════════════════════════════════
//  JOB OPENING  —  /recruitment/job-openings
// ══════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/job-openings:
 *   get:
 *     summary: List all job openings (HR internal view — includes unpublished)
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
 *         name: designationId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [Open, Closed] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Job openings fetched successfully
 */
router
  .route('/job-openings')
  .get(authorize('recruitment', 'JobOpening', 'canRead'), c.listJobOpenings);

/**
 * @swagger
 * /recruitment/job-openings/{id}:
 *   get:
 *     summary: Get a job opening by ID
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
 *         description: Job opening fetched successfully
 *       404:
 *         description: Job opening not found
 *   patch:
 *     summary: Update a job opening (description, salary range, headcount)
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
 *               jobTitle:
 *                 type: string
 *               description:
 *                 type: string
 *               expectedSalaryFrom:
 *                 type: number
 *               expectedSalaryTo:
 *                 type: number
 *               plannedNumberOfPositions:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Job opening updated successfully
 *       404:
 *         description: Job opening not found
 *       422:
 *         description: Cannot edit a closed job opening
 */
router
  .route('/job-openings/:id')
  .get(authorize('recruitment', 'JobOpening', 'canRead'),  c.getJobOpening)
  .patch(authorize('recruitment', 'JobOpening', 'canWrite'), c.updateJobOpening);

/**
 * @swagger
 * /recruitment/job-openings/{id}/publish:
 *   put:
 *     summary: Publish a job opening to the public portal
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
 *         description: Job opening published to portal
 *       422:
 *         description: Cannot publish a closed job opening
 */
router.put(
  '/job-openings/:id/publish',
  authorize('recruitment', 'JobOpening', 'canWrite'),
  c.publishJobOpening,
);

/**
 * @swagger
 * /recruitment/job-openings/{id}/unpublish:
 *   put:
 *     summary: Remove a job opening from the public portal (keeps it Open internally)
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
 *         description: Job opening removed from portal
 */
router.put(
  '/job-openings/:id/unpublish',
  authorize('recruitment', 'JobOpening', 'canWrite'),
  c.unpublishJobOpening,
);

/**
 * @swagger
 * /recruitment/job-openings/{id}/close:
 *   put:
 *     summary: Close a job opening — no new applications accepted
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
 *         description: Job opening closed
 *       422:
 *         description: Job opening is already closed
 */
router.put(
  '/job-openings/:id/close',
  authorize('recruitment', 'JobOpening', 'canWrite'),
  c.closeJobOpening,
);


// ══════════════════════════════════════════════
//  JOB APPLICANT  —  /recruitment/job-applicants
//  POST (public apply) already declared above
// ══════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/job-applicants:
 *   get:
 *     summary: List job applicants (HR internal)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobOpeningId
 *         schema: { type: string, format: uuid }
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
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Job applicants fetched successfully
 */
router
  .route('/job-applicants')
  .get(authorize('recruitment', 'JobApplicant', 'canRead'), c.listJobApplicants);

/**
 * @swagger
 * /recruitment/job-applicants/{id}:
 *   get:
 *     summary: Get a job applicant by ID
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
 *         description: Job applicant fetched successfully
 *       404:
 *         description: Job applicant not found
 */
router
  .route('/job-applicants/:id')
  .get(authorize('recruitment', 'JobApplicant', 'canRead'), c.getJobApplicant);

/**
 * @swagger
 * /recruitment/job-applicants/{id}/status:
 *   patch:
 *     summary: HR updates an applicant's pipeline status
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
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Open, Replied, Hold, Accepted, Rejected]
 *               rejectionReason:
 *                 type: string
 *                 description: "Required when status = Rejected"
 *     responses:
 *       200:
 *         description: Applicant status updated successfully
 *       422:
 *         description: Invalid status value
 */
router.patch(
  '/job-applicants/:id/status',
  authorize('recruitment', 'JobApplicant', 'canWrite'),
  c.updateApplicantStatus,
);

/**
 * @swagger
 * /recruitment/job-applicants/{id}/convert-to-employee:
 *   post:
 *     summary: Convert an accepted applicant into a full Employee record (Flow 13)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: JobApplicant ID
 *     responses:
 *       201:
 *         description: Employee record created — welcome email queued
 *       422:
 *         description: "Applicant must be Accepted with an issued appointment letter"
 *       409:
 *         description: Employee already exists for this email
 */
router.post(
  '/job-applicants/:id/convert-to-employee',
  authorize('recruitment', 'JobApplicant', 'canCreate'),
  c.convertToEmployee,
);


// ══════════════════════════════════════════════
//  EMPLOYEE REFERRAL  —  /recruitment/employee-referrals
// ══════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/employee-referrals:
 *   get:
 *     summary: List employee referrals (HR sees all; employees see their own)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobOpeningId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Accepted, Rejected, In Process]
 *       - in: query
 *         name: referrerId
 *         schema: { type: string, format: uuid }
 *         description: "HR only — filter by referring employee"
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Employee referrals fetched successfully
 *   post:
 *     summary: Employee nominates an external candidate for an open position
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
 *       409:
 *         description: Duplicate referral from this employee for this candidate + opening
 *       422:
 *         description: Job opening is not accepting referrals
 */
router
  .route('/employee-referrals')
  .get(authorize('recruitment', 'EmployeeReferral', 'canRead'),   c.listEmployeeReferrals)
  .post(authorize('recruitment', 'EmployeeReferral', 'canCreate'), c.createEmployeeReferral);

/**
 * @swagger
 * /recruitment/employee-referrals/{id}/accept:
 *   put:
 *     summary: HR accepts a referral — automatically creates a JobApplicant record
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
 *         description: Referral accepted — JobApplicant record created
 *       409:
 *         description: Applicant with this email already exists for this opening
 *       422:
 *         description: Only Pending referrals can be accepted
 */
router.put(
  '/employee-referrals/:id/accept',
  authorize('recruitment', 'EmployeeReferral', 'canWrite'),
  c.acceptReferral,
);

/**
 * @swagger
 * /recruitment/employee-referrals/{id}/reject:
 *   put:
 *     summary: HR rejects a referral
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
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Referral rejected
 *       422:
 *         description: Only Pending referrals can be rejected
 */
router.put(
  '/employee-referrals/:id/reject',
  authorize('recruitment', 'EmployeeReferral', 'canWrite'),
  c.rejectReferral,
);


// ══════════════════════════════════════════════
//  INTERVIEW  —  /recruitment/interviews
// ══════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/interviews/my:
 *   get:
 *     summary: Get interviews assigned to the authenticated user (interviewer view)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Scheduled, Under Review, Pending, Cleared, Not Cleared, Cancelled, No Show]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: My interviews fetched successfully
 */
// Must be declared BEFORE /:id
router.get(
  '/interviews/my',
  authorize('recruitment', 'Interview', 'canRead'),
  c.listMyInterviews,
);

/**
 * @swagger
 * /recruitment/interviews:
 *   get:
 *     summary: List all interviews (HR view)
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobApplicantId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: jobOpeningId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: interviewerId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Scheduled, Under Review, Pending, Cleared, Not Cleared, Cancelled, No Show]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Interviews fetched successfully
 *   post:
 *     summary: HR schedules an interview round for an applicant
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
 *                 description: Lead interviewer (employee ID)
 *               name:
 *                 type: string
 *                 example: "Technical Round 1"
 *               interviewRound:
 *                 type: integer
 *                 default: 1
 *               interviewType:
 *                 type: string
 *                 enum: [One-on-One, Panel, Technical, HR, Case Study, Group Discussion, Video Call, Phone Screening]
 *               scheduledOn:
 *                 type: string
 *                 format: date-time
 *               duration:
 *                 type: integer
 *                 description: Duration in minutes
 *               location:
 *                 type: string
 *                 description: Room name or video call link
 *               panelMembers:
 *                 type: array
 *                 description: Additional panelists beyond the lead interviewer
 *                 items:
 *                   type: object
 *                   properties:
 *                     employeeId: { type: string, format: uuid }
 *                     name:       { type: string }
 *                     role:       { type: string, example: "Technical Evaluator" }
 *               skillCriteria:
 *                 type: array
 *                 description: Skills to evaluate and their maximum scores
 *                 items:
 *                   type: object
 *                   properties:
 *                     skillName:    { type: string }
 *                     maximumScore: { type: number }
 *                     weightage:    { type: number }
 *     responses:
 *       201:
 *         description: Interview scheduled successfully
 *       404:
 *         description: Applicant, opening, or interviewer not found
 *       422:
 *         description: Applicant is not linked to this opening
 */
router
  .route('/interviews')
  .get(authorize('recruitment', 'Interview', 'canRead'),   c.listInterviews)
  .post(authorize('recruitment', 'Interview', 'canCreate'), c.createInterview);

/**
 * @swagger
 * /recruitment/interviews/{id}:
 *   get:
 *     summary: Get an interview by ID (includes all feedback)
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
 *         description: Interview fetched successfully
 *       404:
 *         description: Interview not found
 *   patch:
 *     summary: Update an interview (reschedule, change location, update criteria)
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
 *               scheduledOn:      { type: string, format: date-time }
 *               duration:         { type: integer }
 *               location:         { type: string }
 *               interviewType:    { type: string }
 *               panelMembers:     { type: array }
 *               skillCriteria:    { type: array }
 *               status:
 *                 type: string
 *                 enum: [Scheduled, Under Review, Pending, Cleared, Not Cleared, Cancelled, No Show]
 *               candidateNotified: { type: boolean }
 *     responses:
 *       200:
 *         description: Interview updated successfully
 *       422:
 *         description: Cannot edit a cancelled interview
 */
router
  .route('/interviews/:id')
  .get(authorize('recruitment', 'Interview', 'canRead'),  c.getInterview)
  .patch(authorize('recruitment', 'Interview', 'canWrite'), c.updateInterview);

/**
 * @swagger
 * /recruitment/interviews/{id}/feedback:
 *   post:
 *     summary: Interviewer submits feedback for a completed round
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Interview ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [result]
 *             properties:
 *               result:
 *                 type: string
 *                 enum: [Cleared, Not Cleared, On Hold]
 *               skillAssessments:
 *                 type: array
 *                 description: "Score per skill — must match Interview.skillCriteria"
 *                 items:
 *                   type: object
 *                   properties:
 *                     skillName:    { type: string }
 *                     score:        { type: number }
 *                     maximumScore: { type: number }
 *               competencyRatings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     competency:  { type: string }
 *                     description: { type: string }
 *                     rating:      { type: integer, minimum: 1, maximum: 5 }
 *               strengths:
 *                 type: string
 *               weaknesses:
 *                 type: string
 *               recommendation:
 *                 type: string
 *     responses:
 *       201:
 *         description: Feedback submitted — interview average rating recalculated
 *       403:
 *         description: You are not assigned as an interviewer for this round
 *       409:
 *         description: Feedback already submitted by this reviewer for this interview
 *       422:
 *         description: Interview is cancelled or result value is invalid
 */
router.post(
  '/interviews/:id/feedback',
  authorize('recruitment', 'InterviewFeedback', 'canCreate'),
  c.submitInterviewFeedback,
);


// ══════════════════════════════════════════════
//  JOB OFFER  —  /recruitment/job-offers
// ══════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/job-offers:
 *   get:
 *     summary: List job offers
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobOpeningId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Draft, Awaiting Approval, Approved, Rejected by HR, Offer Sent, Accepted, Declined, Expired, Cancelled]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Job offers fetched successfully
 *   post:
 *     summary: HR creates a job offer for an accepted applicant
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
 *               currency:
 *                 type: string
 *                 default: KES
 *               grossSalary:
 *                 type: number
 *               offerTerms:
 *                 type: array
 *                 description: "Itemised salary components"
 *                 items:
 *                   type: object
 *                   properties:
 *                     componentName: { type: string }
 *                     componentType: { type: string, enum: [Earning, Deduction] }
 *                     amount:        { type: number }
 *                     isConditional: { type: boolean }
 *               probationPeriodMonths:
 *                 type: integer
 *                 default: 3
 *     responses:
 *       201:
 *         description: Job offer created as Draft
 *       409:
 *         description: A job offer already exists for this applicant
 *       422:
 *         description: Applicant must be in Accepted status
 */
router
  .route('/job-offers')
  .get(authorize('recruitment', 'JobOffer', 'canRead'),   c.listJobOffers)
  .post(authorize('recruitment', 'JobOffer', 'canCreate'), c.createJobOffer);

/**
 * @swagger
 * /recruitment/job-offers/{id}:
 *   get:
 *     summary: Get a job offer by ID
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
 *         description: Job offer fetched successfully
 *       404:
 *         description: Job offer not found
 */
router
  .route('/job-offers/:id')
  .get(authorize('recruitment', 'JobOffer', 'canRead'), c.getJobOffer);

/**
 * @swagger
 * /recruitment/job-offers/{id}/submit:
 *   put:
 *     summary: HR submits a Draft offer for GM approval
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
 *         description: Offer submitted — status Awaiting Approval
 *       422:
 *         description: Only Draft offers can be submitted
 */
router.put(
  '/job-offers/:id/submit',
  authorize('recruitment', 'JobOffer', 'canSubmit'),
  c.submitJobOffer,
);

/**
 * @swagger
 * /recruitment/job-offers/{id}/approve:
 *   put:
 *     summary: GM approves a job offer
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
 *         description: Offer approved — HR can now send to candidate
 *       422:
 *         description: Only offers awaiting approval can be approved
 */
router.put(
  '/job-offers/:id/approve',
  authorize('recruitment', 'JobOffer', 'canWrite'),
  c.approveJobOffer,
);

/**
 * @swagger
 * /recruitment/job-offers/{id}/send:
 *   put:
 *     summary: HR sends an approved offer to the candidate
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
 *         description: Offer sent to candidate
 *       422:
 *         description: Only Approved offers can be sent
 */
router.put(
  '/job-offers/:id/send',
  authorize('recruitment', 'JobOffer', 'canWrite'),
  c.sendJobOffer,
);

/**
 * @swagger
 * /recruitment/job-offers/{id}/accept:
 *   put:
 *     summary: Candidate accepts the job offer — draft AppointmentLetter auto-created
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
 *         description: Offer accepted — AppointmentLetter draft created
 *       422:
 *         description: Only sent offers can be accepted
 */
router.put(
  '/job-offers/:id/accept',
  authorize('recruitment', 'JobOffer', 'canWrite'),
  c.acceptJobOffer,
);

/**
 * @swagger
 * /recruitment/job-offers/{id}/decline:
 *   put:
 *     summary: Candidate declines the job offer
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
 *               declineReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Offer declined — applicant reverted to Rejected
 *       422:
 *         description: Only sent offers can be declined
 */
router.put(
  '/job-offers/:id/decline',
  authorize('recruitment', 'JobOffer', 'canWrite'),
  c.declineJobOffer,
);


// ══════════════════════════════════════════════
//  APPOINTMENT LETTER  —  /recruitment/appointment-letters
//  PUT /acknowledge/:token declared above (public)
// ══════════════════════════════════════════════

/**
 * @swagger
 * /recruitment/appointment-letters:
 *   get:
 *     summary: List appointment letters
 *     tags: [Recruitment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobApplicantId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Draft, Issued, Delivered, Acknowledged, Cancelled]
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: Appointment letters fetched successfully
 */
router
  .route('/appointment-letters')
  .get(authorize('recruitment', 'AppointmentLetter', 'canRead'), c.listAppointmentLetters);

/**
 * @swagger
 * /recruitment/appointment-letters/{id}/issue:
 *   put:
 *     summary: HR/GM signs and issues an appointment letter — body is frozen as an HTML snapshot
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
 *               signedById:
 *                 type: string
 *                 format: uuid
 *                 description: Employee ID of the signatory
 *               body:
 *                 type: string
 *                 description: Rendered HTML content of the letter (frozen on issue)
 *               referenceNumber:
 *                 type: string
 *                 example: "ACME/HR/2026/00042"
 *               pdfPath:
 *                 type: string
 *                 description: Path to the generated PDF in uploads/documents/
 *     responses:
 *       200:
 *         description: Appointment letter issued successfully
 *       422:
 *         description: Only Draft letters can be issued
 */
router.put(
  '/appointment-letters/:id/issue',
  authorize('recruitment', 'AppointmentLetter', 'canWrite'),
  c.issueAppointmentLetter,
);

/**
 * @swagger
 * /recruitment/appointment-letters/{id}/deliver:
 *   put:
 *     summary: HR marks an issued letter as delivered to the candidate
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
 *               deliveryMethod:
 *                 type: string
 *                 enum: [Email, Physical, Portal, WhatsApp]
 *     responses:
 *       200:
 *         description: Letter marked as delivered
 *       422:
 *         description: Only Issued letters can be marked as delivered
 */
router.put(
  '/appointment-letters/:id/deliver',
  authorize('recruitment', 'AppointmentLetter', 'canWrite'),
  c.markLetterDelivered,
);

module.exports = router;