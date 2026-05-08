'use strict';

/**
 * modules/employee/controllers/employeeController.js
 *
 * Thin controller layer — delegates all business logic to employeeService.
 *
 * Responsibilities:
 *   — Extract params / query / body from req
 *   — Call the correct service function
 *   — Return a standardised JSON response via response helpers
 *
 * Every handler is wrapped with catchAsync so unhandled rejections
 * are forwarded to the global error middleware automatically.
 */

const { catchAsync } = require('../../../utils/catchAsync');
const { ok, created, noContent } = require('../../../utils/response');
const { AppError } = require('../../../middlewares/errorMiddleware');
const employeeService = require('../services/employeeService');

// ═════════════════════════════════════════════════════════════════════════════
//  CORE PROFILE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/employees
 * HR creates a new employee record (status = Inactive, pending GM approval).
 */
const createEmployee = catchAsync(async (req, res) => {
  const employee = await employeeService.createEmployee(req.body);

  created(res, {
    message: 'Employee record created — pending GM approval',
    data: employee,
  });
});
/**
 * PUT /api/employees/:id/avatar
 * Upload employee profile photo
 */
const updateAvatar = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('No image file uploaded', 422);
  }

  const { id } = req.params;
  const { getRelativePath } = require('../../../middlewares/uploadMiddleware');
  const filePath = getRelativePath(req.file);

  const employee = await employeeService.updateAvatar(id, filePath);

  ok(res, {
    message: 'Profile photo updated successfully',
    data: employee,
  });
});
/**
 * POST /api/employees/from-user/:userId
 * Create Employee from existing User account.
 */
const createEmployeeFromExistingUser = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const employee = await employeeService.createEmployeeFromExistingUser(userId, req.body);

  created(res, {
    message: 'Employee record created from existing User — Active immediately',
    data: employee,
  });
});

/**
 * POST /api/employees/:id/approve
 * GM approves a pending employee → User account provisioned, status → Active.
 */
const approveEmployee = catchAsync(async (req, res) => {
  const { id } = req.params;
  const approverUserId = req.user.id;

  const result = await employeeService.approveEmployee(id, approverUserId);

  ok(res, {
    message: 'Employee approved — User account provisioned',
    data: {
      employee: result.employee,
      temporaryPassword: result.temporaryPassword,
    },
  });
});

/**
 * GET /api/employees
 * Paginated list with rich filters + RBAC scope.
 */
const getEmployees = catchAsync(async (req, res) => {
  const permFilter = req.perms?.dataFilter || {};

  const { data, meta } = await employeeService.getEmployees(req.query, permFilter);

  ok(res, {
    message: 'Employees retrieved successfully',
    data,
    meta,
  });
});

/**
 * GET /api/employees/:id
 * Full employee profile — all sub-records included.
 */
const getEmployeeById = catchAsync(async (req, res) => {
  const { id } = req.params;

  let employee = await employeeService.getEmployeeById(id);
  ok(res, {
    message: 'Employee retrieved successfully',
    data: employee,
  });
});

/**
 * GET /api/employees/me
 * Self-service — employee reads their own profile.
 */
const getMyProfile = catchAsync(async (req, res) => {
  const employee = await employeeService.getMyProfile(req.user.id);

  ok(res, {
    message: 'Profile retrieved successfully',
    data: employee,
  });
});

/**
 * PATCH /api/employees/:id
 * HR updates employee fields.
 */
const updateEmployee = catchAsync(async (req, res) => {
  const { id } = req.params;

  const employee = await employeeService.updateEmployee(id, req.body);

  ok(res, {
    message: 'Employee updated successfully',
    data: employee,
  });
});

/**
 * PATCH /api/employees/:id/status
 * HR changes employee lifecycle status.
 */
const updateEmployeeStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const changedByUserId = req.user.id;

  if (!status) {
    throw new AppError('status is required', 422);
  }

  const employee = await employeeService.updateEmployeeStatus(
    id,
    status,
    reason || null,
    changedByUserId,
  );

  ok(res, {
    message: `Employee status changed to '${status}'`,
    data: employee,
  });
});

/**
 * GET /api/employees/search
 * Full-text search — autocomplete / quick-search widget.
 */
const searchEmployees = catchAsync(async (req, res) => {
  const { q, companyId, status, limit } = req.query;

  const results = await employeeService.searchEmployees(q, {
    companyId: companyId || undefined,
    status: status || undefined,
    limit: limit ? parseInt(limit, 10) : 20,
  });

  ok(res, {
    message: 'Search results',
    data: results,
    meta: { total: results.length },
  });
});

/**
 * GET /api/employees/:id/org-chart
 * Returns the organisation chart tree rooted at the given employee.
 */
