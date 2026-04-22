'use strict';

/**
 * recruitmentRoutes.js
 *
 * Routes are wired 1-to-1 against every exported handler in recruitmentController.js.
 * Controller exports (in declaration order):
 *
 *  Staffing Plan      : listStaffingPlans, createStaffingPlan, getStaffingPlan,
 *                       updateStaffingPlan, submitStaffingPlan, approveStaffingPlan,
 *                       cancelStaffingPlan
 *
 *  Job Requisition    : listJobRequisitions, createJobRequisition, getJobRequisition,
 *                       submitJobRequisition, approveHRRequisition, rejectHRRequisition,
 *                       approveGMRequisition, rejectGMRequisition, cancelJobRequisition
 *
 *  Job Opening        : listJobOpenings, listPublicJobOpenings, getJobOpening,
 *                       createJobOpening, updateJobOpening, publishJobOpening,
 *                       unpublishJobOpening, closeJobOpening
 *
 *  Job Applicant      : listJobApplicants, createJobApplicant, getJobApplicant,
 *                       updateApplicantStatus, rateApplicant
 *
 *  Employee Referral  : listEmployeeReferrals, getEmployeeReferral,
 *                       createEmployeeReferral, acceptEmployeeReferral,
 *                       rejectEmployeeReferral, markReferralBonusPaid
 *
 *  Interview          : listInterviews, listMyInterviews, getInterview,
 *                       createInterview, updateInterview, cancelInterview,
 *                       markCandidateNotified, updateInterviewStatus
 *
 *  Interview Feedback : getInterviewFeedback, getInterviewFeedbackById,
 *                       submitInterviewFeedback
 *
 *  Job Offer          : listJobOffers, getJobOffer, createJobOffer, updateJobOffer,
 *                       submitJobOfferForApproval, approveJobOffer, rejectJobOffer,
 *                       sendJobOffer, acceptJobOffer, declineJobOffer, expireJobOffer
 *
 *  Appointment Letter : listAppointmentLetters, getAppointmentLetter,
 *                       generateAppointmentLetter, signAppointmentLetter,
 *                       markLetterDelivered, acknowledgeAppointmentLetter,
 *                       setPdfPath, cancelAppointmentLetter
 *
 *  Onboarding         : convertToEmployee
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  Authentication strategy
 *  ────────────────────────
 *  Five endpoints are intentionally public (no authenticate):
 *
 *    GET  /job-openings/public            — public job portal listing
 *    POST /job-applicants                 — candidate submits application
 *         (?referralToken= links referral)
 *    PUT  /job-offers/:id/accept          — candidate accepts via portal link
 *    PUT  /job-offers/:id/decline         — candidate declines via portal link
 *    PUT  /appointment-letters/acknowledge— candidate acknowledges via token
 *         (?token= carries the one-time token)
 *
 *  Because router.use(authenticate) would block these five, authenticate is
 *  applied per-route on all protected endpoints instead.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *  authorize() signature used throughout:
 *    authorize('hr', '<ModelName>', '<action>')
 *  Actions: canRead | canCreate | canWrite | canSubmit | canApprove | canDelete
 * ─────────────────────────────────────────────────────────────────────────
 *
 *  Route ordering note
 *  ───────────────────
 *  Static sub-paths (/public, /my, /acknowledge, /pending) are declared
 *  BEFORE their /:id counterparts so Express does not swallow them as
 *  param values.
 */

const express = require('express');

