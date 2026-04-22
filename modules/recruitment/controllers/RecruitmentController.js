'use strict';

/**
 * modules/recruitment/controllers/recruitmentController.js
 *
 * Thin HTTP layer — every function:
 *   1. Extracts params / query / body
 *   2. Calls the corresponding service function
 *   3. Responds via ok / created / noContent helpers
 *
 * No business logic lives here.
 * All errors propagate via catchAsync → global error handler.
 *
 * Route mounting (recruitmentRoutes.js):
 *   GET    /staffing-plans                         → listStaffingPlans
 *   POST   /staffing-plans                         → createStaffingPlan
 *   GET    /staffing-plans/:id                     → getStaffingPlan
 *   PUT    /staffing-plans/:id/submit              → submitStaffingPlan
 *   PUT    /staffing-plans/:id/approve             → approveStaffingPlan
 *
 *   GET    /job-requisitions                       → listJobRequisitions
 *   POST   /job-requisitions                       → createJobRequisition
 *   GET    /job-requisitions/:id                   → getJobRequisition
 *   PUT    /job-requisitions/:id/submit            → submitJobRequisition
 *   PUT    /job-requisitions/:id/approve-hr        → approveHRRequisition
 *   PUT    /job-requisitions/:id/reject-hr         → rejectHRRequisition
 *   PUT    /job-requisitions/:id/approve-gm        → approveGMRequisition
 *   PUT    /job-requisitions/:id/reject-gm         → rejectGMRequisition
 *
 *   GET    /job-openings                           → listJobOpenings
 *   GET    /job-openings/public                    → listPublicJobOpenings
 *   GET    /job-openings/:id                       → getJobOpening
 *   PATCH  /job-openings/:id                       → updateJobOpening
 *   PUT    /job-openings/:id/publish               → publishJobOpening
 *   PUT    /job-openings/:id/unpublish             → unpublishJobOpening
 *   PUT    /job-openings/:id/close                 → closeJobOpening
 *
 *   GET    /job-applicants                         → listJobApplicants
 *   POST   /job-applicants                         → createJobApplicant
 *   GET    /job-applicants/:id                     → getJobApplicant
 *   PATCH  /job-applicants/:id/status              → updateApplicantStatus
 *
 *   GET    /employee-referrals                     → listEmployeeReferrals
 *   POST   /employee-referrals                     → createEmployeeReferral
 *   PUT    /employee-referrals/:id/accept          → acceptReferral
 *   PUT    /employee-referrals/:id/reject          → rejectReferral
 *
 *   GET    /interviews                             → listInterviews
 *   GET    /interviews/my                          → listMyInterviews
 *   POST   /interviews                             → createInterview
 *   GET    /interviews/:id                         → getInterview
 *   PATCH  /interviews/:id                         → updateInterview
 *   POST   /interviews/:id/feedback                → submitInterviewFeedback
 *
 *   GET    /job-offers                             → listJobOffers
 *   POST   /job-offers                             → createJobOffer
 *   GET    /job-offers/:id                         → getJobOffer
 *   PUT    /job-offers/:id/submit                  → submitJobOffer
 *   PUT    /job-offers/:id/approve                 → approveJobOffer
 *   PUT    /job-offers/:id/send                    → sendJobOffer
 *   PUT    /job-offers/:id/accept                  → acceptJobOffer
 *   PUT    /job-offers/:id/decline                 → declineJobOffer
 *
 *   GET    /appointment-letters                    → listAppointmentLetters
 *   PUT    /appointment-letters/:id/issue          → issueAppointmentLetter
 *   PUT    /appointment-letters/:id/deliver        → markLetterDelivered
 *   PUT    /appointment-letters/acknowledge/:token → acknowledgeAppointmentLetter
 *
 *   POST   /job-applicants/:id/convert-to-employee → convertToEmployee
 */