const getOrgChart = catchAsync(async (req, res) => {
  const { id } = req.params;
  const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth, 10) : 4;

  const chart = await employeeService.getOrgChart(id, 0, maxDepth);

  ok(res, {
    message: 'Organisation chart retrieved',
    data: chart,
  });
});

/**
 * GET /api/employees/:id/direct-reports
 * Flat paginated list of employees reporting to the given manager.
 */
const getDirectReports = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { data, meta } = await employeeService.getDirectReports(id, req.query);

  ok(res, {
    message: 'Direct reports retrieved',
    data,
    meta,
  });
});

/**
 * POST /api/employees/:id/deactivate-user
 * Suspends the linked User account without changing employee status.
 */
const deactivateUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await employeeService.deactivateUser(id);

  ok(res, {
    message: result.message,
  });
});

/**
 * POST /api/employees/:id/activate-user
 * Reactivates the linked User account.
 */
const activateUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await employeeService.activateUser(id);

  ok(res, {
    message: result.message,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  EDUCATION
// ═════════════════════════════════════════════════════════════════════════════

const getEducation = catchAsync(async (req, res) => {
  const { id } = req.params;

  const records = await employeeService.getEducation(id);

  ok(res, {
    message: 'Education records retrieved',
    data: records,
  });
});

const addEducation = catchAsync(async (req, res) => {
  const { id } = req.params;

  const record = await employeeService.addEducation(id, req.body);

  created(res, {
    message: 'Education record added',
    data: record,
  });
});

const updateEducation = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;

  const record = await employeeService.updateEducation(id, recordId, req.body);

  ok(res, {
    message: 'Education record updated',
    data: record,
  });
});

const deleteEducation = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;

  await employeeService.deleteEducation(id, recordId);

  noContent(res);
});


// ═════════════════════════════════════════════════════════════════════════════
//  EXTERNAL WORK (previous employment history)
// ═════════════════════════════════════════════════════════════════════════════

const getExternalWork = catchAsync(async (req, res) => {
  const { id } = req.params;

  const records = await employeeService.getExternalWork(id);

  ok(res, {
    message: 'Employment history retrieved',
    data: records,
  });
});

const addExternalWork = catchAsync(async (req, res) => {
  const { id } = req.params;

  const record = await employeeService.addExternalWork(id, req.body);

  created(res, {
    message: 'Work history record added',
    data: record,
  });
});

const updateExternalWork = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;

  const record = await employeeService.updateExternalWork(id, recordId, req.body);

  ok(res, {
    message: 'Work history record updated',
    data: record,
  });
});

const deleteExternalWork = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;

  await employeeService.deleteExternalWork(id, recordId);

  noContent(res);
});


// ═════════════════════════════════════════════════════════════════════════════
//  EMERGENCY CONTACTS
// ═════════════════════════════════════════════════════════════════════════════

const getEmergencyContacts = catchAsync(async (req, res) => {
  const { id } = req.params;

  const contacts = await employeeService.getEmergencyContacts(id);

  ok(res, {
    message: 'Emergency contacts retrieved',
    data: contacts,
  });
});

const addEmergencyContact = catchAsync(async (req, res) => {
  const { id } = req.params;

  const contact = await employeeService.addEmergencyContact(id, req.body);

  created(res, {
    message: 'Emergency contact added',
    data: contact,
  });
});

const updateEmergencyContact = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;

  const contact = await employeeService.updateEmergencyContact(id, recordId, req.body);

  ok(res, {
    message: 'Emergency contact updated',
    data: contact,
  });
});

const deleteEmergencyContact = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;

  await employeeService.deleteEmergencyContact(id, recordId);

  noContent(res);
});


// ═════════════════════════════════════════════════════════════════════════════
//  SKILL MAP
// ═════════════════════════════════════════════════════════════════════════════

const getSkillMap = catchAsync(async (req, res) => {
  const { id } = req.params;

  const map = await employeeService.getSkillMap(id);

  ok(res, {
    message: 'Skill map retrieved',
    data: map,
  });
});