const ctrl = require('../controllers/recruitmentController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize }    = require('../../../middlewares/rbacMiddleware');

const router = express.Router();

// ════════════════════════════════════════════════════════════════════════════
//  STAFFING PLAN
//  /recruitment/staffing-plans
// ════════════════════════════════════════════════════════════════════════════

router.get(
  '/staffing-plans',
  authenticate,
  authorize('hr', 'StaffingPlan', 'canRead'),
  ctrl.listStaffingPlans
);

router.post(
  '/staffing-plans',
  authenticate,
  authorize('hr', 'StaffingPlan', 'canCreate'),
  ctrl.createStaffingPlan
);

router.get(
  '/staffing-plans/:id',
  authenticate,
  authorize('hr', 'StaffingPlan', 'canRead'),
  ctrl.getStaffingPlan
);

router.put(
  '/staffing-plans/:id',
  authenticate,
  authorize('hr', 'StaffingPlan', 'canWrite'),
  ctrl.updateStaffingPlan
);

router.put(
  '/staffing-plans/:id/submit',
  authenticate,
  authorize('hr', 'StaffingPlan', 'canSubmit'),
  ctrl.submitStaffingPlan
);

router.put(
  '/staffing-plans/:id/approve',
  authenticate,
  authorize('hr', 'StaffingPlan', 'canApprove'),
  ctrl.approveStaffingPlan
);

router.put(
  '/staffing-plans/:id/cancel',
  authenticate,
  authorize('hr', 'StaffingPlan', 'canDelete'),
  ctrl.cancelStaffingPlan
);

// ════════════════════════════════════════════════════════════════════════════
//  JOB REQUISITION
//  /recruitment/job-requisitions
// ════════════════════════════════════════════════════════════════════════════

router.get(
  '/job-requisitions',
  authenticate,
  authorize('hr', 'JobRequisition', 'canRead'),
  ctrl.listJobRequisitions
);

router.post(
  '/job-requisitions',
  authenticate,
  authorize('hr', 'JobRequisition', 'canCreate'),
  ctrl.createJobRequisition
);

router.get(
  '/job-requisitions/:id',
  authenticate,
  authorize('hr', 'JobRequisition', 'canRead'),
  ctrl.getJobRequisition
);

// Dept Head submits their draft for HR review
router.put(
  '/job-requisitions/:id/submit',
  authenticate,
  authorize('hr', 'JobRequisition', 'canSubmit'),
  ctrl.submitJobRequisition
);

// HR Manager — Level 1 approval
router.put(
  '/job-requisitions/:id/approve-hr',
  authenticate,
  authorize('hr', 'JobRequisition', 'canApprove'),
  ctrl.approveHRRequisition
);

router.put(
  '/job-requisitions/:id/reject-hr',
  authenticate,
  authorize('hr', 'JobRequisition', 'canApprove'),
  ctrl.rejectHRRequisition
);

// GM — Level 2 approval (also auto-creates JobOpening)
router.put(
  '/job-requisitions/:id/approve-gm',
  authenticate,
  authorize('hr', 'JobRequisition', 'canApprove'),
  ctrl.approveGMRequisition
);

router.put(
  '/job-requisitions/:id/reject-gm',
  authenticate,
  authorize('hr', 'JobRequisition', 'canApprove'),
  ctrl.rejectGMRequisition
);

router.put(
  '/job-requisitions/:id/cancel',
  authenticate,
  authorize('hr', 'JobRequisition', 'canDelete'),
  ctrl.cancelJobRequisition
);

// ════════════════════════════════════════════════════════════════════════════
//  JOB OPENING
//  /recruitment/job-openings
//
//  IMPORTANT: /public is declared first — must come before /:id
// ════════════════════════════════════════════════════════════════════════════

// ── Public (no authenticate) ──────────────────────────────────────────────
router.get(
  '/job-openings/public',
  ctrl.listPublicJobOpenings            // no authenticate, no authorize
);

// ── Authenticated ─────────────────────────────────────────────────────────
router.get(
  '/job-openings',
  authenticate,
  authorize('hr', 'JobOpening', 'canRead'),
  ctrl.listJobOpenings
);

router.post(
  '/job-openings',
  authenticate,
  authorize('hr', 'JobOpening', 'canCreate'),
  ctrl.createJobOpening
);

router.get(
  '/job-openings/:id',
  authenticate,
  authorize('hr', 'JobOpening', 'canRead'),
  ctrl.getJobOpening
);

// PATCH — partial update (title, description, salary range)
router.patch(
  '/job-openings/:id',
  authenticate,
  authorize('hr', 'JobOpening', 'canWrite'),
  ctrl.updateJobOpening
);

// publishJobOpening — sets publishOnWebsite = true
router.put(
  '/job-openings/:id/publish',
  authenticate,
  authorize('hr', 'JobOpening', 'canSubmit'),
  ctrl.publishJobOpening
);

// unpublishJobOpening — sets publishOnWebsite = false
router.put(
  '/job-openings/:id/unpublish',
  authenticate,
  authorize('hr', 'JobOpening', 'canSubmit'),
  ctrl.unpublishJobOpening
);

// closeJobOpening — sets status = 'Closed', also unpublishes
router.put(
  '/job-openings/:id/close',
  authenticate,
  authorize('hr', 'JobOpening', 'canDelete'),
  ctrl.closeJobOpening
);

// ════════════════════════════════════════════════════════════════════════════
//  JOB APPLICANT
//  /recruitment/job-applicants
//
//  POST /job-applicants is public (candidate portal).
//  The controller reads req.query.referralToken to link referrals.
// ════════════════════════════════════════════════════════════════════════════

router.get(
  '/job-applicants',
  authenticate,
  authorize('hr', 'JobApplicant', 'canRead'),
  ctrl.listJobApplicants
);

// ── Public (no authenticate) ──────────────────────────────────────────────
router.post(
  '/job-applicants',
  ctrl.createJobApplicant               // public: candidate submits application
);

// ── Authenticated ─────────────────────────────────────────────────────────
router.get(
  '/job-applicants/:id',
  authenticate,
  authorize('hr', 'JobApplicant', 'canRead'),
  ctrl.getJobApplicant
);

// PATCH — move applicant through pipeline stages
router.patch(
  '/job-applicants/:id/status',
  authenticate,
  authorize('hr', 'JobApplicant', 'canWrite'),
  ctrl.updateApplicantStatus
);

// PUT — recruiter sets overall rating after all interview rounds
router.put(
  '/job-applicants/:id/rate',
  authenticate,
  authorize('hr', 'JobApplicant', 'canWrite'),
  ctrl.rateApplicant
);

// POST — convert accepted applicant to Employee record (onboarding transition)
router.post(
  '/job-applicants/:id/convert-to-employee',
  authenticate,
  authorize('hr', 'Employee', 'canCreate'),
  ctrl.convertToEmployee
);

// ════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE REFERRAL
//  /recruitment/employee-referrals
// ════════════════════════════════════════════════════════════════════════════

router.get(
  '/employee-referrals',
  authenticate,
  authorize('hr', 'EmployeeReferral', 'canRead'),
  ctrl.listEmployeeReferrals
);

router.post(
  '/employee-referrals',
  authenticate,
  authorize('hr', 'EmployeeReferral', 'canCreate'),
  ctrl.createEmployeeReferral
);

router.get(
  '/employee-referrals/:id',
  authenticate,
  authorize('hr', 'EmployeeReferral', 'canRead'),
  ctrl.getEmployeeReferral
);

// HR accepts referral → creates JobApplicant
router.put(
  '/employee-referrals/:id/accept',
  authenticate,
  authorize('hr', 'EmployeeReferral', 'canApprove'),
  ctrl.acceptEmployeeReferral
);

router.put(
  '/employee-referrals/:id/reject',
  authenticate,
  authorize('hr', 'EmployeeReferral', 'canApprove'),
  ctrl.rejectEmployeeReferral
);

// HR / Finance marks referral bonus as paid
router.put(
  '/employee-referrals/:id/bonus-paid',
  authenticate,
  authorize('hr', 'EmployeeReferral', 'canApprove'),
  ctrl.markReferralBonusPaid
);

// ════════════════════════════════════════════════════════════════════════════
//  INTERVIEW
//  /recruitment/interviews
//
//  IMPORTANT: /my is declared before /:id so Express does not
//  treat 'my' as a UUID param value.
// ════════════════════════════════════════════════════════════════════════════

router.get(
  '/interviews',
  authenticate,
  authorize('hr', 'Interview', 'canRead'),
  ctrl.listInterviews
);

// Interviewer-scoped view — no extra authorize needed; controller resolves
// the employee from req.user.id and filters by interviewerId internally
router.get(
  '/interviews/my',
  authenticate,
  ctrl.listMyInterviews
);

router.post(
  '/interviews',
  authenticate,
  authorize('hr', 'Interview', 'canCreate'),
  ctrl.createInterview
);

router.get(
  '/interviews/:id',
  authenticate,
  authorize('hr', 'Interview', 'canRead'),
  ctrl.getInterview
);

// PATCH — reschedule, change panel, location
router.patch(
  '/interviews/:id',
  authenticate,
  authorize('hr', 'Interview', 'canWrite'),
  ctrl.updateInterview
);

router.put(
  '/interviews/:id/cancel',
  authenticate,
  authorize('hr', 'Interview', 'canDelete'),
  ctrl.cancelInterview
);

// Mark that the candidate has been sent their invitation
router.put(
  '/interviews/:id/notify-candidate',
  authenticate,
  authorize('hr', 'Interview', 'canWrite'),
  ctrl.markCandidateNotified
);

// Advance/set interview status (Cleared, Not Cleared, No Show, etc.)
router.put(
  '/interviews/:id/status',
  authenticate,
  authorize('hr', 'Interview', 'canWrite'),
  ctrl.updateInterviewStatus
);

// ════════════════════════════════════════════════════════════════════════════
//  INTERVIEW FEEDBACK
//
//  submitInterviewFeedback  → POST /interviews/:id/feedback
//    controller reads:  req.params.id  (interviewId)  +  req.user.id
//
//  getInterviewFeedback     → GET  /interviews/:interviewId/feedback
//    controller reads:  req.params.interviewId
//
//  getInterviewFeedbackById → GET  /interview-feedback/:id
//    controller reads:  req.params.id  (feedbackId)
// ════════════════════════════════════════════════════════════════════════════

// Submit feedback for an interview round (panelist / interviewer)
router.post(
  '/interviews/:id/feedback',
  authenticate,
  authorize('hr', 'InterviewFeedback', 'canCreate'),
  ctrl.submitInterviewFeedback
);

// Get all feedback records for one interview
// Uses :interviewId param — controller: req.params.interviewId
router.get(
  '/interviews/:interviewId/feedback',
  authenticate,
  authorize('hr', 'InterviewFeedback', 'canRead'),
  ctrl.getInterviewFeedback
);

// Get a single feedback record by its own UUID
// Separate resource path avoids param collision with the routes above
router.get(
  '/interview-feedback/:id',
  authenticate,
  authorize('hr', 'InterviewFeedback', 'canRead'),
  ctrl.getInterviewFeedbackById
);

// ════════════════════════════════════════════════════════════════════════════
//  JOB OFFER
//  /recruitment/job-offers
//
//  accept and decline are public (candidate portal — no auth session).
// ════════════════════════════════════════════════════════════════════════════

router.get(
  '/job-offers',
  authenticate,
  authorize('hr', 'JobOffer', 'canRead'),
  ctrl.listJobOffers
);

router.post(
  '/job-offers',
  authenticate,
  authorize('hr', 'JobOffer', 'canCreate'),
  ctrl.createJobOffer
);

router.get(
  '/job-offers/:id',
  authenticate,
  authorize('hr', 'JobOffer', 'canRead'),
  ctrl.getJobOffer
);

// PUT — edit Draft or Awaiting-Approval offer
router.put(
  '/job-offers/:id',
  authenticate,
  authorize('hr', 'JobOffer', 'canWrite'),
  ctrl.updateJobOffer
);

// HR submits Draft → Awaiting Approval
router.put(
  '/job-offers/:id/submit',
  authenticate,
  authorize('hr', 'JobOffer', 'canSubmit'),
  ctrl.submitJobOfferForApproval
);

// GM approves (Awaiting Approval → Approved)
router.put(
  '/job-offers/:id/approve',
  authenticate,
  authorize('hr', 'JobOffer', 'canApprove'),
  ctrl.approveJobOffer
);

// HR rejects before sending (Awaiting Approval → Rejected by HR)
router.put(
  '/job-offers/:id/reject',
  authenticate,
  authorize('hr', 'JobOffer', 'canApprove'),
  ctrl.rejectJobOffer
);

// HR sends approved offer to candidate (Approved → Offer Sent)
router.put(
  '/job-offers/:id/send',
  authenticate,
  authorize('hr', 'JobOffer', 'canSubmit'),
  ctrl.sendJobOffer
);

// ── Public (no authenticate) ──────────────────────────────────────────────
// Candidate accepts via portal link (Offer Sent → Accepted)
// Also auto-creates AppointmentLetter in Draft status
router.put(
  '/job-offers/:id/accept',
  ctrl.acceptJobOffer
);

// Candidate declines via portal link (Offer Sent → Declined)
// Also sets JobApplicant.status = 'Rejected'
router.put(
  '/job-offers/:id/decline',
  ctrl.declineJobOffer
);

// ── Authenticated ─────────────────────────────────────────────────────────
// Manual or scheduled expiry (Offer Sent / Approved → Expired)
router.put(
  '/job-offers/:id/expire',
  authenticate,
  authorize('hr', 'JobOffer', 'canWrite'),
  ctrl.expireJobOffer
);

// ════════════════════════════════════════════════════════════════════════════
//  APPOINTMENT LETTER
//  /recruitment/appointment-letters
//
//  IMPORTANT: /acknowledge is declared BEFORE /:id to prevent Express
//  matching "acknowledge" as a UUID param.
//
//  acknowledgeAppointmentLetter:
//    The controller reads: req.query.token || req.body.token
//    Route: PUT /appointment-letters/acknowledge
//    The token comes in as a query param: ?token=<one-time-token>
//    No path param is needed — the service looks up the record by token.
// ════════════════════════════════════════════════════════════════════════════

router.get(
  '/appointment-letters',
  authenticate,
  authorize('hr', 'AppointmentLetter', 'canRead'),
  ctrl.listAppointmentLetters
);

// ── Public (no authenticate) — must come before /:id ─────────────────────
// Candidate acknowledges via one-time token in query string: ?token=<token>
router.put(
  '/appointment-letters/acknowledge',
  ctrl.acknowledgeAppointmentLetter
);

// ── Authenticated ─────────────────────────────────────────────────────────
router.get(
  '/appointment-letters/:id',
  authenticate,
  authorize('hr', 'AppointmentLetter', 'canRead'),
  ctrl.getAppointmentLetter
);

// POST — render letter body from offer data and freeze as HTML snapshot
router.post(
  '/appointment-letters/:id/generate',
  authenticate,
  authorize('hr', 'AppointmentLetter', 'canWrite'),
  ctrl.generateAppointmentLetter
);

// PUT — HR Director / GM signs (Draft → Issued); uses req.user.id as signedById
router.put(
  '/appointment-letters/:id/sign',
  authenticate,
  authorize('hr', 'AppointmentLetter', 'canApprove'),
  ctrl.signAppointmentLetter
);

// PUT — HR marks physical or digital delivery (Issued → Delivered)
router.put(
  '/appointment-letters/:id/deliver',
  authenticate,
  authorize('hr', 'AppointmentLetter', 'canWrite'),
  ctrl.markLetterDelivered
);

// PUT — store the generated PDF file path after PDF service completes
router.put(
  '/appointment-letters/:id/pdf-path',
  authenticate,
  authorize('hr', 'AppointmentLetter', 'canWrite'),
  ctrl.setPdfPath
);

// PUT — HR cancels the letter (any status → Cancelled)
router.put(
  '/appointment-letters/:id/cancel',
  authenticate,
  authorize('hr', 'AppointmentLetter', 'canDelete'),
  ctrl.cancelAppointmentLetter
);

module.exports = router;