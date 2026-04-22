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

router.get(
  '/staffing-plans',
  authorize('hr', 'StaffingPlan', 'canRead'),
  recruitmentController.listStaffingPlans
);

router.post(
  '/staffing-plans',
  authorize('hr', 'StaffingPlan', 'canCreate'),
  recruitmentController.createStaffingPlan
);

router.get(
  '/staffing-plans/:id',
  authorize('hr', 'StaffingPlan', 'canRead'),
  recruitmentController.getStaffingPlan
);

router.put(
  '/staffing-plans/:id/submit',
  authorize('hr', 'StaffingPlan', 'canSubmit'),
  recruitmentController.submitStaffingPlan
);

router.put(
  '/staffing-plans/:id/approve',
  authorize('hr', 'StaffingPlan', 'canApprove'),
  recruitmentController.approveStaffingPlan
);

// ════════════════════════════════════════════════════════════════════════════
//  JOB REQUISITION — /recruitment/job-requisitions
// ════════════════════════════════════════════════════════════════════════════

router.get(
  '/job-requisitions',
  authorize('hr', 'JobRequisition', 'canRead'),
  recruitmentController.listJobRequisitions
);

router.post(
  '/job-requisitions',
  authorize('hr', 'JobRequisition', 'canCreate'),
  recruitmentController.createJobRequisition
);

router.get(
  '/job-requisitions/:id',
  authorize('hr', 'JobRequisition', 'canRead'),
  recruitmentController.getJobRequisition
);

router.put(
  '/job-requisitions/:id/submit',
  authorize('hr', 'JobRequisition', 'canSubmit'),
  recruitmentController.submitJobRequisition
);

router.put(
  '/job-requisitions/:id/approve-hr',
  authorize('hr', 'JobRequisition', 'canApprove'),
  recruitmentController.approveHRRequisition
);

router.put(
  '/job-requisitions/:id/reject-hr',
  authorize('hr', 'JobRequisition', 'canApprove'),
  recruitmentController.rejectHRRequisition
);

router.put(
  '/job-requisitions/:id/approve-gm',
  authorize('hr', 'JobRequisition', 'canApprove'),
  recruitmentController.approveGMRequisition
);

router.put(
  '/job-requisitions/:id/reject-gm',
  authorize('hr', 'JobRequisition', 'canApprove'),
  recruitmentController.rejectGMRequisition
);

// ════════════════════════════════════════════════════════════════════════════
//  JOB OPENING — /recruitment/job-openings
// ════════════════════════════════════════════════════════════════════════════

router.get(
  '/job-openings',
  authorize('hr', 'JobOpening', 'canRead'),
  recruitmentController.listJobOpenings
);

router.get(
  '/job-openings/public',
  recruitmentController.listPublicJobOpenings
);

router.get(
  '/job-openings/:id',
  authorize('hr', 'JobOpening', 'canRead'),
  recruitmentController.getJobOpening
);

router.patch(
  '/job-openings/:id',
  authorize('hr', 'JobOpening', 'canWrite'),
  recruitmentController.updateJobOpening
);

router.put(
  '/job-openings/:id/publish',
  authorize('hr', 'JobOpening', 'canSubmit'),
  recruitmentController.publishJobOpening
);

router.put(
  '/job-openings/:id/unpublish',
  authorize('hr', 'JobOpening', 'canSubmit'),
  recruitmentController.unpublishJobOpening
);

router.put(
  '/job-openings/:id/close',
  authorize('hr', 'JobOpening', 'canDelete'),
  recruitmentController.closeJobOpening
);

// ════════════════════════════════════════════════════════════════════════════
//  JOB APPLICANT — /recruitment/job-applicants
// ════════════════════════════════════════════════════════════════════════════

router.get(
  '/job-applicants',
  authorize('hr', 'JobApplicant', 'canRead'),
  recruitmentController.listJobApplicants
);

router.post(
  '/job-applicants',
  recruitmentController.createJobApplicant
);

router.get(
  '/job-applicants/:id',
  authorize('hr', 'JobApplicant', 'canRead'),
  recruitmentController.getJobApplicant
);

router.patch(
  '/job-applicants/:id/status',
  authorize('hr', 'JobApplicant', 'canWrite'),
  recruitmentController.updateApplicantStatus
);

