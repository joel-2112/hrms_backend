'use strict';

/**
 * modules/leave/controllers/leaveController.js
 *
 * Thin controller layer — delegates all business logic to leaveService.
 *
 * Every handler is wrapped with catchAsync so unhandled rejections
 * are forwarded to the global error middleware automatically.
 */

const { catchAsync } = require('../../../utils/catchAsync');
const { ok, created, noContent } = require('../../../utils/response');
const { AppError } = require('../../../middlewares/errorMiddleware');
const leaveService = require('../services/leaveService');
const { Employee, Department, Branch } = require('../../../models');


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE TYPE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/leave/leave-types
 * Admin creates a new leave type (category).
 */
const createLeaveType = catchAsync(async (req, res) => {
  const leaveType = await leaveService.createLeaveType(req.body);

  created(res, {
    message: 'Leave type created successfully',
    data: leaveType,
  });
});

/**
 * GET /api/leave/leave-types
 * List all leave types.
 * Query: ?includeDisabled=true
 */
const getLeaveTypes = catchAsync(async (req, res) => {
  const { includeDisabled } = req.query;

  const types = await leaveService.getLeaveTypes({
    includeDisabled: includeDisabled === 'true',
  });

  ok(res, {
    message: 'Leave types fetched successfully',
    data: types,
  });
});

/**
 * GET /api/leave/leave-types/:id
 * Get a single leave type by ID.
 */
const getLeaveTypeById = catchAsync(async (req, res) => {
  const leaveType = await leaveService.getLeaveTypeById(req.params.id);

  ok(res, {
    message: 'Leave type fetched successfully',
    data: leaveType,
  });
});

/**
 * PATCH /api/leave/leave-types/:id
 * Update leave type rules.
 */
const updateLeaveType = catchAsync(async (req, res) => {
  const updated = await leaveService.updateLeaveType(req.params.id, req.body);

  ok(res, {
    message: 'Leave type updated successfully',
    data: updated,
  });
});

/**
 * DELETE /api/leave/leave-types/:id
 * Soft-delete (disable) a leave type.
 */
