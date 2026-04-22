'use strict';

const express = require('express');
const recruitmentController = require('../controllers/recruitmentController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/rbacMiddleware');

const router = express.Router();

// All recruitment routes require authentication 
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Recruitment
 *     description: Recruitment management - Staffing plans, requisitions, job openings, applicants, interviews, offers
 */

// ══════════════════════════════════════════════
//  STAFFING PLAN  —  /recruitment/staffing-plans
// ══════════════════════════════════════════════

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
 */
router.put(
  '/staffing-plans/:id/approve',
  authorize('hr', 'StaffingPlan', 'canApprove'),
  recruitmentController.approveStaffingPlan
);

// ══════════════════════════════════════════════
//  JOB REQUISITION  —  /recruitment/job-requisitions
// ══════════════════════════════════════════════

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
 */
router.put(
  '/job-requisitions/:id/reject-gm',
  authorize('hr', 'JobRequisition', 'canApprove'),
  recruitmentController.rejectGMRequisition
);

// ══════════════════════════════════════════════
//  JOB OPENING  —  /recruitment/job-openings
// ══════════════════════════════════════════════

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
 */
router.put(
  '/job-openings/:id/close',
  authorize('hr', 'JobOpening', 'canDelete'),
  recruitmentController.closeJobOpening
);

// ══════════════════════════════════════════════
//  JOB APPLICANT  —  /recruitment/job-applicants
// ══════════════════════════════════════════════

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
 */
router.patch(
  '/job-applicants/:id/status',
  authorize('hr', 'JobApplicant', 'canWrite'),
  recruitmentController.updateApplicantStatus
);

// ══════════════════════════════════════════════
//  EMPLOYEE REFERRAL  —  /recruitment/employee-referrals
// ══════════════════════════════════════════════

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
 */
router.put(
  '/employee-referrals/:id/accept',
  authorize('hr', 'EmployeeReferral', 'canApprove'),
  recruitmentController.acceptReferral
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
 */
router.put(
  '/employee-referrals/:id/reject',
  authorize('hr', 'EmployeeReferral', 'canApprove'),
  recruitmentController.rejectReferral
);

// ══════════════════════════════════════════════
//  INTERVIEW  —  /recruitment/interviews
// ══════════════════════════════════════════════

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
 *               interviewType:
 *                 type: string
 *                 enum: [One-on-One, Panel, Technical, HR, Case Study, Group Discussion, Video Call, Phone Screening]
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
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Interview updated successfully
 */
router.patch(
  '/interviews/:id',
  authorize('hr', 'Interview', 'canWrite'),
  recruitmentController.updateInterview
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
 */
router.post(
  '/interviews/:id/feedback',
  authorize('hr', 'InterviewFeedback', 'canCreate'),
  recruitmentController.submitInterviewFeedback
);

// ══════════════════════════════════════════════
//  JOB OFFER  —  /recruitment/job-offers
// ══════════════════════════════════════════════

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
 */
router.get(
  '/job-offers/:id',
  authorize('hr', 'JobOffer', 'canRead'),
  recruitmentController.getJobOffer
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
 */
router.put(
  '/job-offers/:id/submit',
  authorize('hr', 'JobOffer', 'canSubmit'),
  recruitmentController.submitJobOffer
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
 */
router.put(
  '/job-offers/:id/approve',
  authorize('hr', 'JobOffer', 'canApprove'),
  recruitmentController.approveJobOffer
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
 */
router.put(
  '/job-offers/:id/decline',
  recruitmentController.declineJobOffer
);

// ══════════════════════════════════════════════
//  APPOINTMENT LETTER  —  /recruitment/appointment-letters
// ══════════════════════════════════════════════

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
 *         name: jobApplicantId
 *         schema:
 *           type: string
 *           format: uuid
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
 * /recruitment/appointment-letters/{id}/issue:
 *   put:
 *     summary: Issue appointment letter (HR/GM signs)
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
 *               signedById:
 *                 type: string
 *                 format: uuid
 *               body:
 *                 type: string
 *               referenceNumber:
 *                 type: string
 *               pdfPath:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment letter issued successfully
 */
router.put(
  '/appointment-letters/:id/issue',
  authorize('hr', 'AppointmentLetter', 'canSubmit'),
  recruitmentController.issueAppointmentLetter
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
 *     responses:
 *       200:
 *         description: Appointment letter marked as delivered
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

// ══════════════════════════════════════════════
//  ONBOARDING TRANSITION  —  /recruitment/job-applicants/{id}/convert-to-employee
// ══════════════════════════════════════════════

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