const upsertSkillMap = catchAsync(async (req, res) => {
  const { id } = req.params;

  const map = await employeeService.upsertSkillMap(id, req.body);

  ok(res, {
    message: 'Skill map saved',
    data: map,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  SEPARATION
// ═════════════════════════════════════════════════════════════════════════════

const initiateSeparation = catchAsync(async (req, res) => {
  const { id } = req.params;

  const separation = await employeeService.initiateSeparation(id, req.body);

  created(res, {
    message: 'Separation initiated — Draft',
    data: separation,
  });
});

const submitSeparation = catchAsync(async (req, res) => {
  const { id } = req.params;

  const separation = await employeeService.submitSeparation(id);

  ok(res, {
    message: 'Separation submitted for approval',
    data: separation,
  });
});

const approveSeparation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const approverUserId = req.user.id;

  const separation = await employeeService.approveSeparation(id, approverUserId, req.body);

  ok(res, {
    message: 'Separation approved — Employee exited',
    data: separation,
  });
});

const rejectSeparation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const approverUserId = req.user.id;
  const { reason } = req.body;

  const separation = await employeeService.rejectSeparation(id, approverUserId, reason);

  ok(res, {
    message: 'Separation rejected',
    data: separation,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  PROMOTIONS — READ ONLY
// ═════════════════════════════════════════════════════════════════════════════

const getPromotionHistory = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { data, meta } = await employeeService.getPromotionHistory(id, req.query);

  ok(res, {
    message: 'Promotion history retrieved',
    data,
    meta,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  INTERNAL HELPERS
// ═════════════════════════════════════════════════════════════════════════════


// ═════════════════════════════════════════════════════════════════════════════
//  DASHBOARD & STATISTICS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/employees/stats
 * Dashboard statistics with RBAC data scope.
 */
const getEmployeeStats = catchAsync(async (req, res) => {
  const { companyId } = req.query;
  const permFilter = req.perms?.dataFilter || {};

  const stats = await employeeService.getEmployeeStats(companyId, permFilter);

  ok(res, {
    message: 'Employee statistics retrieved',
    data: stats,
  });
});
/**
 * GET /api/employees/birthdays
 * Upcoming birthdays this month.
 */
const getUpcomingBirthdays = catchAsync(async (req, res) => {
  const { companyId } = req.query;
  const permFilter = req.perms?.dataFilter || {};

  const birthdays = await employeeService.getUpcomingBirthdays(companyId, permFilter);

  ok(res, {
    message: 'Upcoming birthdays retrieved',
    data: birthdays,
  });
});

/**
 * GET /api/employees/anniversaries
 * Work anniversaries this month with RBAC data scope.
 */
const getWorkAnniversaries = catchAsync(async (req, res) => {
  const { companyId } = req.query;
  const permFilter = req.perms?.dataFilter || {};

  const anniversaries = await employeeService.getWorkAnniversaries(companyId, permFilter);

  ok(res, {
    message: 'Work anniversaries retrieved',
    data: anniversaries,
  });
});

/**
 * GET /api/employees/recently-joined
 * Recently joined employees (last 30 days) with RBAC data scope.
 */
const getRecentlyJoined = catchAsync(async (req, res) => {
  const { companyId, limit } = req.query;
  const permFilter = req.perms?.dataFilter || {};

  const employees = await employeeService.getRecentlyJoined(
    companyId,
    limit ? parseInt(limit, 10) : 10,
    permFilter,
  );

  ok(res, {
    message: 'Recently joined employees retrieved',
    data: employees,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  FILTER OPTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/employees/filter-options
 * Distinct values for filter dropdowns.
 */
const getFilterOptions = catchAsync(async (req, res) => {
  const { companyId } = req.query;

  const options = await employeeService.getFilterOptions(companyId);

  ok(res, {
    message: 'Filter options retrieved',
    data: options,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE TIMELINE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/employees/:id/timeline
 * Employee activity timeline.
 */
const getEmployeeTimeline = catchAsync(async (req, res) => {
  const { id } = req.params;

  const timeline = await employeeService.getEmployeeTimeline(id);

  ok(res, {
    message: 'Employee timeline retrieved',
    data: timeline,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Core profile
  createEmployee,
  createEmployeeFromExistingUser,
  approveEmployee,
  getEmployees,
  getEmployeeById,
  getMyProfile,
  updateEmployee,
  updateEmployeeStatus,
  searchEmployees,
  getOrgChart,
  getDirectReports,
  deactivateUser,
  activateUser,

  // Education
  getEducation,
  addEducation,
  updateEducation,
  deleteEducation,

  // External work
  getExternalWork,
  addExternalWork,
  updateExternalWork,
  deleteExternalWork,

  // Emergency contacts
  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,

  // Skill map
  getSkillMap,
  upsertSkillMap,

  // Separation
  initiateSeparation,
  submitSeparation,
  approveSeparation,
  rejectSeparation,

  // Promotions (read-only)
  getPromotionHistory,

    // Dashboard & Stats
  getEmployeeStats,
  getUpcomingBirthdays,
  getWorkAnniversaries,
  getRecentlyJoined,

  // Filters
  getFilterOptions,
updateAvatar,
  // Timeline
  getEmployeeTimeline,
};