// ════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE REFERRAL — /recruitment/employee-referrals
// ════════════════════════════════════════════════════════════════════════════

router.get(
  '/employee-referrals',
  authorize('hr', 'EmployeeReferral', 'canRead'),
  recruitmentController.listEmployeeReferrals
);

router.post(
  '/employee-referrals',
  authorize('hr', 'EmployeeReferral', 'canCreate'),
  recruitmentController.createEmployeeReferral
);

router.put(
  '/employee-referrals/:id/accept',
  authorize('hr', 'EmployeeReferral', 'canApprove'),
  recruitmentController.acceptReferral
);

router.put(
  '/employee-referrals/:id/reject',
  authorize('hr', 'EmployeeReferral', 'canApprove'),
  recruitmentController.rejectReferral
);

// ════════════════════════════════════════════════════════════════════════════
//  INTERVIEW — /recruitment/interviews
// ════════════════════════════════════════════════════════════════════════════

router.get(
  '/interviews',
  authorize('hr', 'Interview', 'canRead'),
  recruitmentController.listInterviews
);

router.get(
  '/interviews/my',
  recruitmentController.listMyInterviews
);

router.post(
  '/interviews',
  authorize('hr', 'Interview', 'canCreate'),
  recruitmentController.createInterview
);

router.get(
  '/interviews/:id',
  authorize('hr', 'Interview', 'canRead'),
  recruitmentController.getInterview
);

router.patch(
  '/interviews/:id',
  authorize('hr', 'Interview', 'canWrite'),
  recruitmentController.updateInterview
);

router.post(
  '/interviews/:id/feedback',
  authorize('hr', 'InterviewFeedback', 'canCreate'),
  recruitmentController.submitInterviewFeedback
);

// ════════════════════════════════════════════════════════════════════════════
//  JOB OFFER — /recruitment/job-offers
// ════════════════════════════════════════════════════════════════════════════

router.get(
  '/job-offers',
  authorize('hr', 'JobOffer', 'canRead'),
  recruitmentController.listJobOffers
);

router.post(
  '/job-offers',
  authorize('hr', 'JobOffer', 'canCreate'),
  recruitmentController.createJobOffer
);

router.get(
  '/job-offers/:id',
  authorize('hr', 'JobOffer', 'canRead'),
  recruitmentController.getJobOffer
);

router.put(
  '/job-offers/:id/submit',
  authorize('hr', 'JobOffer', 'canSubmit'),
  recruitmentController.submitJobOffer
);

router.put(
  '/job-offers/:id/approve',
  authorize('hr', 'JobOffer', 'canApprove'),
  recruitmentController.approveJobOffer
);

router.put(
  '/job-offers/:id/send',
  authorize('hr', 'JobOffer', 'canSubmit'),
  recruitmentController.sendJobOffer
);

router.put(
  '/job-offers/:id/accept',
  recruitmentController.acceptJobOffer
);

router.put(
  '/job-offers/:id/decline',
  recruitmentController.declineJobOffer
);

// ════════════════════════════════════════════════════════════════════════════
//  APPOINTMENT LETTER — /recruitment/appointment-letters
// ════════════════════════════════════════════════════════════════════════════

router.get(
  '/appointment-letters',
  authorize('hr', 'AppointmentLetter', 'canRead'),
  recruitmentController.listAppointmentLetters
);

router.put(
  '/appointment-letters/:id/issue',
  authorize('hr', 'AppointmentLetter', 'canSubmit'),
  recruitmentController.issueAppointmentLetter
);

router.put(
  '/appointment-letters/:id/deliver',
  authorize('hr', 'AppointmentLetter', 'canWrite'),
  recruitmentController.markLetterDelivered
);

router.put(
  '/appointment-letters/acknowledge/:token',
  recruitmentController.acknowledgeAppointmentLetter
);

// ════════════════════════════════════════════════════════════════════════════
//  ONBOARDING TRANSITION — /recruitment/job-applicants/{id}/convert-to-employee
// ════════════════════════════════════════════════════════════════════════════

router.post(
  '/job-applicants/:id/convert-to-employee',
  authorize('hr', 'Employee', 'canCreate'),
  recruitmentController.convertToEmployee
);

module.exports = router;