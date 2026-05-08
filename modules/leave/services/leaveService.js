"use strict";

/**
 * modules/leave/services/leaveService.js
 *
 * Complete leave management service covering:
 *
 *  ── LEAVE TYPE ────────────────────────────────────────────────────────
 *  createLeaveType              Admin defines a leave category
 *  getLeaveTypes                List all leave types
 *  getLeaveTypeById             Single leave type
 *  updateLeaveType              Edit leave type rules
 *  deleteLeaveType              Soft-delete (disable)
 *
 *  ── LEAVE PERIOD ──────────────────────────────────────────────────────
 *  createLeavePeriod            Define leave year boundaries
 *  getLeavePeriods              List all periods per company
 *  getLeavePeriodById           Single period
 *  getActiveLeavePeriod         The currently active period for a company
 *  updateLeavePeriod            Edit period boundaries
 *  deleteLeavePeriod            Remove period
 *
 *  ── LEAVE POLICY ──────────────────────────────────────────────────────
 *  createLeavePolicy            Create entitlement template
 *  getLeavePolicies             List all policies
 *  getLeavePolicyById           Single policy with leave type details
 *  updateLeavePolicy            Edit policy
 *  deleteLeavePolicy            Soft-delete
 *
 *  ── LEAVE POLICY ASSIGNMENT ────────────────────────────────────────────
 *  createLeavePolicyAssignment  Assign policy to employee for a period
 *  getLeavePolicyAssignments    List assignments with filters
 *  getLeavePolicyAssignmentById Single assignment
 *  generateAllocations          Create LeaveAllocation rows from assignment
 *  cancelLeavePolicyAssignment  Cancel assignment
 *
 *  ── LEAVE ALLOCATION ──────────────────────────────────────────────────
 *  getLeaveAllocations          List allocations per employee
 *  getLeaveAllocationById       Single allocation
 *  getLeaveBalance              Current balance per employee per leave type
 *  getLeaveBalances             All balances for one employee
 *
 *  ── HOLIDAY LIST ──────────────────────────────────────────────────────
 *  createHolidayList            Define a named holiday calendar
 *  getHolidayLists              List all holiday lists
 *  getHolidayListById           Single list with holidays array
 *  updateHolidayList            Edit holidays
 *  deleteHolidayList            Remove list
 *
 *  ── LEAVE BLOCK LIST ──────────────────────────────────────────────────
 *  createLeaveBlockList         Define dates where leave is restricted
 *  getLeaveBlockLists           List all block lists
 *  getLeaveBlockListById        Single block list
 *  updateLeaveBlockList         Edit blocked dates
 *  deleteLeaveBlockList         Remove block list
 *
 *  ── COMPENSATORY LEAVE REQUEST ────────────────────────────────────────
 *  createCompensatoryRequest    Employee claims comp-off for working on holiday
 *  getCompensatoryRequests      List requests with filters
 *  getCompensatoryRequestById   Single request
 *  submitCompensatoryRequest    Submit for approval (Draft → Submitted)
 *  approveCompensatoryRequest   Approve → creates LeaveAllocation
 *  rejectCompensatoryRequest    Reject with reason
 *  cancelCompensatoryRequest    Cancel request
 *
 *  ── LEAVE APPLICATION ─────────────────────────────────────────────────
 *  createLeaveApplication       Employee applies for leave
 *  getLeaveApplications         List applications with filters
 *  getLeaveApplicationById      Single application
 *  submitLeaveApplication       Submit for approval
 *  approveLeaveApplication      Approver approves → updates ledger
 *  rejectLeaveApplication       Approver rejects
 *  cancelLeaveApplication       Cancel application
 *
 *  ── LEAVE LEDGER ──────────────────────────────────────────────────────
 *  getLeaveLedger               Full ledger for an employee per leave type
 *  getLeaveLedgerEntryById      Single ledger entry
 *
 *  ── LEAVE ENCASHMENT ──────────────────────────────────────────────────
 *  createLeaveEncashment        Convert unused leave balance to payout
 *  getLeaveEncashments          List encashments with filters
 *  getLeaveEncashmentById       Single encashment
 *  submitLeaveEncashment        Submit for processing
 *  approveLeaveEncashment       Approve → updates ledger
 *  rejectLeaveEncashment        Reject
 *  cancelLeaveEncashment        Cancel
 *
 *  ── COMPLIANCE & UTILITIES ────────────────────────────────────────────
 *  isDateBlocked                Check if a date is in any block list
 *  isDateHoliday                Check if a date is a holiday
 *  calculateWorkingDays         Working days between two dates excluding holidays/weekends
 *  validateLeaveBalance         Check sufficient balance before application
 *  expireOverdueLedgerEntries   Mark ledger entries as expired when period ends
 */

const { Op } = require("sequelize");
const { sequelize, Department, Branch } = require("../../../models");
const {
  LeaveType,
  LeavePeriod,
  LeavePolicy,
  LeavePolicyAssignment,
  LeaveAllocation,
  HolidayList,
  LeaveBlockList,
  CompensatoryLeaveRequest,
  LeaveApplication,
  LeaveLedgerEntry,
  LeaveEncashment,
  Employee,
  User,
} = require("../../../models");
const { AppError } = require("../../../middlewares/errorMiddleware");
const {
  getPaginationOptions,
  buildMeta,
} = require("../../../utils/pagination");
const logger = require("../../../utils/logger");

// ═════════════════════════════════════════════════════════════════════════════
//  PRIVATE HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Asserts employee exists and is active.
 */
const assertEmployeeActive = async (employeeId) => {
  const emp = await Employee.findByPk(employeeId, {
    attributes: ["id", "status"],
  });
  if (!emp) throw new AppError("Employee not found", 404);
  if (emp.status !== "Active") {
    throw new AppError("Employee must be Active for leave operations", 422);
  }
  return emp;
};
// ═════════════════════════════════════════════════════════════════════════════
//  MY LEDGER — Authenticated Employee's Ledger
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get leave ledger for the authenticated employee
 * @param {string} employeeId - Employee UUID
 * @param {object} query - Filters (leaveTypeId, voucherType, page, limit)
 */
const getMyLedger = async (employeeId, query = {}) => {
  const { leaveTypeId, voucherType } = query;
  const { limit, offset, page } = getPaginationOptions(query);

  // If no specific leave type, get all leave types for this employee
  let where = { employeeId };

  if (leaveTypeId) {
    where.leaveTypeId = leaveTypeId;
  }

  if (voucherType) {
    where.voucherType = voucherType;
  }

  const { count, rows } = await LeaveLedgerEntry.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: LeaveType,
        as: 'leaveType',
        attributes: ['id', 'name'],
      },
    ],
  });

  // Calculate current balance per leave type
  const allEntries = await LeaveLedgerEntry.findAll({
    where: { employeeId, isExpired: false },
    attributes: ['leaveTypeId', 'leaves'],
  });

  // Group balance by leave type
  const balanceByType = {};
  allEntries.forEach(entry => {
    const ltId = entry.leaveTypeId;
    balanceByType[ltId] = (balanceByType[ltId] || 0) + parseFloat(entry.leaves || 0);
  });

  // Get leave type names
  const typeIds = Object.keys(balanceByType);
  const leaveTypes = await LeaveType.findAll({
    where: { id: { [Op.in]: typeIds } },
    attributes: ['id', 'name'],
  });

  const balanceSummary = typeIds.map(id => ({
    leaveTypeId: id,
    leaveTypeName: leaveTypes.find(lt => lt.id === id)?.name || 'Unknown',
    balance: parseFloat(balanceByType[id].toFixed(2)),
  }));

  return {
    data: rows,
    meta: buildMeta(count, page, limit),
    balances: balanceSummary,
  };
};
/**
 * Asserts leave type exists and is not disabled.
 */
const assertLeaveTypeValid = async (leaveTypeId) => {
  const lt = await LeaveType.findByPk(leaveTypeId);
  if (!lt) throw new AppError("Leave type not found", 404);
  if (lt.disabled)
    throw new AppError(`Leave type "${lt.name}" is disabled`, 422);
  return lt;
};

