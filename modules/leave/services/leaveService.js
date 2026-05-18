"use strict";

/**
 * modules/leave/services/leaveService.js
 *
 * Complete leave management service covering:
 *
 *  ── LEAVE TYPE ────────────────────────────────────────────────────────
 *  ── LEAVE PERIOD ──────────────────────────────────────────────────────
 *  ── HOLIDAY LIST ──────────────────────────────────────────────────────
 *  ── LEAVE BLOCK LIST ──────────────────────────────────────────────────
 *  ── COMPENSATORY LEAVE REQUEST ────────────────────────────────────────
 *  ── LEAVE APPLICATION ─────────────────────────────────────────────────
 *  ── LEAVE LEDGER ──────────────────────────────────────────────────────
 *  ── LEAVE ENCASHMENT ──────────────────────────────────────────────────
 *  ── COMPLIANCE & UTILITIES ────────────────────────────────────────────
 *  ── LEAVE DASHBOARD ───────────────────────────────────────────────────
 */

const { Op } = require("sequelize");
const { sequelize, Department, Branch } = require("../../../models");
const {
  LeaveType,
  LeavePeriod,
  HolidayList,
  LeaveBlockList,
  CompensatoryLeaveRequest,
  LeaveApplication,
  LeaveLedgerEntry,
  LeaveEncashment,
  Employee,
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

const assertEmployeeActive = async (employeeId) => {
  const emp = await Employee.findByPk(employeeId, {
    attributes: ["id", "status", "companyId", "departmentId", "branchId", "dateOfJoining", "gender"],
  });
  if (!emp) throw new AppError("Employee not found", 404);
  if (emp.status !== "Active") {
    throw new AppError("Employee must be Active for leave operations", 422);
  }
  return emp;
};

const assertLeaveTypeValid = async (leaveTypeId) => {
  const lt = await LeaveType.findByPk(leaveTypeId);
  if (!lt) throw new AppError("Leave type not found", 404);
  if (!lt.isActive) throw new AppError(`Leave type "${lt.name}" is disabled`, 422);
  return lt;
};

const assertLeavePeriodValid = async (leavePeriodId) => {
  const lp = await LeavePeriod.findByPk(leavePeriodId);
  if (!lp) throw new AppError("Leave period not found", 404);
  return lp;
};

const computeBalance = async (employeeId, leaveTypeId, leavePeriodId) => {
  const where = { employeeId, leaveTypeId, isExpired: false };
  if (leavePeriodId) {
    where.leavePeriodId = leavePeriodId;
  }
  const result = await LeaveLedgerEntry.sum("leaves", { where });
  return parseFloat(result) || 0;
};

const isWeekend = (date) => {
  const day = new Date(date).getDay();
  return day === 0 || day === 6;
};

const isHolidayInList = (date, holidays) => {
  const dateStr = typeof date === "string" ? date : date.toISOString().split("T")[0];
  return holidays.some((h) => h.date === dateStr);
};

const createLedgerEntry = async (data, transaction) => {
  return LeaveLedgerEntry.create({
    employeeId: data.employeeId,
    leaveTypeId: data.leaveTypeId,
    leavePeriodId: data.leavePeriodId || null,
    voucherType: data.voucherType,
    voucherNo: data.voucherNo,
    leaves: data.leaves,
    fromDate: data.fromDate,
    toDate: data.toDate,
    isExpired: false,
  }, { transaction });
};

const getServiceYears = (dateOfJoining, asOfDate) => {
  const join = new Date(dateOfJoining);
  const asOf = asOfDate ? new Date(asOfDate) : new Date();
  return (asOf - join) / (365.25 * 24 * 60 * 60 * 1000);
};

const monthsBetween = (d1, d2) => {
  const start = new Date(d1);
  const end = new Date(d2);
  return (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE TYPE
// ═════════════════════════════════════════════════════════════════════════════

const createLeaveType = async (data) => {
  if (!data.name) throw new AppError("name is required", 422);

  const exists = await LeaveType.findOne({ where: { name: data.name } });
  if (exists) throw new AppError(`Leave type "${data.name}" already exists`, 409);

  const leaveType = await sequelize.transaction(async (t) => {
    const leaveType = await LeaveType.create({
      name: data.name,
      eligibilityMonths: data.eligibilityMonths ?? null,
      baseAllocation: data.baseAllocation ?? 0,
      annualIncrementDays: data.annualIncrementDays ?? 0,
      incrementCap: data.incrementCap ?? null,
      allocationRules: data.allocationRules ?? null,
      maxDaysPerYear: data.maxDaysPerYear ?? null,
      maxCarryForwardYears: data.maxCarryForwardYears ?? null,
      maxContinuousDaysAllowed: data.maxContinuousDaysAllowed ?? null,
      isEncashable: data.isEncashable ?? false,
      includeHolidays: data.includeHolidays ?? false,
      includeWeekends: data.includeWeekends ?? false,
      isActive: true,
    }, { transaction: t });

    // Auto-assign to all active employees
    const employees = await Employee.findAll({
      where: { status: "Active" },
      attributes: ["id", "companyId", "dateOfJoining", "gender"],
      transaction: t,
    });

    const activePeriod = await LeavePeriod.findOne({
      where: { isActive: true },
      transaction: t,
    });

    for (const employee of employees) {
      const entitlement = getEntitlementForEmployee(leaveType, employee, activePeriod);
      if (entitlement > 0) {
        await createLedgerEntry({
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          leavePeriodId: activePeriod?.id || null,
          voucherType: "LeaveAllocation",
          voucherNo: leaveType.id,
          leaves: entitlement,
          fromDate: activePeriod?.startDate || new Date().toISOString().split("T")[0],
          toDate: activePeriod?.endDate || new Date().toISOString().split("T")[0],
        }, t);
      }
    }

    return leaveType;
  });

  logger.info("LeaveType created and auto-assigned", { id: leaveType.id, name: leaveType.name });
  return leaveType;
};

const getLeaveTypes = async ({ includeInactive = false } = {}) => {
  const where = {};
  if (!includeInactive) where.isActive = true;
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
    if (exists) throw new AppError(`Leave type "${data.name}" already exists`, 409);
  }

  await lt.update(data);
  logger.info("LeaveType updated", { id });
  return lt;
};

const deleteLeaveType = async (id) => {
  const lt = await LeaveType.findByPk(id);
  if (!lt) throw new AppError("Leave type not found", 404);
  await lt.destroy({ force: true });
  logger.info("LeaveType deleted", { id, name: lt.name });
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE PERIOD
// ═════════════════════════════════════════════════════════════════════════════

const createLeavePeriod = async (data) => {
  if (!data.name || !data.companyId || !data.startDate || !data.endDate) {
    throw new AppError("name, companyId, startDate and endDate are required", 422);
  }
  if (new Date(data.startDate) >= new Date(data.endDate)) {
    throw new AppError("startDate must be before endDate", 422);
  }

  const exists = await LeavePeriod.findOne({
    where: { name: data.name, companyId: data.companyId },
  });
  if (exists) throw new AppError(`Leave period "${data.name}" already exists for this company`, 409);

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
  return LeavePeriod.findAll({ where, order: [["startDate", "DESC"]] });
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
  if (!period) throw new AppError("No active leave period found for this company", 404);
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
  await period.destroy({ force: true });
  logger.info("LeavePeriod deleted", { id });
};

// ═════════════════════════════════════════════════════════════════════════════
//  AUTO-ALLOCATION ENGINE
// ═════════════════════════════════════════════════════════════════════════════

const getEntitlementForEmployee = (leaveType, employee, period) => {
  // Check allocationRules first (gender-based)
   if (leaveType.allocationRules && Array.isArray(leaveType.allocationRules)) {
    for (const rule of leaveType.allocationRules) {
      if (rule.field === "gender") {
        const allowedGenders = Array.isArray(rule.value) ? rule.value : [rule.value];
        if (allowedGenders.includes(employee.gender)) {
          return rule.days;
        }
      }
    }
  }
  // If no rules match, use baseAllocation
  let entitlement = leaveType.baseAllocation || 0;

  // Add increment for service years (Annual Leave)
  if (leaveType.annualIncrementDays > 0 && period) {
    const serviceYears = Math.floor(getServiceYears(employee.dateOfJoining, period.startDate));
    if (serviceYears > 0) {
      entitlement += serviceYears * leaveType.annualIncrementDays;
    }
  }

  // Apply cap
  if (leaveType.incrementCap) {
    entitlement = Math.min(entitlement, leaveType.incrementCap);
  }

  // Pro-rata for year 1 if joined mid-period
  if (period && employee.dateOfJoining > period.startDate) {
    const daysInPeriod = (new Date(period.endDate) - new Date(period.startDate)) / (1000 * 60 * 60 * 24);
    const daysFromJoin = (new Date(period.endDate) - new Date(employee.dateOfJoining)) / (1000 * 60 * 60 * 24);
    entitlement = Math.floor(entitlement * (daysFromJoin / daysInPeriod));
  }

  return entitlement;
};

const autoAllocateForEmployee = async (employeeId, employee, transaction) => {
  const activePeriod = await LeavePeriod.findOne({
    where: { companyId: employee.companyId, isActive: true },
    transaction,
  });

  if (!activePeriod) {
    logger.warn("No active leave period for auto-allocation", { employeeId });
    return [];
  }

  const leaveTypes = await LeaveType.findAll({
    where: { isActive: true },
    transaction,
  });

  const allocations = [];

  for (const leaveType of leaveTypes) {
    // Check eligibility
    if (leaveType.eligibilityMonths) {
      const months = monthsBetween(employee.dateOfJoining, activePeriod.startDate);
      if (months < leaveType.eligibilityMonths) continue;
    }

    const days = getEntitlementForEmployee(leaveType, employee, activePeriod);
    if (days <= 0) continue;

    await createLedgerEntry({
      employeeId,
      leaveTypeId: leaveType.id,
      leavePeriodId: activePeriod.id,
      voucherNo: employeeId,
      leaves: days,
      fromDate: activePeriod.startDate,
      toDate: activePeriod.endDate,
    }, transaction);

    allocations.push({ leaveTypeId: leaveType.id, days });
  }

  logger.info("Auto-allocated leave", { employeeId, count: allocations.length });
  return allocations;
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE BALANCE
// ═════════════════════════════════════════════════════════════════════════════

const getLeaveBalance = async (employeeId, leaveTypeId) => {
  await assertEmployeeActive(employeeId);
  await assertLeaveTypeValid(leaveTypeId);
  const balance = await computeBalance(employeeId, leaveTypeId, null);
  return { employeeId, leaveTypeId, balance };
};

const getLeaveBalances = async (employeeId) => {
  await assertEmployeeActive(employeeId);

  const leaveTypes = await LeaveType.findAll({ where: { isActive: true } });
  const balances = await Promise.all(
    leaveTypes.map(async (lt) => {
      const balance = await computeBalance(employeeId, lt.id, null);
      return {
        leaveTypeId: lt.id,
        leaveTypeName: lt.name,
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
  if (exists) throw new AppError("Holiday list with this name already exists", 409);

  const list = await HolidayList.create({
    name: data.name,
    companyId: data.companyId || null,
    fromDate: data.fromDate,
    toDate: data.toDate,
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
  if (exists) throw new AppError("Block list with this name already exists", 409);

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

const getLeaveBlockLists = async (companyId, { includeDisabled = false } = {}) => {
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
    where, limit, offset,
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
  if (request.status !== "Draft") throw new AppError("Only Draft requests can be submitted", 422);
  await request.update({ docStatus: 1, status: "Approved" });
  return request;
};

const approveCompensatoryRequest = async (id, approverUserId) => {
  const request = await CompensatoryLeaveRequest.findByPk(id);
  if (!request) throw new AppError("Compensatory leave request not found", 404);
  if (request.status !== "Draft" && request.status !== "Approved") {
    throw new AppError("Only Draft/Submitted requests can be approved", 422);
  }

  const activePeriod = await LeavePeriod.findOne({ where: { isActive: true } });

  const result = await sequelize.transaction(async (t) => {
    await createLedgerEntry({
      employeeId: request.employeeId,
      leaveTypeId: request.leaveTypeId,
      leavePeriodId: activePeriod?.id || null,
      voucherType: "CompensatoryLeaveRequest",
      voucherNo: request.id,
      leaves: 1,
      fromDate: activePeriod?.startDate || new Date().toISOString().split("T")[0],
      toDate: activePeriod?.endDate || new Date().toISOString().split("T")[0],
    }, t);

    await request.update({ status: "Approved", docStatus: 1 }, { transaction: t });
    return request;
  });

  logger.info("CompensatoryLeaveRequest approved", { id });
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
  if (request.status === "Cancelled") throw new AppError("Request already cancelled", 422);
  await request.update({ status: "Cancelled", docStatus: 2 });
  return request;
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE APPLICATION
// ═════════════════════════════════════════════════════════════════════════════

const createLeaveApplication = async (data, userId) => {
  const { employeeId, leaveTypeId, leavePeriodId, fromDate, toDate, isHalfDay, halfDayDate, reason, followUpDate, holidayListId } = data;

  if (!employeeId || !leaveTypeId || !fromDate || !toDate) {
    throw new AppError("employeeId, leaveTypeId, fromDate and toDate are required", 422);
  }
  if (new Date(fromDate) > new Date(toDate)) {
    throw new AppError("fromDate must be before or equal to toDate", 422);
  }

  const employee = await assertEmployeeActive(employeeId);
  const leaveType = await assertLeaveTypeValid(leaveTypeId);

  // Leave Period validation
  let finalLeavePeriodId = leavePeriodId;
  if (finalLeavePeriodId) {
    const lp = await assertLeavePeriodValid(finalLeavePeriodId);
    if (lp.companyId !== employee.companyId) {
      throw new AppError("Invalid leave period for this company", 422);
    }
  } else {
    // If not provided, fallback to active period
    const activePeriod = await getActiveLeavePeriod(employee.companyId);
    finalLeavePeriodId = activePeriod.id;
  }

  // Eligibility check
  if (leaveType.eligibilityMonths) {
    const eligibleMonths = monthsBetween(employee.dateOfJoining, fromDate);
    if (eligibleMonths < leaveType.eligibilityMonths) {
      const eligibleDate = new Date(employee.dateOfJoining);
      eligibleDate.setMonth(eligibleDate.getMonth() + leaveType.eligibilityMonths);
      throw new AppError(
        `Not yet eligible. You joined ${employee.dateOfJoining}. Eligible from ${eligibleDate.toISOString().split("T")[0]}.`,
        422,
      );
    }
  }

  // Block dates check
  const blockedDates = [];
  const start = new Date(fromDate);
  const end = new Date(toDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    const blockCheck = await isDateBlocked(dateStr, employee.companyId, employee.departmentId);
    if (blockCheck.blocked) {
      blockedDates.push({ date: dateStr, blockListName: blockCheck.blockListName });
    }
  }

  if (blockedDates.length > 0) {
    const dates = blockedDates.map((b) => b.date).join(", ");
    const names = [...new Set(blockedDates.map((b) => b.blockListName))].join(", ");
    throw new AppError(`Blocked dates found: ${dates} (${names}). Leave is restricted on these dates.`, 422);
  }

  // Calculate working days
  const holidayList = holidayListId ? await HolidayList.findByPk(holidayListId) : null;
  const totalLeaveDays = await calculateWorkingDays(
    fromDate, toDate,
    leaveType.includeHolidays,
    leaveType.includeWeekends,
    holidayList?.holidays || [],
  );

  if (totalLeaveDays <= 0) {
    throw new AppError("No working days found in the selected date range.", 422);
  }

  // Max days per year check
  if (leaveType.maxDaysPerYear) {
    const activePeriod = await getActiveLeavePeriod(employee.companyId);
    if (activePeriod) {
      const takenThisYear = await LeaveApplication.sum("totalLeaveDays", {
        where: {
          employeeId,
          leaveTypeId,
          status: "Approved",
          fromDate: { [Op.gte]: activePeriod.startDate },
          toDate: { [Op.lte]: activePeriod.endDate },
        },
      });
      if ((parseFloat(takenThisYear || 0) + totalLeaveDays) > leaveType.maxDaysPerYear) {
        throw new AppError(
          `Exceeds annual limit of ${leaveType.maxDaysPerYear} days. Already taken: ${parseFloat(takenThisYear || 0)}.`,
          422,
        );
      }
    }
  }

  // Max continuous days check
  if (leaveType.maxContinuousDaysAllowed && totalLeaveDays > leaveType.maxContinuousDaysAllowed) {
    throw new AppError(`Maximum ${leaveType.maxContinuousDaysAllowed} consecutive days allowed.`, 422);
  }

  // Balance check
  const balance = await computeBalance(employeeId, leaveTypeId, finalLeavePeriodId);
  if (balance < totalLeaveDays) {
    throw new AppError(`Insufficient balance for the selected period. Required: ${totalLeaveDays}, Available: ${balance}`, 422);
  }

  // Overlap check
  const overlap = await LeaveApplication.findOne({
    where: {
      employeeId,
      status: { [Op.in]: ["Open", "Approved"] },
      fromDate: { [Op.lte]: toDate },
      toDate: { [Op.gte]: fromDate },
    },
  });
  if (overlap) {
    throw new AppError(`Overlaps with existing ${overlap.status} application (${overlap.fromDate} – ${overlap.toDate})`, 422);
  }

  const application = await LeaveApplication.create({
    employeeId, leaveTypeId, leavePeriodId: finalLeavePeriodId, fromDate, toDate, totalLeaveDays,
    isHalfDay: isHalfDay ?? false,
    halfDayDate: isHalfDay ? halfDayDate : null,
    reason: reason || null,
    followUpDate: followUpDate || null,
    holidayListId: holidayListId || null,
    status: "Draft",
    docStatus: 0,
  });

  logger.info("LeaveApplication created", { id: application.id, employeeId, totalLeaveDays });
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

  const employeeWhere = {};
  if (permFilter.branchId) employeeWhere.branchId = permFilter.branchId;
  if (permFilter.departmentId) employeeWhere.departmentId = permFilter.departmentId;
  if (permFilter.companyId) employeeWhere.companyId = permFilter.companyId;

  const includeOptions = [
    {
      model: Employee, as: "applicant",
      attributes: ["id", "firstName", "middleName", "lastName", "employeeNumber", "image"],
      where: Object.keys(employeeWhere).length > 0 ? employeeWhere : undefined,
      include: [
        { model: Department, as: "department", attributes: ["id", "name"] },
        { model: Branch, as: "branch", attributes: ["id", "name"] },
      ],
    },
    {
      model: Employee, as: "approver",
      attributes: ["id", "firstName", "middleName", "lastName", "employeeNumber"],
    },
    { model: LeaveType, as: "leaveType", attributes: ["id", "name"] },
    { model: HolidayList, as: "holidayList", attributes: ["id", "name"], required: false },
  ];

  const { count, rows } = await LeaveApplication.findAndCountAll({
    where, limit, offset,
    order: [["createdAt", "DESC"]],
    include: includeOptions,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};

const getLeaveApplicationById = async (id) => {
  const app = await LeaveApplication.findByPk(id, {
    include: [
      {
        model: Employee, as: "applicant",
        attributes: ["id", "firstName", "middleName", "lastName", "employeeNumber", "image"],
        include: [
          { model: Department, as: "department", attributes: ["id", "name"] },
          { model: Branch, as: "branch", attributes: ["id", "name"] },
        ],
      },
      { model: Employee, as: "approver", attributes: ["id", "firstName", "middleName", "lastName", "employeeNumber"] },
      { model: LeaveType, as: "leaveType", attributes: ["id", "name"] },
      { model: HolidayList, as: "holidayList", attributes: ["id", "name"], required: false },
    ],
  });
  if (!app) throw new AppError("Leave application not found", 404);
  return app;
};

const submitLeaveApplication = async (id) => {
  const app = await LeaveApplication.findByPk(id);
  if (!app) throw new AppError("Leave application not found", 404);
  if (app.status !== "Draft") throw new AppError("Only Draft applications can be submitted", 422);
  await app.update({ status: "Open", docStatus: 1 });
  return app;
};

const approveLeaveApplication = async (id, approverUserId) => {
  const app = await LeaveApplication.findByPk(id);
  if (!app) throw new AppError("Leave application not found", 404);
  if (app.status !== "Open") throw new AppError("Only Open applications can be approved", 422);

  const balance = await computeBalance(app.employeeId, app.leaveTypeId, app.leavePeriodId);
  if (balance < parseFloat(app.totalLeaveDays)) {
    throw new AppError(`Insufficient balance. Required: ${app.totalLeaveDays}, Available: ${balance}`, 422);
  }

  await sequelize.transaction(async (t) => {
    await createLedgerEntry({
      employeeId: app.employeeId,
      leaveTypeId: app.leaveTypeId,
      leavePeriodId: app.leavePeriodId,
      voucherType: "LeaveApplication",
      voucherNo: app.id,
      leaves: -Math.abs(parseFloat(app.totalLeaveDays)),
      fromDate: app.fromDate,
      toDate: app.toDate,
    }, t);

    const updateData = { status: "Approved" };
    if (approverUserId) updateData.approverId = approverUserId;
    await app.update(updateData, { transaction: t });
  });

  logger.info("LeaveApplication approved", { id, employeeId: app.employeeId });
  return app;
};

const rejectLeaveApplication = async (id, approverUserId, rejectionReason) => {
  if (!rejectionReason) throw new AppError("rejectionReason is required", 422);

  const app = await LeaveApplication.findByPk(id);
  if (!app) throw new AppError("Leave application not found", 404);
  if (app.status !== "Open") throw new AppError("Only Open applications can be rejected", 422);

  await app.update({ status: "Rejected", approverId: approverUserId, rejectionReason });
  logger.info("LeaveApplication rejected", { id });
  return app;
};

const cancelLeaveApplication = async (id) => {
  const app = await LeaveApplication.findByPk(id);
  if (!app) throw new AppError("Leave application not found", 404);
  if (app.status === "Cancelled") throw new AppError("Application already cancelled", 422);

  if (app.status === "Approved") {
    await sequelize.transaction(async (t) => {
      await createLedgerEntry({
        employeeId: app.employeeId,
        leaveTypeId: app.leaveTypeId,
        leavePeriodId: app.leavePeriodId,
        voucherType: "LeaveApplication",
        voucherNo: app.id,
        leaves: Math.abs(parseFloat(app.totalLeaveDays)),
        fromDate: app.fromDate,
        toDate: app.toDate,
      }, t);

      await app.update({ status: "Cancelled", docStatus: 2 }, { transaction: t });
    });
  } else {
    await app.update({ status: "Cancelled", docStatus: 2 });
  }

  logger.info("LeaveApplication cancelled", { id });
  return app;
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE LEDGER
// ═════════════════════════════════════════════════════════════════════════════
const getAllLedgerEntries = async (query = {}) => {
  const { employeeId, leaveTypeId, voucherType } = query;
  const { limit, offset, page } = getPaginationOptions(query);

  const where = {};
  if (employeeId) where.employeeId = employeeId;
  if (leaveTypeId) where.leaveTypeId = leaveTypeId;
  if (voucherType) where.voucherType = voucherType;

  const { count, rows } = await LeaveLedgerEntry.findAndCountAll({
    where, limit, offset,
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: Employee,
        as: "employee",
        attributes: ["id", "firstName", "middleName" ,"lastName", "employeeNumber"],
      },
      {
        model: LeaveType,
        as: "leaveType",
      },
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};
const getLeaveLedger = async (employeeId, leaveTypeId, query = {}) => {
  const { limit, offset, page } = getPaginationOptions(query);
  const where = { employeeId, leaveTypeId };
  if (query.voucherType) where.voucherType = query.voucherType;

  const { count, rows } = await LeaveLedgerEntry.findAndCountAll({
    where, limit, offset,
    order: [["createdAt", "DESC"]],
  });

  const balance = await computeBalance(employeeId, leaveTypeId, query.leavePeriodId);
  return { data: rows, meta: buildMeta(count, page, limit), currentBalance: balance };
};

const getLeaveLedgerEntryById = async (id) => {
  const entry = await LeaveLedgerEntry.findByPk(id);
  if (!entry) throw new AppError("Ledger entry not found", 404);
  return entry;
};

const getMyLedger = async (employeeId, query = {}) => {
  const { leaveTypeId, voucherType } = query;
  const { limit, offset, page } = getPaginationOptions(query);

  const where = { employeeId };
  if (leaveTypeId) where.leaveTypeId = leaveTypeId;
  if (voucherType) where.voucherType = voucherType;

  const { count, rows } = await LeaveLedgerEntry.findAndCountAll({
    where, limit, offset,
    order: [["createdAt", "DESC"]],
    include: [{ model: LeaveType, as: "leaveType", attributes: ["id", "name"] }],
  });

  const allEntries = await LeaveLedgerEntry.findAll({
    where: { employeeId, isExpired: false },
    attributes: ["leaveTypeId", "leaves"],
  });

  const balanceByType = {};
  allEntries.forEach((entry) => {
    const ltId = entry.leaveTypeId;
    balanceByType[ltId] = (balanceByType[ltId] || 0) + parseFloat(entry.leaves || 0);
  });

  const typeIds = Object.keys(balanceByType);
  const leaveTypes = await LeaveType.findAll({
    where: { id: { [Op.in]: typeIds } },
    attributes: ["id", "name"],
  });

  const balanceSummary = typeIds.map((id) => ({
    leaveTypeId: id,
    leaveTypeName: leaveTypes.find((lt) => lt.id === id)?.name || "Unknown",
    balance: parseFloat(balanceByType[id].toFixed(2)),
  }));

  return { data: rows, meta: buildMeta(count, page, limit), balances: balanceSummary };
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE ENCASHMENT
// ═════════════════════════════════════════════════════════════════════════════

const createLeaveEncashment = async (data) => {
  if (!data.employeeId || !data.leaveTypeId || !data.leavePeriodId || !data.leavesToEncash) {
    throw new AppError("employeeId, leaveTypeId, leavePeriodId and leavesToEncash are required", 422);
  }

  await assertEmployeeActive(data.employeeId);
  const leaveType = await assertLeaveTypeValid(data.leaveTypeId);

  if (!leaveType.isEncashable) {
    throw new AppError(`Leave type "${leaveType.name}" is not encashable`, 422);
  }

  await assertLeavePeriodValid(data.leavePeriodId);

  const balance = await computeBalance(data.employeeId, data.leaveTypeId, data.leavePeriodId);
  if (balance < parseFloat(data.leavesToEncash)) {
    throw new AppError(`Insufficient balance. Requested: ${data.leavesToEncash}, Available: ${balance}`, 422);
  }

  const encashment = await LeaveEncashment.create({
    employeeId: data.employeeId,
    leaveTypeId: data.leaveTypeId,
    leavePeriodId: data.leavePeriodId,
    leavesToEncash: data.leavesToEncash,
    encashmentAmount: data.encashmentAmount || 0,
    encashmentDate: data.encashmentDate || new Date().toISOString().split("T")[0],
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
    where, limit, offset,
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
  if (enc.docStatus !== 0) throw new AppError("Only Draft encashments can be submitted", 422);
  await enc.update({ docStatus: 1 });
  return enc;
};

const approveLeaveEncashment = async (id) => {
  const enc = await LeaveEncashment.findByPk(id);
  if (!enc) throw new AppError("Leave encashment not found", 404);
  if (enc.docStatus !== 1) throw new AppError("Only submitted encashments can be approved", 422);

  await sequelize.transaction(async (t) => {
    await createLedgerEntry({
      employeeId: enc.employeeId,
      leaveTypeId: enc.leaveTypeId,
      leavePeriodId: enc.leavePeriodId,
      voucherType: "LeaveEncashment",
      voucherNo: enc.id,
      leaves: -Math.abs(parseFloat(enc.leavesToEncash)),
      fromDate: enc.encashmentDate,
      toDate: enc.encashmentDate,
    }, t);

    await enc.update({ docStatus: 1 }, { transaction: t });
  });

  logger.info("LeaveEncashment approved", { id });
  return enc;
};

const rejectLeaveEncashment = async (id) => {
  const enc = await LeaveEncashment.findByPk(id);
  if (!enc) throw new AppError("Leave encashment not found", 404);
  if (enc.docStatus !== 1) throw new AppError("Only submitted encashments can be rejected", 422);
  await enc.update({ docStatus: 0 });
  return enc;
};

const cancelLeaveEncashment = async (id) => {
  const enc = await LeaveEncashment.findByPk(id);
  if (!enc) throw new AppError("Leave encashment not found", 404);
  if (enc.docStatus === 2) throw new AppError("Encashment already cancelled", 422);
  await enc.update({ docStatus: 2 });
  return enc;
};

// ═════════════════════════════════════════════════════════════════════════════
//  COMPLIANCE & UTILITIES
// ═════════════════════════════════════════════════════════════════════════════

const isDateBlocked = async (dateStr, companyId, departmentId) => {
  const blockLists = await LeaveBlockList.findAll({
    where: { companyId, disabled: false },
  });

  for (const list of blockLists) {
    const blocked = list.blockDates.some((b) => b.date === dateStr);
    if (!blocked) continue;

    if (list.appliesToAllDepartments) return { blocked: true, blockListName: list.name };

    if (departmentId && list.allowedDepartments.includes(departmentId)) {
      return { blocked: true, blockListName: list.name };
    }
  }

  return { blocked: false };
};

const isDateHoliday = async (dateStr, companyId) => {
  const lists = await HolidayList.findAll({ where: { disabled: false } });

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

const calculateWorkingDays = async (fromDate, toDate, includeHolidays, includeWeekends, holidays = []) => {
  let count = 0;
  const start = new Date(fromDate);
  const end = new Date(toDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];
    if (!includeWeekends && isWeekend(dateStr)) continue;
    if (!includeHolidays && isHolidayInList(dateStr, holidays)) continue;
    count++;
  }

  return count;
};

const validateLeaveBalance = async (employeeId, leaveTypeId, requestedDays, leavePeriodId) => {
  const balance = await computeBalance(employeeId, leaveTypeId, leavePeriodId);
  if (balance < requestedDays) {
    return { sufficient: false, balance, requested: requestedDays, shortfall: requestedDays - balance };
  }
  return { sufficient: true, balance, requested: requestedDays };
};

const expireOverdueLedgerEntries = async () => {
  const today = new Date().toISOString().split("T")[0];

  const [affectedCount] = await LeaveLedgerEntry.update(
    { isExpired: true },
    { where: { toDate: { [Op.lt]: today }, isExpired: false } },
  );

  logger.info("Expired ledger entries updated", { count: affectedCount });
  return { expired: affectedCount };
};

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════

const formatDate = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
};

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

const getDashboardStats = async (companyId, period, userBranchId, userDepartmentId) => {
  if (!companyId) throw new AppError("companyId is required", 422);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const employeeWhere = { companyId, status: "Active" };
  if (userBranchId) employeeWhere.branchId = userBranchId;
  if (userDepartmentId) employeeWhere.departmentId = userDepartmentId;

  let totalBranches = 0;
  try {
    totalBranches = await Branch.count({ where: { companyId, isActive: true } });
  } catch {
    totalBranches = 0;
  }

  const onLeaveTodayApplications = await LeaveApplication.findAll({
    where: { status: "Approved", fromDate: { [Op.lte]: tomorrow }, toDate: { [Op.gte]: today } },
    include: [{ model: Employee, as: "applicant", required: true, where: employeeWhere, attributes: ["id"] }],
  });
  const onLeaveToday = [...new Set(onLeaveTodayApplications.map((a) => a.applicant?.id).filter(Boolean))].length;

  const pendingApprovals = await LeaveApplication.count({
    where: { status: "Open" },
    include: [{ model: Employee, as: "applicant", required: true, where: employeeWhere }],
  });

  const oldestPending = await LeaveApplication.findOne({
    where: { status: "Open" },
    include: [{ model: Employee, as: "applicant", required: true, where: employeeWhere, attributes: ["id"] }],
    order: [["createdAt", "ASC"]],
    attributes: ["createdAt"],
  });

  let oldestPendingText = "N/A";
  if (oldestPending) {
    const daysAgo = Math.floor((today - new Date(oldestPending.createdAt)) / (1000 * 60 * 60 * 24));
    oldestPendingText = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`;
  }

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthStart = new Date(currentYear, currentMonth, 1);
  const monthEnd = new Date(currentYear, currentMonth + 1, 0);

  let leavesThisMonth = 0;
  try {
    leavesThisMonth = await LeaveApplication.sum("totalLeaveDays", {
      where: { status: "Approved", fromDate: { [Op.gte]: monthStart }, toDate: { [Op.lte]: monthEnd } },
      include: [{ model: Employee, as: "applicant", required: true, where: employeeWhere }],
    });
  } catch { /* ignore */ }

  let encashmentEligible = 0;
  try {
    const encashableTypes = await LeaveType.findAll({ where: { isEncashable: true, isActive: true }, attributes: ["id"] });
    if (encashableTypes.length > 0) {
      const employees = await Employee.findAll({ where: employeeWhere, attributes: ["id"], limit: 100 });
      for (const emp of employees) {
        for (const lt of encashableTypes) {
          const balance = await computeBalance(emp.id, lt.id, null);
          if (balance > 0) { encashmentEligible++; break; }
        }
      }
    }
  } catch { /* ignore */ }

  return {
    onLeaveToday,
    branchesWithLeave: 0,
    totalBranches,
    pendingApprovals,
    oldestPending: oldestPendingText,
    leavesTakenThisMonth: parseFloat(leavesThisMonth || 0),
    encashmentEligible,
  };
};

const getDashboardBalances = async (companyId, userBranchId) => {
  if (!companyId) throw new AppError("companyId is required", 422);

  const employeeWhere = { companyId, status: "Active" };
  if (userBranchId) employeeWhere.branchId = userBranchId;

  const employees = await Employee.findAll({ where: employeeWhere, attributes: ["id"] });
  const leaveTypes = await LeaveType.findAll({ where: { isActive: true }, attributes: ["id", "name"] });

  const balances = {};
  const keyTypes = ["Annual", "Sick", "Maternity"];

  for (const typeName of keyTypes) {
    const leaveType = leaveTypes.find((lt) => lt.name.toLowerCase().includes(typeName.toLowerCase()));
    if (!leaveType) continue;

    let totalAllocated = 0, totalRemaining = 0, employeeCount = 0;

    for (const emp of employees) {
      const balance = await computeBalance(emp.id, leaveType.id, null);
      if (balance > 0) {
        totalRemaining += balance;
        employeeCount++;
      }
    }

    balances[typeName.toLowerCase()] = {
      entitled: typeName === "Sick" ? "6 months" : typeName === "Maternity" ? 90 : 16,
      avgRemaining: employeeCount > 0 ? parseFloat((totalRemaining / employeeCount).toFixed(1)) : 0,
      utilizationPercent: 0,
      employeeCount,
      totalAllocated: parseFloat(totalAllocated.toFixed(1)),
      totalRemaining: parseFloat(totalRemaining.toFixed(1)),
    };
  }

  return balances;
};

const getDashboardPendingApprovals = async (companyId, options = {}) => {
  const { limit = 4, branchId, departmentId } = options;
  if (!companyId) throw new AppError("companyId is required", 422);

  const employeeWhere = { companyId, status: "Active" };
  if (branchId) employeeWhere.branchId = branchId;
  if (departmentId) employeeWhere.departmentId = departmentId;

  const applications = await LeaveApplication.findAll({
    where: { status: "Open" },
    include: [
      {
        model: Employee, as: "applicant", required: true, where: employeeWhere,
        include: [
          { model: Department, as: "department", attributes: ["id", "name"] },
          { model: Branch, as: "branch", attributes: ["id", "name"] },
        ],
      },
      { model: LeaveType, as: "leaveType", attributes: ["id", "name"] },
    ],
    order: [["createdAt", "ASC"]],
    limit,
  });

  return applications.map((app) => {
    const emp = app.applicant;
    return {
      id: app.id,
      employee: {
        id: emp?.id,
        name: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
        initials: emp ? `${emp.firstName?.[0] || ""}${emp.lastName?.[0] || ""}`.toUpperCase() : "??",
        department: emp?.department?.name || "N/A",
        branch: emp?.branch?.name || "N/A",
      },
      leaveType: app.leaveType?.name || "Unknown",
      duration: `${formatDate(app.fromDate)} – ${formatDate(app.toDate)}`,
      days: parseFloat(app.totalLeaveDays),
      status: "Pending",
      appliedDate: app.createdAt,
    };
  });
};

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
    where: { status: "Approved", fromDate: { [Op.lte]: endOfWeek }, toDate: { [Op.gte]: startOfWeek } },
    include: [
      { model: Employee, as: "applicant", required: true, where: employeeWhere },
      { model: LeaveType, as: "leaveType", attributes: ["name"] },
    ],
    order: [["fromDate", "ASC"]],
  });

  return applications.map((app) => {
    const emp = app.applicant;
    return {
      id: app.id,
      name: emp ? `${emp.firstName} ${emp.lastName}` : "Unknown",
      initials: emp ? `${emp.firstName?.[0] || ""}${emp.lastName?.[0] || ""}`.toUpperCase() : "??",
      dates: `${formatDate(app.fromDate)} – ${formatDate(app.toDate)}`,
      leaveType: app.leaveType?.name || "Unknown",
      status: "Active",
    };
  });
};

const getDashboardLeaveByType = async (companyId, period, branchId) => {
  if (!companyId) throw new AppError("companyId is required", 422);

  const year = parseInt(period);
  const periodStart = `${year}-01-01`;
  const periodEnd = `${year}-12-31`;

  const employeeWhere = { companyId, status: "Active" };
  if (branchId) employeeWhere.branchId = branchId;

  const leaveTypes = await LeaveType.findAll({ where: { isActive: true } });

  const applications = await LeaveApplication.findAll({
    where: { status: "Approved", fromDate: { [Op.gte]: periodStart }, toDate: { [Op.lte]: periodEnd } },
    include: [{ model: Employee, as: "applicant", required: true, where: employeeWhere, attributes: ["id"] }],
    attributes: ["leaveTypeId", "totalLeaveDays"],
  });

  const leaveTypeMap = {};
  let totalDays = 0;

  for (const app of applications) {
    const days = parseFloat(app.totalLeaveDays) || 0;
    leaveTypeMap[app.leaveTypeId] = (leaveTypeMap[app.leaveTypeId] || 0) + days;
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
      if (holiday.date >= today && (!earliestDate || holiday.date < earliestDate)) {
        earliestDate = holiday.date;
        earliestHoliday = { name: holiday.description || list.name, date: holiday.date, listName: list.name };
      }
    }
  }

  if (!earliestHoliday) return null;

  const holidayDate = new Date(earliestHoliday.date);
  const daysAway = Math.ceil((holidayDate - new Date(today)) / (1000 * 60 * 60 * 24));

  return { ...earliestHoliday, daysAway };
};

const exportDashboardData = async (companyId, period) => {
  const stats = await getDashboardStats(companyId, period);
  const balances = await getDashboardBalances(companyId);
  const byType = await getDashboardLeaveByType(companyId, period);
  return { generatedAt: new Date().toISOString(), period, stats, balances, leaveByType: byType };
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

  // Auto-Allocation
  autoAllocateForEmployee,
  getEntitlementForEmployee,

  // Leave Balance
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
  getAllLedgerEntries,
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