const recruitmentService = require('../services/recruitmentService');
const { catchAsync }     = require('../../../utils/catchAsync');
const { ok, created, noContent } = require('../../../utils/response');


// ══════════════════════════════════════════════
//  STAFFING PLAN
// ══════════════════════════════════════════════

const listStaffingPlans = catchAsync(async (req, res) => {
  const { companyId, docStatus, page, limit } = req.query;
  const result = await recruitmentService.getStaffingPlans({
    companyId,
    docStatus: docStatus !== undefined ? Number(docStatus) : undefined,
    page:      Number(page)  || 1,
    limit:     Number(limit) || 20,
  });
  ok(res, result.data, 'Staffing plans fetched successfully', result.meta);
});

const createStaffingPlan = catchAsync(async (req, res) => {
  const plan = await recruitmentService.createStaffingPlan(req.body);
  created(res, plan, 'Staffing plan created successfully');
});

const getStaffingPlan = catchAsync(async (req, res) => {
  const plan = await recruitmentService.getStaffingPlanById(req.params.id);
  ok(res, plan, 'Staffing plan fetched successfully');
});

const submitStaffingPlan = catchAsync(async (req, res) => {
  const plan = await recruitmentService.submitStaffingPlan(req.params.id);
  ok(res, plan, 'Staffing plan submitted successfully');
});

const approveStaffingPlan = catchAsync(async (req, res) => {
  const plan = await recruitmentService.approveStaffingPlan(req.params.id, req.user.id);
  ok(res, plan, 'Staffing plan approved successfully');
});


// ══════════════════════════════════════════════
//  JOB REQUISITION
// ══════════════════════════════════════════════

