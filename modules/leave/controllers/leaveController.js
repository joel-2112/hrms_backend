'use strict';

/**
 * modules/leave/controllers/leaveController.js
 *
 * Thin controller layer — delegates all business logic to leaveService.
 */

const { catchAsync } = require('../../../utils/catchAsync');
const { ok, created, noContent } = require('../../../utils/response');
const { AppError } = require('../../../middlewares/errorMiddleware');
const leaveService = require('../services/leaveService');
const { Employee, Department, Branch } = require('../../../models');


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE TYPE
// ═════════════════════════════════════════════════════════════════════════════

const createLeaveType = catchAsync(async (req, res) => {
  const leaveType = await leaveService.createLeaveType(req.body);
  created(res, { message: 'Leave type created successfully', data: leaveType });
});

const getLeaveTypes = catchAsync(async (req, res) => {
  const { includeInactive } = req.query;
  const types = await leaveService.getLeaveTypes({ includeInactive: includeInactive === 'true' });
  ok(res, { message: 'Leave types fetched successfully', data: types });
});

const getLeaveTypeById = catchAsync(async (req, res) => {
  const leaveType = await leaveService.getLeaveTypeById(req.params.id);
  ok(res, { message: 'Leave type fetched successfully', data: leaveType });
});

const updateLeaveType = catchAsync(async (req, res) => {
  const updated = await leaveService.updateLeaveType(req.params.id, req.body);
  ok(res, { message: 'Leave type updated successfully', data: updated });
});

const deleteLeaveType = catchAsync(async (req, res) => {
  await leaveService.deleteLeaveType(req.params.id);
  ok(res, { message: 'Leave type disabled successfully' });
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE PERIOD
// ═════════════════════════════════════════════════════════════════════════════

const createLeavePeriod = catchAsync(async (req, res) => {
  const period = await leaveService.createLeavePeriod(req.body);
  created(res, { message: 'Leave period created successfully', data: period });
});

const getLeavePeriods = catchAsync(async (req, res) => {
  const { companyId, isActive } = req.query;
  const periods = await leaveService.getLeavePeriods(companyId, {
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
  });
  ok(res, { message: 'Leave periods fetched successfully', data: periods });
});

const getActiveLeavePeriod = catchAsync(async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) throw new AppError('companyId is required', 422);
  const period = await leaveService.getActiveLeavePeriod(companyId);
  ok(res, { message: 'Active leave period fetched successfully', data: period });
});

const getLeavePeriodById = catchAsync(async (req, res) => {
  const period = await leaveService.getLeavePeriodById(req.params.id);
  ok(res, { message: 'Leave period fetched successfully', data: period });
});

const updateLeavePeriod = catchAsync(async (req, res) => {
  const updated = await leaveService.updateLeavePeriod(req.params.id, req.body);
  ok(res, { message: 'Leave period updated successfully', data: updated });
});

