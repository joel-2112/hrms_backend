'use strict';
const { Op } = require('sequelize');
const { sequelize, ...models } = require('../../../models');
const { AppError } = require('../../../middlewares/errorMiddleware');
const { getPaginationOptions, buildMeta } = require('../../../utils/pagination');
const logger = require('../../../utils/logger');

// Destructure models for cleaner access
const {
  StaffingPlan,
  JobRequisition,
  JobOpening,
  EmployeeReferral,
  JobApplicant,
  Interview,
  InterviewFeedback,
  JobOffer,
  AppointmentLetter,
  Employee,
  User,
  Department,
  Designation,
  Company,
  Branch,
  EmploymentType,
  EmployeeGrade,
} = models;

// ════════════════════════════════════════════════════════════════════════════
//  CONSTANTS & CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

const VALID_APPLICANT_STATUSES = ['Open', 'Replied', 'Hold', 'Accepted', 'Rejected'];
const VALID_INTERVIEW_STATUSES = ['Scheduled', 'Under Review', 'Pending', 'Cleared', 'Not Cleared', 'Cancelled', 'No Show'];
const VALID_INTERVIEW_TYPES = ['One-on-One', 'Panel', 'Technical', 'HR', 'Case Study', 'Group Discussion', 'Video Call', 'Phone Screening'];
const VALID_OFFER_STATUSES = ['Draft', 'Awaiting Approval', 'Approved', 'Rejected by HR', 'Offer Sent', 'Accepted', 'Declined', 'Expired', 'Cancelled'];
const VALID_LETTER_STATUSES = ['Draft', 'Issued', 'Delivered', 'Acknowledged', 'Cancelled'];
const VALID_REFERRAL_STATUSES = ['Pending', 'Accepted', 'Rejected', 'In Process'];
const VALID_SOURCES = ['Website Listing', 'Employee Referral', 'Campaign', 'Walk In'];
const VALID_RESULTS = ['Cleared', 'Not Cleared', 'On Hold'];

// ════════════════════════════════════════════════════════════════════════════
//  INTERNAL HELPERS — Utilities
// ════════════════════════════════════════════════════════════════════════════

/**
 * Resolves employee record for a given userId with caching.
 * @param {string} userId - User UUID
 * @returns {Promise<object>} Employee record
 */
const employeeCache = new Map();
const EMPLOYEE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getEmployeeByUserId = async (userId) => {
  const cached = employeeCache.get(userId);
  if (cached && Date.now() - cached.timestamp < EMPLOYEE_CACHE_TTL) {
    return cached.data;
  }

  const emp = await Employee.findOne({ where: { userId } });
  if (!emp) {
    throw new AppError('No employee record linked to this user account', 403);
  }

  employeeCache.set(userId, { data: emp, timestamp: Date.now() });
  return emp;
};

/**
 * Clear employee cache (call after employee updates).
 */
const clearEmployeeCache = (userId) => {
  if (userId) employeeCache.delete(userId);
  else employeeCache.clear();
};

/**
 * Generates sequential reference number with prefix.
 * @param {string} prefix - e.g., 'REQ', 'SP', 'APT'
 * @param {object} where - Additional WHERE conditions
 * @returns {Promise<string>}
 */
const generateReferenceNumber = async (prefix, where = {}) => {
  const year = new Date().getFullYear();
  const modelMap = {
    REQ: JobRequisition,
    SP: StaffingPlan,
    APT: AppointmentLetter,
  };

  const Model = modelMap[prefix] || JobRequisition;
  const field = prefix === 'REQ' ? 'requisitionNumber' : (prefix === 'APT' ? 'referenceNumber' : 'name');

  const count = await Model.count({
    where: {
      [field]: { [Op.like]: `${prefix}-${year}-%` },
      ...where,
    },
  });

  const seq = String(count + 1).padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
};

/**
 * Validates date range.
 */
const validateDateRange = (fromDate, toDate, fieldNames = ['fromDate', 'toDate']) => {
  if (new Date(fromDate) >= new Date(toDate)) {
    throw new AppError(`${fieldNames[0]} must be before ${fieldNames[1]}`, 422);
  }
};

/**
 * Sanitizes email input.
 */
const sanitizeEmail = (email) => email?.toLowerCase().trim();

/**
 * Formats applicant name into first/last.
 */
const parseApplicantName = (fullName) => {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '.',
  };
};

/**
 * Generates temporary password for new employee.
 */
const generateTemporaryPassword = () => `Hrms@${Math.random().toString(36).slice(2, 10)}`;

/**
 * Generates employee number.
 */
const generateEmployeeNumber = async (transaction) => {
  const year = new Date().getFullYear();
  const count = await Employee.count({ transaction });
  return `EMP-${year}-${String(count + 1).padStart(4, '0')}`;
};

// ════════════════════════════════════════════════════════════════════════════
//  INTERNAL HELPERS — Staffing & Headcount
// ════════════════════════════════════════════════════════════════════════════

/**
 * Gets active staffing plan for a designation.
 */
const getActiveStaffingPlan = async (designationId, departmentId, companyId) => {
  const today = new Date().toISOString().slice(0, 10);

  return StaffingPlan.findOne({
    where: {
      companyId,
      ...(departmentId ? { departmentId } : {}),
      docStatus: 1,
      fromDate: { [Op.lte]: today },
      toDate: { [Op.gte]: today },
    },
    order: [['createdAt', 'DESC']],
  });
};

/**
 * Captures frozen snapshot of current headcount situation.
 */
const getStaffingSnapshot = async (designationId, departmentId, companyId) => {
  const [currentHeadcount, activePlan] = await Promise.all([
    Employee.count({
      where: {
        designationId,
        ...(departmentId ? { departmentId } : {}),
        companyId,
        status: 'Active',
      },
    }),
    getActiveStaffingPlan(designationId, departmentId, companyId),
  ]);

  if (!activePlan) {
    const designation = await Designation.findByPk(designationId, { attributes: ['name'] });
    return {
      staffingPlanId: null,
      planName: null,
      designationId,
      designationName: designation?.name || null,
      plannedHeadcount: 0,
      currentHeadcount,
      openRequisitions: 0,
      availableVacancies: 0,
    };
  }

  const detail = (activePlan.planDetails || []).find((d) => d.designationId === designationId);
  const plannedHeadcount = detail?.numberOfPositions ?? 0;

  const openRequisitions = await JobRequisition.count({
    where: {
      designationId,
      companyId,
      overallStatus: { [Op.in]: ['Pending HR Review', 'Pending GM Review', 'Approved'] },
    },
  });

  const designation = await Designation.findByPk(designationId, { attributes: ['name'] });

  return {
    staffingPlanId: activePlan.id,
    planName: activePlan.name,
    designationId,
    designationName: designation?.name || null,
    plannedHeadcount,
    currentHeadcount,
    openRequisitions,
    availableVacancies: Math.max(0, plannedHeadcount - currentHeadcount - openRequisitions),
  };
};

/**
 * Enriches plan details with live headcount data.
 */
