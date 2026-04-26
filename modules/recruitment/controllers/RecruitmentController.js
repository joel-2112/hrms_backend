const recruitmentService = require('../services/recruitmentService');
const { catchAsync }     = require('../../../utils/catchAsync');
const { ok, created, noContent } = require('../../../utils/response');
const { AppError } = require('../../../middlewares/errorMiddleware');


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

const updateStaffingPlan = catchAsync(async (req, res) => {
  const plan = await recruitmentService.updateStaffingPlan(req.params.id, req.body);
  ok(res, plan, 'Staffing plan updated successfully');
});

const submitStaffingPlan = catchAsync(async (req, res) => {
  const plan = await recruitmentService.submitStaffingPlan(req.params.id);
  ok(res, plan, 'Staffing plan submitted successfully');
});

const cancelStaffingPlan = catchAsync(async (req, res) => {
  const plan = await recruitmentService.cancelStaffingPlan(req.params.id);
  ok(res, plan, 'Staffing plan cancelled successfully');
});

const getStaffingSnapshot = catchAsync(async (req, res) => {
  const { designationId, departmentId, companyId } = req.query;
  if (!designationId || !companyId) {
    throw new AppError('designationId and companyId are required', 422);
  }
  const snapshot = await recruitmentService.getStaffingSnapshot(
    designationId,
    departmentId,
    companyId
  );
  ok(res, snapshot, 'Staffing snapshot fetched successfully');
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
  ok(res, result, 'Requisition approved by GM');
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

const cancelJobRequisition = catchAsync(async (req, res) => {
  const { remarks } = req.body;
  const requisition = await recruitmentService.cancelJobRequisition(
    req.params.id,
    req.user.id,
    remarks || null,
  );
  ok(res, requisition, 'Job requisition cancelled successfully');
});


// ══════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════

module.exports = {
  // Staffing Plan
  listStaffingPlans,
  createStaffingPlan,
  getStaffingPlan,
  updateStaffingPlan,
  submitStaffingPlan,
  cancelStaffingPlan,
  getStaffingSnapshot,

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
};