const deleteLeavePeriod = catchAsync(async (req, res) => {
  await leaveService.deleteLeavePeriod(req.params.id);
  noContent(res);
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE BALANCE
// ═════════════════════════════════════════════════════════════════════════════

const getLeaveBalances = catchAsync(async (req, res) => {
  const balances = await leaveService.getLeaveBalances(req.params.employeeId);
  ok(res, { message: 'Leave balances fetched successfully', data: balances });
});

const getLeaveBalance = catchAsync(async (req, res) => {
  const { employeeId, leaveTypeId } = req.params;
  const balance = await leaveService.getLeaveBalance(employeeId, leaveTypeId);
  ok(res, { message: 'Leave balance fetched successfully', data: balance });
});


// ═════════════════════════════════════════════════════════════════════════════
//  HOLIDAY LIST
// ═════════════════════════════════════════════════════════════════════════════

const createHolidayList = catchAsync(async (req, res) => {
  const list = await leaveService.createHolidayList(req.body);
  created(res, { message: 'Holiday list created successfully', data: list });
});

const getHolidayLists = catchAsync(async (req, res) => {
  const { companyId, includeDisabled } = req.query;
  const lists = await leaveService.getHolidayLists({ companyId, includeDisabled: includeDisabled === 'true' });
  ok(res, { message: 'Holiday lists fetched successfully', data: lists });
});

const getHolidayListById = catchAsync(async (req, res) => {
  const list = await leaveService.getHolidayListById(req.params.id);
  ok(res, { message: 'Holiday list fetched successfully', data: list });
});

const updateHolidayList = catchAsync(async (req, res) => {
  const updated = await leaveService.updateHolidayList(req.params.id, req.body);
  ok(res, { message: 'Holiday list updated successfully', data: updated });
});

const deleteHolidayList = catchAsync(async (req, res) => {
  await leaveService.deleteHolidayList(req.params.id);
  ok(res, { message: 'Holiday list disabled successfully' });
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE BLOCK LIST
// ═════════════════════════════════════════════════════════════════════════════

const createLeaveBlockList = catchAsync(async (req, res) => {
  const list = await leaveService.createLeaveBlockList(req.body);
  created(res, { message: 'Leave block list created successfully', data: list });
});

const getLeaveBlockLists = catchAsync(async (req, res) => {
  const { companyId, includeDisabled } = req.query;
  const lists = await leaveService.getLeaveBlockLists(companyId, { includeDisabled: includeDisabled === 'true' });
  ok(res, { message: 'Leave block lists fetched successfully', data: lists });
});

const getLeaveBlockListById = catchAsync(async (req, res) => {
  const list = await leaveService.getLeaveBlockListById(req.params.id);
  ok(res, { message: 'Leave block list fetched successfully', data: list });
});

const updateLeaveBlockList = catchAsync(async (req, res) => {
  const updated = await leaveService.updateLeaveBlockList(req.params.id, req.body);
  ok(res, { message: 'Leave block list updated successfully', data: updated });
});

const deleteLeaveBlockList = catchAsync(async (req, res) => {
  await leaveService.deleteLeaveBlockList(req.params.id);
  ok(res, { message: 'Leave block list disabled successfully' });
});


// ═════════════════════════════════════════════════════════════════════════════
//  COMPENSATORY LEAVE REQUEST
// ═════════════════════════════════════════════════════════════════════════════

const createCompensatoryRequest = catchAsync(async (req, res) => {
  const request = await leaveService.createCompensatoryRequest(req.body, req.user?.id);
  created(res, { message: 'Compensatory leave request created successfully', data: request });
});

const getCompensatoryRequests = catchAsync(async (req, res) => {
  const { data, meta } = await leaveService.getCompensatoryRequests(req.query);
  ok(res, { message: 'Compensatory requests fetched successfully', data, meta });
});

const getCompensatoryRequestById = catchAsync(async (req, res) => {
  const request = await leaveService.getCompensatoryRequestById(req.params.id);
  ok(res, { message: 'Compensatory request fetched successfully', data: request });
});

const submitCompensatoryRequest = catchAsync(async (req, res) => {
  const request = await leaveService.submitCompensatoryRequest(req.params.id);
  ok(res, { message: 'Compensatory request submitted successfully', data: request });
});

const approveCompensatoryRequest = catchAsync(async (req, res) => {
  const approverUserId = req.user?.id;
  const result = await leaveService.approveCompensatoryRequest(req.params.id, approverUserId);
  ok(res, { message: 'Compensatory request approved', data: result });
});

const rejectCompensatoryRequest = catchAsync(async (req, res) => {
  const { rejectionReason } = req.body;
  const request = await leaveService.rejectCompensatoryRequest(req.params.id, rejectionReason);
  ok(res, { message: 'Compensatory request rejected', data: request });
});

const cancelCompensatoryRequest = catchAsync(async (req, res) => {
  const request = await leaveService.cancelCompensatoryRequest(req.params.id);
  ok(res, { message: 'Compensatory request cancelled', data: request });
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE APPLICATION
// ═════════════════════════════════════════════════════════════════════════════

const createLeaveApplication = catchAsync(async (req, res) => {
  const application = await leaveService.createLeaveApplication(req.body, req.user?.id);
  created(res, { message: 'Leave application created successfully', data: application });
});

const getLeaveApplications = catchAsync(async (req, res) => {
  const permFilter = req.perms?.dataFilter || {};
  const { data, meta } = await leaveService.getLeaveApplications(req.query, permFilter);
  ok(res, { message: 'Leave applications fetched successfully', data, meta });
});

const getLeaveApplicationById = catchAsync(async (req, res) => {
  const application = await leaveService.getLeaveApplicationById(req.params.id);
  ok(res, { message: 'Leave application fetched successfully', data: application });
});

const submitLeaveApplication = catchAsync(async (req, res) => {
  const application = await leaveService.submitLeaveApplication(req.params.id);
  ok(res, { message: 'Leave application submitted for approval', data: application });
});

const approveLeaveApplication = catchAsync(async (req, res) => {
  let approverEmployeeId = null;

  if (req.user?.id) {
    const employee = await Employee.findOne({ where: { userId: req.user.id }, attributes: ['id'] });
    approverEmployeeId = employee?.id || null;
  }

  const application = await leaveService.approveLeaveApplication(req.params.id, approverEmployeeId);
  ok(res, { message: 'Leave application approved — Balance updated', data: application });
});

const rejectLeaveApplication = catchAsync(async (req, res) => {
  let approverEmployeeId = null;

  if (req.user?.id) {
    const employee = await Employee.findOne({ where: { userId: req.user.id }, attributes: ['id'] });
    approverEmployeeId = employee?.id || null;
  }

  const { rejectionReason } = req.body;
  const application = await leaveService.rejectLeaveApplication(req.params.id, approverEmployeeId, rejectionReason);
  ok(res, { message: 'Leave application rejected', data: application });
});

const cancelLeaveApplication = catchAsync(async (req, res) => {
  const application = await leaveService.cancelLeaveApplication(req.params.id);
  ok(res, { message: 'Leave application cancelled', data: application });
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE LEDGER
// ═════════════════════════════════════════════════════════════════════════════
const getAllLedgerEntries = catchAsync(async (req, res) => {
  const { data, meta } = await leaveService.getAllLedgerEntries(req.query);

  ok(res, {
    message: 'Ledger entries fetched successfully',
    data,
    meta,
  });
});
const getLeaveLedger = catchAsync(async (req, res) => {
  const { employeeId, leaveTypeId } = req.params;
  const result = await leaveService.getLeaveLedger(employeeId, leaveTypeId, req.query);
  ok(res, { message: 'Leave ledger fetched successfully', data: result.data, meta: result.meta, currentBalance: result.currentBalance });
});

const getLeaveLedgerEntryById = catchAsync(async (req, res) => {
  const entry = await leaveService.getLeaveLedgerEntryById(req.params.id);
  ok(res, { message: 'Ledger entry fetched successfully', data: entry });
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE ENCASHMENT
// ═════════════════════════════════════════════════════════════════════════════

const createLeaveEncashment = catchAsync(async (req, res) => {
  const encashment = await leaveService.createLeaveEncashment(req.body);
  created(res, { message: 'Leave encashment created successfully', data: encashment });
});

const getLeaveEncashments = catchAsync(async (req, res) => {
  const { data, meta } = await leaveService.getLeaveEncashments(req.query);
  ok(res, { message: 'Leave encashments fetched successfully', data, meta });
});

const getLeaveEncashmentById = catchAsync(async (req, res) => {
  const encashment = await leaveService.getLeaveEncashmentById(req.params.id);
  ok(res, { message: 'Leave encashment fetched successfully', data: encashment });
});

const submitLeaveEncashment = catchAsync(async (req, res) => {
  const encashment = await leaveService.submitLeaveEncashment(req.params.id);
  ok(res, { message: 'Leave encashment submitted for approval', data: encashment });
});

const approveLeaveEncashment = catchAsync(async (req, res) => {
  const encashment = await leaveService.approveLeaveEncashment(req.params.id);
  ok(res, { message: 'Leave encashment approved — Balance updated', data: encashment });
});

const rejectLeaveEncashment = catchAsync(async (req, res) => {
  const encashment = await leaveService.rejectLeaveEncashment(req.params.id);
  ok(res, { message: 'Leave encashment rejected', data: encashment });
});

const cancelLeaveEncashment = catchAsync(async (req, res) => {
  const encashment = await leaveService.cancelLeaveEncashment(req.params.id);
  ok(res, { message: 'Leave encashment cancelled', data: encashment });
});


// ═════════════════════════════════════════════════════════════════════════════
//  COMPLIANCE & UTILITIES
// ═════════════════════════════════════════════════════════════════════════════

const checkDate = catchAsync(async (req, res) => {
  const { date, companyId, departmentId } = req.query;
  if (!date || !companyId) throw new AppError('date and companyId are required', 422);

  const [blocked, holiday] = await Promise.all([
    leaveService.isDateBlocked(date, companyId, departmentId || null),
    leaveService.isDateHoliday(date, companyId),
  ]);

  ok(res, { message: 'Date check completed', data: { date, blocked, holiday } });
});

const validateLeaveBalance = catchAsync(async (req, res) => {
  const { employeeId, leaveTypeId, requestedDays } = req.query;
  if (!employeeId || !leaveTypeId || !requestedDays) {
    throw new AppError('employeeId, leaveTypeId and requestedDays are required', 422);
  }

  const result = await leaveService.validateLeaveBalance(employeeId, leaveTypeId, parseFloat(requestedDays));
  ok(res, { message: result.sufficient ? 'Sufficient balance' : 'Insufficient balance', data: result });
});

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

  ok(res, { message: 'Working days calculated', data: { fromDate, toDate, workingDays: days, includeHolidays: includeHolidays === 'true', includeWeekends: includeWeekends === 'true' } });
});

const expireOverdueLedgerEntries = catchAsync(async (req, res) => {
  const result = await leaveService.expireOverdueLedgerEntries();
  ok(res, { message: `${result.expired} overdue ledger entry(s) marked as expired`, data: result });
});


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════

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

const getDashboardStats = catchAsync(async (req, res) => {
  const context = await getEmployeeContext(req);
  if (!context?.companyId) throw new AppError('Employee record not found.', 400);

  const { period } = req.query;
  const stats = await leaveService.getDashboardStats(
    context.companyId, period || new Date().getFullYear().toString(),
    context.branchId || null, context.departmentId || null,
  );
  ok(res, { message: 'Dashboard stats fetched successfully', data: stats });
});

const getDashboardBalances = catchAsync(async (req, res) => {
  const context = await getEmployeeContext(req);
  if (!context?.companyId) throw new AppError('Employee record not found.', 400);

  const balances = await leaveService.getDashboardBalances(context.companyId, context.branchId || null);
  ok(res, { message: 'Dashboard balances fetched successfully', data: balances });
});

const getDashboardPendingApprovals = catchAsync(async (req, res) => {
  const context = await getEmployeeContext(req);
  if (!context?.companyId) throw new AppError('Employee record not found.', 400);

  const { limit } = req.query;
  const approvals = await leaveService.getDashboardPendingApprovals(context.companyId, {
    limit: parseInt(limit) || 4,
    branchId: context.branchId || null,
    departmentId: context.departmentId || null,
  });
  ok(res, { message: 'Pending approvals fetched successfully', data: approvals });
});

const getOnLeaveThisWeek = catchAsync(async (req, res) => {
  const context = await getEmployeeContext(req);
  if (!context?.companyId) throw new AppError('Employee record not found.', 400);

  const employees = await leaveService.getOnLeaveThisWeek(context.companyId, context.branchId || null);
  ok(res, { message: 'On-leave employees fetched successfully', data: employees });
});

const getDashboardLeaveByType = catchAsync(async (req, res) => {
  const context = await getEmployeeContext(req);
  if (!context?.companyId) throw new AppError('Employee record not found.', 400);

  const { period } = req.query;
  const byType = await leaveService.getDashboardLeaveByType(
    context.companyId, period || new Date().getFullYear().toString(), context.branchId || null,
  );
  ok(res, { message: 'Leave by type fetched successfully', data: byType });
});

const getNextHoliday = catchAsync(async (req, res) => {
  const context = await getEmployeeContext(req);
  if (!context?.companyId) throw new AppError('Employee record not found.', 400);

  const holiday = await leaveService.getNextHoliday(context.companyId);
  ok(res, { message: 'Next holiday fetched successfully', data: holiday });
});

const exportDashboard = catchAsync(async (req, res) => {
  const context = await getEmployeeContext(req);
  if (!context?.companyId) throw new AppError('Employee record not found.', 400);

  const { period } = req.query;
  const data = await leaveService.exportDashboardData(context.companyId, period || new Date().getFullYear().toString());
  ok(res, { message: 'Dashboard data exported successfully', data });
});


// ═════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE SELF-SERVICE
// ═════════════════════════════════════════════════════════════════════════════

const getMyEmployee = async (req) => {
  if (req.user?.id) {
    return Employee.findOne({
      where: { userId: req.user.id },
      attributes: ['id', 'employeeNumber', 'firstName', 'middleName', 'lastName', 'reportsToId', 'dateOfJoining', 'departmentId', 'branchId', 'companyId'],
      include: [
        { model: Department, as: 'department', attributes: ['id', 'name'] },
        { model: Branch, as: 'branch', attributes: ['id', 'name'] },
        { model: Employee, as: 'reportsTo', attributes: ['id', 'firstName', 'middleName', 'lastName', 'employeeNumber', 'dateOfJoining'] },
      ],
    });
  }
  return null;
};

const getMyLeaveSummary = catchAsync(async (req, res) => {
  const employee = await getMyEmployee(req);
  if (!employee) throw new AppError('Employee record not found. Contact HR.', 404);

  const balances = await leaveService.getLeaveBalances(employee.id);

  let activePeriod = null;
  try { activePeriod = await leaveService.getActiveLeavePeriod(employee.companyId); } catch { /* no active period */ }

  const pendingApps = await leaveService.getLeaveApplications({ employeeId: employee.id, status: 'Open', limit: 100 });
  const approvedRes = await leaveService.getLeaveApplications({ employeeId: employee.id, status: 'Approved', limit: 100 });
  const approvedThisPeriod = (approvedRes.data || []).reduce((sum, app) => sum + parseFloat(app.totalLeaveDays || 0), 0);
  const draftRes = await leaveService.getLeaveApplications({ employeeId: employee.id, status: 'Draft', limit: 100 });

  ok(res, {
    message: 'My leave summary fetched successfully',
    data: {
      employee: {
        id: employee.id,
        employeeNumber: employee.employeeNumber,
        name: `${employee.firstName} ${employee.middleName || ''} ${employee.lastName}`.trim().replace(/\s+/g, ' '),
        dateOfJoining: employee.dateOfJoining,
        department: employee.department?.name,
        branch: employee.branch?.name,
        reportsTo: employee.reportsTo ? {
          id: employee.reportsTo.id,
          name: `${employee.reportsTo.firstName} ${employee.reportsTo.middleName || ''} ${employee.reportsTo.lastName}`.trim().replace(/\s+/g, ' '),
          dateOfJoining: employee.reportsTo.dateOfJoining,
        } : null,
      },
      activePeriod: activePeriod ? { id: activePeriod.id, name: activePeriod.name, startDate: activePeriod.startDate, endDate: activePeriod.endDate } : null,
      balances: balances || [],
      pendingApplications: (pendingApps.data || []).length,
      daysTakenThisPeriod: approvedThisPeriod,
      draftCount: (draftRes.data || []).length,
    },
  });
});

const getMyLeaveApplications = catchAsync(async (req, res) => {
  const employee = await getMyEmployee(req);
  if (!employee) throw new AppError('Employee record not found. Contact HR.', 404);

  const { status, page, limit } = req.query;
  const result = await leaveService.getLeaveApplications({ employeeId: employee.id, status: status || undefined, page: page || 1, limit: limit || 20 });

  ok(res, { message: 'My leave applications fetched successfully', data: result.data, meta: result.meta });
});

const getMyLeaveCalendar = catchAsync(async (req, res) => {
  const employee = await getMyEmployee(req);
  if (!employee) throw new AppError('Employee record not found. Contact HR.', 404);

  const year = parseInt(req.query.year) || new Date().getFullYear();
  const fromDate = `${year}-01-01`;
  const toDate = `${year}-12-31`;

  const result = await leaveService.getLeaveApplications({ employeeId: employee.id, status: 'Approved', limit: 200 });
  const yearApps = (result.data || []).filter(app => app.fromDate >= fromDate && app.toDate <= toDate);

  const byMonth = {};
  yearApps.forEach(app => {
    const month = new Date(app.fromDate).getMonth();
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push({ id: app.id, fromDate: app.fromDate, toDate: app.toDate, totalLeaveDays: app.totalLeaveDays, leaveType: app.leaveType?.name || 'Unknown', status: app.status });
  });

  ok(res, {
    message: 'My leave calendar fetched successfully',
    data: { year, totalDays: yearApps.reduce((sum, app) => sum + parseFloat(app.totalLeaveDays || 0), 0), applications: yearApps.length, byMonth },
  });
});

const getMyLedger = catchAsync(async (req, res) => {
  const employee = await getMyEmployee(req);
  if (!employee) throw new AppError('Employee record not found', 404);

  const result = await leaveService.getMyLedger(employee.id, req.query);
  ok(res, { message: 'My ledger fetched successfully', data: result.data, meta: result.meta, balances: result.balances });
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

  // Leave Balance
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
  getAllLedgerEntries,
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