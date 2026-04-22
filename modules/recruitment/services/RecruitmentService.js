'use strict';

/**
 * modules/recruitment/services/recruitmentService.js
 *
 * Complete business logic layer for the Recruitment module.
 * Covers all 13 flows from the Complete Technical Flow document:
 *
 *  Phase 1 — HR Configuration
 *    Flow 1  : StaffingPlan CRUD + submit + approve
 *
 *  Phase 2 — Job Requisition (Department Head → HR → GM)
 *    Flow 2  : Create + submit requisition
 *    Flow 3  : HR Manager L1 approval / rejection
 *    Flow 4  : GM L2 approval (auto-creates JobOpening) / rejection
 *
 *  Phase 3 — Job Opening Management
 *    Flow 5  : HR publishes opening to job portal
 *
 *  Phase 4 — Applicant Intake
 *    Flow 6  : Public apply + duplicate check + resume upload
 *    Flow 7  : Employee Referral → HR accept/reject → creates JobApplicant
 *
 *  Phase 5 — Interview Management
 *    Flow 8  : HR schedules interview round
 *    Flow 9  : Interviewer submits feedback → recalculates average rating
 *
 *  Phase 6 — Job Offer & Appointment
 *    Flow 10 : HR creates + submits offer
 *    Flow 11 : GM approves offer → HR sends to candidate
 *    Flow 12 : Candidate accepts (triggers AppointmentLetter) or declines
 *
 *  Phase 7 — Onboarding Transition
 *    Flow 13 : Convert accepted applicant → Employee record
 *
 * Architecture rules (mirrors roleService.js):
 *   — No req / res knowledge — pure data in, data out
 *   — Every mutating function throws AppError on rule violations
 *   — Sequelize transactions wrap every multi-table write
 *   — All list functions return { data, meta } via buildMeta()
 */

const { Op }    = require('sequelize');
const { v4: uuidv4 } = require('uuid');

const {
  sequelize,
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
} = require('../../../models');

const { AppError }                    = require('../../../middlewares/errorMiddleware');
const { getPaginationOptions, buildMeta } = require('../../../utils/pagination');
const logger                          = require('../../../utils/logger');

// ═════════════════════════════════════════════
//  INTERNAL HELPERS
// ═════════════════════════════════════════════

/**
 * Resolves the employee record for a given userId.
 * Used throughout to convert req.user.id → employee.id.
 */
const getEmployeeByUserId = async (userId) => {
  const emp = await Employee.findOne({ where: { userId } });
  if (!emp) throw new AppError('No employee record linked to this user account', 403);
  return emp;
};

/**
 * Generates a sequential requisition number in the format REQ-YYYY-NNN.
 * Uses a DB-level count to produce the sequence — safe under concurrent inserts
 * because the unique index on requisitionnumber will reject true races.
 */
const generateRequisitionNumber = async (companyId) => {
  const year  = new Date().getFullYear();
  const count = await JobRequisition.count({
    where: {
      companyId,
      createdAt: {
        [Op.gte]: new Date(`${year}-01-01`),
        [Op.lt]:  new Date(`${year + 1}-01-01`),
      },
    },
  });
  const seq = String(count + 1).padStart(3, '0');
  return `REQ-${year}-${seq}`;
};

/**
 * Captures a frozen snapshot of the current headcount situation
 * for a given designation + department at requisition-submission time.
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
    StaffingPlan.findOne({
      where: {
        companyId,
        ...(departmentId ? { departmentId } : {}),
        docStatus: 1,                        // Submitted plans only
        fromDate: { [Op.lte]: new Date() },
        toDate:   { [Op.gte]: new Date() },
      },
      order: [['createdAt', 'DESC']],
    }),
  ]);

  if (!activePlan) {
    return {
      staffingPlanId:     null,
      planName:           null,
      plannedHeadcount:   0,
      currentHeadcount,
      openRequisitions:   0,
      availableVacancies: 0,
    };
  }

  // Find the matching detail row for this designation inside the plan
  const detail = (activePlan.planDetails || []).find(
    d => d.designationId === designationId,
  );

  const plannedHeadcount = detail?.numberOfPositions ?? 0;

  // Count already-open requisitions for this designation (not yet hired)
  const openRequisitions = await JobRequisition.count({
    where: {
      designationId,
      companyId,
      overallStatus: {
        [Op.in]: ['Pending HR Review', 'Pending GM Review', 'Approved'],
      },
    },
  });

  return {
    staffingPlanId:     activePlan.id,
    planName:           activePlan.name,
    designationId,
    plannedHeadcount,
    currentHeadcount,
    openRequisitions,
    availableVacancies: Math.max(0, plannedHeadcount - currentHeadcount - openRequisitions),
  };
};

/**
 * Recalculates Interview.averageRating from all submitted feedback rows.
 * Called after every InterviewFeedback insert/update.
 */
const recalculateInterviewRating = async (interviewId, transaction = null) => {
  const feedbacks = await InterviewFeedback.findAll({
    where:      { interviewId, docStatus: 1 },  // submitted only
    attributes: ['totalScore', 'maxScore'],
    transaction,
  });

  if (!feedbacks.length) return null;

  const totalSum = feedbacks.reduce((s, f) => s + parseFloat(f.totalScore || 0), 0);
  const average  = parseFloat((totalSum / feedbacks.length).toFixed(2));

  await Interview.update(
    { averageRating: average },
    { where: { id: interviewId }, transaction },
  );

  return average;
};

/**
 * Returns the panelMember employee IDs for an interview
 * (lead interviewer + JSONB panelMembers array).
 */
const getAllPanelistIds = (interview) => {
  const panel = (interview.panelMembers || []).map(p => p.employeeId).filter(Boolean);
  return [interview.interviewerId, ...panel];
};


// ═════════════════════════════════════════════
//  PHASE 1 — STAFFING PLAN
// ═════════════════════════════════════════════

/**
 * List staffing plans — paginated, optionally filtered by company / docStatus.
 */