const deleteLeaveType = catchAsync(async (req, res) => {
  await leaveService.deleteLeaveType(req.params.id);

  ok(res, {
    message: 'Leave type disabled successfully',
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE PERIOD
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/leave/leave-periods
 * Create a new leave period (financial/leave year).
 */
const createLeavePeriod = catchAsync(async (req, res) => {
  const period = await leaveService.createLeavePeriod(req.body);

  created(res, {
    message: 'Leave period created successfully',
    data: period,
  });
});

/**
 * GET /api/leave/leave-periods
 * List all leave periods for a company.
 * Query: ?companyId=uuid&isActive=true
 */
const getLeavePeriods = catchAsync(async (req, res) => {
  const { companyId, isActive } = req.query;

  const periods = await leaveService.getLeavePeriods(companyId, {
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
  });

  ok(res, {
    message: 'Leave periods fetched successfully',
    data: periods,
  });
});

/**
 * GET /api/leave/leave-periods/active
 * Get the currently active leave period for a company.
 * Query: ?companyId=uuid
 */
const getActiveLeavePeriod = catchAsync(async (req, res) => {
  const { companyId } = req.query;

  if (!companyId) throw new AppError('companyId is required', 422);

  const period = await leaveService.getActiveLeavePeriod(companyId);

  ok(res, {
    message: 'Active leave period fetched successfully',
    data: period,
  });
});

/**
 * GET /api/leave/leave-periods/:id
 * Get a single leave period by ID.
 */
const getLeavePeriodById = catchAsync(async (req, res) => {
  const period = await leaveService.getLeavePeriodById(req.params.id);

  ok(res, {
    message: 'Leave period fetched successfully',
    data: period,
  });
});

/**
 * PATCH /api/leave/leave-periods/:id
 * Update leave period boundaries.
 */
const updateLeavePeriod = catchAsync(async (req, res) => {
  const updated = await leaveService.updateLeavePeriod(req.params.id, req.body);

  ok(res, {
    message: 'Leave period updated successfully',
    data: updated,
  });
});

/**
 * DELETE /api/leave/leave-periods/:id
 * Delete a leave period.
 */
const deleteLeavePeriod = catchAsync(async (req, res) => {
  await leaveService.deleteLeavePeriod(req.params.id);

  noContent(res);
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE POLICY
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/leave/leave-policies
 * Create a new leave policy (entitlement template).
 */
const createLeavePolicy = catchAsync(async (req, res) => {
  const policy = await leaveService.createLeavePolicy(req.body);

  created(res, {
    message: 'Leave policy created successfully',
    data: policy,
  });
});

/**
 * GET /api/leave/leave-policies
 * List all leave policies.
 * Query: ?includeDisabled=true
 */
const getLeavePolicies = catchAsync(async (req, res) => {
  const { includeDisabled } = req.query;

  const policies = await leaveService.getLeavePolicies({
    includeDisabled: includeDisabled === 'true',
  });

  ok(res, {
    message: 'Leave policies fetched successfully',
    data: policies,
  });
});

/**
 * GET /api/leave/leave-policies/:id
 * Get a single leave policy by ID.
 */
const getLeavePolicyById = catchAsync(async (req, res) => {
  const policy = await leaveService.getLeavePolicyById(req.params.id);

  ok(res, {
    message: 'Leave policy fetched successfully',
    data: policy,
  });
});

/**
 * PATCH /api/leave/leave-policies/:id
 * Update a leave policy.
 */
const updateLeavePolicy = catchAsync(async (req, res) => {
  const updated = await leaveService.updateLeavePolicy(req.params.id, req.body);

  ok(res, {
    message: 'Leave policy updated successfully',
    data: updated,
  });
});

/**
 * DELETE /api/leave/leave-policies/:id
 * Soft-delete (disable) a leave policy.
 */
const deleteLeavePolicy = catchAsync(async (req, res) => {
  await leaveService.deleteLeavePolicy(req.params.id);

  ok(res, {
    message: 'Leave policy disabled successfully',
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE POLICY ASSIGNMENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/leave/policy-assignments
 * Assign a leave policy to an employee for a period.
 */
const createLeavePolicyAssignment = catchAsync(async (req, res) => {
  const assignment = await leaveService.createLeavePolicyAssignment(req.body);

  created(res, {
    message: 'Leave policy assigned successfully',
    data: assignment,
  });
});

/**
 * GET /api/leave/policy-assignments
 * List policy assignments with filters.
 * Query: ?employeeId=uuid&leavePeriodId=uuid&page=1&limit=20
 */
const getLeavePolicyAssignments = catchAsync(async (req, res) => {
  const { data, meta } = await leaveService.getLeavePolicyAssignments(req.query);

  ok(res, {
    message: 'Policy assignments fetched successfully',
    data,
    meta,
  });
});

/**
 * GET /api/leave/policy-assignments/:id
 * Get a single policy assignment by ID.
 */
const getLeavePolicyAssignmentById = catchAsync(async (req, res) => {
  const assignment = await leaveService.getLeavePolicyAssignmentById(req.params.id);

  ok(res, {
    message: 'Policy assignment fetched successfully',
    data: assignment,
  });
});

/**
 * POST /api/leave/policy-assignments/:id/generate-allocations
 * Generate LeaveAllocation rows from a policy assignment.
 */
const generateAllocations = catchAsync(async (req, res) => {
  const allocations = await leaveService.generateAllocations(req.params.id);

  created(res, {
    message: `${allocations.length} allocation(s) generated successfully`,
    data: allocations,
  });
});

/**
 * POST /api/leave/policy-assignments/:id/cancel
 * Cancel a policy assignment.
 */
const cancelLeavePolicyAssignment = catchAsync(async (req, res) => {
  const assignment = await leaveService.cancelLeavePolicyAssignment(req.params.id);

  ok(res, {
    message: 'Policy assignment cancelled successfully',
    data: assignment,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE ALLOCATION (read-only)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/leave/allocations
 * List all leave allocations with filters.
 * Query: ?employeeId=uuid&leaveTypeId=uuid&leavePeriodId=uuid&page=1&limit=20
 */
const getLeaveAllocations = catchAsync(async (req, res) => {
  const { data, meta } = await leaveService.getLeaveAllocations(req.query);

  ok(res, {
    message: 'Leave allocations fetched successfully',
    data,
    meta,
  });
});

/**
 * GET /api/leave/allocations/:id
 * Get a single leave allocation by ID.
 */
const getLeaveAllocationById = catchAsync(async (req, res) => {
  const allocation = await leaveService.getLeaveAllocationById(req.params.id);

  ok(res, {
    message: 'Leave allocation fetched successfully',
    data: allocation,
  });
});

/**
 * GET /api/leave/balances/:employeeId
 * Get all leave balances for one employee.
 */
const getLeaveBalances = catchAsync(async (req, res) => {
  const balances = await leaveService.getLeaveBalances(req.params.employeeId);

  ok(res, {
    message: 'Leave balances fetched successfully',
    data: balances,
  });
});

/**
 * GET /api/leave/balances/:employeeId/:leaveTypeId
 * Get leave balance for one employee + one leave type.
 */
const getLeaveBalance = catchAsync(async (req, res) => {
  const { employeeId, leaveTypeId } = req.params;

  const balance = await leaveService.getLeaveBalance(employeeId, leaveTypeId);

  ok(res, {
    message: 'Leave balance fetched successfully',
    data: balance,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  HOLIDAY LIST
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/leave/holiday-lists
 * Create a new holiday list.
 */
const createHolidayList = catchAsync(async (req, res) => {
  const list = await leaveService.createHolidayList(req.body);

  created(res, {
    message: 'Holiday list created successfully',
    data: list,
  });
});

/**
 * GET /api/leave/holiday-lists
 * List all holiday lists.
 * Query: ?companyId=uuid&includeDisabled=true
 */
const getHolidayLists = catchAsync(async (req, res) => {
  const { companyId, includeDisabled } = req.query;

  const lists = await leaveService.getHolidayLists({
    companyId,
    includeDisabled: includeDisabled === 'true',
  });

  ok(res, {
    message: 'Holiday lists fetched successfully',
    data: lists,
  });
});

/**
 * GET /api/leave/holiday-lists/:id
 * Get a single holiday list by ID.
 */
const getHolidayListById = catchAsync(async (req, res) => {
  const list = await leaveService.getHolidayListById(req.params.id);

  ok(res, {
    message: 'Holiday list fetched successfully',
    data: list,
  });
});

/**
 * PATCH /api/leave/holiday-lists/:id
 * Update a holiday list.
 */
const updateHolidayList = catchAsync(async (req, res) => {
  const updated = await leaveService.updateHolidayList(req.params.id, req.body);

  ok(res, {
    message: 'Holiday list updated successfully',
    data: updated,
  });
});

/**
 * DELETE /api/leave/holiday-lists/:id
 * Soft-delete (disable) a holiday list.
 */
const deleteHolidayList = catchAsync(async (req, res) => {
  await leaveService.deleteHolidayList(req.params.id);

  ok(res, {
    message: 'Holiday list disabled successfully',
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE BLOCK LIST
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/leave/block-lists
 * Create a new leave block list.
 */
const createLeaveBlockList = catchAsync(async (req, res) => {
  const list = await leaveService.createLeaveBlockList(req.body);

  created(res, {
    message: 'Leave block list created successfully',
    data: list,
  });
});

/**
 * GET /api/leave/block-lists
 * List all leave block lists for a company.
 * Query: ?companyId=uuid&includeDisabled=true
 */
const getLeaveBlockLists = catchAsync(async (req, res) => {
  const { companyId, includeDisabled } = req.query;

  const lists = await leaveService.getLeaveBlockLists(companyId, {
    includeDisabled: includeDisabled === 'true',
  });

  ok(res, {
    message: 'Leave block lists fetched successfully',
    data: lists,
  });
});

/**
 * GET /api/leave/block-lists/:id
 * Get a single leave block list by ID.
 */
const getLeaveBlockListById = catchAsync(async (req, res) => {
  const list = await leaveService.getLeaveBlockListById(req.params.id);

  ok(res, {
    message: 'Leave block list fetched successfully',
    data: list,
  });
});

/**
 * PATCH /api/leave/block-lists/:id
 * Update a leave block list.
 */
const updateLeaveBlockList = catchAsync(async (req, res) => {
  const updated = await leaveService.updateLeaveBlockList(req.params.id, req.body);

  ok(res, {
    message: 'Leave block list updated successfully',
    data: updated,
  });
});

/**
 * DELETE /api/leave/block-lists/:id
 * Soft-delete (disable) a leave block list.
 */
const deleteLeaveBlockList = catchAsync(async (req, res) => {
  await leaveService.deleteLeaveBlockList(req.params.id);

  ok(res, {
    message: 'Leave block list disabled successfully',
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  COMPENSATORY LEAVE REQUEST
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/leave/compensatory-requests
 * Employee claims comp-off for working on a holiday/weekend.
 */
const createCompensatoryRequest = catchAsync(async (req, res) => {
  const request = await leaveService.createCompensatoryRequest(req.body, req.user?.id);

  created(res, {
    message: 'Compensatory leave request created successfully',
    data: request,
  });
});

/**
 * GET /api/leave/compensatory-requests
 * List compensatory leave requests with filters.
 * Query: ?employeeId=uuid&status=Approved&page=1&limit=20
 */
const getCompensatoryRequests = catchAsync(async (req, res) => {
  const { data, meta } = await leaveService.getCompensatoryRequests(req.query);

  ok(res, {
    message: 'Compensatory requests fetched successfully',
    data,
    meta,
  });
});

/**
 * GET /api/leave/compensatory-requests/:id
 * Get a single compensatory request by ID.
 */
const getCompensatoryRequestById = catchAsync(async (req, res) => {
  const request = await leaveService.getCompensatoryRequestById(req.params.id);

  ok(res, {
    message: 'Compensatory request fetched successfully',
    data: request,
  });
});

/**
 * POST /api/leave/compensatory-requests/:id/submit
 * Submit compensatory request for approval.
 */
const submitCompensatoryRequest = catchAsync(async (req, res) => {
  const request = await leaveService.submitCompensatoryRequest(req.params.id);

  ok(res, {
    message: 'Compensatory request submitted successfully',
    data: request,
  });
});

/**
 * POST /api/leave/compensatory-requests/:id/approve
 * Approve compensatory request — creates LeaveAllocation + credits ledger.
 */
const approveCompensatoryRequest = catchAsync(async (req, res) => {
  const approverUserId = req.employee?.id || req.user?.id;

  const result = await leaveService.approveCompensatoryRequest(req.params.id, approverUserId);

  ok(res, {
    message: 'Compensatory request approved — Leave allocation created',
    data: result,
  });
});

/**
 * POST /api/leave/compensatory-requests/:id/reject
 * Reject compensatory request.
 */
const rejectCompensatoryRequest = catchAsync(async (req, res) => {
  const { rejectionReason } = req.body;

  const request = await leaveService.rejectCompensatoryRequest(req.params.id, rejectionReason);

  ok(res, {
    message: 'Compensatory request rejected',
    data: request,
  });
});

/**
 * POST /api/leave/compensatory-requests/:id/cancel
 * Cancel compensatory request.
 */
const cancelCompensatoryRequest = catchAsync(async (req, res) => {
  const request = await leaveService.cancelCompensatoryRequest(req.params.id);

  ok(res, {
    message: 'Compensatory request cancelled',
    data: request,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE APPLICATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/leave/applications
 * Employee applies for leave.
 */
const createLeaveApplication = catchAsync(async (req, res) => {
  const application = await leaveService.createLeaveApplication(req.body, req.user?.id);

  created(res, {
    message: 'Leave application created successfully',
    data: application,
  });
});

/**
 * GET /api/leave/applications
 * List leave applications with filters + RBAC data scope.
 * Query: ?employeeId=uuid&status=Approved&leaveTypeId=uuid&page=1&limit=20
 */
const getLeaveApplications = catchAsync(async (req, res) => {
  // Get data filter from RBAC middleware (e.g., { branchId: "uuid" })
  const permFilter = req.perms?.dataFilter || {};

  const { data, meta } = await leaveService.getLeaveApplications(req.query, permFilter);

  ok(res, {
    message: 'Leave applications fetched successfully',
    data,
    meta,
  });
});

/**
 * GET /api/leave/applications/:id
 * Get a single leave application by ID.
 */
const getLeaveApplicationById = catchAsync(async (req, res) => {
  const application = await leaveService.getLeaveApplicationById(req.params.id);

  ok(res, {
    message: 'Leave application fetched successfully',
    data: application,
  });
});

/**
 * POST /api/leave/applications/:id/submit
 * Submit leave application for approval.
 */
const submitLeaveApplication = catchAsync(async (req, res) => {
  const application = await leaveService.submitLeaveApplication(req.params.id);

  ok(res, {
    message: 'Leave application submitted for approval',
    data: application,
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE APPLICATION — FIXED APPROVE/REJECT WITH EMPLOYEE LOOKUP
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/leaves/applications/:id/approve
 * Approver approves leave application — debits ledger.
 */
const approveLeaveApplication = catchAsync(async (req, res) => {
  // Look up the Employee record associated with the authenticated User
  const { Employee } = require('../../../models');
  let approverEmployeeId = null;

  if (req.user?.id) {
    const employee = await Employee.findOne({
      where: { userId: req.user.id },
      attributes: ['id'],
    });
    approverEmployeeId = employee?.id || null;
  }

  // Also check req.employee if your auth middleware attaches it
  if (!approverEmployeeId && req.employee?.id) {
    approverEmployeeId = req.employee.id;
  }

  // Fallback: if the user IS an employee (userId on employee = same UUID pattern)
  if (!approverEmployeeId) {
    const employee = await Employee.findByPk(req.user?.id, { attributes: ['id'] });
    approverEmployeeId = employee?.id || null;
  }

  const application = await leaveService.approveLeaveApplication(
    req.params.id,
    approverEmployeeId,
  );

  ok(res, {
    message: 'Leave application approved — Balance updated',
    data: application,
  });
});

/**
 * POST /api/leaves/applications/:id/reject
 * Approver rejects leave application.
 */
const rejectLeaveApplication = catchAsync(async (req, res) => {
  // Look up the Employee record associated with the authenticated User
  const { Employee } = require('../../../models');
  let approverEmployeeId = null;

  if (req.user?.id) {
    const employee = await Employee.findOne({
      where: { userId: req.user.id },
      attributes: ['id'],
    });
    approverEmployeeId = employee?.id || null;
  }

  if (!approverEmployeeId && req.employee?.id) {
    approverEmployeeId = req.employee.id;
  }

  if (!approverEmployeeId) {
    const employee = await Employee.findByPk(req.user?.id, { attributes: ['id'] });
    approverEmployeeId = employee?.id || null;
  }

  const { rejectionReason } = req.body;

  const application = await leaveService.rejectLeaveApplication(
    req.params.id,
    approverEmployeeId,
    rejectionReason,
  );

  ok(res, {
    message: 'Leave application rejected',
    data: application,
  });
});

/**
 * POST /api/leave/applications/:id/cancel
 * Cancel leave application — reverses debit if already approved.
 */
const cancelLeaveApplication = catchAsync(async (req, res) => {
  const application = await leaveService.cancelLeaveApplication(req.params.id);

  ok(res, {
    message: 'Leave application cancelled',
    data: application,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE LEDGER (read-only)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/leave/ledger/:employeeId/:leaveTypeId
 * Full ledger for an employee per leave type.
 * Query: ?voucherType=LeaveApplication&page=1&limit=20
 */
const getLeaveLedger = catchAsync(async (req, res) => {
  const { employeeId, leaveTypeId } = req.params;

  const result = await leaveService.getLeaveLedger(employeeId, leaveTypeId, req.query);

  ok(res, {
    message: 'Leave ledger fetched successfully',
    data: result.data,
    meta: result.meta,
    currentBalance: result.currentBalance,
  });
});

/**
 * GET /api/leave/ledger-entries/:id
 * Get a single ledger entry by ID.
 */
const getLeaveLedgerEntryById = catchAsync(async (req, res) => {
  const entry = await leaveService.getLeaveLedgerEntryById(req.params.id);

  ok(res, {
    message: 'Ledger entry fetched successfully',
    data: entry,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE ENCASHMENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/leave/encashments
 * Create a leave encashment request.
 */
const createLeaveEncashment = catchAsync(async (req, res) => {
  const encashment = await leaveService.createLeaveEncashment(req.body);

  created(res, {
    message: 'Leave encashment created successfully',
    data: encashment,
  });
});

/**
 * GET /api/leave/encashments
 * List leave encashments with filters.
 * Query: ?employeeId=uuid&page=1&limit=20
 */
const getLeaveEncashments = catchAsync(async (req, res) => {
  const { data, meta } = await leaveService.getLeaveEncashments(req.query);

  ok(res, {
    message: 'Leave encashments fetched successfully',
    data,
    meta,
  });
});

/**
 * GET /api/leave/encashments/:id
 * Get a single leave encashment by ID.
 */
const getLeaveEncashmentById = catchAsync(async (req, res) => {
  const encashment = await leaveService.getLeaveEncashmentById(req.params.id);

  ok(res, {
    message: 'Leave encashment fetched successfully',
    data: encashment,
  });
});

/**
 * POST /api/leave/encashments/:id/submit
 * Submit encashment for processing.
 */
const submitLeaveEncashment = catchAsync(async (req, res) => {
  const encashment = await leaveService.submitLeaveEncashment(req.params.id);

  ok(res, {
    message: 'Leave encashment submitted for approval',
    data: encashment,
  });
});

/**
 * POST /api/leave/encashments/:id/approve
 * Approve encashment — debits ledger.
 */
const approveLeaveEncashment = catchAsync(async (req, res) => {
  const encashment = await leaveService.approveLeaveEncashment(req.params.id);

  ok(res, {
    message: 'Leave encashment approved — Balance updated',
    data: encashment,
  });
});

/**
 * POST /api/leave/encashments/:id/reject
 * Reject encashment — back to Draft.
 */
const rejectLeaveEncashment = catchAsync(async (req, res) => {
  const encashment = await leaveService.rejectLeaveEncashment(req.params.id);

  ok(res, {
    message: 'Leave encashment rejected',
    data: encashment,
  });
});

/**
 * POST /api/leave/encashments/:id/cancel
 * Cancel encashment.
 */
const cancelLeaveEncashment = catchAsync(async (req, res) => {
  const encashment = await leaveService.cancelLeaveEncashment(req.params.id);

  ok(res, {
    message: 'Leave encashment cancelled',
    data: encashment,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  COMPLIANCE & UTILITIES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/leave/compliance/check-date
 * Check if a date is blocked or a holiday.
 * Query: ?date=2026-06-15&companyId=uuid&departmentId=uuid
 */
const checkDate = catchAsync(async (req, res) => {
  const { date, companyId, departmentId } = req.query;

  if (!date || !companyId) throw new AppError('date and companyId are required', 422);

  const [blocked, holiday] = await Promise.all([
    leaveService.isDateBlocked(date, companyId, departmentId || null),
    leaveService.isDateHoliday(date, companyId),
  ]);

  ok(res, {
    message: 'Date check completed',
    data: {
      date,
      blocked,
      holiday,
    },
  });
});

/**
 * GET /api/leave/compliance/validate-balance
 * Validate if an employee has sufficient balance for requested days.
 * Query: ?employeeId=uuid&leaveTypeId=uuid&requestedDays=5
 */
const validateLeaveBalance = catchAsync(async (req, res) => {
  const { employeeId, leaveTypeId, requestedDays } = req.query;

  if (!employeeId || !leaveTypeId || !requestedDays) {
    throw new AppError('employeeId, leaveTypeId and requestedDays are required', 422);
  }

  const result = await leaveService.validateLeaveBalance(
    employeeId, leaveTypeId, parseFloat(requestedDays),
  );

  ok(res, {
    message: result.sufficient ? 'Sufficient balance' : 'Insufficient balance',
    data: result,
  });
});

/**
 * GET /api/leave/compliance/calculate-days
 * Calculate working days between two dates excluding holidays/weekends.
 * Query: ?fromDate=2026-06-01&toDate=2026-06-15&includeHolidays=false&includeWeekends=false&holidayListId=uuid
 */
const calculateWorkingDays = catchAsync(async (req, res) => {
  const { fromDate, toDate, includeHolidays, includeWeekends, holidayListId } = req.query;

  if (!fromDate || !toDate) throw new AppError('fromDate and toDate are required', 422);

  let holidays = [];
  if (holidayListId) {
    const list = await leaveService.getHolidayListById(holidayListId);
    holidays = list.holidays || [];
  }

  const days = await leaveService.calculateWorkingDays(
    fromDate, toDate,
    includeHolidays === 'true', includeWeekends === 'true',
    holidays,
  );

  ok(res, {
    message: 'Working days calculated',
    data: {
      fromDate,
      toDate,
      workingDays: days,
      includeHolidays: includeHolidays === 'true',
      includeWeekends: includeWeekends === 'true',
    },
  });
});

/**
 * POST /api/leave/compliance/expire-overdue
 * Bulk-expire overdue ledger entries (scheduled job).
 */
const expireOverdueLedgerEntries = catchAsync(async (req, res) => {
  const result = await leaveService.expireOverdueLedgerEntries();

  ok(res, {
    message: `${result.expired} overdue ledger entry(s) marked as expired`,
    data: result,
  });
});
// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE DASHBOARD — fixed controllers with Employee lookup for companyId
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Helper: fetch employee context (companyId, branchId, departmentId) from userId
 * Caches result on req.employeeContext for subsequent calls in same request
 */
const getEmployeeContext = async (req) => {
  if (req._employeeContext) return req._employeeContext;

  const userId = req.user?.id;
  if (!userId) return null;

  const employee = await Employee.findOne({
    where: { userId },
    attributes: ['id', 'companyId', 'branchId', 'departmentId'],
  });

  if (!employee) return null;

  req._employeeContext = {
    employeeId: employee.id,
    companyId: employee.companyId,
    branchId: employee.branchId,
    departmentId: employee.departmentId,
  };

  return req._employeeContext;
};

/**
 * GET /api/leaves/dashboard/stats
 * Get dashboard statistics
 */
const getDashboardStats = catchAsync(async (req, res) => {
  const context = await getEmployeeContext(req);
  if (!context?.companyId) {
    throw new AppError('Employee record not found. Please ensure your account is linked to an employee.', 400);
  }

  const { period } = req.query;

  const stats = await leaveService.getDashboardStats(
    context.companyId,
    period || new Date().getFullYear().toString(),
    context.branchId || null,
    context.departmentId || null,
  );

  ok(res, { message: 'Dashboard stats fetched successfully', data: stats });
});

/**
 * GET /api/leaves/dashboard/balances
 * Get leave balance snapshot
 */
const getDashboardBalances = catchAsync(async (req, res) => {
  const context = await getEmployeeContext(req);
  if (!context?.companyId) {
    throw new AppError('Employee record not found.', 400);
  }

  const balances = await leaveService.getDashboardBalances(
    context.companyId,
    context.branchId || null,
  );

  ok(res, { message: 'Dashboard balances fetched successfully', data: balances });
});

/**
 * GET /api/leaves/dashboard/pending-approvals
 * Get pending leave approvals
 */
const getDashboardPendingApprovals = catchAsync(async (req, res) => {
  const context = await getEmployeeContext(req);
  if (!context?.companyId) {
    throw new AppError('Employee record not found.', 400);
  }

  const { limit } = req.query;

  const approvals = await leaveService.getDashboardPendingApprovals(
    context.companyId,
    {
      limit: parseInt(limit) || 4,
      branchId: context.branchId || null,
      departmentId: context.departmentId || null,
    },
  );

  ok(res, { message: 'Pending approvals fetched successfully', data: approvals });
});

/**
 * GET /api/leaves/dashboard/on-leave-this-week
 * Get employees currently on leave this week
 */
const getOnLeaveThisWeek = catchAsync(async (req, res) => {
  const context = await getEmployeeContext(req);
  if (!context?.companyId) {
    throw new AppError('Employee record not found.', 400);
  }

  const employees = await leaveService.getOnLeaveThisWeek(
    context.companyId,
    context.branchId || null,
  );

  ok(res, { message: 'On-leave employees fetched successfully', data: employees });
});

/**
 * GET /api/leaves/dashboard/by-type
 * Get leave distribution by type
 */
const getDashboardLeaveByType = catchAsync(async (req, res) => {
  const context = await getEmployeeContext(req);
  if (!context?.companyId) {
    throw new AppError('Employee record not found.', 400);
  }

  const { period } = req.query;

  const byType = await leaveService.getDashboardLeaveByType(
    context.companyId,
    period || new Date().getFullYear().toString(),
    context.branchId || null,
  );

  ok(res, { message: 'Leave by type fetched successfully', data: byType });
});

/**
 * GET /api/leaves/dashboard/next-holiday
 * Get next upcoming public holiday
 */
const getNextHoliday = catchAsync(async (req, res) => {
  const context = await getEmployeeContext(req);
  if (!context?.companyId) {
    throw new AppError('Employee record not found.', 400);
  }

  const holiday = await leaveService.getNextHoliday(context.companyId);

  ok(res, { message: 'Next holiday fetched successfully', data: holiday });
});

/**
 * GET /api/leaves/dashboard/export
 * Export dashboard data
 */
const exportDashboard = catchAsync(async (req, res) => {
  const context = await getEmployeeContext(req);
  if (!context?.companyId) {
    throw new AppError('Employee record not found.', 400);
  }

  const { period } = req.query;

  const data = await leaveService.exportDashboardData(
    context.companyId,
    period || new Date().getFullYear().toString(),
  );

  ok(res, { message: 'Dashboard data exported successfully', data });
});


// ═════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE SELF-SERVICE — MY LEAVE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Helper: Get the employee record for the authenticated user
 */
const getMyEmployee = async (req) => {
  
  // Try req.employee first (if auth middleware attaches it)
  if (req.employee?.id) {
    return Employee.findByPk(req.employee.id, {
      attributes: ['id', 'employeeNumber', 'firstName','middleName', 'lastName', 'reportsToId', 'dateOfJoining', 'departmentId', 'branchId', 'companyId'],
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] },
        { model: Employee, as: 'reportsTo', attributes: ['id', 'firstName', 'middleName', 'lastName', 'employeeNumber', 'dateOfJoining'] },
      ],
    });
  }

  // Look up by userId
  if (req.user?.id) {
    return Employee.findOne({
      where: { userId: req.user.id },
      attributes: ['id', 'employeeNumber', 'firstName','middleName', 'lastName', 'reportsToId', 'dateOfJoining', 'departmentId', 'branchId', 'companyId'],
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] },
        { model: Employee, as: 'reportsTo', attributes: ['id', 'firstName', 'middleName', 'lastName', 'employeeNumber', 'dateOfJoining'] },
      ],
    });
  }

  return null;
};

/**
 * GET /api/leaves/my-leave/summary
 * Get current employee's leave summary
 */
const getMyLeaveSummary = catchAsync(async (req, res) => {
  const employee = await getMyEmployee(req);
  if (!employee) throw new AppError('Employee record not found. Contact HR.', 404);

  // Get all leave balances
  const balances = await leaveService.getLeaveBalances(employee.id);

  // Get active leave period
  let activePeriod = null;
  try {
    const periodRes = await leaveService.getActiveLeavePeriod(employee.companyId);
    activePeriod = periodRes;
  } catch { /* no active period */ }

  // Get pending applications count
  const pendingApps = await leaveService.getLeaveApplications({
    employeeId: employee.id,
    status: 'Open',
    limit: 100,
  });

  // Get approved applications this period
  let approvedThisPeriod = 0;
  if (activePeriod) {
    const approvedRes = await leaveService.getLeaveApplications({
      employeeId: employee.id,
      status: 'Approved',
      limit: 100,
    });
    approvedThisPeriod = (approvedRes.data || []).reduce(
      (sum, app) => sum + parseFloat(app.totalLeaveDays || 0), 0
    );
  }

  ok(res, {
    message: 'My leave summary fetched successfully',
    data: {
      employee: {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        name: `${employee.firstName} ${employee.middleName} ${employee.lastName}`,
        dateOfJoining: employee.dateOfJoining,
        department: employee.department?.name,
        branch: employee.branch?.name,
        reportsTo: employee.reportsTo ? {
          id: employee.reportsTo.id,
          name: `${employee.reportsTo.firstName} ${employee.reportsTo.middleName} ${employee.reportsTo.lastName}`,
          dateOfJoining: employee.reportsTo.dateOfJoining,
        } : null,
      },
      activePeriod: activePeriod ? {
        id: activePeriod.id,
        name: activePeriod.name,
        startDate: activePeriod.startDate,
        endDate: activePeriod.endDate,
      } : null,
      balances: balances || [],
      pendingApplications: (pendingApps.data || []).length,
      daysTakenThisPeriod: approvedThisPeriod,
      draftCount: (await leaveService.getLeaveApplications({
        employeeId: employee.id,
        status: 'Draft',
        limit: 100,
      })).data?.length || 0,
    },
  });
});

/**
 * GET /api/leaves/my-leave/applications
 * Get current employee's leave applications
 */
const getMyLeaveApplications = catchAsync(async (req, res) => {
  const employee = await getMyEmployee(req);
  if (!employee) throw new AppError('Employee record not found. Contact HR.', 404);

  const { status, page, limit } = req.query;

  const result = await leaveService.getLeaveApplications({
    employeeId: employee.id,
    status: status || undefined,
    page: page || 1,
    limit: limit || 20,
  });

  ok(res, {
    message: 'My leave applications fetched successfully',
    data: result.data,
    meta: result.meta,
  });
});

/**
 * GET /api/leaves/my-leave/calendar
 * Get current employee's leave calendar for a year
 */
const getMyLeaveCalendar = catchAsync(async (req, res) => {
  const employee = await getMyEmployee(req);
  if (!employee) throw new AppError('Employee record not found. Contact HR.', 404);

  const year = parseInt(req.query.year) || new Date().getFullYear();
  const fromDate = `${year}-01-01`;
  const toDate = `${year}-12-31`;

  // Get all approved applications for this year
  const result = await leaveService.getLeaveApplications({
    employeeId: employee.id,
    status: 'Approved',
    limit: 200,
  });

  // Filter by year client-side (since service doesn't support date range)
  const yearApps = (result.data || []).filter(
    app => app.fromDate >= fromDate && app.toDate <= toDate
  );

  // Group by month
  const byMonth = {};
  yearApps.forEach(app => {
    const month = new Date(app.fromDate).getMonth();
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push({
      id: app.id,
      fromDate: app.fromDate,
      toDate: app.toDate,
      totalLeaveDays: app.totalLeaveDays,
      leaveType: app.leaveType?.name || 'Unknown',
      status: app.status,
    });
  });

  ok(res, {
    message: 'My leave calendar fetched successfully',
    data: {
      year,
      totalDays: yearApps.reduce((sum, app) => sum + parseFloat(app.totalLeaveDays || 0), 0),
      applications: yearApps.length,
      byMonth,
    },
  });
});
const getMyLedger = catchAsync(async (req, res) => {
  const employee = await getMyEmployee(req);
  if (!employee) throw new AppError('Employee record not found', 404);

  const result = await leaveService.getMyLedger(employee.id, req.query);

  ok(res, {
    message: 'My ledger fetched successfully',
    data: result.data,
    meta: result.meta,
    balances: result.balances,
  });
});

// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Leave Type
  createLeaveType,
  getLeaveTypes,
  getLeaveTypeById,
  updateLeaveType,
  deleteLeaveType,

  // Leave Period
  createLeavePeriod,
  getLeavePeriods,
  getActiveLeavePeriod,
  getLeavePeriodById,
  updateLeavePeriod,
  deleteLeavePeriod,

  // Leave Policy
  createLeavePolicy,
  getLeavePolicies,
  getLeavePolicyById,
  updateLeavePolicy,
  deleteLeavePolicy,

  // Leave Policy Assignment
  createLeavePolicyAssignment,
  getLeavePolicyAssignments,
  getLeavePolicyAssignmentById,
  generateAllocations,
  cancelLeavePolicyAssignment,

  // Leave Allocation
  getLeaveAllocations,
  getLeaveAllocationById,
  getLeaveBalances,
  getLeaveBalance,

  // Holiday List
  createHolidayList,
  getHolidayLists,
  getHolidayListById,
  updateHolidayList,
  deleteHolidayList,

  // Leave Block List
  createLeaveBlockList,
  getLeaveBlockLists,
  getLeaveBlockListById,
  updateLeaveBlockList,
  deleteLeaveBlockList,

  // Compensatory Leave Request
  createCompensatoryRequest,
  getCompensatoryRequests,
  getCompensatoryRequestById,
  submitCompensatoryRequest,
  approveCompensatoryRequest,
  rejectCompensatoryRequest,
  cancelCompensatoryRequest,

  // Leave Application
  createLeaveApplication,
  getLeaveApplications,
  getLeaveApplicationById,
  submitLeaveApplication,
  approveLeaveApplication,
  rejectLeaveApplication,
  cancelLeaveApplication,

  // Leave Ledger
  getLeaveLedger,
  getLeaveLedgerEntryById,

  // Leave Encashment
  createLeaveEncashment,
  getLeaveEncashments,
  getLeaveEncashmentById,
  submitLeaveEncashment,
  approveLeaveEncashment,
  rejectLeaveEncashment,
  cancelLeaveEncashment,

  // Compliance & Utilities
  checkDate,
  validateLeaveBalance,
  calculateWorkingDays,
  expireOverdueLedgerEntries,

  // Dashboard
  getDashboardStats,
  getDashboardBalances,
  getDashboardPendingApprovals,
  getOnLeaveThisWeek,
  getDashboardLeaveByType,
  getNextHoliday,
  exportDashboard,

  // Employee Self-Service
  getMyLeaveSummary,
  getMyLeaveApplications,
  getMyLeaveCalendar,
  getMyLedger,
};