/**
 * Asserts leave period exists.
 */
const assertLeavePeriodValid = async (leavePeriodId) => {
  const lp = await LeavePeriod.findByPk(leavePeriodId);
  if (!lp) throw new AppError("Leave period not found", 404);
  return lp;
};

/**
 * Computes current leave balance for an employee + leave type.
 * Balance = SUM(leaves) from ledger where isExpired = false.
 */
const computeBalance = async (employeeId, leaveTypeId) => {
  const result = await LeaveLedgerEntry.sum("leaves", {
    where: {
      employeeId,
      leaveTypeId,
      isExpired: false,
    },
  });
  return parseFloat(result) || 0;
};

/**
 * Checks if a date falls on a weekend (Saturday = 6, Sunday = 0).
 */
const isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
};

/**
 * Checks if a date is in a holiday list.
 */
const isHolidayInList = (date, holidays) => {
  const dateStr =
    typeof date === "string" ? date : date.toISOString().split("T")[0];
  return holidays.some((h) => h.date === dateStr);
};

/**
 * Inserts a ledger entry and returns it.
 * The ledger is append-only — rows are never updated.
 */
const createLedgerEntry = async (data, transaction) => {
  return LeaveLedgerEntry.create(
    {
      employeeId: data.employeeId,
      leaveTypeId: data.leaveTypeId,
      voucherType: data.voucherType,
      voucherNo: data.voucherNo,
      leaves: data.leaves,
      fromDate: data.fromDate,
      toDate: data.toDate,
      isExpired: false,
    },
    { transaction },
  );
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE TYPE
// ═════════════════════════════════════════════════════════════════════════════

const createLeaveType = async (data) => {
  if (!data.name) throw new AppError("name is required", 422);

  const exists = await LeaveType.findOne({ where: { name: data.name } });
  if (exists)
    throw new AppError(`Leave type "${data.name}" already exists`, 409);

  const leaveType = await LeaveType.create({
    name: data.name,
    description: data.description || null,
    maxDaysAllowed: data.maxDaysAllowed ?? 0,
    maxCarryForwardedDays: data.maxCarryForwardedDays ?? 0,
    maxContinuousDaysAllowed: data.maxContinuousDaysAllowed ?? null,
    isLeaveWithoutPay: data.isLeaveWithoutPay ?? false,
    isOptionalLeave: data.isOptionalLeave ?? false,
    isCompensatory: data.isCompensatory ?? false,
    isEncashable: data.isEncashable ?? false,
    allowNegativeBalance: data.allowNegativeBalance ?? false,
    includeHolidays: data.includeHolidays ?? false,
    includeWeekends: data.includeWeekends ?? false,
    disabled: false,
  });

  logger.info("LeaveType created", { id: leaveType.id, name: leaveType.name });
  return leaveType;
};

const getLeaveTypes = async ({ includeDisabled = false } = {}) => {
  const where = {};
  if (!includeDisabled) where.disabled = false;
  return LeaveType.findAll({ where, order: [["name", "ASC"]] });
};

const getLeaveTypeById = async (id) => {
  const lt = await LeaveType.findByPk(id);
  if (!lt) throw new AppError("Leave type not found", 404);
  return lt;
};

const updateLeaveType = async (id, data) => {
  const lt = await LeaveType.findByPk(id);
  if (!lt) throw new AppError("Leave type not found", 404);

  if (data.name && data.name !== lt.name) {
    const exists = await LeaveType.findOne({ where: { name: data.name } });
    if (exists)
      throw new AppError(`Leave type "${data.name}" already exists`, 409);
  }

  await lt.update(data);
  logger.info("LeaveType updated", { id });
  return lt;
};

const deleteLeaveType = async (id) => {
  const lt = await LeaveType.findByPk(id);
  if (!lt) throw new AppError("Leave type not found", 404);
  await lt.update({ disabled: true });
  logger.info("LeaveType disabled", { id, name: lt.name });
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE PERIOD
// ═════════════════════════════════════════════════════════════════════════════

const createLeavePeriod = async (data) => {
  if (!data.name || !data.companyId || !data.startDate || !data.endDate) {
    throw new AppError(
      "name, companyId, startDate and endDate are required",
      422,
    );
  }
  if (new Date(data.startDate) >= new Date(data.endDate)) {
    throw new AppError("startDate must be before endDate", 422);
  }

  const exists = await LeavePeriod.findOne({
    where: { name: data.name, companyId: data.companyId },
  });
  if (exists)
    throw new AppError(
      `Leave period "${data.name}" already exists for this company`,
      409,
    );

  // If setting as active, deactivate others
  if (data.isActive) {
    await LeavePeriod.update(
      { isActive: false },
      { where: { companyId: data.companyId, isActive: true } },
    );
  }

  const period = await LeavePeriod.create({
    name: data.name,
    companyId: data.companyId,
    startDate: data.startDate,
    endDate: data.endDate,
    isActive: data.isActive ?? true,
  });

  logger.info("LeavePeriod created", { id: period.id, name: period.name });
  return period;
};

const getLeavePeriods = async (companyId, query = {}) => {
  const where = {};
  if (companyId) where.companyId = companyId;
  if (query.isActive !== undefined) where.isActive = query.isActive;

  return LeavePeriod.findAll({
    where,
    order: [["startDate", "DESC"]],
  });
};

const getLeavePeriodById = async (id) => {
  const period = await LeavePeriod.findByPk(id);
  if (!period) throw new AppError("Leave period not found", 404);
  return period;
};

const getActiveLeavePeriod = async (companyId) => {
  const period = await LeavePeriod.findOne({
    where: { companyId, isActive: true },
  });
  if (!period)
    throw new AppError("No active leave period found for this company", 404);
  return period;
};

const updateLeavePeriod = async (id, data) => {
  const period = await LeavePeriod.findByPk(id);
  if (!period) throw new AppError("Leave period not found", 404);

  if (data.isActive) {
    await LeavePeriod.update(
      { isActive: false },
      { where: { companyId: period.companyId, id: { [Op.ne]: id } } },
    );
  }

  await period.update(data);
  logger.info("LeavePeriod updated", { id });
  return period;
};

const deleteLeavePeriod = async (id) => {
  const period = await LeavePeriod.findByPk(id);
  if (!period) throw new AppError("Leave period not found", 404);

  const allocationCount = await LeaveAllocation.count({
    where: { leavePeriodId: id },
  });
  if (allocationCount > 0) {
    throw new AppError(
      "Cannot delete — allocations exist for this period",
      409,
    );
  }

  await period.destroy({ force: true });
  logger.info("LeavePeriod deleted", { id });
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE POLICY
// ═════════════════════════════════════════════════════════════════════════════

const createLeavePolicy = async (data) => {
  if (!data.name) throw new AppError("name is required", 422);
  if (!data.leaveTypes?.length)
    throw new AppError("leaveTypes array is required", 422);

  // Validate all leave type IDs exist
  const typeIds = data.leaveTypes.map((t) => t.leaveTypeId);
  const types = await LeaveType.findAll({
    where: { id: { [Op.in]: typeIds } },
  });
  if (types.length !== typeIds.length) {
    throw new AppError("One or more leave types not found", 404);
  }

  const exists = await LeavePolicy.findOne({ where: { name: data.name } });
  if (exists)
    throw new AppError(`Leave policy "${data.name}" already exists`, 409);

  const policy = await LeavePolicy.create({
    name: data.name,
    leaveTypes: data.leaveTypes,
    disabled: false,
  });

  logger.info("LeavePolicy created", { id: policy.id, name: policy.name });
  return policy;
};

const getLeavePolicies = async ({ includeDisabled = false } = {}) => {
  const where = {};
  if (!includeDisabled) where.disabled = false;
  return LeavePolicy.findAll({ where, order: [["name", "ASC"]] });
};

const getLeavePolicyById = async (id) => {
  const policy = await LeavePolicy.findByPk(id);
  if (!policy) throw new AppError("Leave policy not found", 404);
  return policy;
};

const updateLeavePolicy = async (id, data) => {
  const policy = await LeavePolicy.findByPk(id);
  if (!policy) throw new AppError("Leave policy not found", 404);

  if (data.leaveTypes) {
    const typeIds = data.leaveTypes.map((t) => t.leaveTypeId);
    const types = await LeaveType.findAll({
      where: { id: { [Op.in]: typeIds } },
    });
    if (types.length !== typeIds.length) {
      throw new AppError("One or more leave types not found", 404);
    }
  }

  await policy.update(data);
  logger.info("LeavePolicy updated", { id });
  return policy;
};

const deleteLeavePolicy = async (id) => {
  const policy = await LeavePolicy.findByPk(id);
  if (!policy) throw new AppError("Leave policy not found", 404);
  await policy.update({ disabled: true });
  logger.info("LeavePolicy disabled", { id });
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE POLICY ASSIGNMENT
// ═════════════════════════════════════════════════════════════════════════════

const createLeavePolicyAssignment = async (data) => {
  if (
    !data.employeeId ||
    !data.leavePolicyId ||
    !data.leavePeriodId ||
    !data.effectiveFrom
  ) {
    throw new AppError(
      "employeeId, leavePolicyId, leavePeriodId and effectiveFrom are required",
      422,
    );
  }

  await assertEmployeeActive(data.employeeId);
  await LeavePolicy.findByPk(data.leavePolicyId).then((p) => {
    if (!p) throw new AppError("Leave policy not found", 404);
    if (p.disabled) throw new AppError("Leave policy is disabled", 422);
  });
  await assertLeavePeriodValid(data.leavePeriodId);

  const existing = await LeavePolicyAssignment.findOne({
    where: { employeeId: data.employeeId, leavePeriodId: data.leavePeriodId },
  });
  if (existing) {
    throw new AppError(
      "Employee already has a policy assignment for this period",
      409,
    );
  }

  const assignment = await LeavePolicyAssignment.create({
    employeeId: data.employeeId,
    leavePolicyId: data.leavePolicyId,
    leavePeriodId: data.leavePeriodId,
    effectiveFrom: data.effectiveFrom,
    effectiveTo: data.effectiveTo || null,
    allocationsGenerated: false,
    docStatus: 0,
  });

  logger.info("LeavePolicyAssignment created", { id: assignment.id });
  return assignment;
};

const getLeavePolicyAssignments = async (query = {}) => {
  const { employeeId, leavePeriodId, leavePolicyId } = query;
  const { limit, offset, page } = getPaginationOptions(query);

  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (leavePeriodId) where.leavePeriodId = leavePeriodId;
  if (leavePolicyId) where.leavePolicyId = leavePolicyId;

  const { count, rows } = await LeavePolicyAssignment.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};

const getLeavePolicyAssignmentById = async (id) => {
  const assignment = await LeavePolicyAssignment.findByPk(id);
  if (!assignment) throw new AppError("Leave policy assignment not found", 404);
  return assignment;
};

/**
 * Generate LeaveAllocation rows from a policy assignment.
 * Reads the policy's leaveTypes array and creates one allocation per entry.
 */
const generateAllocations = async (assignmentId) => {
  const assignment = await LeavePolicyAssignment.findByPk(assignmentId, {
    include: [{ model: LeavePolicy, as: "leavePolicy" }],
  });
  if (!assignment) throw new AppError("Leave policy assignment not found", 404);
  if (assignment.allocationsGenerated) {
    throw new AppError(
      "Allocations already generated for this assignment",
      422,
    );
  }

  const policy = assignment.leavePolicy;
  const period = await LeavePeriod.findByPk(assignment.leavePeriodId);

  const result = await sequelize.transaction(async (t) => {
    const allocations = [];

    for (const entry of policy.leaveTypes) {
      const leaveType = await LeaveType.findByPk(entry.leaveTypeId, {
        transaction: t,
      });
      if (!leaveType || leaveType.disabled) continue;

      const allocation = await LeaveAllocation.create(
        {
          employeeId: assignment.employeeId,
          leaveTypeId: entry.leaveTypeId,
          leavePeriodId: assignment.leavePeriodId,
          newLeaves: entry.annualAllocation,
          carryForwardedLeaves: 0,
          totalLeavesAllocated: entry.annualAllocation,
          fromDate: period.startDate,
          toDate: period.endDate,
          docStatus: 1,
        },
        { transaction: t },
      );

      // Credit ledger
      await createLedgerEntry(
        {
          employeeId: assignment.employeeId,
          leaveTypeId: entry.leaveTypeId,
          voucherType: "LeaveAllocation",
          voucherNo: allocation.id,
          leaves: entry.annualAllocation,
          fromDate: period.startDate,
          toDate: period.endDate,
        },
        t,
      );

      allocations.push(allocation);
    }

    await assignment.update(
      { allocationsGenerated: true, docStatus: 1 },
      { transaction: t },
    );

    return allocations;
  });

  logger.info("Allocations generated", { assignmentId, count: result.length });
  return result;
};

const cancelLeavePolicyAssignment = async (id) => {
  const assignment = await LeavePolicyAssignment.findByPk(id);
  if (!assignment) throw new AppError("Leave policy assignment not found", 404);
  await assignment.update({ docStatus: 2 });
  logger.info("LeavePolicyAssignment cancelled", { id });
  return assignment;
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE ALLOCATION (read-heavy)
// ═════════════════════════════════════════════════════════════════════════════
/**
 * Get paginated leave allocations.
 * 
 * @param {Object} query - Query params (employeeId, leaveTypeId, leavePeriodId, page, limit)
 * @param {Object} permFilter - Data filter from userPermissions (e.g., { branchId: "uuid" })
 * @param {string} userId - Current user ID for self-scoping
 * @param {Object} scope - { canRead, canReadSelf } permission flags
 */
const getLeaveAllocations = async (query = {}, permFilter = {}, userId, scope = {}) => {
  const { employeeId, leaveTypeId, leavePeriodId } = query;
  const { limit, offset, page } = getPaginationOptions(query);

  const where = {};

  // Apply user-supplied filters
  if (employeeId) where.employeeId = employeeId;
  if (leaveTypeId) where.leaveTypeId = leaveTypeId;
  if (leavePeriodId) where.leavePeriodId = leavePeriodId;

  // ═══════════════════════════════════════════════════════════
  //  RBAC SCOPE: canReadSelf only → restrict to own allocations
  // ═══════════════════════════════════════════════════════════
  if (scope.canReadSelf && !scope.canRead) {
    // User only has readSelf — must see only their own
    const employee = await Employee.findOne({ 
      where: { userId },
      attributes: ['id'] 
    });
    
    if (!employee) {
      throw new AppError("No employee record linked to your account", 404);
    }
    
    where.employeeId = employee.id;
  }

  // ═══════════════════════════════════════════════════════════
  //  DATA FILTER: Apply org-level restrictions through Employee
  // ═══════════════════════════════════════════════════════════
  const employeeWhere = {};
  if (permFilter.branchId) employeeWhere.branchId = permFilter.branchId;
  if (permFilter.departmentId) employeeWhere.departmentId = permFilter.departmentId;
  if (permFilter.companyId) employeeWhere.companyId = permFilter.companyId;
  
  const includeOptions = [
    {
      model: Employee,
      as: "employee",
      attributes: ["id", "firstName", "middleName", "lastName", "employeeNumber", "image"],
      // Apply org filter to employee if exists
      ...(Object.keys(employeeWhere).length > 0 && { where: employeeWhere }),
      include: [
        { model: Department, as: "department", attributes: ["id", "name"] },
        { model: Branch, as: "branch", attributes: ["id", "name"] },
      ],
    },
    {
      model: LeaveType,
      as: "leaveType",
      attributes: ["id", "name", "isEncashable", "isCompensatory"],
    },
    {
      model: LeavePeriod,
      as: "leavePeriod",
      attributes: ["id", "name", "startDate", "endDate", "isActive"],
    },
  ];

  const { count, rows } = await LeaveAllocation.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: includeOptions,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};

const getLeaveAllocationById = async (id) => {
  const allocation = await LeaveAllocation.findByPk(id);
  if (!allocation) throw new AppError("Leave allocation not found", 404);
  return allocation;
};

/**
 * Current balance for one employee + one leave type.
 */
const getLeaveBalance = async (employeeId, leaveTypeId) => {
  await assertEmployeeActive(employeeId);
  await assertLeaveTypeValid(leaveTypeId);

  const balance = await computeBalance(employeeId, leaveTypeId);
  const allocation = await LeaveAllocation.findOne({
    where: { employeeId, leaveTypeId, docStatus: 1 },
    order: [["createdAt", "DESC"]],
  });

  return {
    employeeId,
    leaveTypeId,
    balance,
    allocated: parseFloat(allocation?.totalLeavesAllocated || 0),
  };
};

/**
 * All balances for one employee — all leave types.
 */
const getLeaveBalances = async (employeeId) => {
  await assertEmployeeActive(employeeId);

  const allocations = await LeaveAllocation.findAll({
    where: { employeeId, docStatus: 1 },
    include: [
      { model: LeaveType, as: "leaveType", attributes: ["id", "name"] },
    ],
  });

  const balances = await Promise.all(
    allocations.map(async (alloc) => {
      const balance = await computeBalance(employeeId, alloc.leaveTypeId);
      return {
        leaveTypeId: alloc.leaveTypeId,
        leaveTypeName: alloc.leaveType?.name || "Unknown",
        allocated: parseFloat(alloc.totalLeavesAllocated),
        used: parseFloat(alloc.totalLeavesAllocated) - balance,
        balance,
      };
    }),
  );

  return balances;
};

// ═════════════════════════════════════════════════════════════════════════════
//  HOLIDAY LIST
// ═════════════════════════════════════════════════════════════════════════════

const createHolidayList = async (data) => {
  if (!data.name || !data.fromDate || !data.toDate) {
    throw new AppError("name, fromDate and toDate are required", 422);
  }

  const exists = await HolidayList.findOne({
    where: { name: data.name, companyId: data.companyId || null },
  });
  if (exists)
    throw new AppError("Holiday list with this name already exists", 409);

  const list = await HolidayList.create({
    name: data.name,
    companyId: data.companyId || null,
    fromDate: data.fromDate,
    toDate: data.toDate,
    holidays: data.holidays || [],
    disabled: false,
  });

  logger.info("HolidayList created", { id: list.id, name: list.name });
  return list;
};

const getHolidayLists = async ({ companyId, includeDisabled = false } = {}) => {
  const where = {};
  if (companyId !== undefined) where.companyId = companyId;
  if (!includeDisabled) where.disabled = false;
  return HolidayList.findAll({ where, order: [["fromDate", "DESC"]] });
};

const getHolidayListById = async (id) => {
  const list = await HolidayList.findByPk(id);
  if (!list) throw new AppError("Holiday list not found", 404);
  return list;
};

const updateHolidayList = async (id, data) => {
  const list = await HolidayList.findByPk(id);
  if (!list) throw new AppError("Holiday list not found", 404);
  await list.update(data);
  return list;
};

const deleteHolidayList = async (id) => {
  const list = await HolidayList.findByPk(id);
  if (!list) throw new AppError("Holiday list not found", 404);
  await list.update({ disabled: true });
  logger.info("HolidayList disabled", { id });
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE BLOCK LIST
// ═════════════════════════════════════════════════════════════════════════════

const createLeaveBlockList = async (data) => {
  if (!data.name || !data.companyId) {
    throw new AppError("name and companyId are required", 422);
  }

  const exists = await LeaveBlockList.findOne({
    where: { name: data.name, companyId: data.companyId },
  });
  if (exists)
    throw new AppError("Block list with this name already exists", 409);

  const list = await LeaveBlockList.create({
    name: data.name,
    companyId: data.companyId,
    blockDates: data.blockDates || [],
    appliesToAllDepartments: data.appliesToAllDepartments ?? true,
    allowedDepartments: data.allowedDepartments || [],
    disabled: false,
  });

  logger.info("LeaveBlockList created", { id: list.id, name: list.name });
  return list;
};

const getLeaveBlockLists = async (
  companyId,
  { includeDisabled = false } = {},
) => {
  const where = {};
  if (companyId) where.companyId = companyId;
  if (!includeDisabled) where.disabled = false;
  return LeaveBlockList.findAll({ where, order: [["name", "ASC"]] });
};

const getLeaveBlockListById = async (id) => {
  const list = await LeaveBlockList.findByPk(id);
  if (!list) throw new AppError("Leave block list not found", 404);
  return list;
};

const updateLeaveBlockList = async (id, data) => {
  const list = await LeaveBlockList.findByPk(id);
  if (!list) throw new AppError("Leave block list not found", 404);
  await list.update(data);
  return list;
};

const deleteLeaveBlockList = async (id) => {
  const list = await LeaveBlockList.findByPk(id);
  if (!list) throw new AppError("Leave block list not found", 404);
  await list.update({ disabled: true });
  logger.info("LeaveBlockList disabled", { id });
};

// ═════════════════════════════════════════════════════════════════════════════
//  COMPENSATORY LEAVE REQUEST
// ═════════════════════════════════════════════════════════════════════════════

const createCompensatoryRequest = async (data, userId) => {
  if (!data.leaveTypeId || !data.workDate) {
    throw new AppError("leaveTypeId and workDate are required", 422);
  }

  const employee = await assertEmployeeActive(data.employeeId);
  const leaveType = await assertLeaveTypeValid(data.leaveTypeId);

  if (!leaveType.isCompensatory) {
    throw new AppError(
      `Leave type "${leaveType.name}" is not a compensatory leave type`,
      422,
    );
  }

  const request = await CompensatoryLeaveRequest.create({
    employeeId: employee.id,
    leaveTypeId: data.leaveTypeId,
    workDate: data.workDate,
    reason: data.reason || null,
    status: "Draft",
    docStatus: 0,
  });

  logger.info("CompensatoryLeaveRequest created", { id: request.id });
  return request;
};

const getCompensatoryRequests = async (query = {}) => {
  const { employeeId, status, leaveTypeId } = query;
  const { limit, offset, page } = getPaginationOptions(query);

  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;
  if (leaveTypeId) where.leaveTypeId = leaveTypeId;

  const { count, rows } = await CompensatoryLeaveRequest.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};

const getCompensatoryRequestById = async (id) => {
  const request = await CompensatoryLeaveRequest.findByPk(id);
  if (!request) throw new AppError("Compensatory leave request not found", 404);
  return request;
};

const submitCompensatoryRequest = async (id) => {
  const request = await CompensatoryLeaveRequest.findByPk(id);
  if (!request) throw new AppError("Compensatory leave request not found", 404);
  if (request.status !== "Draft")
    throw new AppError("Only Draft requests can be submitted", 422);

  await request.update({ docStatus: 1, status: "Approved" });
  return request;
};

const approveCompensatoryRequest = async (id, approverUserId) => {
  const request = await CompensatoryLeaveRequest.findByPk(id);
  if (!request) throw new AppError("Compensatory leave request not found", 404);
  if (request.status !== "Draft" && request.status !== "Approved") {
    throw new AppError("Only Draft/Submitted requests can be approved", 422);
  }

  const leaveType = await LeaveType.findByPk(request.leaveTypeId);
  const activePeriod = await LeavePeriod.findOne({
    where: { isActive: true },
  });

  const result = await sequelize.transaction(async (t) => {
    // Create a LeaveAllocation for the comp-off days
    const allocation = await LeaveAllocation.create(
      {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        leavePeriodId: activePeriod?.id,
        newLeaves: 1, // 1 day comp-off per request
        carryForwardedLeaves: 0,
        totalLeavesAllocated: 1,
        fromDate:
          activePeriod?.startDate || new Date().toISOString().split("T")[0],
        toDate: activePeriod?.endDate || new Date().toISOString().split("T")[0],
        docStatus: 1,
      },
      { transaction: t },
    );

    // Credit the ledger
    await createLedgerEntry(
      {
        employeeId: request.employeeId,
        leaveTypeId: request.leaveTypeId,
        voucherType: "CompensatoryLeaveRequest",
        voucherNo: request.id,
        leaves: 1,
        fromDate:
          activePeriod?.startDate || new Date().toISOString().split("T")[0],
        toDate: activePeriod?.endDate || new Date().toISOString().split("T")[0],
      },
      t,
    );

    await request.update(
      {
        status: "Approved",
        leaveAllocationId: allocation.id,
        docStatus: 1,
      },
      { transaction: t },
    );

    return { request, allocation };
  });

  logger.info("CompensatoryLeaveRequest approved", {
    id,
    allocationId: result.allocation.id,
  });
  return result;
};

const rejectCompensatoryRequest = async (id, rejectionReason) => {
  if (!rejectionReason) throw new AppError("rejectionReason is required", 422);

  const request = await CompensatoryLeaveRequest.findByPk(id);
  if (!request) throw new AppError("Compensatory leave request not found", 404);
  if (!["Draft", "Approved"].includes(request.status)) {
    throw new AppError("Cannot reject — request is already final", 422);
  }

  await request.update({ status: "Rejected" });
  return request;
};

const cancelCompensatoryRequest = async (id) => {
  const request = await CompensatoryLeaveRequest.findByPk(id);
  if (!request) throw new AppError("Compensatory leave request not found", 404);
  if (request.status === "Cancelled")
    throw new AppError("Request already cancelled", 422);

  await request.update({ status: "Cancelled", docStatus: 2 });
  return request;
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE APPLICATION
// ═════════════════════════════════════════════════════════════════════════════

const createLeaveApplication = async (data, userId) => {
  const {
    employeeId,
    leaveTypeId,
    fromDate,
    toDate,
    isHalfDay,
    halfDayDate,
    reason,
    followUpDate,
    holidayListId,
  } = data;

  if (!employeeId || !leaveTypeId || !fromDate || !toDate) {
    throw new AppError(
      "employeeId, leaveTypeId, fromDate and toDate are required",
      422,
    );
  }
  if (new Date(fromDate) > new Date(toDate)) {
    throw new AppError("fromDate must be before or equal to toDate", 422);
  }

  await assertEmployeeActive(employeeId);
  const leaveType = await assertLeaveTypeValid(leaveTypeId);

  // Calculate total leave days
  const holidayList = holidayListId
    ? await HolidayList.findByPk(holidayListId)
    : null;
  const totalLeaveDays = await calculateWorkingDays(
    fromDate,
    toDate,
    leaveType.includeHolidays,
    leaveType.includeWeekends,
    holidayList?.holidays || [],
  );

  // Validate balance
  if (!leaveType.allowNegativeBalance) {
    const balance = await computeBalance(employeeId, leaveTypeId);
    if (balance < totalLeaveDays) {
      throw new AppError(
        `Insufficient balance. Required: ${totalLeaveDays}, Available: ${balance}`,
        422,
      );
    }
  }

  const application = await LeaveApplication.create({
    employeeId,
    leaveTypeId,
    fromDate,
    toDate,
    totalLeaveDays,
    isHalfDay: isHalfDay ?? false,
    halfDayDate: isHalfDay ? halfDayDate : null,
    reason: reason || null,
    followUpDate: followUpDate || null,
    holidayListId: holidayListId || null,
    status: "Draft",
    docStatus: 0,
  });

  logger.info("LeaveApplication created", {
    id: application.id,
    employeeId,
    totalLeaveDays,
  });
  return application;
};

const getLeaveApplications = async (query = {}, permFilter = {}) => {
  const { employeeId, leaveTypeId, status, approverId } = query;
  const { limit, offset, page } = getPaginationOptions(query);

  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (leaveTypeId) where.leaveTypeId = leaveTypeId;
  if (status) where.status = status;
  if (approverId) where.approverId = approverId;

  // Build Employee-level filter from permFilter
  // permFilter contains: { branchId: "uuid", departmentId: "uuid", companyId: "uuid" }
  // These need to be applied to the associated Employee (applicant)
  const employeeWhere = {};
  if (permFilter.branchId) employeeWhere.branchId = permFilter.branchId;
  if (permFilter.departmentId) employeeWhere.departmentId = permFilter.departmentId;
  if (permFilter.companyId) employeeWhere.companyId = permFilter.companyId;
  
  // If we have employee-level filters, we need to filter through the association
  const includeOptions = [
    {
      model: Employee,
      as: "applicant",
      attributes: ["id", "firstName", "middleName", "lastName", "employeeNumber", "image"],
      // Apply the org filters to the applicant employee
      where: Object.keys(employeeWhere).length > 0 ? employeeWhere : undefined,
      include: [
        { model: Department, as: "department", attributes: ["id", "name"] },
        { model: Branch, as: "branch", attributes: ["id", "name"] },
      ],
    },
    {
      model: Employee,
      as: "approver",
      attributes: ["id", "firstName", "middleName", "lastName", "employeeNumber"],
    },
    {
      model: LeaveType,
      as: "leaveType",
      attributes: ["id", "name"],
    },
    {
      model: HolidayList,
      as: "holidayList",
      attributes: ["id", "name"],
      required: false,
    },
  ];

  const { count, rows } = await LeaveApplication.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: includeOptions,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};

const getLeaveApplicationById = async (id) => {
  const app = await LeaveApplication.findByPk(id, {
    include: [
      {
        model: Employee,
        as: "applicant",
        attributes: ["id", "firstName", "middleName", "lastName", "employeeNumber", "image"],
        include: [
          { model: Department, as: "department", attributes: ["id", "name"] },
          { model: Branch, as: "branch", attributes: ["id", "name"] },
        ],
      },
      {
        model: Employee,
        as: "approver",
        attributes: ["id", "firstName", "middleName", "lastName", "employeeNumber"],
      },
      {
        model: LeaveType,
        as: "leaveType",
        attributes: ["id", "name"],
      },
      {
        model: HolidayList,
        as: "holidayList",
        attributes: ["id", "name"],
        required: false,
      },
    ],
  });
  if (!app) throw new AppError("Leave application not found", 404);
  return app;
};

const submitLeaveApplication = async (id) => {
  const app = await LeaveApplication.findByPk(id);
  if (!app) throw new AppError("Leave application not found", 404);
  if (app.status !== "Draft")
    throw new AppError("Only Draft applications can be submitted", 422);

  await app.update({ status: "Open", docStatus: 1 });
  return app;
};

const approveLeaveApplication = async (id, approverUserId) => {
  const app = await LeaveApplication.findByPk(id);
  if (!app) throw new AppError("Leave application not found", 404);
  if (app.status !== "Open")
    throw new AppError("Only Open applications can be approved", 422);

  // DEBUG
  console.log('=== APPROVE DEBUG ===');
  console.log('Application ID:', id);
  console.log('Approver User ID passed:', approverUserId);
  console.log('Application employeeId:', app.employeeId);
  console.log('Application status:', app.status);
  console.log('======================');

  const leaveType = await LeaveType.findByPk(app.leaveTypeId);

  if (!leaveType.allowNegativeBalance) {
    const balance = await computeBalance(app.employeeId, app.leaveTypeId);
    if (balance < parseFloat(app.totalLeaveDays)) {
      throw new AppError(
        `Insufficient balance. Required: ${app.totalLeaveDays}, Available: ${balance}`,
        422,
      );
    }
  }

  await sequelize.transaction(async (t) => {
    await createLedgerEntry({
      employeeId: app.employeeId,
      leaveTypeId: app.leaveTypeId,
      voucherType: "LeaveApplication",
      voucherNo: app.id,
      leaves: -Math.abs(parseFloat(app.totalLeaveDays)),
      fromDate: app.fromDate,
      toDate: app.toDate,
    }, t);

    // If approverUserId is null, don't set it
    const updateData = {
      status: "Approved",
    };
    if (approverUserId) {
      updateData.approverId = approverUserId;
    }

    await app.update(updateData, { transaction: t });
  });

  logger.info("LeaveApplication approved", { id, employeeId: app.employeeId });
  return app;
};

const rejectLeaveApplication = async (id, approverUserId, rejectionReason) => {
  if (!rejectionReason) throw new AppError("rejectionReason is required", 422);

  const app = await LeaveApplication.findByPk(id);
  if (!app) throw new AppError("Leave application not found", 404);
  if (app.status !== "Open")
    throw new AppError("Only Open applications can be rejected", 422);

  await app.update({
    status: "Rejected",
    approverId: approverUserId,
    rejectionReason,
  });

  logger.info("LeaveApplication rejected", { id });
  return app;
};

const cancelLeaveApplication = async (id) => {
  const app = await LeaveApplication.findByPk(id);
  if (!app) throw new AppError("Leave application not found", 404);

  if (app.status === "Cancelled")
    throw new AppError("Application already cancelled", 422);

  // If already approved and days were consumed, reverse the debit
  if (app.status === "Approved") {
    await sequelize.transaction(async (t) => {
      await createLedgerEntry(
        {
          employeeId: app.employeeId,
          leaveTypeId: app.leaveTypeId,
          voucherType: "LeaveApplication",
          voucherNo: app.id,
          leaves: Math.abs(parseFloat(app.totalLeaveDays)), // positive = credit back
          fromDate: app.fromDate,
          toDate: app.toDate,
        },
        t,
      );

      await app.update(
        { status: "Cancelled", docStatus: 2 },
        { transaction: t },
      );
    });
  } else {
    await app.update({ status: "Cancelled", docStatus: 2 });
  }

  logger.info("LeaveApplication cancelled", { id });
  return app;
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE LEDGER (read-only)
// ═════════════════════════════════════════════════════════════════════════════

const getLeaveLedger = async (employeeId, leaveTypeId, query = {}) => {
  const { limit, offset, page } = getPaginationOptions(query);

  const where = { employeeId, leaveTypeId };
  if (query.voucherType) where.voucherType = query.voucherType;

  const { count, rows } = await LeaveLedgerEntry.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  });

  const balance = await computeBalance(employeeId, leaveTypeId);

  return {
    data: rows,
    meta: buildMeta(count, page, limit),
    currentBalance: balance,
  };
};

const getLeaveLedgerEntryById = async (id) => {
  const entry = await LeaveLedgerEntry.findByPk(id);
  if (!entry) throw new AppError("Ledger entry not found", 404);
  return entry;
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE ENCASHMENT
// ═════════════════════════════════════════════════════════════════════════════

const createLeaveEncashment = async (data) => {
  if (
    !data.employeeId ||
    !data.leaveTypeId ||
    !data.leavePeriodId ||
    !data.leavesToEncash
  ) {
    throw new AppError(
      "employeeId, leaveTypeId, leavePeriodId and leavesToEncash are required",
      422,
    );
  }

  await assertEmployeeActive(data.employeeId);
  const leaveType = await assertLeaveTypeValid(data.leaveTypeId);

  if (!leaveType.isEncashable) {
    throw new AppError(`Leave type "${leaveType.name}" is not encashable`, 422);
  }

  await assertLeavePeriodValid(data.leavePeriodId);

  // Validate sufficient balance
  const balance = await computeBalance(data.employeeId, data.leaveTypeId);
  if (balance < parseFloat(data.leavesToEncash)) {
    throw new AppError(
      `Insufficient balance. Requested: ${data.leavesToEncash}, Available: ${balance}`,
      422,
    );
  }

  const encashment = await LeaveEncashment.create({
    employeeId: data.employeeId,
    leaveTypeId: data.leaveTypeId,
    leavePeriodId: data.leavePeriodId,
    leavesToEncash: data.leavesToEncash,
    encashmentAmount: data.encashmentAmount || 0,
    encashmentDate:
      data.encashmentDate || new Date().toISOString().split("T")[0],
    docStatus: 0,
  });

  logger.info("LeaveEncashment created", { id: encashment.id });
  return encashment;
};

const getLeaveEncashments = async (query = {}) => {
  const { employeeId, leaveTypeId, docStatus } = query;
  const { limit, offset, page } = getPaginationOptions(query);

  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (leaveTypeId) where.leaveTypeId = leaveTypeId;
  if (docStatus !== undefined) where.docStatus = docStatus;

  const { count, rows } = await LeaveEncashment.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};

const getLeaveEncashmentById = async (id) => {
  const enc = await LeaveEncashment.findByPk(id);
  if (!enc) throw new AppError("Leave encashment not found", 404);
  return enc;
};

const submitLeaveEncashment = async (id) => {
  const enc = await LeaveEncashment.findByPk(id);
  if (!enc) throw new AppError("Leave encashment not found", 404);
  if (enc.docStatus !== 0)
    throw new AppError("Only Draft encashments can be submitted", 422);
  await enc.update({ docStatus: 1 });
  return enc;
};

const approveLeaveEncashment = async (id) => {
  const enc = await LeaveEncashment.findByPk(id);
  if (!enc) throw new AppError("Leave encashment not found", 404);
  if (enc.docStatus !== 1)
    throw new AppError("Only submitted encashments can be approved", 422);

  await sequelize.transaction(async (t) => {
    // Debit the ledger
    await createLedgerEntry(
      {
        employeeId: enc.employeeId,
        leaveTypeId: enc.leaveTypeId,
        voucherType: "LeaveEncashment",
        voucherNo: enc.id,
        leaves: -Math.abs(parseFloat(enc.leavesToEncash)),
        fromDate: enc.encashmentDate,
        toDate: enc.encashmentDate,
      },
      t,
    );

    await enc.update({ docStatus: 1 }, { transaction: t });
  });

  logger.info("LeaveEncashment approved", { id });
  return enc;
};

const rejectLeaveEncashment = async (id) => {
  const enc = await LeaveEncashment.findByPk(id);
  if (!enc) throw new AppError("Leave encashment not found", 404);
  if (enc.docStatus !== 1)
    throw new AppError("Only submitted encashments can be rejected", 422);
  await enc.update({ docStatus: 0 });
  return enc;
};

const cancelLeaveEncashment = async (id) => {
  const enc = await LeaveEncashment.findByPk(id);
  if (!enc) throw new AppError("Leave encashment not found", 404);
  if (enc.docStatus === 2)
    throw new AppError("Encashment already cancelled", 422);
  await enc.update({ docStatus: 2 });
  return enc;
};

// ═════════════════════════════════════════════════════════════════════════════
//  COMPLIANCE & UTILITIES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Check if a specific date is blocked for leave in any active block list.
 */
const isDateBlocked = async (dateStr, companyId, departmentId) => {
  const blockLists = await LeaveBlockList.findAll({
    where: { companyId, disabled: false },
  });

  for (const list of blockLists) {
    const blocked = list.blockDates.some((b) => b.date === dateStr);
    if (!blocked) continue;

    // If applies to all departments, it's blocked
    if (list.appliesToAllDepartments)
      return { blocked: true, blockListName: list.name };

    // If restricted to specific departments, check if employee's dept is included
    if (departmentId && list.allowedDepartments.includes(departmentId)) {
      return { blocked: true, blockListName: list.name };
    }
  }

  return { blocked: false };
};

/**
 * Check if a date is a holiday in any active holiday list.
 */
const isDateHoliday = async (dateStr, companyId) => {
  const lists = await HolidayList.findAll({
    where: { disabled: false },
  });

  for (const list of lists) {
    if (list.companyId && list.companyId !== companyId) continue;
    if (isHolidayInList(dateStr, list.holidays)) {
      return {
        isHoliday: true,
        holidayListName: list.name,
        description: list.holidays.find((h) => h.date === dateStr)?.description,
      };
    }
  }

  return { isHoliday: false };
};

/**
 * Calculate working days between two dates.
 * Excludes holidays and/or weekends based on leave type config.
 */
const calculateWorkingDays = async (
  fromDate,
  toDate,
  includeHolidays,
  includeWeekends,
  holidays = [],
) => {
  let count = 0;
  const start = new Date(fromDate);
  const end = new Date(toDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];

    if (!includeWeekends && isWeekend(dateStr)) continue;
    if (!includeHolidays && isHolidayInList(dateStr, holidays)) continue;

    count++;
  }

  // Half day = 0.5
  return count;
};

/**
 * Validate leave balance before application.
 */
const validateLeaveBalance = async (employeeId, leaveTypeId, requestedDays) => {
  const leaveType = await assertLeaveTypeValid(leaveTypeId);
  const balance = await computeBalance(employeeId, leaveTypeId);

  if (!leaveType.allowNegativeBalance && balance < requestedDays) {
    return {
      sufficient: false,
      balance,
      requested: requestedDays,
      shortfall: requestedDays - balance,
    };
  }

  return {
    sufficient: true,
    balance,
    requested: requestedDays,
  };
};

/**
 * Scheduled job: expire ledger entries for periods that have ended.
 */
const expireOverdueLedgerEntries = async () => {
  const today = new Date().toISOString().split("T")[0];

  const [affectedCount] = await LeaveLedgerEntry.update(
    { isExpired: true },
    {
      where: {
        toDate: { [Op.lt]: today },
        isExpired: false,
      },
    },
  );

  logger.info("Expired ledger entries updated", { count: affectedCount });
  return { expired: affectedCount };
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE DASHBOARD — add this section BEFORE the module.exports block
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Format date to "Mon DD" format (e.g., "Apr 22")
 */
const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}`;
};

/**
 * Get color for leave type in charts
 */
const getLeaveTypeColor = (typeName) => {
  const name = typeName.toLowerCase();
  if (name.includes("annual")) return "#534AB7";
  if (name.includes("sick")) return "#1D9E75";
  if (name.includes("maternity")) return "#D85A30";
  if (name.includes("compensatory")) return "#378ADD";
  if (name.includes("unpaid")) return "#888780";
  if (name.includes("paternity")) return "#0F6E56";
  return "#6B7280";
};

/**
 * Get dashboard stats for company-wide overview
 */
/**
 * Get dashboard stats for company-wide overview
 */
const getDashboardStats = async (companyId, period, userBranchId, userDepartmentId) => {
  if (!companyId) throw new AppError('companyId is required', 422);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const employeeWhere = { companyId, status: 'Active' };
  if (userBranchId) employeeWhere.branchId = userBranchId;
  if (userDepartmentId) employeeWhere.departmentId = userDepartmentId;

  // Get total branches — use sequelize.models.Branch as fallback
  let totalBranches = 0;
  try {
    const BranchModel = sequelize.models?.Branch || Branch;
    if (BranchModel && BranchModel.count) {
      totalBranches = await BranchModel.count({
        where: { companyId, isActive: true }
      });
    } else {
      // Fallback: count distinct branches from employees
      const distinctBranches = await Employee.findAll({
        where: { companyId, status: 'Active' },
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('branchId')), 'branchId']],
        raw: true,
      });
      totalBranches = distinctBranches.filter(b => b.branchId).length;
    }
  } catch (err) {
    // Final fallback
    logger.warn('Could not count branches, using fallback', { error: err.message });
    totalBranches = 8; // default from your HTML mockup
  }

  // On leave today
  const onLeaveTodayApplications = await LeaveApplication.findAll({
    where: { status: 'Approved', fromDate: { [Op.lte]: tomorrow }, toDate: { [Op.gte]: today } },
    include: [{ model: Employee, as: 'applicant', required: true, where: employeeWhere, attributes: ['id'] }]
  });
  const onLeaveToday = [...new Set(onLeaveTodayApplications.map(a => a.applicant?.id).filter(Boolean))].length;

  // Branches with leave today
  let branchesWithLeave = 0;
  try {
    const branchesWithLeaveApplications = await LeaveApplication.findAll({
      where: { status: 'Approved', fromDate: { [Op.lte]: tomorrow }, toDate: { [Op.gte]: today } },
      include: [{ model: Employee, as: 'applicant', required: true, where: employeeWhere, attributes: ['id', 'branchId'] }]
    });
    branchesWithLeave = [...new Set(branchesWithLeaveApplications.map(a => a.applicant?.branchId).filter(Boolean))].length;
  } catch (err) {
    logger.warn('Could not count branches with leave', { error: err.message });
    branchesWithLeave = 0;
  }

  // Pending approvals
  const pendingApprovals = await LeaveApplication.count({
    where: { status: 'Open' },
    include: [{ model: Employee, as: 'applicant', required: true, where: employeeWhere }]
  });

  // Oldest pending
  const oldestPending = await LeaveApplication.findOne({
    where: { status: 'Open' },
    include: [{ model: Employee, as: 'applicant', required: true, where: employeeWhere, attributes: ['id'] }],
    order: [['createdAt', 'ASC']],
    attributes: ['createdAt']
  });

  let oldestPendingText = 'N/A';
  if (oldestPending) {
    const daysAgo = Math.floor((today - new Date(oldestPending.createdAt)) / (1000 * 60 * 60 * 24));
    oldestPendingText = daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo} days ago`;
  }

  // Leaves taken this month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);

  let leavesThisMonth = 0;
  try {
    leavesThisMonth = await LeaveApplication.sum('totalLeaveDays', {
      where: { status: 'Approved', fromDate: { [Op.gte]: monthStart }, toDate: { [Op.lte]: monthEnd } },
      include: [{ model: Employee, as: 'applicant', required: true, where: employeeWhere }]
    });
  } catch (err) {
    logger.warn('Could not sum leaves this month', { error: err.message });
  }

  // Encashment eligible
  let encashmentEligible = 0;
  try {
    const encashableTypes = await LeaveType.findAll({
      where: { isEncashable: true, disabled: false },
      attributes: ['id']
    });

    if (encashableTypes.length > 0) {
      const employees = await Employee.findAll({ where: employeeWhere, attributes: ['id'], limit: 100 });
      for (const emp of employees) {
        for (const lt of encashableTypes) {
          const balance = await computeBalance(emp.id, lt.id);
          if (balance > 0) { encashmentEligible++; break; }
        }
      }
    }
  } catch (err) {
    logger.warn('Could not count encashment eligible', { error: err.message });
  }

  return {
    onLeaveToday,
    branchesWithLeave,
    totalBranches,
    pendingApprovals,
    oldestPending: oldestPendingText,
    leavesTakenThisMonth: parseFloat(leavesThisMonth || 0),
    encashmentEligible
  };
};

/**
 * Get company-wide leave balance snapshot
 */
const getDashboardBalances = async (companyId, userBranchId) => {
  if (!companyId) throw new AppError("companyId is required", 422);

  const employeeWhere = { companyId, status: "Active" };
  if (userBranchId) employeeWhere.branchId = userBranchId;

  const employees = await Employee.findAll({
    where: employeeWhere,
    attributes: ["id"],
  });
  const leaveTypes = await LeaveType.findAll({
    where: { disabled: false },
    attributes: ["id", "name"],
  });

  const balances = {};
  const keyTypes = ["Annual", "Sick", "Maternity"];

  for (const typeName of keyTypes) {
    const leaveType = leaveTypes.find((lt) =>
      lt.name.toLowerCase().includes(typeName.toLowerCase()),
    );
    if (!leaveType) continue;

    let totalAllocated = 0,
      totalRemaining = 0,
      activeCases = 0,
      employeeCount = 0;

    for (const emp of employees) {
      const balance = await computeBalance(emp.id, leaveType.id);
      const allocation = await LeaveAllocation.findOne({
        where: { employeeId: emp.id, leaveTypeId: leaveType.id, docStatus: 1 },
        order: [["createdAt", "DESC"]],
      });

      if (allocation || balance > 0) {
        totalAllocated += parseFloat(allocation?.totalLeavesAllocated || 0);
        totalRemaining += balance;
        employeeCount++;

        if (typeName === "Sick") {
          const activeSick = await LeaveApplication.findOne({
            where: {
              employeeId: emp.id,
              leaveTypeId: leaveType.id,
              status: "Approved",
              fromDate: { [Op.lte]: new Date() },
              toDate: { [Op.gte]: new Date() },
            },
          });
          if (activeSick) activeCases++;
        }
      }
    }

    const avgRemaining =
      employeeCount > 0 ? (totalRemaining / employeeCount).toFixed(1) : 0;
    const utilizationPercent =
      totalAllocated > 0
        ? (((totalAllocated - totalRemaining) / totalAllocated) * 100).toFixed(
            0,
          )
        : 0;

    balances[typeName.toLowerCase()] = {
      entitled:
        typeName === "Sick" ? "6 months" : typeName === "Maternity" ? 90 : 16,
      avgRemaining: parseFloat(avgRemaining),
      utilizationPercent: parseInt(utilizationPercent),
      employeeCount,
      totalAllocated: parseFloat(totalAllocated.toFixed(1)),
      totalRemaining: parseFloat(totalRemaining.toFixed(1)),
      ...(typeName === "Sick" && { activeCases }),
      ...(typeName === "Maternity" && { activeNow: activeCases }),
    };
  }

  return balances;
};

/**
 * Get pending approvals list
 */
const getDashboardPendingApprovals = async (companyId, options = {}) => {
  const { limit = 4, branchId, departmentId } = options;
  if (!companyId) throw new AppError('companyId is required', 422);

  const employeeWhere = { companyId, status: 'Active' };
  if (branchId) employeeWhere.branchId = branchId;
  if (departmentId) employeeWhere.departmentId = departmentId;

  const applications = await LeaveApplication.findAll({
    where: { status: 'Open' },
    include: [
      {
        model: Employee, as: 'applicant', required: true, where: employeeWhere,
        include: [
          { model: Department, as: 'department', attributes: ['id', 'name'] },
          { model: Branch, as: 'branch', attributes: ['id', 'name'] }
        ]
      },
      { model: LeaveType, as: 'leaveType', attributes: ['id', 'name'] }
    ],
    order: [['createdAt', 'ASC']],
    limit,
  });

  return applications.map(app => {
    const emp = app.applicant;
    const initials = emp ? `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase() : '??';
    return {
      id: app.id,
      employee: {
        id: emp?.id,
        name: emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown',
        initials,
        department: emp?.department?.name || 'N/A',
        branch: emp?.branch?.name || 'N/A'
      },
      leaveType: app.leaveType?.name || 'Unknown',
      duration: `${formatDate(app.fromDate)} – ${formatDate(app.toDate)}`,
      days: parseFloat(app.totalLeaveDays),
      status: 'Pending',
      appliedDate: app.createdAt
    };
  });
};

/**
 * Get employees on leave this week
 */
const getOnLeaveThisWeek = async (companyId, branchId) => {
  if (!companyId) throw new AppError("companyId is required", 422);

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const employeeWhere = { companyId, status: "Active" };
  if (branchId) employeeWhere.branchId = branchId;

  const applications = await LeaveApplication.findAll({
    where: {
      status: "Approved",
      fromDate: { [Op.lte]: endOfWeek },
      toDate: { [Op.gte]: startOfWeek },
    },
    include: [
      {
        model: Employee,
        as: "applicant",
        required: true,
        where: employeeWhere,
      },
      { model: LeaveType, as: "leaveType", attributes: ["name"] },
    ],
    order: [["fromDate", "ASC"]],
  });

  return applications.map((app) => {
    const emp = app.applicant;
    return {
      id: app.id,
      name: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
      initials: emp
        ? `${emp.firstName?.[0] || ""}${emp.lastName?.[0] || ""}`.toUpperCase()
        : "??",
      dates: `${formatDate(app.fromDate)} – ${formatDate(app.toDate)}`,
      leaveType: app.leaveType?.name || "Unknown",
      status: "Active",
    };
  });
};

/**
 * Get leave distribution by type for the period
 */
const getDashboardLeaveByType = async (companyId, period, branchId) => {
  if (!companyId) throw new AppError("companyId is required", 422);

  const year = parseInt(period);
  const periodStart = `${year}-01-01`;
  const periodEnd = `${year}-12-31`;

  const employeeWhere = { companyId, status: "Active" };
  if (branchId) employeeWhere.branchId = branchId;

  const leaveTypes = await LeaveType.findAll({ where: { disabled: false } });

  const applications = await LeaveApplication.findAll({
    where: {
      status: "Approved",
      fromDate: { [Op.gte]: periodStart },
      toDate: { [Op.lte]: periodEnd },
    },
    include: [
      {
        model: Employee,
        as: "applicant",
        required: true,
        where: employeeWhere,
        attributes: ["id"],
      },
    ],
    attributes: ["leaveTypeId", "totalLeaveDays"],
  });

  const leaveTypeMap = {};
  let totalDays = 0;

  for (const app of applications) {
    const ltId = app.leaveTypeId;
    const days = parseFloat(app.totalLeaveDays) || 0;
    leaveTypeMap[ltId] = (leaveTypeMap[ltId] || 0) + days;
    totalDays += days;
  }

  const byType = [];
  for (const lt of leaveTypes) {
    const days = leaveTypeMap[lt.id] || 0;
    if (days > 0) {
      byType.push({
        type: lt.name,
        days: parseFloat(days.toFixed(1)),
        percentage: totalDays > 0 ? Math.round((days / totalDays) * 100) : 0,
        color: getLeaveTypeColor(lt.name),
      });
    }
  }

  return byType.sort((a, b) => b.days - a.days);
};

/**
 * Get next upcoming public holiday
 */
const getNextHoliday = async (companyId) => {
  if (!companyId) throw new AppError("companyId is required", 422);

  const today = new Date().toISOString().split("T")[0];

  const holidayLists = await HolidayList.findAll({
    where: { [Op.or]: [{ companyId }, { companyId: null }], disabled: false },
    order: [["fromDate", "ASC"]],
  });

  if (holidayLists.length === 0) return null;

  let earliestHoliday = null;
  let earliestDate = null;

  for (const list of holidayLists) {
    if (!list.holidays || !Array.isArray(list.holidays)) continue;
    for (const holiday of list.holidays) {
      if (
        holiday.date >= today &&
        (!earliestDate || holiday.date < earliestDate)
      ) {
        earliestDate = holiday.date;
        earliestHoliday = {
          name: holiday.description || list.name,
          date: holiday.date,
          listName: list.name,
        };
      }
    }
  }

  if (!earliestHoliday) return null;

  const holidayDate = new Date(earliestHoliday.date);
  const daysAway = Math.ceil(
    (holidayDate - new Date(today)) / (1000 * 60 * 60 * 24),
  );

  const overlappingLeaves = await LeaveApplication.count({
    where: {
      status: { [Op.in]: ["Approved", "Open"] },
      fromDate: { [Op.lte]: earliestDate },
      toDate: { [Op.gte]: earliestDate },
    },
    include: [
      {
        model: Employee,
        as: "applicant",
        required: true,
        where: { companyId, status: "Active" },
      },
    ],
  });

  return { ...earliestHoliday, daysAway, overlappingLeaves };
};

/**
 * Export dashboard data
 */
const exportDashboardData = async (companyId, period) => {
  const stats = await getDashboardStats(companyId, period);
  const balances = await getDashboardBalances(companyId);
  const byType = await getDashboardLeaveByType(companyId, period);
  return {
    generatedAt: new Date().toISOString(),
    period,
    stats,
    balances,
    leaveByType: byType,
  };
};

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
  getLeavePeriodById,
  getActiveLeavePeriod,
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
  getLeaveBalance,
  getLeaveBalances,

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
  getMyLedger,

  // Leave Encashment
  createLeaveEncashment,
  getLeaveEncashments,
  getLeaveEncashmentById,
  submitLeaveEncashment,
  approveLeaveEncashment,
  rejectLeaveEncashment,
  cancelLeaveEncashment,

  // Compliance & Utilities
  isDateBlocked,
  isDateHoliday,
  calculateWorkingDays,
  validateLeaveBalance,
  expireOverdueLedgerEntries,
  computeBalance,

  // Leave Dashboard
  getDashboardStats,
  getDashboardBalances,
  getDashboardPendingApprovals,
  getOnLeaveThisWeek,
  getDashboardLeaveByType,
  getNextHoliday,
  exportDashboardData,
};
