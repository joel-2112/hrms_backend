'use strict';

/**
 * recruitment.controller.js
 *
 * Thin HTTP adapter layer for Recruitment module.
 * Each handler:
 *   1. Extracts input from req (params, query, body)
 *   2. Delegates business logic to recruitment.service
 *   3. Sends response via ok/created/noContent helpers
 *
 * No business logic lives here.
 */

const recruitmentService = require('../services/recruitmentService');
const { catchAsync } = require('../../../utils/catchAsync');
const { ok, created, noContent } = require('../../../utils/response');

// ════════════════════════════════════════════════════════════════════════════
//  STAFFING PLAN
// ════════════════════════════════════════════════════════════════════════════

const listStaffingPlans = catchAsync(async (req, res) => {
  const { companyId, docStatus, page, limit } = req.query;
  const result = await recruitmentService.getStaffingPlans({
    companyId,
    docStatus: docStatus !== undefined ? Number(docStatus) : undefined,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
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

const updateStaffingPlan = catchAsync(async (req, res) => {
  const plan = await recruitmentService.updateStaffingPlan(req.params.id, req.body);
  ok(res, plan, 'Staffing plan updated successfully');
});

const submitStaffingPlan = catchAsync(async (req, res) => {
  const plan = await recruitmentService.submitStaffingPlan(req.params.id);
  ok(res, plan, 'Staffing plan submitted successfully');
});

const approveStaffingPlan = catchAsync(async (req, res) => {
  const plan = await recruitmentService.approveStaffingPlan(req.params.id, req.user.id);
  ok(res, plan, 'Staffing plan approved successfully');
});

const cancelStaffingPlan = catchAsync(async (req, res) => {
  const plan = await recruitmentService.cancelStaffingPlan(req.params.id);
  ok(res, plan, 'Staffing plan cancelled successfully');
});

// ════════════════════════════════════════════════════════════════════════════
//  JOB REQUISITION
// ════════════════════════════════════════════════════════════════════════════

const listJobRequisitions = catchAsync(async (req, res) => {
  const { companyId, departmentId, overallStatus, requestedById, page, limit } = req.query;
  const result = await recruitmentService.getJobRequisitions({
    companyId,
    departmentId,
    overallStatus,
    requestedById,
    page: Number(page) || 1,
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
    remarks || null
  );
  ok(res, requisition, 'Requisition approved by HR — escalated to GM');
});

const rejectHRRequisition = catchAsync(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw new AppError('Rejection reason is required', 400);
  const requisition = await recruitmentService.rejectHRRequisition(
    req.params.id,
    req.user.id,
    reason
  );
  ok(res, requisition, 'Requisition rejected by HR');
});

const approveGMRequisition = catchAsync(async (req, res) => {
  const { remarks } = req.body;
  const result = await recruitmentService.approveGMRequisition(
    req.params.id,
    req.user.id,
    remarks || null
  );
  ok(res, result, 'Requisition approved by GM — job opening created');
});

const rejectGMRequisition = catchAsync(async (req, res) => {
  const { reason } = req.body;
  if (!reason) throw new AppError('Rejection reason is required', 400);
  const requisition = await recruitmentService.rejectGMRequisition(
    req.params.id,
    req.user.id,
    reason
  );
  ok(res, requisition, 'Requisition rejected by GM');
});

const cancelJobRequisition = catchAsync(async (req, res) => {
  const { remarks } = req.body;
  const requisition = await recruitmentService.cancelJobRequisition(
    req.params.id,
    req.user.id,
    remarks || null
  );
  ok(res, requisition, 'Job requisition cancelled successfully');
});

// ════════════════════════════════════════════════════════════════════════════
//  JOB OPENING
// ════════════════════════════════════════════════════════════════════════════

const listJobOpenings = catchAsync(async (req, res) => {
  const { companyId, departmentId, designationId, status, page, limit } = req.query;
  const result = await recruitmentService.getJobOpenings({
    companyId,
    departmentId,
    designationId,
    status,
    publicOnly: false,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'Job openings fetched successfully', result.meta);
});

const listPublicJobOpenings = catchAsync(async (req, res) => {
  const { companyId, departmentId, designationId, page, limit } = req.query;
  const result = await recruitmentService.listPublicJobOpenings({
    companyId,
    departmentId,
    designationId,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'Public job openings fetched successfully', result.meta);
});

const getJobOpening = catchAsync(async (req, res) => {
  const opening = await recruitmentService.getJobOpeningById(req.params.id);
  ok(res, opening, 'Job opening fetched successfully');
});

const createJobOpening = catchAsync(async (req, res) => {
  const opening = await recruitmentService.createJobOpening(req.body);
  created(res, opening, 'Job opening created successfully');
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

// ════════════════════════════════════════════════════════════════════════════
//  JOB APPLICANT
// ════════════════════════════════════════════════════════════════════════════

const listJobApplicants = catchAsync(async (req, res) => {
  const { jobOpeningId, status, source, page, limit } = req.query;
  const result = await recruitmentService.getJobApplicants({
    jobOpeningId,
    status,
    source,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'Job applicants fetched successfully', result.meta);
});

const createJobApplicant = catchAsync(async (req, res) => {
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
    rejectionReason || null
  );
  ok(res, applicant, 'Applicant status updated successfully');
});

const rateApplicant = catchAsync(async (req, res) => {
  const { rating } = req.body;
  const applicant = await recruitmentService.rateApplicant(req.params.id, rating);
  ok(res, applicant, 'Applicant rated successfully');
});

// ════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE REFERRAL
// ════════════════════════════════════════════════════════════════════════════

const listEmployeeReferrals = catchAsync(async (req, res) => {
  const { jobOpeningId, status, page, limit } = req.query;

  const { Employee } = require('../../../models');
  const emp = await Employee.findOne({ where: { userId: req.user.id } });

  const referrerId = req.user.isSystemManager || req.user.isSuperUser
    ? req.query.referrerId || undefined
    : emp?.id;

  const result = await recruitmentService.getEmployeeReferrals({
    referrerId,
    jobOpeningId,
    status,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'Employee referrals fetched successfully', result.meta);
});

const getEmployeeReferral = catchAsync(async (req, res) => {
  const referral = await recruitmentService.getEmployeeReferralById(req.params.id);
  ok(res, referral, 'Employee referral fetched successfully');
});

const createEmployeeReferral = catchAsync(async (req, res) => {
  const referral = await recruitmentService.createEmployeeReferral(req.body, req.user.id);
  created(res, referral, 'Referral submitted successfully');
});

const acceptEmployeeReferral = catchAsync(async (req, res) => {
  const result = await recruitmentService.acceptEmployeeReferral(req.params.id);
  ok(res, result, 'Referral accepted — applicant record created');
});

const rejectEmployeeReferral = catchAsync(async (req, res) => {
  const { reason } = req.body;
  const referral = await recruitmentService.rejectEmployeeReferral(req.params.id, reason || null);
  ok(res, referral, 'Referral rejected');
});

const markReferralBonusPaid = catchAsync(async (req, res) => {
  const referral = await recruitmentService.markReferralBonusPaid(req.params.id);
  ok(res, referral, 'Referral bonus marked as paid');
});

// ════════════════════════════════════════════════════════════════════════════
//  INTERVIEW
// ════════════════════════════════════════════════════════════════════════════

const listInterviews = catchAsync(async (req, res) => {
  const { jobApplicantId, jobOpeningId, interviewerId, status, page, limit } = req.query;
  const result = await recruitmentService.getInterviews({
    jobApplicantId,
    jobOpeningId,
    interviewerId,
    status,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'Interviews fetched successfully', result.meta);
});

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
    page: Number(page) || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'My interviews fetched successfully', result.meta);
});

const getInterview = catchAsync(async (req, res) => {
  const interview = await recruitmentService.getInterviewById(req.params.id);
  ok(res, interview, 'Interview fetched successfully');
});

const createInterview = catchAsync(async (req, res) => {
  const interview = await recruitmentService.createInterview(req.body);
  created(res, interview, 'Interview scheduled successfully');
});

const updateInterview = catchAsync(async (req, res) => {
  const interview = await recruitmentService.updateInterview(req.params.id, req.body);
  ok(res, interview, 'Interview updated successfully');
});

const cancelInterview = catchAsync(async (req, res) => {
  const { remarks } = req.body;
  const interview = await recruitmentService.cancelInterview(req.params.id, remarks || null);
  ok(res, interview, 'Interview cancelled successfully');
});

const markCandidateNotified = catchAsync(async (req, res) => {
  const interview = await recruitmentService.markCandidateNotified(req.params.id);
  ok(res, interview, 'Candidate marked as notified');
});

const updateInterviewStatus = catchAsync(async (req, res) => {
  const { status, remarks } = req.body;
  const interview = await recruitmentService.updateInterviewStatus(req.params.id, status, remarks || null);
  ok(res, interview, 'Interview status updated successfully');
});

// ════════════════════════════════════════════════════════════════════════════
//  INTERVIEW FEEDBACK
// ════════════════════════════════════════════════════════════════════════════

const getInterviewFeedback = catchAsync(async (req, res) => {
  const feedbacks = await recruitmentService.getInterviewFeedback(req.params.interviewId);
  ok(res, feedbacks, 'Interview feedback fetched successfully');
});

const getInterviewFeedbackById = catchAsync(async (req, res) => {
  const feedback = await recruitmentService.getInterviewFeedbackById(req.params.id);
  ok(res, feedback, 'Interview feedback fetched successfully');
});

const submitInterviewFeedback = catchAsync(async (req, res) => {
  const feedback = await recruitmentService.createInterviewFeedback(
    { ...req.body, interviewId: req.params.id },
    req.user.id
  );
  created(res, feedback, 'Interview feedback submitted successfully');
});

// ════════════════════════════════════════════════════════════════════════════
//  JOB OFFER
// ════════════════════════════════════════════════════════════════════════════

const listJobOffers = catchAsync(async (req, res) => {
  const { jobOpeningId, status, page, limit } = req.query;
  const result = await recruitmentService.getJobOffers({
    jobOpeningId,
    status,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'Job offers fetched successfully', result.meta);
});

const getJobOffer = catchAsync(async (req, res) => {
  const offer = await recruitmentService.getJobOfferById(req.params.id);
  ok(res, offer, 'Job offer fetched successfully');
});

const createJobOffer = catchAsync(async (req, res) => {
  const offer = await recruitmentService.createJobOffer(req.body);
  created(res, offer, 'Job offer created successfully');
});

const updateJobOffer = catchAsync(async (req, res) => {
  const offer = await recruitmentService.updateJobOffer(req.params.id, req.body);
  ok(res, offer, 'Job offer updated successfully');
});

const submitJobOfferForApproval = catchAsync(async (req, res) => {
  const offer = await recruitmentService.submitJobOfferForApproval(req.params.id);
  ok(res, offer, 'Job offer submitted for approval');
});

const approveJobOffer = catchAsync(async (req, res) => {
  const offer = await recruitmentService.approveJobOffer(req.params.id, req.user.id);
  ok(res, offer, 'Job offer approved');
});

const rejectJobOffer = catchAsync(async (req, res) => {
  const { remarks } = req.body;
  const offer = await recruitmentService.rejectJobOffer(req.params.id, remarks);
  ok(res, offer, 'Job offer rejected');
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

const expireJobOffer = catchAsync(async (req, res) => {
  const offer = await recruitmentService.expireJobOffer(req.params.id);
  ok(res, offer, 'Job offer expired');
});

// ════════════════════════════════════════════════════════════════════════════
//  APPOINTMENT LETTER
// ════════════════════════════════════════════════════════════════════════════

const listAppointmentLetters = catchAsync(async (req, res) => {
  const { status, page, limit } = req.query;
  const result = await recruitmentService.getAppointmentLetters({
    status,
    page: Number(page) || 1,
    limit: Number(limit) || 20,
  });
  ok(res, result.data, 'Appointment letters fetched successfully', result.meta);
});

const getAppointmentLetter = catchAsync(async (req, res) => {
  const letter = await recruitmentService.getAppointmentLetterById(req.params.id);
  ok(res, letter, 'Appointment letter fetched successfully');
});

const generateAppointmentLetter = catchAsync(async (req, res) => {
  const { templateKey, signedById, candidateEmail } = req.body;
  const letter = await recruitmentService.generateAppointmentLetter(req.params.id, {
    templateKey,
    signedById: signedById || null,
    candidateEmail: candidateEmail || null,
  });
  ok(res, letter, 'Appointment letter generated successfully');
});

const signAppointmentLetter = catchAsync(async (req, res) => {
  const letter = await recruitmentService.signAppointmentLetter(req.params.id, req.user.id);
  ok(res, letter, 'Appointment letter signed and issued');
});

const markLetterDelivered = catchAsync(async (req, res) => {
  const { deliveryMethod, deliveredOn } = req.body;
  const letter = await recruitmentService.markLetterDelivered(
    req.params.id,
    deliveryMethod || null,
    deliveredOn || null
  );
  ok(res, letter, 'Appointment letter marked as delivered');
});

const acknowledgeAppointmentLetter = catchAsync(async (req, res) => {
  const token = req.query.token || req.body.token;
  const letter = await recruitmentService.acknowledgeAppointmentLetter(token);
  ok(res, letter, 'Appointment letter acknowledged — thank you');
});

const setPdfPath = catchAsync(async (req, res) => {
  const { pdfPath } = req.body;
  const letter = await recruitmentService.setPdfPath(req.params.id, pdfPath);
  ok(res, letter, 'PDF path set successfully');
});

const cancelAppointmentLetter = catchAsync(async (req, res) => {
  const { remarks } = req.body;
  const letter = await recruitmentService.cancelAppointmentLetter(req.params.id, remarks || null);
  ok(res, letter, 'Appointment letter cancelled');
});

// ════════════════════════════════════════════════════════════════════════════
//  ONBOARDING TRANSITION
// ════════════════════════════════════════════════════════════════════════════

const convertToEmployee = catchAsync(async (req, res) => {
  const result = await recruitmentService.createEmployeeFromApplicant(req.params.id);
  created(
    res,
    {
      employee: result.employee,
      user: result.user,
      ...(process.env.NODE_ENV !== 'production' && {
        temporaryPassword: result.temporaryPassword,
      }),
    },
    'Employee record created — welcome email queued'
  );
});

// ════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Staffing Plan
  listStaffingPlans,
  createStaffingPlan,
  getStaffingPlan,
  updateStaffingPlan,
  submitStaffingPlan,
  approveStaffingPlan,
  cancelStaffingPlan,

  // Job Requisition
  listJobRequisitions,
  createJobRequisition,
  getJobRequisition,
  submitJobRequisition,
  approveHRRequisition,
  rejectHRRequisition,
  approveGMRequisition,
  rejectGMRequisition,
  cancelJobRequisition,

  // Job Opening
  listJobOpenings,
  listPublicJobOpenings,
  getJobOpening,
  createJobOpening,
  updateJobOpening,
  publishJobOpening,
  unpublishJobOpening,
  closeJobOpening,

  // Job Applicant
  listJobApplicants,
  createJobApplicant,
  getJobApplicant,
  updateApplicantStatus,
  rateApplicant,

  // Employee Referral
  listEmployeeReferrals,
  getEmployeeReferral,
  createEmployeeReferral,
  acceptEmployeeReferral,
  rejectEmployeeReferral,
  markReferralBonusPaid,

  // Interview
  listInterviews,
  listMyInterviews,
  getInterview,
  createInterview,
  updateInterview,
  cancelInterview,
  markCandidateNotified,
  updateInterviewStatus,

  // Interview Feedback
  getInterviewFeedback,
  getInterviewFeedbackById,
  submitInterviewFeedback,

  // Job Offer
  listJobOffers,
  getJobOffer,
  createJobOffer,
  updateJobOffer,
  submitJobOfferForApproval,
  approveJobOffer,
  rejectJobOffer,
  sendJobOffer,
  acceptJobOffer,
  declineJobOffer,
  expireJobOffer,

  // Appointment Letter
  listAppointmentLetters,
  getAppointmentLetter,
  generateAppointmentLetter,
  signAppointmentLetter,
  markLetterDelivered,
  acknowledgeAppointmentLetter,
  setPdfPath,
  cancelAppointmentLetter,

  // Onboarding Transition
  convertToEmployee,
};