const listJobRequisitions = catchAsync(async (req, res) => {
  const { companyId, departmentId, overallStatus, requestedById, page, limit } = req.query;
  const result = await recruitmentService.getJobRequisitions({
    companyId,
    departmentId,
    overallStatus,
    requestedById,
    page:  Number(page)  || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'Job requisitions fetched successfully', result.meta);
});

const createJobRequisition = catchAsync(async (req, res) => {
  const requisition = await recruitmentService.createJobRequisition(req.body, req.user.id);
  created(res, requisition, 'Job requisition created successfully');
});

const getJobRequisition = catchAsync(async (req, res) => {
  const requisition = await recruitmentService.getJobRequisitionById(req.params.id);
  ok(res, requisition, 'Job requisition fetched successfully');
});

const submitJobRequisition = catchAsync(async (req, res) => {
  const requisition = await recruitmentService.submitJobRequisition(req.params.id, req.user.id);
  ok(res, requisition, 'Job requisition submitted for HR review');
});

const approveHRRequisition = catchAsync(async (req, res) => {
  const { remarks } = req.body;
  const requisition = await recruitmentService.approveHRRequisition(
    req.params.id,
    req.user.id,
    remarks || null,
  );
  ok(res, requisition, 'Requisition approved by HR — escalated to GM');
});

const rejectHRRequisition = catchAsync(async (req, res) => {
  const { reason } = req.body;
  const requisition = await recruitmentService.rejectHRRequisition(
    req.params.id,
    req.user.id,
    reason,
  );
  ok(res, requisition, 'Requisition rejected by HR');
});

const approveGMRequisition = catchAsync(async (req, res) => {
  const { remarks } = req.body;
  const result = await recruitmentService.approveGMRequisition(
    req.params.id,
    req.user.id,
    remarks || null,
  );
  ok(res, result, 'Requisition approved by GM — job opening created');
});

const rejectGMRequisition = catchAsync(async (req, res) => {
  const { reason } = req.body;
  const requisition = await recruitmentService.rejectGMRequisition(
    req.params.id,
    req.user.id,
    reason,
  );
  ok(res, requisition, 'Requisition rejected by GM');
});


// ══════════════════════════════════════════════
//  JOB OPENING
// ══════════════════════════════════════════════

const listJobOpenings = catchAsync(async (req, res) => {
  const { companyId, departmentId, designationId, status, page, limit } = req.query;
  const result = await recruitmentService.getJobOpenings({
    companyId,
    departmentId,
    designationId,
    status,
    publicOnly: false,
    page:       Number(page)  || 1,
    limit:      Number(limit) || 20,
  });
  ok(res, result.data, 'Job openings fetched successfully', result.meta);
});

// Public endpoint — no authentication, only published openings
const listPublicJobOpenings = catchAsync(async (req, res) => {
  const { companyId, departmentId, designationId, page, limit } = req.query;
  const result = await recruitmentService.getJobOpenings({
    companyId,
    departmentId,
    designationId,
    status:    'Open',
    publicOnly: true,
    page:       Number(page)  || 1,
    limit:      Number(limit) || 20,
  });
  ok(res, result.data, 'Job openings fetched successfully', result.meta);
});

const getJobOpening = catchAsync(async (req, res) => {
  const opening = await recruitmentService.getJobOpeningById(req.params.id);
  ok(res, opening, 'Job opening fetched successfully');
});

const updateJobOpening = catchAsync(async (req, res) => {
  const opening = await recruitmentService.updateJobOpening(req.params.id, req.body);
  ok(res, opening, 'Job opening updated successfully');
});

const publishJobOpening = catchAsync(async (req, res) => {
  const opening = await recruitmentService.publishJobOpening(req.params.id, true);
  ok(res, opening, 'Job opening published to portal');
});

const unpublishJobOpening = catchAsync(async (req, res) => {
  const opening = await recruitmentService.publishJobOpening(req.params.id, false);
  ok(res, opening, 'Job opening removed from portal');
});

const closeJobOpening = catchAsync(async (req, res) => {
  const opening = await recruitmentService.closeJobOpening(req.params.id);
  ok(res, opening, 'Job opening closed');
});


// ══════════════════════════════════════════════
//  JOB APPLICANT
// ══════════════════════════════════════════════

const listJobApplicants = catchAsync(async (req, res) => {
  const { jobOpeningId, status, source, page, limit } = req.query;
  const result = await recruitmentService.getJobApplicants({
    jobOpeningId,
    status,
    source,
    page:  Number(page)  || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'Job applicants fetched successfully', result.meta);
});

// Public — candidates apply without authentication
const createJobApplicant = catchAsync(async (req, res) => {
  // referralToken may be passed as a query param from a referral link
  const referralToken = req.query.referralToken || null;
  const applicant = await recruitmentService.createJobApplicant(req.body, referralToken);
  created(res, applicant, 'Application submitted successfully');
});

const getJobApplicant = catchAsync(async (req, res) => {
  const applicant = await recruitmentService.getJobApplicantById(req.params.id);
  ok(res, applicant, 'Job applicant fetched successfully');
});

const updateApplicantStatus = catchAsync(async (req, res) => {
  const { status, rejectionReason } = req.body;
  const applicant = await recruitmentService.updateApplicantStatus(
    req.params.id,
    status,
    rejectionReason || null,
  );
  ok(res, applicant, 'Applicant status updated successfully');
});


// ══════════════════════════════════════════════
//  EMPLOYEE REFERRAL
// ══════════════════════════════════════════════

const listEmployeeReferrals = catchAsync(async (req, res) => {
  const { jobOpeningId, status, page, limit } = req.query;

  // If the caller is not a superuser/system manager, scope to their own referrals
  // by default — HR can pass referrerId=all or omit to see everything
  const { Employee } = require('../../../models');
  const emp = await Employee.findOne({ where: { userId: req.user.id } });

  const referrerId = (req.user.isSystemManager || req.user.isSuperUser)
    ? req.query.referrerId || undefined
    : emp?.id;

  const result = await recruitmentService.getEmployeeReferrals({
    referrerId,
    jobOpeningId,
    status,
    page:  Number(page)  || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'Employee referrals fetched successfully', result.meta);
});

const createEmployeeReferral = catchAsync(async (req, res) => {
  const referral = await recruitmentService.createEmployeeReferral(req.body, req.user.id);
  created(res, referral, 'Referral submitted successfully');
});

const acceptReferral = catchAsync(async (req, res) => {
  const result = await recruitmentService.acceptReferral(req.params.id);
  ok(res, result, 'Referral accepted — applicant record created');
});

const rejectReferral = catchAsync(async (req, res) => {
  const { reason } = req.body;
  const referral = await recruitmentService.rejectReferral(req.params.id, reason || null);
  ok(res, referral, 'Referral rejected');
});


// ══════════════════════════════════════════════
//  INTERVIEW
// ══════════════════════════════════════════════

const listInterviews = catchAsync(async (req, res) => {
  const { jobApplicantId, jobOpeningId, interviewerId, status, page, limit } = req.query;
  const result = await recruitmentService.getInterviews({
    jobApplicantId,
    jobOpeningId,
    interviewerId,
    status,
    page:  Number(page)  || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'Interviews fetched successfully', result.meta);
});

// "My Interviews" — filters by the authenticated user's employee record
const listMyInterviews = catchAsync(async (req, res) => {
  const { Employee } = require('../../../models');
  const emp = await Employee.findOne({ where: { userId: req.user.id } });
  if (!emp) {
    return ok(res, [], 'No interviews found');
  }

  const { status, page, limit } = req.query;
  const result = await recruitmentService.getInterviews({
    interviewerId: emp.id,
    status,
    page:  Number(page)  || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'My interviews fetched successfully', result.meta);
});

const createInterview = catchAsync(async (req, res) => {
  const interview = await recruitmentService.createInterview(req.body);
  created(res, interview, 'Interview scheduled successfully');
});

const getInterview = catchAsync(async (req, res) => {
  const interview = await recruitmentService.getInterviewById(req.params.id);
  ok(res, interview, 'Interview fetched successfully');
});

const updateInterview = catchAsync(async (req, res) => {
  const interview = await recruitmentService.updateInterview(req.params.id, req.body);
  ok(res, interview, 'Interview updated successfully');
});

const submitInterviewFeedback = catchAsync(async (req, res) => {
  const feedback = await recruitmentService.createInterviewFeedback(
    { ...req.body, interviewId: req.params.id },
    req.user.id,
  );
  created(res, feedback, 'Interview feedback submitted successfully');
});


// ══════════════════════════════════════════════
//  JOB OFFER
// ══════════════════════════════════════════════

const listJobOffers = catchAsync(async (req, res) => {
  const { jobOpeningId, status, page, limit } = req.query;
  const result = await recruitmentService.getJobOffers({
    jobOpeningId,
    status,
    page:  Number(page)  || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'Job offers fetched successfully', result.meta);
});

const createJobOffer = catchAsync(async (req, res) => {
  const offer = await recruitmentService.createJobOffer(req.body);
  created(res, offer, 'Job offer created successfully');
});

const getJobOffer = catchAsync(async (req, res) => {
  const offer = await recruitmentService.getJobOfferById(req.params.id);
  ok(res, offer, 'Job offer fetched successfully');
});

const submitJobOffer = catchAsync(async (req, res) => {
  const offer = await recruitmentService.submitJobOffer(req.params.id);
  ok(res, offer, 'Job offer submitted for approval');
});

const approveJobOffer = catchAsync(async (req, res) => {
  const offer = await recruitmentService.approveJobOffer(req.params.id, req.user.id);
  ok(res, offer, 'Job offer approved');
});

const sendJobOffer = catchAsync(async (req, res) => {
  const offer = await recruitmentService.sendJobOffer(req.params.id);
  ok(res, offer, 'Job offer sent to candidate');
});

const acceptJobOffer = catchAsync(async (req, res) => {
  const result = await recruitmentService.acceptJobOffer(req.params.id);
  ok(res, result, 'Job offer accepted — appointment letter draft created');
});

const declineJobOffer = catchAsync(async (req, res) => {
  const { declineReason } = req.body;
  const offer = await recruitmentService.declineJobOffer(req.params.id, declineReason || null);
  ok(res, offer, 'Job offer declined');
});


// ══════════════════════════════════════════════
//  APPOINTMENT LETTER
// ══════════════════════════════════════════════

const listAppointmentLetters = catchAsync(async (req, res) => {
  const { jobApplicantId, status, page, limit } = req.query;
  const result = await recruitmentService.getAppointmentLetters({
    jobApplicantId,
    status,
    page:  Number(page)  || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'Appointment letters fetched successfully', result.meta);
});

const issueAppointmentLetter = catchAsync(async (req, res) => {
  const { signedById, body, referenceNumber, pdfPath } = req.body;
  const letter = await recruitmentService.issueAppointmentLetter(req.params.id, {
    signedById:      signedById      || null,
    body:            body            || null,
    referenceNumber: referenceNumber || null,
    pdfPath:         pdfPath         || null,
  });
  ok(res, letter, 'Appointment letter issued successfully');
});

const markLetterDelivered = catchAsync(async (req, res) => {
  const { deliveryMethod } = req.body;
  const letter = await recruitmentService.markLetterDelivered(
    req.params.id,
    deliveryMethod || null,
  );
  ok(res, letter, 'Appointment letter marked as delivered');
});

// Public endpoint — candidate clicks the acknowledgement link, no auth required
const acknowledgeAppointmentLetter = catchAsync(async (req, res) => {
  const letter = await recruitmentService.acknowledgeAppointmentLetter(req.params.token);
  ok(res, letter, 'Appointment letter acknowledged — thank you');
});


// ══════════════════════════════════════════════
//  ONBOARDING TRANSITION
// ══════════════════════════════════════════════

const convertToEmployee = catchAsync(async (req, res) => {
  const result = await recruitmentService.createEmployeeFromApplicant(req.params.id);
  // Never expose the plain-text temporary password in the response body
  // — log it server-side and trigger a welcome email from a notification service
  created(res, {
    employee:   result.employee,
    user:       result.user,
    // Included only in non-production environments for testing convenience
    ...(process.env.NODE_ENV !== 'production' && {
      temporaryPassword: result.temporaryPassword,
    }),
  }, 'Employee record created — welcome email queued');
});


// ══════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════

module.exports = {
  // Staffing Plan
  listStaffingPlans,
  createStaffingPlan,
  getStaffingPlan,
  submitStaffingPlan,
  approveStaffingPlan,

  // Job Requisition
  listJobRequisitions,
  createJobRequisition,
  getJobRequisition,
  submitJobRequisition,
  approveHRRequisition,
  rejectHRRequisition,
  approveGMRequisition,
  rejectGMRequisition,

  // Job Opening
  listJobOpenings,
  listPublicJobOpenings,
  getJobOpening,
  updateJobOpening,
  publishJobOpening,
  unpublishJobOpening,
  closeJobOpening,

  // Job Applicant
  listJobApplicants,
  createJobApplicant,
  getJobApplicant,
  updateApplicantStatus,

  // Employee Referral
  listEmployeeReferrals,
  createEmployeeReferral,
  acceptReferral,
  rejectReferral,

  // Interview
  listInterviews,
  listMyInterviews,
  createInterview,
  getInterview,
  updateInterview,
  submitInterviewFeedback,

  // Job Offer
  listJobOffers,
  createJobOffer,
  getJobOffer,
  submitJobOffer,
  approveJobOffer,
  sendJobOffer,
  acceptJobOffer,
  declineJobOffer,

  // Appointment Letter
  listAppointmentLetters,
  issueAppointmentLetter,
  markLetterDelivered,
  acknowledgeAppointmentLetter,

  // Onboarding Transition
  convertToEmployee,
};