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
      { model: Company, as: 'company', attributes: ['id', 'name'] },
      { model: Department, as: 'department', attributes: ['id', 'name'], required: false },
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
  // Cache Management
  clearEmployeeCache,
};