const enrichPlanDetails = async (planDetails, companyId, departmentId) => {
  let totalEstimatedBudget = 0;

  const enriched = await Promise.all(
    planDetails.map(async (detail) => {
      if (!detail.designationId || !detail.numberOfPositions) {
        throw new AppError('Each planDetail must have designationId and numberOfPositions', 422);
      }

      const currentCount = await Employee.count({
        where: {
          designationId: detail.designationId,
          companyId,
          ...(departmentId ? { departmentId } : {}),
          status: 'Active',
        },
      });

      const vacancies = Math.max(0, detail.numberOfPositions - currentCount);
      const estimatedCostPerPosition = detail.estimatedCostPerPosition ?? 0;
      const totalEstimatedCost = vacancies * estimatedCostPerPosition;
      totalEstimatedBudget += totalEstimatedCost;

      return {
        ...detail,
        currentCount,
        vacancies,
        estimatedCostPerPosition,
        totalEstimatedCost,
      };
    })
  );

  return { enrichedDetails: enriched, totalEstimatedBudget };
};

// ════════════════════════════════════════════════════════════════════════════
//  INTERNAL HELPERS — Interview & Feedback
// ════════════════════════════════════════════════════════════════════════════

/**
 * Gets all panelist IDs for an interview.
 */
const getAllPanelistIds = (interview) => {
  const panel = (interview.panelMembers || []).map((p) => p.employeeId).filter(Boolean);
  return [interview.interviewerId, ...panel];
};

/**
 * Recalculates interview average rating from all feedback.
 */
const recalculateInterviewRating = async (interviewId, transaction = null) => {
  const feedbacks = await InterviewFeedback.findAll({
    where: { interviewId, docStatus: 1 },
    attributes: ['totalScore', 'maxScore'],
    transaction,
  });

  if (!feedbacks.length) return null;

  const totalSum = feedbacks.reduce((s, f) => s + parseFloat(f.totalScore || 0), 0);
  const average = parseFloat((totalSum / feedbacks.length).toFixed(2));

  await Interview.update({ averageRating: average }, { where: { id: interviewId }, transaction });
  return average;
};

/**
 * Advances interview status if all panelists submitted.
 */
const advanceInterviewStatusIfComplete = async (interviewId, transaction = null) => {
  const interview = await Interview.findByPk(interviewId, { transaction });
  if (!interview || interview.status !== 'Scheduled') return;

  const panelistIds = getAllPanelistIds(interview);
  const submittedCount = await InterviewFeedback.count({
    where: { interviewId, docStatus: 1 },
    transaction,
  });

  if (submittedCount >= panelistIds.length) {
    await Interview.update({ status: 'Under Review' }, { where: { id: interviewId }, transaction });
  }
};

// ════════════════════════════════════════════════════════════════════════════
//  PHASE 1 — STAFFING PLAN
// ════════════════════════════════════════════════════════════════════════════

/**
 * List staffing plans with pagination and filters.
 */