const getStaffingPlans = async ({ companyId, docStatus, page, limit } = {}) => {
  const where = {};
  if (companyId !== undefined) where.companyId = companyId;
  if (docStatus !== undefined) where.docStatus = Number(docStatus);

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await StaffingPlan.findAndCountAll({
    where,
    limit:  lim,
    offset,
    order:  [['createdAt', 'DESC']],
    include: [
      { model: Company,    attributes: ['id', 'name'] },
      { model: Department, attributes: ['id', 'name'], required: false },
    ],
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Fetch a single staffing plan by ID.
 */
const getStaffingPlanById = async (id) => {
  const plan = await StaffingPlan.findByPk(id, {
    include: [
      { model: Company,    attributes: ['id', 'name'] },
      { model: Department, attributes: ['id', 'name'], required: false },
    ],
  });
  if (!plan) throw new AppError('Staffing plan not found', 404);
  return plan;
};

/**
 * Create a staffing plan (Draft).
 * Automatically calculates currentCount, vacancies, and totalEstimatedBudget
 * for each planDetail row.
 */
const createStaffingPlan = async (data) => {
  const { name, companyId, departmentId, fromDate, toDate, planDetails = [] } = data;

  if (!name || !companyId || !fromDate || !toDate) {
    throw new AppError('name, companyId, fromDate and toDate are required', 422);
  }
  if (new Date(fromDate) >= new Date(toDate)) {
    throw new AppError('fromDate must be before toDate', 422);
  }

  // Enrich each planDetail row with live headcount data
  const enrichedDetails = await Promise.all(
    planDetails.map(async (d) => {
      if (!d.designationId || !d.numberOfPositions) {
        throw new AppError('Each planDetail must have designationId and numberOfPositions', 422);
      }

      const currentCount = await Employee.count({
        where: {
          designationId: d.designationId,
          companyId,
          ...(departmentId ? { departmentId } : {}),
          status: 'Active',
        },
      });

      const vacancies             = Math.max(0, d.numberOfPositions - currentCount);
      const estimatedCostPerPosition = d.estimatedCostPerPosition ?? 0;
      const totalEstimatedCost    = vacancies * estimatedCostPerPosition;

      return {
        ...d,
        currentCount,
        vacancies,
        estimatedCostPerPosition,
        totalEstimatedCost,
      };
    }),
  );

  const totalEstimatedBudget = enrichedDetails.reduce(
    (s, d) => s + (d.totalEstimatedCost || 0), 0,
  );

  const plan = await StaffingPlan.create({
    name,
    companyId,
    departmentId:         departmentId || null,
    fromDate,
    toDate,
    planDetails:          enrichedDetails,
    totalEstimatedBudget,
    docStatus:            0,              // Draft
  });

  logger.info('StaffingPlan created', { planId: plan.id, name });
  return plan;
};

/**
 * Submit a staffing plan for GM approval (docStatus 0 → 1).
 */
const submitStaffingPlan = async (id) => {
  const plan = await StaffingPlan.findByPk(id);
  if (!plan) throw new AppError('Staffing plan not found', 404);
  if (plan.docStatus !== 0) throw new AppError('Only Draft plans can be submitted', 422);

  await plan.update({ docStatus: 1 });
  logger.info('StaffingPlan submitted', { planId: id });
  return plan;
};

/**
 * GM approves a submitted staffing plan — marks it active.
 * In this system docStatus 1 = Submitted/Active (same as Frappe convention).
 * A separate "approved" flag is not needed — submission IS the approval gate.
 * If you want a 2-step approve, add docStatus 2 = Approved here.
 */
const approveStaffingPlan = async (id, gmUserId) => {
  const plan = await StaffingPlan.findByPk(id);
  if (!plan) throw new AppError('Staffing plan not found', 404);
  if (plan.docStatus !== 1) throw new AppError('Only submitted plans can be approved', 422);

  // Already active — idempotent in this design.
  logger.info('StaffingPlan approved', { planId: id, gmUserId });
  return plan;
};


// ═════════════════════════════════════════════
//  PHASE 2 — JOB REQUISITION
// ═════════════════════════════════════════════

/**
 * List job requisitions — paginated with rich filters.
 */
const getJobRequisitions = async ({
  companyId, departmentId, overallStatus, requestedById, page, limit,
} = {}) => {
  const where = {};
  if (companyId      !== undefined) where.companyId      = companyId;
  if (departmentId   !== undefined) where.departmentId   = departmentId;
  if (overallStatus  !== undefined) where.overallStatus  = overallStatus;
  if (requestedById  !== undefined) where.requestedById  = requestedById;

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await JobRequisition.findAndCountAll({
    where,
    limit:  lim,
    offset,
    order:  [['createdAt', 'DESC']],
    include: [
      { model: Department,  attributes: ['id', 'name'] },
      { model: Designation, attributes: ['id', 'name'] },
      { model: Company,     attributes: ['id', 'name'] },
    ],
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Fetch a single requisition by ID.
 */
const getJobRequisitionById = async (id) => {
  const req = await JobRequisition.findByPk(id, {
    include: [
      { model: Department,  attributes: ['id', 'name'] },
      { model: Designation, attributes: ['id', 'name'] },
      { model: Company,     attributes: ['id', 'name'] },
    ],
  });
  if (!req) throw new AppError('Job requisition not found', 404);
  return req;
};

/**
 * Department Head creates a draft requisition.
 * Captures the staffing snapshot at creation time.
 */
const createJobRequisition = async (data, userId) => {
  const {
    departmentId, designationId, companyId, employmentTypeId,
    numberOfPositions = 1, replacementFor, isNewPosition = false,
    reasonForHiring, proposedSalaryMin, proposedSalaryMax,
    targetHireDate, currency = 'KES',
  } = data;

  if (!departmentId || !designationId || !companyId || !reasonForHiring) {
    throw new AppError(
      'departmentId, designationId, companyId and reasonForHiring are required', 422,
    );
  }

  const requester = await getEmployeeByUserId(userId);

  // Generate requisition number and capture snapshot in parallel
  const [requisitionNumber, staffingSnapshot] = await Promise.all([
    generateRequisitionNumber(companyId),
    getStaffingSnapshot(designationId, departmentId, companyId),
  ]);

  const requisition = await JobRequisition.create({
    requisitionNumber,
    departmentId,
    designationId,
    companyId,
    employmentTypeId:   employmentTypeId || null,
    requestedById:      requester.id,
    requestedOn:        new Date(),
    numberOfPositions,
    replacementFor:     replacementFor   || null,
    isNewPosition,
    reasonForHiring,
    proposedSalaryMin:  proposedSalaryMin ?? null,
    proposedSalaryMax:  proposedSalaryMax ?? null,
    targetHireDate:     targetHireDate   || null,
    currency,
    staffingSnapshot,
    overallStatus:      'Draft',
    hrStatus:           'Pending',
    gmStatus:           'Pending',
    docStatus:          0,
  });

  logger.info('JobRequisition created', { requisitionId: requisition.id, requisitionNumber });
  return requisition;
};

/**
 * Department Head submits a Draft requisition for HR review.
 */
const submitJobRequisition = async (id, userId) => {
  const requisition = await JobRequisition.findByPk(id);
  if (!requisition) throw new AppError('Job requisition not found', 404);
  if (requisition.overallStatus !== 'Draft') {
    throw new AppError('Only Draft requisitions can be submitted', 422);
  }

  const requester = await getEmployeeByUserId(userId);
  if (requisition.requestedById !== requester.id) {
    throw new AppError('Only the creator can submit this requisition', 403);
  }

  await requisition.update({ overallStatus: 'Pending HR Review', docStatus: 1 });
  logger.info('JobRequisition submitted', { requisitionId: id });
  return requisition;
};

/**
 * HR Manager approves at Level 1 → escalates to GM.
 */
const approveHRRequisition = async (id, userId, remarks = null) => {
  const requisition = await JobRequisition.findByPk(id);
  if (!requisition) throw new AppError('Job requisition not found', 404);
  if (requisition.overallStatus !== 'Pending HR Review') {
    throw new AppError('Requisition is not pending HR review', 422);
  }

  const hrManager = await getEmployeeByUserId(userId);

  await requisition.update({
    hrStatus:      'Approved',
    hrManagerId:   hrManager.id,
    hrReviewedOn:  new Date(),
    hrRemarks:     remarks,
    overallStatus: 'Pending GM Review',
  });

  logger.info('JobRequisition HR-approved', { requisitionId: id, hrManagerId: hrManager.id });
  return requisition;
};

/**
 * HR Manager rejects at Level 1 — sends back to Department Head.
 */
const rejectHRRequisition = async (id, userId, reason) => {
  if (!reason) throw new AppError('Rejection reason is required', 422);

  const requisition = await JobRequisition.findByPk(id);
  if (!requisition) throw new AppError('Job requisition not found', 404);
  if (requisition.overallStatus !== 'Pending HR Review') {
    throw new AppError('Requisition is not pending HR review', 422);
  }

  const hrManager = await getEmployeeByUserId(userId);

  await requisition.update({
    hrStatus:      'Rejected',
    hrManagerId:   hrManager.id,
    hrReviewedOn:  new Date(),
    hrRemarks:     reason,
    overallStatus: 'HR Rejected',
  });

  logger.info('JobRequisition HR-rejected', { requisitionId: id, reason });
  return requisition;
};

/**
 * GM approves at Level 2 → automatically creates a JobOpening.
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
    // 1. Approve the requisition
    await requisition.update({
      gmStatus:      'Approved',
      gmId:          gm.id,
      gmReviewedOn:  new Date(),
      gmRemarks:     remarks,
      overallStatus: 'Approved',
    }, { transaction: t });

    // 2. Auto-create JobOpening from approved requisition
    const jobTitle = requisition.Designation?.name || 'Open Position';

    const opening = await JobOpening.create({
      jobTitle,
      staffingPlanId:           requisition.staffingSnapshot?.staffingPlanId || null,
      departmentId:             requisition.departmentId,
      designationId:            requisition.designationId,
      companyId:                requisition.companyId,
      plannedNumberOfPositions: requisition.numberOfPositions,
      expectedSalaryFrom:       requisition.proposedSalaryMin || null,
      expectedSalaryTo:         requisition.proposedSalaryMax || null,
      status:                   'Open',
      publishOnWebsite:         false,
    }, { transaction: t });

    // 3. Link the opening back to the requisition
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
 * GM rejects at Level 2.
 */
const rejectGMRequisition = async (id, userId, reason) => {
  if (!reason) throw new AppError('Rejection reason is required', 422);

  const requisition = await JobRequisition.findByPk(id);
  if (!requisition) throw new AppError('Job requisition not found', 404);
  if (requisition.overallStatus !== 'Pending GM Review') {
    throw new AppError('Requisition is not pending GM review', 422);
  }

  const gm = await getEmployeeByUserId(userId);

  await requisition.update({
    gmStatus:      'Rejected',
    gmId:          gm.id,
    gmReviewedOn:  new Date(),
    gmRemarks:     reason,
    overallStatus: 'GM Rejected',
  });

  logger.info('JobRequisition GM-rejected', { requisitionId: id, reason });
  return requisition;
};


// ═════════════════════════════════════════════
//  PHASE 3 — JOB OPENING
// ═════════════════════════════════════════════

/**
 * List job openings — public variant excludes unpublished.
 */
const getJobOpenings = async ({
  companyId, departmentId, designationId, status,
  publicOnly = false, page, limit,
} = {}) => {
  const where = {};
  if (companyId     !== undefined) where.companyId     = companyId;
  if (departmentId  !== undefined) where.departmentId  = departmentId;
  if (designationId !== undefined) where.designationId = designationId;
  if (status        !== undefined) where.status        = status;
  if (publicOnly)                  where.publishOnWebsite = true;

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await JobOpening.findAndCountAll({
    where,
    limit:  lim,
    offset,
    order:  [['createdAt', 'DESC']],
    include: [
      { model: Company,    attributes: ['id', 'name'] },
      { model: Department, attributes: ['id', 'name'], required: false },
      { model: Designation, attributes: ['id', 'name'], required: false },
    ],
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Fetch a single job opening.
 */
const getJobOpeningById = async (id) => {
  const opening = await JobOpening.findByPk(id, {
    include: [
      { model: Company,    attributes: ['id', 'name'] },
      { model: Department, attributes: ['id', 'name'], required: false },
      { model: Designation, attributes: ['id', 'name'], required: false },
    ],
  });
  if (!opening) throw new AppError('Job opening not found', 404);
  return opening;
};

/**
 * HR updates a job opening (description, salary range, etc.)
 */
const updateJobOpening = async (id, data) => {
  const opening = await JobOpening.findByPk(id);
  if (!opening) throw new AppError('Job opening not found', 404);
  if (opening.status === 'Closed') throw new AppError('Cannot edit a closed job opening', 422);

  const allowed = [
    'jobTitle', 'description', 'expectedSalaryFrom', 'expectedSalaryTo',
    'plannedNumberOfPositions',
  ];

  const updates = {};
  allowed.forEach(field => {
    if (data[field] !== undefined) updates[field] = data[field];
  });

  return opening.update(updates);
};

/**
 * HR publishes (or unpublishes) a job opening to the public portal.
 */
const publishJobOpening = async (id, publish = true) => {
  const opening = await JobOpening.findByPk(id);
  if (!opening) throw new AppError('Job opening not found', 404);
  if (opening.status === 'Closed') throw new AppError('Cannot publish a closed job opening', 422);

  await opening.update({ publishOnWebsite: publish });
  logger.info(`JobOpening ${publish ? 'published' : 'unpublished'}`, { openingId: id });
  return opening;
};

/**
 * Close a job opening (no more applications).
 */
const closeJobOpening = async (id) => {
  const opening = await JobOpening.findByPk(id);
  if (!opening) throw new AppError('Job opening not found', 404);
  if (opening.status === 'Closed') throw new AppError('Job opening is already closed', 422);

  await opening.update({ status: 'Closed', closedDate: new Date(), publishOnWebsite: false });
  logger.info('JobOpening closed', { openingId: id });
  return opening;
};


// ═════════════════════════════════════════════
//  PHASE 4 — APPLICANT INTAKE
// ═════════════════════════════════════════════

/**
 * List job applicants — paginated, multi-filter.
 */
const getJobApplicants = async ({
  jobOpeningId, status, source, page, limit,
} = {}) => {
  const where = {};
  if (jobOpeningId !== undefined) where.jobOpeningId = jobOpeningId;
  if (status       !== undefined) where.status       = status;
  if (source       !== undefined) where.source       = source;

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await JobApplicant.findAndCountAll({
    where,
    limit:  lim,
    offset,
    order:  [['createdAt', 'DESC']],
    include: [
      { model: JobOpening, attributes: ['id', 'jobTitle', 'status'] },
    ],
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Fetch a single applicant with full details.
 */
const getJobApplicantById = async (id) => {
  const applicant = await JobApplicant.findByPk(id, {
    include: [
      { model: JobOpening, attributes: ['id', 'jobTitle', 'status'] },
    ],
  });
  if (!applicant) throw new AppError('Job applicant not found', 404);
  return applicant;
};

/**
 * Public apply endpoint — creates a JobApplicant record.
 * Validates the opening is Open + published, and prevents duplicate applications.
 *
 * @param {object} data   - applicant fields
 * @param {string} [referralToken] - optional referral token from the referral link
 */
const createJobApplicant = async (data, referralToken = null) => {
  const {
    jobOpeningId, applicantName, email, phone,
    coverLetter, resumePath, linkedinUrl,
    currentSalary, expectedSalary,
  } = data;

  if (!jobOpeningId || !applicantName || !email) {
    throw new AppError('jobOpeningId, applicantName and email are required', 422);
  }

  // 1. Validate the opening
  const opening = await JobOpening.findByPk(jobOpeningId);
  if (!opening)              throw new AppError('Job opening not found', 404);
  if (opening.status !== 'Open') {
    throw new AppError('This job opening is no longer accepting applications', 422);
  }
  if (!opening.publishOnWebsite) {
    throw new AppError('This job opening is not published', 422);
  }

  // 2. Duplicate application check
  const duplicate = await JobApplicant.findOne({
    where: { email: email.toLowerCase().trim(), jobOpeningId },
  });
  if (duplicate) {
    throw new AppError('An application from this email already exists for this opening', 409);
  }

  // 3. Resolve referral if token provided
  let employeeReferralId = null;
  let source             = 'Website Listing';

  if (referralToken) {
    // referralToken = the EmployeeReferral.id — passed via the referral link
    const referral = await EmployeeReferral.findOne({
      where: { id: referralToken, jobOpeningId, status: 'Accepted' },
    });
    if (referral) {
      employeeReferralId = referral.id;
      source             = 'Employee Referral';
    }
  }

  const applicant = await JobApplicant.create({
    jobOpeningId,
    employeeReferralId,
    applicantName:  applicantName.trim(),
    email:          email.toLowerCase().trim(),
    phone:          phone          || null,
    source,
    coverLetter:    coverLetter    || null,
    resumeUrl:      resumePath     || null,
    linkedinUrl:    linkedinUrl    || null,
    currentSalary:  currentSalary  ?? null,
    expectedSalary: expectedSalary ?? null,
    status:         'Open',
  });

  logger.info('JobApplicant created', { applicantId: applicant.id, email: applicant.email });
  return applicant;
};

/**
 * HR updates the status of a job applicant through the pipeline.
 * Status flow: Open → Replied → Hold → Accepted → Rejected
 * 'Accepted' triggers a reminder — JobOffer must then be created separately.
 */
const updateApplicantStatus = async (id, status, rejectionReason = null) => {
  const VALID = ['Open', 'Replied', 'Hold', 'Accepted', 'Rejected'];
  if (!VALID.includes(status)) throw new AppError(`Invalid status: ${status}`, 422);

  const applicant = await JobApplicant.findByPk(id);
  if (!applicant) throw new AppError('Job applicant not found', 404);
  if (applicant.status === 'Accepted' && status !== 'Accepted') {
    throw new AppError('Cannot change status of an already accepted applicant', 422);
  }

  const updates = { status };
  if (status === 'Rejected' && rejectionReason) {
    updates.rejectionReason = rejectionReason;
  }

  await applicant.update(updates);
  logger.info('JobApplicant status updated', { applicantId: id, status });
  return applicant;
};


// ═════════════════════════════════════════════
//  EMPLOYEE REFERRAL  (Flow 7)
// ═════════════════════════════════════════════

/**
 * List referrals — HR sees all; employees see their own.
 */
const getEmployeeReferrals = async ({ referrerId, jobOpeningId, status, page, limit } = {}) => {
  const where = {};
  if (referrerId   !== undefined) where.referrerId   = referrerId;
  if (jobOpeningId !== undefined) where.jobOpeningId = jobOpeningId;
  if (status       !== undefined) where.status       = status;

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await EmployeeReferral.findAndCountAll({
    where,
    limit:  lim,
    offset,
    order:  [['createdAt', 'DESC']],
    include: [{ model: JobOpening, attributes: ['id', 'jobTitle'] }],
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Employee nominates an external candidate for an open position.
 */
const createEmployeeReferral = async (data, userId) => {
  const { jobOpeningId, candidateName, candidateEmail, candidatePhone, coverNote } = data;

  if (!jobOpeningId || !candidateName || !candidateEmail) {
    throw new AppError('jobOpeningId, candidateName and candidateEmail are required', 422);
  }

  const opening = await JobOpening.findByPk(jobOpeningId);
  if (!opening)                  throw new AppError('Job opening not found', 404);
  if (opening.status !== 'Open') throw new AppError('Job opening is not accepting referrals', 422);

  const referrer = await getEmployeeByUserId(userId);

  // Prevent duplicate referral from the same employee for the same candidate+opening
  const duplicate = await EmployeeReferral.findOne({
    where: {
      referrerId:     referrer.id,
      jobOpeningId,
      candidateEmail: candidateEmail.toLowerCase().trim(),
    },
  });
  if (duplicate) throw new AppError('You have already referred this candidate for this opening', 409);

  const referral = await EmployeeReferral.create({
    referrerId:      referrer.id,
    jobOpeningId,
    candidateName:   candidateName.trim(),
    candidateEmail:  candidateEmail.toLowerCase().trim(),
    candidatePhone:  candidatePhone || null,
    coverNote:       coverNote      || null,
    status:          'Pending',
    bonusPaid:       false,
    referralBonusAmount: 0,
  });

  logger.info('EmployeeReferral created', { referralId: referral.id, referrerId: referrer.id });
  return referral;
};

/**
 * HR accepts a referral → automatically creates a JobApplicant record.
 */
const acceptReferral = async (id) => {
  const referral = await EmployeeReferral.findByPk(id, {
    include: [{ model: JobOpening, attributes: ['id', 'status', 'publishOnWebsite'] }],
  });
  if (!referral) throw new AppError('Referral not found', 404);
  if (referral.status !== 'Pending') {
    throw new AppError('Only Pending referrals can be accepted', 422);
  }

  const result = await sequelize.transaction(async (t) => {
    // Check for duplicate applicant before creating
    const existing = await JobApplicant.findOne({
      where: { email: referral.candidateEmail, jobOpeningId: referral.jobOpeningId },
      transaction: t,
    });
    if (existing) throw new AppError('An applicant with this email already exists for this opening', 409);

    // Create the JobApplicant from the referral
    const applicant = await JobApplicant.create({
      jobOpeningId:      referral.jobOpeningId,
      employeeReferralId: referral.id,
      applicantName:     referral.candidateName,
      email:             referral.candidateEmail,
      phone:             referral.candidatePhone || null,
      source:            'Employee Referral',
      status:            'Open',
    }, { transaction: t });

    // Update the referral
    await referral.update({
      status:         'Accepted',
      jobApplicantId: applicant.id,
    }, { transaction: t });

    return { referral, applicant };
  });

  logger.info('EmployeeReferral accepted, JobApplicant created', {
    referralId: id, applicantId: result.applicant.id,
  });

  return result;
};

/**
 * HR rejects a referral.
 */
const rejectReferral = async (id, reason = null) => {
  const referral = await EmployeeReferral.findByPk(id);
  if (!referral) throw new AppError('Referral not found', 404);
  if (referral.status !== 'Pending') {
    throw new AppError('Only Pending referrals can be rejected', 422);
  }

  await referral.update({ status: 'Rejected' });
  logger.info('EmployeeReferral rejected', { referralId: id });
  return referral;
};


// ═════════════════════════════════════════════
//  PHASE 5 — INTERVIEW MANAGEMENT
// ═════════════════════════════════════════════

/**
 * List interviews — supports filter by applicant, opening, interviewer, status.
 */
const getInterviews = async ({
  jobApplicantId, jobOpeningId, interviewerId, status, page, limit,
} = {}) => {
  const where = {};
  if (jobApplicantId !== undefined) where.jobApplicantId = jobApplicantId;
  if (jobOpeningId   !== undefined) where.jobOpeningId   = jobOpeningId;
  if (interviewerId  !== undefined) where.interviewerId  = interviewerId;
  if (status         !== undefined) where.status         = status;

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await Interview.findAndCountAll({
    where,
    limit:  lim,
    offset,
    order:  [['scheduledOn', 'ASC']],
    include: [
      { model: JobApplicant, attributes: ['id', 'applicantName', 'email'] },
      { model: JobOpening,   attributes: ['id', 'jobTitle'] },
    ],
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Fetch a single interview with all feedback.
 */
const getInterviewById = async (id) => {
  const interview = await Interview.findByPk(id, {
    include: [
      { model: JobApplicant,     attributes: ['id', 'applicantName', 'email'] },
      { model: JobOpening,       attributes: ['id', 'jobTitle'] },
      { model: InterviewFeedback },
    ],
  });
  if (!interview) throw new AppError('Interview not found', 404);
  return interview;
};

/**
 * HR schedules an interview round for a job applicant.
 */
const createInterview = async (data) => {
  const {
    jobApplicantId, jobOpeningId, interviewerId,
    name, interviewRound = 1, interviewType = 'One-on-One',
    scheduledOn, duration, location,
    panelMembers = [], skillCriteria = [],
  } = data;

  if (!jobApplicantId || !jobOpeningId || !interviewerId || !scheduledOn || !name) {
    throw new AppError(
      'jobApplicantId, jobOpeningId, interviewerId, scheduledOn and name are required', 422,
    );
  }

  // Validate applicant and opening exist and are compatible
  const [applicant, opening, interviewer] = await Promise.all([
    JobApplicant.findByPk(jobApplicantId),
    JobOpening.findByPk(jobOpeningId),
    Employee.findByPk(interviewerId),
  ]);

  if (!applicant)   throw new AppError('Job applicant not found', 404);
  if (!opening)     throw new AppError('Job opening not found', 404);
  if (!interviewer) throw new AppError('Interviewer employee not found', 404);

  if (applicant.jobOpeningId !== jobOpeningId) {
    throw new AppError('Applicant is not linked to this job opening', 422);
  }

  const interview = await Interview.create({
    jobApplicantId,
    jobOpeningId,
    interviewerId,
    name,
    interviewRound,
    interviewType,
    scheduledOn:      new Date(scheduledOn),
    duration:         duration  || null,
    location:         location  || null,
    panelMembers,
    skillCriteria,
    status:           'Scheduled',
    candidateNotified: false,
    docStatus:        0,
  });

  logger.info('Interview scheduled', {
    interviewId: interview.id,
    applicantId: jobApplicantId,
    round:       interviewRound,
  });

  return interview;
};

/**
 * Update an interview (reschedule, change location, update skill criteria).
 */
const updateInterview = async (id, data) => {
  const interview = await Interview.findByPk(id);
  if (!interview) throw new AppError('Interview not found', 404);
  if (interview.docStatus === 2) throw new AppError('Cannot edit a cancelled interview', 422);

  const allowed = [
    'scheduledOn', 'duration', 'location', 'interviewType',
    'panelMembers', 'skillCriteria', 'status', 'candidateNotified',
  ];

  const updates = {};
  allowed.forEach(field => {
    if (data[field] !== undefined) updates[field] = data[field];
  });

  return interview.update(updates);
};

/**
 * Interviewer (or panelist) submits feedback for an interview round.
 * One submission per reviewer per interview — enforced by DB unique index.
 */
const createInterviewFeedback = async (data, userId) => {
  const {
    interviewId,
    skillAssessments = [],
    competencyRatings = [],
    strengths, weaknesses, recommendation,
    result,
  } = data;

  if (!interviewId || !result) {
    throw new AppError('interviewId and result are required', 422);
  }

  const VALID_RESULTS = ['Cleared', 'Not Cleared', 'On Hold'];
  if (!VALID_RESULTS.includes(result)) {
    throw new AppError(`result must be one of: ${VALID_RESULTS.join(', ')}`, 422);
  }

  const interview = await Interview.findByPk(interviewId);
  if (!interview) throw new AppError('Interview not found', 404);
  if (interview.status === 'Cancelled') {
    throw new AppError('Cannot submit feedback for a cancelled interview', 422);
  }

  const reviewer = await getEmployeeByUserId(userId);

  // Verify the reviewer is the lead interviewer or a panel member
  const authorisedIds = getAllPanelistIds(interview);
  if (!authorisedIds.includes(reviewer.id)) {
    throw new AppError('You are not assigned as an interviewer for this round', 403);
  }

  // Compute scores from skillAssessments
  const totalScore = skillAssessments.reduce((s, a) => s + (parseFloat(a.score) || 0), 0);
  const maxScore   = skillAssessments.reduce((s, a) => s + (parseFloat(a.maximumScore) || 0), 0);

  const feedback = await sequelize.transaction(async (t) => {
    const fb = await InterviewFeedback.create({
      interviewId,
      reviewerId:        reviewer.id,
      skillAssessments,
      competencyRatings,
      totalScore:        parseFloat(totalScore.toFixed(2)),
      maxScore:          parseFloat(maxScore.toFixed(2)),
      result,
      strengths:         strengths         || null,
      weaknesses:        weaknesses        || null,
      recommendation:    recommendation    || null,
      isConfidential:    true,
      docStatus:         1,                // auto-submit on creation
    }, { transaction: t });

    // Recalculate the interview average rating
    await recalculateInterviewRating(interviewId, t);

    // Check if all panelists have now submitted
    const panelistIds     = getAllPanelistIds(interview);
    const submittedCount  = await InterviewFeedback.count({
      where: { interviewId, docStatus: 1 },
      transaction: t,
    });

    if (submittedCount >= panelistIds.length) {
      await Interview.update(
        { status: 'Under Review' },
        { where: { id: interviewId }, transaction: t },
      );
    }

    return fb;
  });

  logger.info('InterviewFeedback submitted', {
    feedbackId:  feedback.id,
    interviewId,
    reviewerId:  reviewer.id,
    result,
  });

  return feedback;
};


// ═════════════════════════════════════════════
//  PHASE 6 — JOB OFFER
// ═════════════════════════════════════════════

/**
 * List job offers.
 */
const getJobOffers = async ({ jobOpeningId, status, page, limit } = {}) => {
  const where = {};
  if (jobOpeningId !== undefined) where.jobOpeningId = jobOpeningId;
  if (status       !== undefined) where.status       = status;

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await JobOffer.findAndCountAll({
    where,
    limit:  lim,
    offset,
    order:  [['offerDate', 'DESC']],
    include: [{ model: JobApplicant, attributes: ['id', 'applicantName', 'email'] }],
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * Fetch a single job offer.
 */
const getJobOfferById = async (id) => {
  const offer = await JobOffer.findByPk(id, {
    include: [
      { model: JobApplicant, attributes: ['id', 'applicantName', 'email', 'phone'] },
      { model: JobOpening,   attributes: ['id', 'jobTitle'] },
      { model: Designation,  attributes: ['id', 'name'], required: false },
    ],
  });
  if (!offer) throw new AppError('Job offer not found', 404);
  return offer;
};

/**
 * HR creates a job offer for an accepted applicant.
 * Enforces one offer per applicant (DB unique + service guard).
 */
const createJobOffer = async (data) => {
  const {
    jobApplicantId, jobOpeningId, designationId,
    offerDate, expiryDate, proposedJoiningDate,
    companyId, departmentId, branchId, employmentTypeId, gradeId,
    currency = 'KES', grossSalary, offerTerms = [],
    probationPeriodMonths = 3, remarks,
  } = data;

  if (!jobApplicantId || !jobOpeningId || !offerDate || !grossSalary) {
    throw new AppError('jobApplicantId, jobOpeningId, offerDate and grossSalary are required', 422);
  }

  // Guard: one offer per applicant
  const existing = await JobOffer.findOne({ where: { jobApplicantId } });
  if (existing) throw new AppError('A job offer already exists for this applicant', 409);

  // Validate applicant is Accepted
  const applicant = await JobApplicant.findByPk(jobApplicantId);
  if (!applicant) throw new AppError('Job applicant not found', 404);
  if (applicant.status !== 'Accepted') {
    throw new AppError('A job offer can only be created for an Accepted applicant', 422);
  }

  const offer = await JobOffer.create({
    jobApplicantId,
    jobOpeningId,
    designationId:         designationId         || null,
    offerDate,
    expiryDate:            expiryDate            || null,
    proposedJoiningDate:   proposedJoiningDate   || null,
    companyId:             companyId             || null,
    departmentId:          departmentId          || null,
    branchId:              branchId              || null,
    employmentTypeId:      employmentTypeId      || null,
    gradeId:               gradeId               || null,
    currency,
    grossSalary,
    offerTerms,
    probationPeriodMonths,
    remarks:               remarks               || null,
    status:                'Draft',
    docStatus:             0,
  });

  logger.info('JobOffer created', { offerId: offer.id, applicantId: jobApplicantId });
  return offer;
};

/**
 * HR submits a draft offer for GM approval.
 */
const submitJobOffer = async (id) => {
  const offer = await JobOffer.findByPk(id);
  if (!offer) throw new AppError('Job offer not found', 404);
  if (offer.status !== 'Draft') throw new AppError('Only Draft offers can be submitted', 422);

  await offer.update({ status: 'Awaiting Approval', docStatus: 1 });
  logger.info('JobOffer submitted for approval', { offerId: id });
  return offer;
};

/**
 * GM approves a job offer.
 */
const approveJobOffer = async (id, userId) => {
  const offer = await JobOffer.findByPk(id);
  if (!offer) throw new AppError('Job offer not found', 404);
  if (offer.status !== 'Awaiting Approval') {
    throw new AppError('Only offers awaiting approval can be approved', 422);
  }

  const gm = await getEmployeeByUserId(userId);

  await offer.update({
    status:      'Approved',
    approvedById: gm.id,
    approvedOn:  new Date(),
  });

  logger.info('JobOffer approved', { offerId: id, approvedBy: gm.id });
  return offer;
};

/**
 * HR sends an approved offer to the candidate.
 */
const sendJobOffer = async (id) => {
  const offer = await JobOffer.findByPk(id, {
    include: [{ model: JobApplicant, attributes: ['id', 'email', 'applicantName'] }],
  });
  if (!offer) throw new AppError('Job offer not found', 404);
  if (offer.status !== 'Approved') {
    throw new AppError('Only Approved offers can be sent', 422);
  }

  await offer.update({ status: 'Offer Sent' });

  // Email notification would be triggered here via a notification service
  logger.info('JobOffer sent to candidate', {
    offerId: id,
    candidateEmail: offer.JobApplicant?.email,
  });

  return offer;
};

/**
 * Candidate accepts a job offer.
 * Automatically creates a draft AppointmentLetter.
 */
const acceptJobOffer = async (id) => {
  const offer = await JobOffer.findByPk(id, {
    include: [{ model: JobApplicant, attributes: ['id', 'email', 'applicantName'] }],
  });
  if (!offer) throw new AppError('Job offer not found', 404);
  if (offer.status !== 'Offer Sent') {
    throw new AppError('Only sent offers can be accepted', 422);
  }

  const result = await sequelize.transaction(async (t) => {
    // Accept the offer
    await offer.update({ status: 'Accepted', acceptedOn: new Date() }, { transaction: t });

    // Auto-generate a draft AppointmentLetter
    const letter = await AppointmentLetter.create({
      jobApplicantId: offer.jobApplicantId,
      jobOfferId:     offer.id,
      letterDate:     new Date().toISOString().split('T')[0],
      candidateEmail: offer.JobApplicant?.email || null,
      deliveryMethod: 'Email',
      status:         'Draft',
      docStatus:      0,
    }, { transaction: t });

    return { offer, letter };
  });

  logger.info('JobOffer accepted, AppointmentLetter draft created', {
    offerId: id, letterId: result.letter.id,
  });

  return result;
};

/**
 * Candidate declines a job offer.
 */
const declineJobOffer = async (id, declineReason = null) => {
  const offer = await JobOffer.findByPk(id);
  if (!offer) throw new AppError('Job offer not found', 404);
  if (offer.status !== 'Offer Sent') {
    throw new AppError('Only sent offers can be declined', 422);
  }

  await sequelize.transaction(async (t) => {
    await offer.update({
      status:        'Declined',
      declinedOn:    new Date(),
      declineReason: declineReason || null,
    }, { transaction: t });

    // Revert applicant status to allow re-evaluation
    await JobApplicant.update(
      { status: 'Rejected' },
      { where: { id: offer.jobApplicantId }, transaction: t },
    );
  });

  logger.info('JobOffer declined', { offerId: id });
  return offer;
};


// ═════════════════════════════════════════════
//  APPOINTMENT LETTER
// ═════════════════════════════════════════════

/**
 * List appointment letters.
 */
const getAppointmentLetters = async ({ jobApplicantId, status, page, limit } = {}) => {
  const where = {};
  if (jobApplicantId !== undefined) where.jobApplicantId = jobApplicantId;
  if (status         !== undefined) where.status         = status;

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await AppointmentLetter.findAndCountAll({
    where,
    limit:  lim,
    offset,
    order:  [['letterDate', 'DESC']],
  });

  return { data: rows, meta: buildMeta(count, page || 1, lim) };
};

/**
 * HR/GM signs and issues the appointment letter.
 * Freezes the body HTML snapshot and sets status to Issued.
 *
 * @param {string} id          - AppointmentLetter ID
 * @param {object} signData    - { signedById, body, referenceNumber, pdfPath }
 */
const issueAppointmentLetter = async (id, signData) => {
  const letter = await AppointmentLetter.findByPk(id);
  if (!letter) throw new AppError('Appointment letter not found', 404);
  if (!['Draft', 'Issued'].includes(letter.status)) {
    throw new AppError('Only Draft letters can be issued', 422);
  }

  const { signedById, body, referenceNumber, pdfPath } = signData;

  await letter.update({
    signedById:      signedById      || null,
    signedOn:        new Date(),
    body:            body            || letter.body,
    referenceNumber: referenceNumber || letter.referenceNumber,
    pdfPath:         pdfPath         || null,
    status:          'Issued',
    docStatus:       1,
  });

  logger.info('AppointmentLetter issued', { letterId: id });
  return letter;
};

/**
 * Mark letter as delivered (HR confirms manual delivery or email send).
 */
const markLetterDelivered = async (id, deliveryMethod = null) => {
  const letter = await AppointmentLetter.findByPk(id);
  if (!letter) throw new AppError('Appointment letter not found', 404);
  if (letter.status !== 'Issued') {
    throw new AppError('Only Issued letters can be marked as delivered', 422);
  }

  await letter.update({
    status:         'Delivered',
    deliveredOn:    new Date(),
    deliveryMethod: deliveryMethod || letter.deliveryMethod,
  });

  return letter;
};

/**
 * Candidate acknowledges the appointment letter via portal token.
 */
const acknowledgeAppointmentLetter = async (token) => {
  if (!token) throw new AppError('Acknowledgement token is required', 422);

  const letter = await AppointmentLetter.findOne({
    where: { acknowledgementToken: token },
  });
  if (!letter) throw new AppError('Invalid or expired acknowledgement token', 404);
  if (letter.status === 'Acknowledged') {
    throw new AppError('Letter has already been acknowledged', 409);
  }

  await letter.update({
    status:         'Acknowledged',
    acknowledgedOn: new Date(),
  });

  logger.info('AppointmentLetter acknowledged', { letterId: letter.id });
  return letter;
};


// ═════════════════════════════════════════════
//  PHASE 7 — ONBOARDING TRANSITION  (Flow 13)
// ═════════════════════════════════════════════

/**
 * Convert an accepted JobApplicant into a full Employee record.
 *
 * Steps:
 *   1. Validate applicant is Accepted with an issued AppointmentLetter
 *   2. Create a User account (email = applicant email, temp password)
 *   3. Create the Employee record seeded from the JobOffer placement data
 *   4. Link the User → Employee
 *
 * Returns: { employee, user, temporaryPassword }
 */
const createEmployeeFromApplicant = async (applicantId) => {
  const applicant = await JobApplicant.findByPk(applicantId, {
    include: [
      {
        model: JobOffer,
        required: false,
        include: [
          { model: Designation,    attributes: ['id', 'name'], required: false },
          { model: EmploymentType, attributes: ['id', 'name'], required: false },
          { model: EmployeeGrade,  attributes: ['id', 'name'], required: false },
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

  // Verify appointment letter is at least Issued
  const letter = await AppointmentLetter.findOne({ where: { jobApplicantId: applicantId } });
  if (!letter || !['Issued', 'Delivered', 'Acknowledged'].includes(letter.status)) {
    throw new AppError('Appointment letter must be issued before converting to employee', 422);
  }

  // Check no employee already linked to this applicant's email
  const existingUser = await User.unscoped().findOne({
    where: { email: applicant.email },
  });
  if (existingUser?.id) {
    const existingEmp = await Employee.findOne({ where: { userId: existingUser.id } });
    if (existingEmp) throw new AppError('An employee already exists for this email', 409);
  }

  // Generate a temporary password
  const temporaryPassword = `Hrms@${Math.random().toString(36).slice(2, 10)}`;

  // Parse applicant name into first/last
  const nameParts   = applicant.applicantName.trim().split(/\s+/);
  const firstName   = nameParts[0];
  const lastName    = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '.';

  const result = await sequelize.transaction(async (t) => {
    // 1. Create or reuse the User account
    let user = existingUser;
    if (!user) {
      user = await User.create({
        firstName,
        lastName,
        email:        applicant.email,
        passwordHash: temporaryPassword,   // beforeSave hook hashes this
        status:       'Active',
      }, { transaction: t });
    }

    // 2. Generate employee number: EMP-YYYY-NNN
    const year     = new Date().getFullYear();
    const empCount = await Employee.count({ transaction: t });
    const empNumber = `EMP-${year}-${String(empCount + 1).padStart(4, '0')}`;

    // 3. Create the Employee record
    const employee = await Employee.create({
      userId:           user.id,
      companyId:        offer.companyId,
      branchId:         offer.branchId         || null,
      departmentId:     offer.departmentId      || null,
      designationId:    offer.designationId     || null,
      employmentTypeId: offer.employmentTypeId  || null,
      employeeGradeId:  offer.gradeId           || null,
      employeeNumber:   empNumber,
      firstName,
      lastName,
      companyEmail:     applicant.email,
      dateOfJoining:    offer.proposedJoiningDate || new Date().toISOString().split('T')[0],
      status:           'Active',
    }, { transaction: t });

    // 4. Update applicant status to indicate conversion is done
    await applicant.update({ status: 'Accepted' }, { transaction: t });

    return { employee, user };
  });

  logger.info('Employee created from applicant', {
    employeeId:  result.employee.id,
    applicantId,
    email:       applicant.email,
  });

  return {
    employee:          result.employee,
    user:              result.user,
    temporaryPassword,   // caller is responsible for emailing this to the new hire
  };
};


// ═════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════

module.exports = {
  // Staffing Plan
  getStaffingPlans,
  getStaffingPlanById,
  createStaffingPlan,
  submitStaffingPlan,
  approveStaffingPlan,

  // Job Requisition
  getJobRequisitions,
  getJobRequisitionById,
  createJobRequisition,
  submitJobRequisition,
  approveHRRequisition,
  rejectHRRequisition,
  approveGMRequisition,
  rejectGMRequisition,

  // Job Opening
  getJobOpenings,
  getJobOpeningById,
  updateJobOpening,
  publishJobOpening,
  closeJobOpening,

  // Job Applicant
  getJobApplicants,
  getJobApplicantById,
  createJobApplicant,
  updateApplicantStatus,

  // Employee Referral
  getEmployeeReferrals,
  createEmployeeReferral,
  acceptReferral,
  rejectReferral,

  // Interview
  getInterviews,
  getInterviewById,
  createInterview,
  updateInterview,
  createInterviewFeedback,

  // Job Offer
  getJobOffers,
  getJobOfferById,
  createJobOffer,
  submitJobOffer,
  approveJobOffer,
  sendJobOffer,
  acceptJobOffer,
  declineJobOffer,

  // Appointment Letter
  getAppointmentLetters,
  issueAppointmentLetter,
  markLetterDelivered,
  acknowledgeAppointmentLetter,

  // Onboarding Transition
  createEmployeeFromApplicant,
};