const getStaffingPlans = async ({ companyId, docStatus, page, limit } = {}) => {
  const where = {};
  if (companyId !== undefined) where.companyId = companyId;
  if (docStatus !== undefined) where.docStatus = Number(docStatus);

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await StaffingPlan.findAndCountAll({
    where,
    limit: lim,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      { model: Company, as: 'company', attributes: ['id', 'name'] },
      { model: Department, as: 'department', attributes: ['id', 'name'], required: false },
    ],
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Get single staffing plan by ID.
 */
const getStaffingPlanById = async (id) => {
  const plan = await StaffingPlan.findByPk(id, {
    include: [
      { model: Company, attributes: ['id', 'name'] },
      { model: Department, attributes: ['id', 'name'], required: false },
    ],
  });
  if (!plan) throw new AppError('Staffing plan not found', 404);
  return plan;
};

/**
 * Create staffing plan (Draft).
 */
const createStaffingPlan = async (data) => {
  const { name, companyId, departmentId, fromDate, toDate, planDetails = [] } = data;

  if (!name || !companyId || !fromDate || !toDate) {
    throw new AppError('name, companyId, fromDate and toDate are required', 422);
  }
  validateDateRange(fromDate, toDate);

  const duplicate = await StaffingPlan.findOne({ where: { name, companyId } });
  if (duplicate) throw new AppError('Staffing plan with this name already exists for this company', 409);

  const { enrichedDetails, totalEstimatedBudget } = await enrichPlanDetails(planDetails, companyId, departmentId);

  const plan = await StaffingPlan.create({
    name,
    companyId,
    departmentId: departmentId || null,
    fromDate,
    toDate,
    planDetails: enrichedDetails,
    totalEstimatedBudget,
    docStatus: 0,
  });

  logger.info('StaffingPlan created', { planId: plan.id, name, companyId });
  return plan;
};

/**
 * Update staffing plan (only Draft).
 */
const updateStaffingPlan = async (id, data) => {
  const plan = await getStaffingPlanById(id);
  if (plan.docStatus !== 0) throw new AppError('Only Draft staffing plans can be edited', 422);

  if (data.planDetails) {
    const { enrichedDetails, totalEstimatedBudget } = await enrichPlanDetails(
      data.planDetails,
      plan.companyId,
      plan.departmentId
    );
    data.planDetails = enrichedDetails;
    data.totalEstimatedBudget = totalEstimatedBudget;
  }

  await plan.update(data);
  logger.info('StaffingPlan updated', { planId: id });
  return plan.reload();
};

/**
 * Submit staffing plan for approval (Draft → Submitted).
 */
const submitStaffingPlan = async (id) => {
  const plan = await getStaffingPlanById(id);
  if (plan.docStatus !== 0) throw new AppError('Only Draft plans can be submitted', 422);
  if (!plan.planDetails?.length) throw new AppError('Cannot submit staffing plan with no detail rows', 422);

  await plan.update({ docStatus: 1 });
  logger.info('StaffingPlan submitted', { planId: id });
  return plan;
};

/**
 * Approve staffing plan (GM only).
 */
const approveStaffingPlan = async (id, gmUserId) => {
  const plan = await getStaffingPlanById(id);
  if (plan.docStatus !== 1) throw new AppError('Only submitted plans can be approved', 422);

  logger.info('StaffingPlan approved', { planId: id, gmUserId });
  return plan;
};

/**
 * Cancel staffing plan.
 */
const cancelStaffingPlan = async (id) => {
  const plan = await getStaffingPlanById(id);
  if (plan.docStatus === 2) throw new AppError('Plan is already cancelled', 422);

  await plan.update({ docStatus: 2 });
  logger.info('StaffingPlan cancelled', { planId: id });
  return plan;
};

// ════════════════════════════════════════════════════════════════════════════
//  PHASE 2 — JOB REQUISITION
// ════════════════════════════════════════════════════════════════════════════

const REQUISITION_INCLUDES = [
  { model: Department, as: 'department', attributes: ['id', 'name'] },
  { model: Designation, as: 'designation', attributes: ['id', 'name'] },
  { model: Company, as: 'company', attributes: ['id', 'name'] },
  { model: EmploymentType, as: 'employmentType', attributes: ['id', 'name'], required: false },
  { model: Employee, as: 'requestedBy', attributes: ['id', 'firstName', 'lastName'] },
  { model: Employee, as: 'hrManager', attributes: ['id', 'firstName', 'lastName'], required: false },
  { model: Employee, as: 'generalManager', attributes: ['id', 'firstName', 'lastName'], required: false },
  { model: JobOpening, as: 'jobOpening', attributes: ['id', 'jobTitle', 'status'], required: false },
];

/**
 * List job requisitions with pagination.
 */
const getJobRequisitions = async ({ companyId, departmentId, overallStatus, requestedById, page, limit } = {}) => {
  const where = {};
  if (companyId !== undefined) where.companyId = companyId;
  if (departmentId !== undefined) where.departmentId = departmentId;
  if (overallStatus !== undefined) where.overallStatus = overallStatus;
  if (requestedById !== undefined) where.requestedById = requestedById;

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await JobRequisition.findAndCountAll({
    where,
    limit: lim,
    offset,
    order: [['createdAt', 'DESC']],
    include: REQUISITION_INCLUDES,
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Get single job requisition by ID.
 */
const getJobRequisitionById = async (id) => {
  const req = await JobRequisition.findByPk(id, { include: REQUISITION_INCLUDES });
  if (!req) throw new AppError('Job requisition not found', 404);
  return req;
};

/**
 * Create job requisition (Department Head).
 */
const createJobRequisition = async (data, userId) => {
  const {
    departmentId,
    designationId,
    companyId,
    employmentTypeId,
    numberOfPositions = 1,
    replacementFor,
    isNewPosition = false,
    reasonForHiring,
    proposedSalaryMin,
    proposedSalaryMax,
    targetHireDate,
    currency = 'ETB',
  } = data;

  if (!departmentId || !designationId || !companyId || !reasonForHiring) {
    throw new AppError('departmentId, designationId, companyId and reasonForHiring are required', 422);
  }

  const requester = await getEmployeeByUserId(userId);
  const [requisitionNumber, staffingSnapshot] = await Promise.all([
    generateReferenceNumber('REQ', { companyId }),
    getStaffingSnapshot(designationId, departmentId, companyId),
  ]);

  const requisition = await JobRequisition.create({
    requisitionNumber,
    departmentId,
    designationId,
    companyId,
    employmentTypeId: employmentTypeId || null,
    requestedById: requester.id,
    requestedOn: new Date(),
    numberOfPositions,
    replacementFor: replacementFor || null,
    isNewPosition,
    reasonForHiring,
    proposedSalaryMin: proposedSalaryMin ?? null,
    proposedSalaryMax: proposedSalaryMax ?? null,
    targetHireDate: targetHireDate || null,
    currency,
    staffingSnapshot,
    overallStatus: 'Draft',
    hrStatus: 'Pending',
    gmStatus: 'Pending',
    docStatus: 0,
  });

  logger.info('JobRequisition created', { requisitionId: requisition.id, requisitionNumber });
  return requisition;
};

/**
 * Submit job requisition for HR review.
 */
const submitJobRequisition = async (id, userId) => {
  const requisition = await getJobRequisitionById(id);
  if (requisition.overallStatus !== 'Draft') throw new AppError('Only Draft requisitions can be submitted', 422);

  const requester = await getEmployeeByUserId(userId);
  if (requisition.requestedById !== requester.id) {
    throw new AppError('Only the creator can submit this requisition', 403);
  }

  await requisition.update({ overallStatus: 'Pending HR Review', docStatus: 1 });
  logger.info('JobRequisition submitted', { requisitionId: id });
  return requisition;
};

/**
 * HR approves requisition (Level 1).
 */
const approveHRRequisition = async (id, userId, remarks = null) => {
  const requisition = await getJobRequisitionById(id);
  if (requisition.overallStatus !== 'Pending HR Review') {
    throw new AppError('Requisition is not pending HR review', 422);
  }

  const hrManager = await getEmployeeByUserId(userId);

  await requisition.update({
    hrStatus: 'Approved',
    hrManagerId: hrManager.id,
    hrReviewedOn: new Date(),
    hrRemarks: remarks,
    overallStatus: 'Pending GM Review',
  });

  logger.info('JobRequisition HR-approved', { requisitionId: id, hrManagerId: hrManager.id });
  return requisition;
};

/**
 * HR rejects requisition (Level 1).
 */
const rejectHRRequisition = async (id, userId, reason) => {
  if (!reason) throw new AppError('Rejection reason is required', 422);

  const requisition = await getJobRequisitionById(id);
  if (requisition.overallStatus !== 'Pending HR Review') {
    throw new AppError('Requisition is not pending HR review', 422);
  }

  const hrManager = await getEmployeeByUserId(userId);

  await requisition.update({
    hrStatus: 'Rejected',
    hrManagerId: hrManager.id,
    hrReviewedOn: new Date(),
    hrRemarks: reason,
    overallStatus: 'HR Rejected',
  });

  logger.info('JobRequisition HR-rejected', { requisitionId: id, reason });
  return requisition;
};

/**
 * GM approves requisition (Level 2) - auto-creates JobOpening.
 */
const approveGMRequisition = async (id, userId, remarks = null) => {
  const requisition = await JobRequisition.findByPk(id, {
    include: [{ model: Designation, attributes: ['id', 'name'] }],
  });
  if (!requisition) throw new AppError('Job requisition not found', 404);
  if (requisition.overallStatus !== 'Pending GM Review') {
    throw new AppError('Requisition is not pending GM review', 422);
  }

  const gm = await getEmployeeByUserId(userId);

  const result = await sequelize.transaction(async (t) => {
    await requisition.update(
      {
        gmStatus: 'Approved',
        gmId: gm.id,
        gmReviewedOn: new Date(),
        gmRemarks: remarks,
        overallStatus: 'Approved',
      },
      { transaction: t }
    );

    const jobTitle = requisition.Designation?.name || 'Open Position';

    const opening = await JobOpening.create(
      {
        jobTitle,
        staffingPlanId: requisition.staffingSnapshot?.staffingPlanId || null,
        departmentId: requisition.departmentId,
        designationId: requisition.designationId,
        companyId: requisition.companyId,
        plannedNumberOfPositions: requisition.numberOfPositions,
        expectedSalaryFrom: requisition.proposedSalaryMin || null,
        expectedSalaryTo: requisition.proposedSalaryMax || null,
        status: 'Open',
        publishOnWebsite: false,
      },
      { transaction: t }
    );

    await requisition.update({ jobOpeningId: opening.id }, { transaction: t });

    return { requisition, opening };
  });

  logger.info('JobRequisition GM-approved, JobOpening created', {
    requisitionId: id,
    jobOpeningId: result.opening.id,
  });

  return result;
};

/**
 * GM rejects requisition (Level 2).
 */
const rejectGMRequisition = async (id, userId, reason) => {
  if (!reason) throw new AppError('Rejection reason is required', 422);

  const requisition = await getJobRequisitionById(id);
  if (requisition.overallStatus !== 'Pending GM Review') {
    throw new AppError('Requisition is not pending GM review', 422);
  }

  const gm = await getEmployeeByUserId(userId);

  await requisition.update({
    gmStatus: 'Rejected',
    gmId: gm.id,
    gmReviewedOn: new Date(),
    gmRemarks: reason,
    overallStatus: 'GM Rejected',
  });

  logger.info('JobRequisition GM-rejected', { requisitionId: id, reason });
  return requisition;
};

/**
 * Cancel job requisition.
 */
const cancelJobRequisition = async (id, userId, remarks = null) => {
  const requisition = await getJobRequisitionById(id);
  if (requisition.overallStatus === 'Approved') {
    throw new AppError('Approved requisition cannot be cancelled. Cancel the Job Opening instead.', 422);
  }

  await requisition.update({ overallStatus: 'Cancelled', remarks, docStatus: 2 });
  logger.info('JobRequisition cancelled', { requisitionId: id });
  return requisition;
};

// ════════════════════════════════════════════════════════════════════════════
//  PHASE 3 — JOB OPENING
// ════════════════════════════════════════════════════════════════════════════

const OPENING_INCLUDES = [
  { model: Company, attributes: ['id', 'name'] },
  { model: Department, attributes: ['id', 'name'], required: false },
  { model: Designation, attributes: ['id', 'name'], required: false },
  { model: StaffingPlan, attributes: ['id', 'name'], required: false },
];

/**
 * List job openings with pagination.
 */
const getJobOpenings = async ({ companyId, departmentId, designationId, status, publicOnly = false, page, limit } = {}) => {
  const where = {};
  if (companyId !== undefined) where.companyId = companyId;
  if (departmentId !== undefined) where.departmentId = departmentId;
  if (designationId !== undefined) where.designationId = designationId;
  if (status !== undefined) where.status = status;
  if (publicOnly) where.publishOnWebsite = true;

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await JobOpening.findAndCountAll({
    where,
    limit: lim,
    offset,
    order: [['createdAt', 'DESC']],
    include: OPENING_INCLUDES,
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Get single job opening by ID.
 */
const getJobOpeningById = async (id) => {
  const opening = await JobOpening.findByPk(id, { include: OPENING_INCLUDES });
  if (!opening) throw new AppError('Job opening not found', 404);
  return opening;
};

/**
 * Create job opening (HR or from requisition).
 */
const createJobOpening = async (data) => {
  const { jobTitle, departmentId, designationId, companyId, staffingPlanId, plannedNumberOfPositions = 1, description, expectedSalaryFrom, expectedSalaryTo } = data;

  if (!jobTitle || !companyId) {
    throw new AppError('jobTitle and companyId are required', 422);
  }

  const opening = await JobOpening.create({
    jobTitle,
    departmentId: departmentId || null,
    designationId: designationId || null,
    companyId,
    staffingPlanId: staffingPlanId || null,
    plannedNumberOfPositions,
    description: description || null,
    expectedSalaryFrom: expectedSalaryFrom || null,
    expectedSalaryTo: expectedSalaryTo || null,
    publishOnWebsite: false,
    status: 'Open',
    docStatus: 0,
  });

  logger.info('JobOpening created', { openingId: opening.id, jobTitle });
  return opening;
};

/**
 * Update job opening.
 */
const updateJobOpening = async (id, data) => {
  const opening = await getJobOpeningById(id);
  if (opening.status === 'Closed') throw new AppError('Cannot edit a closed job opening', 422);

  const allowed = ['jobTitle', 'description', 'expectedSalaryFrom', 'expectedSalaryTo', 'plannedNumberOfPositions'];
  const updates = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));

  await opening.update(updates);
  logger.info('JobOpening updated', { openingId: id });
  return opening.reload();
};

/**
 * Publish/unpublish job opening.
 */
const publishJobOpening = async (id, publish = true) => {
  const opening = await getJobOpeningById(id);
  if (opening.status === 'Closed') throw new AppError('Cannot publish a closed job opening', 422);

  await opening.update({ publishOnWebsite: publish });
  logger.info(`JobOpening ${publish ? 'published' : 'unpublished'}`, { openingId: id });
  return opening;
};

/**
 * Close job opening.
 */
const closeJobOpening = async (id) => {
  const opening = await getJobOpeningById(id);
  if (opening.status === 'Closed') throw new AppError('Job opening is already closed', 422);

  await opening.update({ status: 'Closed', closedDate: new Date(), publishOnWebsite: false });
  logger.info('JobOpening closed', { openingId: id });
  return opening;
};

/**
 * List public job openings (no auth).
 */
const listPublicJobOpenings = async ({ page, limit } = {}) => {
  return getJobOpenings({ status: 'Open', publicOnly: true, page, limit });
};

// ════════════════════════════════════════════════════════════════════════════
//  PHASE 4 — JOB APPLICANT
// ════════════════════════════════════════════════════════════════════════════

const APPLICANT_INCLUDES = [
  { model: JobOpening, attributes: ['id', 'jobTitle', 'status'] },
  { model: EmployeeReferral, as: 'referral', attributes: ['id', 'referrerId', 'coverNote'], required: false },
];

/**
 * List job applicants with pagination.
 */
const getJobApplicants = async ({ jobOpeningId, status, source, page, limit } = {}) => {
  const where = {};
  if (jobOpeningId !== undefined) where.jobOpeningId = jobOpeningId;
  if (status !== undefined) where.status = status;
  if (source !== undefined) where.source = source;

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await JobApplicant.findAndCountAll({
    where,
    limit: lim,
    offset,
    order: [['createdAt', 'DESC']],
    include: APPLICANT_INCLUDES,
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Get single job applicant by ID.
 */
const getJobApplicantById = async (id) => {
  const applicant = await JobApplicant.findByPk(id, { include: APPLICANT_INCLUDES });
  if (!applicant) throw new AppError('Job applicant not found', 404);
  return applicant;
};

/**
 * Create job applicant (public apply).
 */
const createJobApplicant = async (data, referralToken = null) => {
  const { jobOpeningId, applicantName, email, phone, coverLetter, resumeUrl, linkedinUrl, currentSalary, expectedSalary } = data;

  if (!jobOpeningId || !applicantName || !email) {
    throw new AppError('jobOpeningId, applicantName and email are required', 422);
  }

  const opening = await JobOpening.findByPk(jobOpeningId);
  if (!opening) throw new AppError('Job opening not found', 404);
  if (opening.status !== 'Open') throw new AppError('This job opening is no longer accepting applications', 422);
  if (!opening.publishOnWebsite) throw new AppError('This job opening is not published', 422);

  const sanitizedEmail = sanitizeEmail(email);
  const duplicate = await JobApplicant.findOne({ where: { email: sanitizedEmail, jobOpeningId } });
  if (duplicate) throw new AppError('An application from this email already exists for this opening', 409);

  let employeeReferralId = null;
  let source = 'Website Listing';

  if (referralToken) {
    const referral = await EmployeeReferral.findOne({
      where: { id: referralToken, jobOpeningId, status: 'Accepted' },
    });
    if (referral) {
      employeeReferralId = referral.id;
      source = 'Employee Referral';
    }
  }

  const applicant = await JobApplicant.create({
    jobOpeningId,
    employeeReferralId,
    applicantName: applicantName.trim(),
    email: sanitizedEmail,
    phone: phone || null,
    source,
    coverLetter: coverLetter || null,
    resumeUrl: resumeUrl || null,
    linkedinUrl: linkedinUrl || null,
    currentSalary: currentSalary ?? null,
    expectedSalary: expectedSalary ?? null,
    status: 'Open',
  });

  logger.info('JobApplicant created', { applicantId: applicant.id, email: sanitizedEmail });
  return applicant;
};

/**
 * Update applicant status.
 */
const updateApplicantStatus = async (id, status, rejectionReason = null) => {
  if (!VALID_APPLICANT_STATUSES.includes(status)) {
    throw new AppError(`Invalid status: ${status}. Valid: ${VALID_APPLICANT_STATUSES.join(', ')}`, 422);
  }

  const applicant = await getJobApplicantById(id);
  if (applicant.status === 'Accepted' && status !== 'Accepted') {
    throw new AppError('Cannot change status of an already accepted applicant', 422);
  }

  const updates = { status };
  if (status === 'Rejected' && rejectionReason) updates.rejectionReason = rejectionReason;

  await applicant.update(updates);
  logger.info('JobApplicant status updated', { applicantId: id, status });
  return applicant;
};

/**
 * Rate applicant.
 */
const rateApplicant = async (id, rating) => {
  if (rating < 0 || rating > 5) throw new AppError('Rating must be between 0 and 5', 422);

  const applicant = await getJobApplicantById(id);
  await applicant.update({ rating });
  logger.info('JobApplicant rated', { applicantId: id, rating });
  return applicant;
};

// ════════════════════════════════════════════════════════════════════════════
//  PHASE 5 — EMPLOYEE REFERRAL
// ════════════════════════════════════════════════════════════════════════════

const REFERRAL_INCLUDES = [
  { model: Employee, as: 'referrer', attributes: ['id', 'firstName', 'lastName'] },
  { model: JobOpening, attributes: ['id', 'jobTitle', 'status'] },
  { model: JobApplicant, as: 'applicants', attributes: ['id', 'applicantName', 'status'], required: false },
];

/**
 * List employee referrals.
 */
const getEmployeeReferrals = async ({ referrerId, jobOpeningId, status, page, limit } = {}) => {
  const where = {};
  if (referrerId !== undefined) where.referrerId = referrerId;
  if (jobOpeningId !== undefined) where.jobOpeningId = jobOpeningId;
  if (status !== undefined) where.status = status;

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await EmployeeReferral.findAndCountAll({
    where,
    limit: lim,
    offset,
    order: [['createdAt', 'DESC']],
    include: REFERRAL_INCLUDES,
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Get single employee referral by ID.
 */
const getEmployeeReferralById = async (id) => {
  const referral = await EmployeeReferral.findByPk(id, { include: REFERRAL_INCLUDES });
  if (!referral) throw new AppError('Employee referral not found', 404);
  return referral;
};

/**
 * Create employee referral.
 */
const createEmployeeReferral = async (data, userId) => {
  const { jobOpeningId, candidateName, candidateEmail, candidatePhone, coverNote } = data;

  if (!jobOpeningId || !candidateName || !candidateEmail) {
    throw new AppError('jobOpeningId, candidateName and candidateEmail are required', 422);
  }

  const opening = await JobOpening.findByPk(jobOpeningId);
  if (!opening || opening.status !== 'Open') {
    throw new AppError('Job opening is not accepting referrals', 422);
  }

  const referrer = await getEmployeeByUserId(userId);
  const sanitizedEmail = sanitizeEmail(candidateEmail);

  const duplicate = await EmployeeReferral.findOne({
    where: {
      referrerId: referrer.id,
      jobOpeningId,
      candidateEmail: sanitizedEmail,
    },
  });
  if (duplicate) throw new AppError('You have already referred this candidate for this opening', 409);

  const referral = await EmployeeReferral.create({
    referrerId: referrer.id,
    jobOpeningId,
    candidateName: candidateName.trim(),
    candidateEmail: sanitizedEmail,
    candidatePhone: candidatePhone || null,
    coverNote: coverNote || null,
    status: 'Pending',
    bonusPaid: false,
    referralBonusAmount: 0,
  });

  logger.info('EmployeeReferral created', { referralId: referral.id, referrerId: referrer.id });
  return referral;
};

/**
 * Accept employee referral - creates JobApplicant.
 */
const acceptEmployeeReferral = async (id) => {
  const referral = await getEmployeeReferralById(id);
  if (referral.status !== 'Pending') throw new AppError('Only Pending referrals can be accepted', 422);

  const result = await sequelize.transaction(async (t) => {
    const existing = await JobApplicant.findOne({
      where: { email: referral.candidateEmail, jobOpeningId: referral.jobOpeningId },
      transaction: t,
    });
    if (existing) throw new AppError('An applicant with this email already exists for this opening', 409);

    const applicant = await JobApplicant.create(
      {
        jobOpeningId: referral.jobOpeningId,
        employeeReferralId: referral.id,
        applicantName: referral.candidateName,
        email: referral.candidateEmail,
        phone: referral.candidatePhone || null,
        source: 'Employee Referral',
        status: 'Open',
      },
      { transaction: t }
    );

    await referral.update({ status: 'Accepted', jobApplicantId: applicant.id }, { transaction: t });

    return { referral, applicant };
  });

  logger.info('EmployeeReferral accepted, JobApplicant created', {
    referralId: id,
    applicantId: result.applicant.id,
  });

  return result;
};

/**
 * Reject employee referral.
 */
const rejectEmployeeReferral = async (id, reason = null) => {
  const referral = await getEmployeeReferralById(id);
  if (referral.status !== 'Pending') throw new AppError('Only Pending referrals can be rejected', 422);

  await referral.update({ status: 'Rejected' });
  logger.info('EmployeeReferral rejected', { referralId: id, reason });
  return referral;
};

/**
 * Mark referral bonus as paid.
 */
const markReferralBonusPaid = async (id) => {
  const referral = await getEmployeeReferralById(id);
  if (referral.bonusPaid) throw new AppError('Referral bonus is already marked as paid', 422);

  await referral.update({ bonusPaid: true });
  logger.info('Referral bonus marked paid', { referralId: id });
  return referral;
};

// ════════════════════════════════════════════════════════════════════════════
//  PHASE 6 — INTERVIEW MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

const INTERVIEW_INCLUDES = [
  { model: JobApplicant, attributes: ['id', 'applicantName', 'email', 'status'] },
  { model: JobOpening, attributes: ['id', 'jobTitle'] },
  { model: Employee, as: 'interviewer', attributes: ['id', 'firstName', 'lastName'] },
  { model: InterviewFeedback, as: 'feedbacks', required: false },
];

/**
 * List interviews.
 */
const getInterviews = async ({ jobApplicantId, jobOpeningId, interviewerId, status, page, limit } = {}) => {
  const where = {};
  if (jobApplicantId !== undefined) where.jobApplicantId = jobApplicantId;
  if (jobOpeningId !== undefined) where.jobOpeningId = jobOpeningId;
  if (interviewerId !== undefined) where.interviewerId = interviewerId;
  if (status !== undefined) where.status = status;

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await Interview.findAndCountAll({
    where,
    limit: lim,
    offset,
    order: [['scheduledOn', 'ASC']],
    include: INTERVIEW_INCLUDES,
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Get single interview by ID.
 */
const getInterviewById = async (id) => {
  const interview = await Interview.findByPk(id, { include: INTERVIEW_INCLUDES });
  if (!interview) throw new AppError('Interview not found', 404);
  return interview;
};

/**
 * Schedule interview.
 */
const createInterview = async (data) => {
  const { jobApplicantId, jobOpeningId, interviewerId, name, interviewRound = 1, interviewType = 'One-on-One', scheduledOn, duration, location, panelMembers = [], skillCriteria = [] } = data;

  if (!jobApplicantId || !jobOpeningId || !interviewerId || !scheduledOn || !name) {
    throw new AppError('jobApplicantId, jobOpeningId, interviewerId, scheduledOn and name are required', 422);
  }

  if (!VALID_INTERVIEW_TYPES.includes(interviewType)) {
    throw new AppError(`Invalid interviewType. Valid: ${VALID_INTERVIEW_TYPES.join(', ')}`, 422);
  }

  const [applicant, opening, interviewer] = await Promise.all([
    JobApplicant.findByPk(jobApplicantId),
    JobOpening.findByPk(jobOpeningId),
    Employee.findByPk(interviewerId),
  ]);

  if (!applicant) throw new AppError('Job applicant not found', 404);
  if (!opening) throw new AppError('Job opening not found', 404);
  if (!interviewer) throw new AppError('Interviewer employee not found', 404);
  if (applicant.jobOpeningId !== jobOpeningId) {
    throw new AppError('Applicant is not linked to this job opening', 422);
  }

  // Conflict check
  const ivStart = new Date(scheduledOn);
  const ivEnd = new Date(ivStart.getTime() + (duration || 60) * 60000);

  const conflict = await Interview.findOne({
    where: {
      interviewerId,
      status: { [Op.in]: ['Scheduled', 'Under Review', 'Pending'] },
      scheduledOn: { [Op.between]: [ivStart, ivEnd] },
    },
  });
  if (conflict) throw new AppError('The interviewer has a scheduling conflict at that time', 409);

  const interview = await Interview.create({
    jobApplicantId,
    jobOpeningId,
    interviewerId,
    name,
    interviewRound,
    interviewType,
    scheduledOn: new Date(scheduledOn),
    duration: duration || null,
    location: location || null,
    panelMembers,
    skillCriteria,
    status: 'Scheduled',
    candidateNotified: false,
    docStatus: 0,
  });

  if (applicant.status === 'Open') {
    await applicant.update({ status: 'Replied' });
  }

  logger.info('Interview scheduled', { interviewId: interview.id, applicantId: jobApplicantId });
  return interview;
};

/**
 * Update interview.
 */
const updateInterview = async (id, data) => {
  const interview = await getInterviewById(id);
  if (!['Scheduled', 'Pending'].includes(interview.status)) {
    throw new AppError('Only Scheduled or Pending interviews can be updated', 422);
  }

  const allowed = ['scheduledOn', 'duration', 'location', 'panelMembers', 'skillCriteria', 'name', 'interviewType'];
  const updates = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));

  await interview.update(updates);
  logger.info('Interview updated', { interviewId: id });
  return interview.reload();
};

/**
 * Cancel interview.
 */
const cancelInterview = async (id, remarks = null) => {
  const interview = await getInterviewById(id);
  if (interview.status === 'Cancelled') throw new AppError('Interview is already cancelled', 422);

  await interview.update({ status: 'Cancelled', remarks });
  logger.info('Interview cancelled', { interviewId: id });
  return interview;
};

/**
 * Mark candidate as notified.
 */
const markCandidateNotified = async (id) => {
  const interview = await getInterviewById(id);
  await interview.update({ candidateNotified: true });
  return interview;
};

/**
 * Update interview status.
 */
const updateInterviewStatus = async (id, status, remarks = null) => {
  if (!VALID_INTERVIEW_STATUSES.includes(status)) {
    throw new AppError(`Invalid status. Valid: ${VALID_INTERVIEW_STATUSES.join(', ')}`, 422);
  }

  const interview = await getInterviewById(id);
  await interview.update({ status, ...(remarks ? { remarks } : {}) });
  logger.info('Interview status updated', { interviewId: id, status });
  return interview;
};

// ════════════════════════════════════════════════════════════════════════════
//  PHASE 7 — INTERVIEW FEEDBACK
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get all feedback for an interview.
 */
const getInterviewFeedback = async (interviewId) => {
  await getInterviewById(interviewId);
  return InterviewFeedback.findAll({
    where: { interviewId },
    include: [{ model: Employee, as: 'reviewer', attributes: ['id', 'firstName', 'lastName'] }],
  });
};

/**
 * Get single feedback by ID.
 */
const getInterviewFeedbackById = async (id) => {
  const feedback = await InterviewFeedback.findByPk(id, {
    include: [{ model: Employee, as: 'reviewer', attributes: ['id', 'firstName', 'lastName'] }],
  });
  if (!feedback) throw new AppError('Interview feedback not found', 404);
  return feedback;
};

/**
 * Submit interview feedback.
 */
const createInterviewFeedback = async (data, userId) => {
  const { interviewId, skillAssessments = [], competencyRatings = [], strengths, weaknesses, recommendation, result } = data;

  if (!interviewId || !result) throw new AppError('interviewId and result are required', 422);
  if (!VALID_RESULTS.includes(result)) {
    throw new AppError(`result must be one of: ${VALID_RESULTS.join(', ')}`, 422);
  }

  const interview = await getInterviewById(interviewId);
  if (interview.status === 'Cancelled') throw new AppError('Cannot submit feedback for a cancelled interview', 422);

  const reviewer = await getEmployeeByUserId(userId);
  const authorisedIds = getAllPanelistIds(interview);
  if (!authorisedIds.includes(reviewer.id)) {
    throw new AppError('You are not assigned as an interviewer for this round', 403);
  }

  const totalScore = skillAssessments.reduce((s, a) => s + (parseFloat(a.score) || 0), 0);
  const maxScore = skillAssessments.reduce((s, a) => s + (parseFloat(a.maximumScore) || 0), 0);

  const feedback = await sequelize.transaction(async (t) => {
    const fb = await InterviewFeedback.create(
      {
        interviewId,
        reviewerId: reviewer.id,
        skillAssessments,
        competencyRatings,
        totalScore: parseFloat(totalScore.toFixed(2)),
        maxScore: parseFloat(maxScore.toFixed(2)),
        result,
        strengths: strengths || null,
        weaknesses: weaknesses || null,
        recommendation: recommendation || null,
        isConfidential: true,
        docStatus: 1,
      },
      { transaction: t }
    );

    await recalculateInterviewRating(interviewId, t);
    await advanceInterviewStatusIfComplete(interviewId, t);

    return fb;
  });

  logger.info('InterviewFeedback submitted', { feedbackId: feedback.id, interviewId, reviewerId: reviewer.id, result });
  return feedback;
};

// ════════════════════════════════════════════════════════════════════════════
//  PHASE 8 — JOB OFFER
// ════════════════════════════════════════════════════════════════════════════

const OFFER_INCLUDES = [
  { model: JobApplicant, attributes: ['id', 'applicantName', 'email'] },
  { model: JobOpening, attributes: ['id', 'jobTitle'] },
  { model: Designation, attributes: ['id', 'name'], required: false },
  { model: Employee, as: 'approvedBy', attributes: ['id', 'firstName', 'lastName'], required: false },
  { model: AppointmentLetter, as: 'appointmentLetter', required: false },
];

/**
 * List job offers.
 */
const getJobOffers = async ({ jobOpeningId, status, page, limit } = {}) => {
  const where = {};
  if (jobOpeningId !== undefined) where.jobOpeningId = jobOpeningId;
  if (status !== undefined) where.status = status;

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await JobOffer.findAndCountAll({
    where,
    limit: lim,
    offset,
    order: [['createdAt', 'DESC']],
    include: OFFER_INCLUDES,
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Get single job offer by ID.
 */
const getJobOfferById = async (id) => {
  const offer = await JobOffer.findByPk(id, { include: OFFER_INCLUDES });
  if (!offer) throw new AppError('Job offer not found', 404);
  return offer;
};

/**
 * Create job offer.
 */
const createJobOffer = async (data) => {
  const { jobApplicantId, jobOpeningId, designationId, offerDate, expiryDate, proposedJoiningDate, companyId, departmentId, branchId, employmentTypeId, gradeId, currency = 'ETB', grossSalary, offerTerms = [], probationPeriodMonths = 3, remarks } = data;

  if (!jobApplicantId || !jobOpeningId || !offerDate || !grossSalary) {
    throw new AppError('jobApplicantId, jobOpeningId, offerDate and grossSalary are required', 422);
  }

  const existing = await JobOffer.findOne({ where: { jobApplicantId } });
  if (existing) throw new AppError('A job offer already exists for this applicant', 409);

  const applicant = await JobApplicant.findByPk(jobApplicantId);
  if (!applicant) throw new AppError('Job applicant not found', 404);
  if (applicant.status !== 'Accepted') {
    throw new AppError('A job offer can only be created for an Accepted applicant', 422);
  }

  const offer = await JobOffer.create({
    jobApplicantId,
    jobOpeningId,
    designationId: designationId || null,
    offerDate,
    expiryDate: expiryDate || null,
    proposedJoiningDate: proposedJoiningDate || null,
    companyId: companyId || null,
    departmentId: departmentId || null,
    branchId: branchId || null,
    employmentTypeId: employmentTypeId || null,
    gradeId: gradeId || null,
    currency,
    grossSalary,
    offerTerms,
    probationPeriodMonths,
    remarks: remarks || null,
    status: 'Draft',
    docStatus: 0,
  });

  logger.info('JobOffer created', { offerId: offer.id, applicantId: jobApplicantId });
  return offer;
};

/**
 * Update job offer.
 */
const updateJobOffer = async (id, data) => {
  const offer = await getJobOfferById(id);
  if (!['Draft', 'Awaiting Approval'].includes(offer.status)) {
    throw new AppError('Only Draft or Awaiting Approval offers can be edited', 422);
  }

  const allowed = ['offerDate', 'expiryDate', 'proposedJoiningDate', 'designationId', 'companyId', 'departmentId', 'branchId', 'employmentTypeId', 'gradeId', 'currency', 'grossSalary', 'offerTerms', 'probationPeriodMonths', 'remarks'];

  const updates = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.includes(k)));

  await offer.update(updates);
  logger.info('JobOffer updated', { offerId: id });
  return offer.reload();
};

/**
 * Submit job offer for approval.
 */
const submitJobOfferForApproval = async (id) => {
  const offer = await getJobOfferById(id);
  if (offer.status !== 'Draft') throw new AppError('Only Draft offers can be submitted for approval', 422);

  await offer.update({ status: 'Awaiting Approval' });
  logger.info('JobOffer submitted for approval', { offerId: id });
  return offer;
};

/**
 * Approve job offer (GM).
 */
const approveJobOffer = async (id, userId) => {
  const offer = await getJobOfferById(id);
  if (offer.status !== 'Awaiting Approval') throw new AppError('Offer is not awaiting approval', 422);

  const gm = await getEmployeeByUserId(userId);

  await offer.update({
    status: 'Approved',
    approvedById: gm.id,
    approvedOn: new Date(),
  });

  logger.info('JobOffer approved', { offerId: id, approvedBy: gm.id });
  return offer;
};

/**
 * Reject job offer (HR).
 */
const rejectJobOffer = async (id, remarks) => {
  const offer = await getJobOfferById(id);
  if (offer.status !== 'Awaiting Approval') throw new AppError('Only offers awaiting approval can be rejected', 422);
  if (!remarks) throw new AppError('Rejection remarks are required', 422);

  await offer.update({ status: 'Rejected by HR', remarks });
  logger.info('JobOffer rejected', { offerId: id });
  return offer;
};

/**
 * Send job offer to candidate.
 */
const sendJobOffer = async (id) => {
  const offer = await getJobOfferById(id);
  if (offer.status !== 'Approved') throw new AppError('Only Approved offers can be sent', 422);

  await offer.update({ status: 'Offer Sent' });
  logger.info('JobOffer sent to candidate', { offerId: id });
  return offer;
};

/**
 * Accept job offer (candidate).
 */
const acceptJobOffer = async (id) => {
  const offer = await getJobOfferById(id);
  if (offer.status !== 'Offer Sent') throw new AppError('Only a sent offer can be accepted', 422);

  const result = await sequelize.transaction(async (t) => {
    await offer.update({ status: 'Accepted', acceptedOn: new Date() }, { transaction: t });

    const letter = await AppointmentLetter.create(
      {
        jobApplicantId: offer.jobApplicantId,
        jobOfferId: offer.id,
        letterDate: new Date().toISOString().split('T')[0],
        candidateEmail: offer.JobApplicant?.email || null,
        deliveryMethod: 'Email',
        status: 'Draft',
        docStatus: 0,
      },
      { transaction: t }
    );

    return { offer, letter };
  });

  logger.info('JobOffer accepted, AppointmentLetter draft created', { offerId: id, letterId: result.letter.id });
  return result;
};

/**
 * Decline job offer (candidate).
 */
const declineJobOffer = async (id, declineReason = null) => {
  const offer = await getJobOfferById(id);
  if (offer.status !== 'Offer Sent') throw new AppError('Only a sent offer can be declined', 422);

  await sequelize.transaction(async (t) => {
    await offer.update(
      {
        status: 'Declined',
        declinedOn: new Date(),
        declineReason: declineReason || null,
      },
      { transaction: t }
    );

    await JobApplicant.update({ status: 'Rejected' }, { where: { id: offer.jobApplicantId }, transaction: t });
  });

  logger.info('JobOffer declined', { offerId: id });
  return offer;
};

/**
 * Expire job offer.
 */
const expireJobOffer = async (id) => {
  const offer = await getJobOfferById(id);
  if (!['Offer Sent', 'Approved'].includes(offer.status)) {
    throw new AppError('Only sent or approved offers can be expired', 422);
  }

  await offer.update({ status: 'Expired' });
  logger.info('JobOffer expired', { offerId: id });
  return offer;
};

// ════════════════════════════════════════════════════════════════════════════
//  PHASE 9 — APPOINTMENT LETTER
// ════════════════════════════════════════════════════════════════════════════

const LETTER_INCLUDES = [
  { model: JobApplicant, as: 'jobApplicant', attributes: ['id', 'applicantName', 'email'] },
  { model: JobOffer, as: 'jobOffer', attributes: ['id', 'status', 'grossSalary', 'offerTerms', 'proposedJoiningDate'] },
];

/**
 * List appointment letters.
 */
const getAppointmentLetters = async ({ status, page, limit } = {}) => {
  const where = {};
  if (status !== undefined) where.status = status;

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await AppointmentLetter.findAndCountAll({
    where,
    limit: lim,
    offset,
    order: [['letterDate', 'DESC']],
    include: LETTER_INCLUDES,
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Get single appointment letter by ID.
 */
const getAppointmentLetterById = async (id) => {
  const letter = await AppointmentLetter.findByPk(id, { include: LETTER_INCLUDES });
  if (!letter) throw new AppError('Appointment letter not found', 404);
  return letter;
};

/**
 * Generate appointment letter.
 */
const generateAppointmentLetter = async (id, { templateKey, signedById, candidateEmail }) => {
  const letter = await getAppointmentLetterById(id);
  const offer = await getJobOfferById(letter.jobOfferId);

  if (letter.status !== 'Draft') throw new AppError('Letter has already been issued or cancelled', 422);

  const referenceNumber = await generateReferenceNumber('APT');
  const body = renderLetterTemplate(offer, templateKey);

  await letter.update({
    referenceNumber,
    templateKey: templateKey || 'default',
    body,
    signedById: signedById || null,
    candidateEmail: candidateEmail || offer.JobApplicant?.email || null,
    status: 'Draft',
  });

  logger.info('AppointmentLetter generated', { letterId: id });
  return letter.reload();
};

/**
 * Render letter template (stub - replace with actual template engine).
 */
const renderLetterTemplate = (offer, templateKey) => {
  return `<p>Dear Candidate,</p><p>We are pleased to offer you the position. Gross salary: ${offer.grossSalary}.</p>`;
};

/**
 * Sign appointment letter.
 */
const signAppointmentLetter = async (id, signedById) => {
  const letter = await getAppointmentLetterById(id);
  if (letter.status !== 'Draft') throw new AppError('Only Draft letters can be signed', 422);
  if (!letter.body) throw new AppError('Letter body must be generated before signing', 422);

  await letter.update({
    signedById,
    signedOn: new Date(),
    status: 'Issued',
  });

  logger.info('AppointmentLetter signed', { letterId: id, signedById });
  return letter.reload();
};

/**
 * Mark letter as delivered.
 */
const markLetterDelivered = async (id, deliveryMethod = null, deliveredOn = null) => {
  const letter = await getAppointmentLetterById(id);
  if (letter.status !== 'Issued') throw new AppError('Only Issued letters can be marked as delivered', 422);

  await letter.update({
    status: 'Delivered',
    deliveryMethod: deliveryMethod || letter.deliveryMethod,
    deliveredOn: deliveredOn ? new Date(deliveredOn) : new Date(),
  });

  logger.info('AppointmentLetter marked delivered', { letterId: id });
  return letter;
};

/**
 * Acknowledge appointment letter (candidate).
 */
const acknowledgeAppointmentLetter = async (token) => {
  if (!token) throw new AppError('Acknowledgement token is required', 422);

  const letter = await AppointmentLetter.findOne({ where: { acknowledgementToken: token } });
  if (!letter) throw new AppError('Invalid or expired acknowledgement token', 404);
  if (letter.status === 'Acknowledged') throw new AppError('Letter has already been acknowledged', 409);

  await letter.update({
    status: 'Acknowledged',
    acknowledgedOn: new Date(),
  });

  logger.info('AppointmentLetter acknowledged', { letterId: letter.id });
  return letter;
};

/**
 * Set PDF path for letter.
 */
const setPdfPath = async (id, pdfPath) => {
  const letter = await getAppointmentLetterById(id);
  await letter.update({ pdfPath });
  return letter;
};

/**
 * Cancel appointment letter.
 */
const cancelAppointmentLetter = async (id, remarks = null) => {
  const letter = await getAppointmentLetterById(id);
  if (letter.status === 'Cancelled') throw new AppError('Letter is already cancelled', 422);

  await letter.update({ status: 'Cancelled', remarks, docStatus: 2 });
  logger.info('AppointmentLetter cancelled', { letterId: id });
  return letter;
};

// ════════════════════════════════════════════════════════════════════════════
//  PHASE 10 — ONBOARDING TRANSITION (Flow 13)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Convert accepted applicant to employee.
 */
const createEmployeeFromApplicant = async (applicantId) => {
  const applicant = await JobApplicant.findByPk(applicantId, {
    include: [
      {
        model: JobOffer,
        required: false,
        include: [
          { model: Designation, attributes: ['id', 'name'], required: false },
          { model: EmploymentType, attributes: ['id', 'name'], required: false },
          { model: EmployeeGrade, attributes: ['id', 'name'], required: false },
        ],
      },
    ],
  });

  if (!applicant) throw new AppError('Job applicant not found', 404);
  if (applicant.status !== 'Accepted') {
    throw new AppError('Only Accepted applicants can be converted to employees', 422);
  }

  const offer = applicant.JobOffer;
  if (!offer || offer.status !== 'Accepted') {
    throw new AppError('Applicant must have an Accepted job offer before conversion', 422);
  }

  const letter = await AppointmentLetter.findOne({ where: { jobApplicantId: applicantId } });
  if (!letter || !['Issued', 'Delivered', 'Acknowledged'].includes(letter.status)) {
    throw new AppError('Appointment letter must be issued before converting to employee', 422);
  }

  const sanitizedEmail = sanitizeEmail(applicant.email);
  const existingUser = await User.unscoped().findOne({ where: { email: sanitizedEmail } });

  if (existingUser?.id) {
    const existingEmp = await Employee.findOne({ where: { userId: existingUser.id } });
    if (existingEmp) throw new AppError('An employee already exists for this email', 409);
  }

  const temporaryPassword = generateTemporaryPassword();
  const { firstName, lastName } = parseApplicantName(applicant.applicantName);

  const result = await sequelize.transaction(async (t) => {
    let user = existingUser;
    if (!user) {
      user = await User.create(
        {
          firstName,
          lastName,
          email: sanitizedEmail,
          passwordHash: temporaryPassword,
          status: 'Active',
        },
        { transaction: t }
      );
    }

    const empNumber = await generateEmployeeNumber(t);

    const employee = await Employee.create(
      {
        userId: user.id,
        companyId: offer.companyId,
        branchId: offer.branchId || null,
        departmentId: offer.departmentId || null,
        designationId: offer.designationId || null,
        employmentTypeId: offer.employmentTypeId || null,
        employeeGradeId: offer.gradeId || null,
        employeeNumber: empNumber,
        firstName,
        lastName,
        companyEmail: sanitizedEmail,
        dateOfJoining: offer.proposedJoiningDate || new Date().toISOString().split('T')[0],
        status: 'Active',
      },
      { transaction: t }
    );

    return { employee, user };
  });

  // Clear cache for new employee
  clearEmployeeCache(result.user.id);

  logger.info('Employee created from applicant', {
    employeeId: result.employee.id,
    applicantId,
    email: sanitizedEmail,
  });

  return {
    employee: result.employee,
    user: result.user,
    temporaryPassword,
  };
};

// ════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Staffing Plan
  getStaffingPlans,
  getStaffingPlanById,
  createStaffingPlan,
  updateStaffingPlan,
  submitStaffingPlan,
  approveStaffingPlan,
  cancelStaffingPlan,
  getStaffingSnapshot,

  // Job Requisition
  getJobRequisitions,
  getJobRequisitionById,
  createJobRequisition,
  submitJobRequisition,
  approveHRRequisition,
  rejectHRRequisition,
  approveGMRequisition,
  rejectGMRequisition,
  cancelJobRequisition,

  // Job Opening
  getJobOpenings,
  getJobOpeningById,
  createJobOpening,
  updateJobOpening,
  publishJobOpening,
  closeJobOpening,
  listPublicJobOpenings,

  // Job Applicant
  getJobApplicants,
  getJobApplicantById,
  createJobApplicant,
  updateApplicantStatus,
  rateApplicant,

  // Employee Referral
  getEmployeeReferrals,
  getEmployeeReferralById,
  createEmployeeReferral,
  acceptEmployeeReferral,
  rejectEmployeeReferral,
  markReferralBonusPaid,

  // Interview
  getInterviews,
  getInterviewById,
  createInterview,
  updateInterview,
  cancelInterview,
  markCandidateNotified,
  updateInterviewStatus,

  // Interview Feedback
  getInterviewFeedback,
  getInterviewFeedbackById,
  createInterviewFeedback,

  // Job Offer
  getJobOffers,
  getJobOfferById,
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
  getAppointmentLetters,
  getAppointmentLetterById,
  generateAppointmentLetter,
  signAppointmentLetter,
  markLetterDelivered,
  acknowledgeAppointmentLetter,
  setPdfPath,
  cancelAppointmentLetter,

  // Onboarding Transition
  createEmployeeFromApplicant,

  // Cache Management
  clearEmployeeCache,
};