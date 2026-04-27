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
    message: 'Employee record created successfully — pending GM approval',
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
 * Paginated list with rich filters + RBAC scope from req.perms.
 */
const getEmployees = catchAsync(async (req, res) => {
  const permFilter = req.perms?.employeeFilter || {};

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

  // Strip confidential fields for non-HR callers
  if (req.perms && !req.perms.isHR) {
    employee = stripHRFields(employee);
  }

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
 * HR updates employee fields (no status, no promotion fields through this route).
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
 * HR changes employee lifecycle status (Active ↔ Suspended ↔ On Leave).
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
 * Used for security lockouts while HR investigates.
 */
const deactivateUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await employeeService.deactivateUser(id);

  ok(res, {
    message: result.message,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  EDUCATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/employees/:id/education
 * All education records for an employee.
 */
const getEducation = catchAsync(async (req, res) => {
  const { id } = req.params;

  const records = await employeeService.getEducation(id);

  ok(res, {
    message: 'Education records retrieved',
    data: records,
  });
});

/**
 * POST /api/employees/:id/education
 * Add a qualification record.
 */
const addEducation = catchAsync(async (req, res) => {
  const { id } = req.params;

  const record = await employeeService.addEducation(id, req.body);

  created(res, {
    message: 'Education record added',
    data: record,
  });
});

/**
 * PATCH /api/employees/:id/education/:recordId
 * Edit an education record (HR only).
 */
const updateEducation = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;

  const record = await employeeService.updateEducation(id, recordId, req.body);

  ok(res, {
    message: 'Education record updated',
    data: record,
  });
});

/**
 * DELETE /api/employees/:id/education/:recordId
 * Remove an education record.
 */
const deleteEducation = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;

  await employeeService.deleteEducation(id, recordId);

  noContent(res);
});


// ═════════════════════════════════════════════════════════════════════════════
//  EXTERNAL WORK (previous employment history)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/employees/:id/external-work
 * Full employment history for an employee.
 */
const getExternalWork = catchAsync(async (req, res) => {
  const { id } = req.params;

  let records = await employeeService.getExternalWork(id);

  // Strip HR-only fields for non-HR callers
  if (req.perms && !req.perms.isHR) {
    records = records.map(r => {
      const { referenceNotes, referenceChecked, referenceCheckedOn, ...rest } = r.toJSON();
      return rest;
    });
  }

  ok(res, {
    message: 'Employment history retrieved',
    data: records,
  });
});

/**
 * POST /api/employees/:id/external-work
 * Add a work history record.
 */
const addExternalWork = catchAsync(async (req, res) => {
  const { id } = req.params;

  const record = await employeeService.addExternalWork(id, req.body);

  created(res, {
    message: 'Work history record added',
    data: record,
  });
});

/**
 * PATCH /api/employees/:id/external-work/:recordId
 * Edit a work history record (HR only).
 */
const updateExternalWork = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;

  const record = await employeeService.updateExternalWork(id, recordId, req.body);

  ok(res, {
    message: 'Work history record updated',
    data: record,
  });
});

/**
 * DELETE /api/employees/:id/external-work/:recordId
 * Remove a work history record.
 */
const deleteExternalWork = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;

  await employeeService.deleteExternalWork(id, recordId);

  noContent(res);
});


// ═════════════════════════════════════════════════════════════════════════════
//  EMERGENCY CONTACTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/employees/:id/emergency-contacts
 * All emergency contacts for an employee.
 */
const getEmergencyContacts = catchAsync(async (req, res) => {
  const { id } = req.params;

  const contacts = await employeeService.getEmergencyContacts(id);

  ok(res, {
    message: 'Emergency contacts retrieved',
    data: contacts,
  });
});

/**
 * POST /api/employees/:id/emergency-contacts
 * Add an emergency contact.
 */
const addEmergencyContact = catchAsync(async (req, res) => {
  const { id } = req.params;

  const contact = await employeeService.addEmergencyContact(id, req.body);

  created(res, {
    message: 'Emergency contact added',
    data: contact,
  });
});

/**
 * PATCH /api/employees/:id/emergency-contacts/:recordId
 * Edit an emergency contact.
 */
const updateEmergencyContact = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;

  const contact = await employeeService.updateEmergencyContact(id, recordId, req.body);

  ok(res, {
    message: 'Emergency contact updated',
    data: contact,
  });
});

/**
 * DELETE /api/employees/:id/emergency-contacts/:recordId
 * Remove an emergency contact.
 */
const deleteEmergencyContact = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;

  await employeeService.deleteEmergencyContact(id, recordId);

  noContent(res);
});

/**
 * PATCH /api/employees/:id/emergency-contacts/:recordId/primary
 * Atomically set one contact as primary (unsets all others).
 */
const setPrimaryContact = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;

  const contact = await employeeService.setPrimaryContact(id, recordId);

  ok(res, {
    message: 'Primary emergency contact updated',
    data: contact,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  SKILL MAP
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/employees/:id/skill-map
 * Fetch the skill map record.
 */
const getSkillMap = catchAsync(async (req, res) => {
  const { id } = req.params;

  const map = await employeeService.getSkillMap(id);

  ok(res, {
    message: 'Skill map retrieved',
    data: map,
  });
});

/**
 * PUT /api/employees/:id/skill-map
 * Create or fully replace the skill map.
 */
const upsertSkillMap = catchAsync(async (req, res) => {
  const { id } = req.params;

  const map = await employeeService.upsertSkillMap(id, req.body);

  ok(res, {
    message: 'Skill map saved',
    data: map,
  });
});

/**
 * POST /api/employees/:id/skill-map/skills
 * Append one skill to the skills array.
 */
const addSkill = catchAsync(async (req, res) => {
  const { id } = req.params;

  const map = await employeeService.addSkill(id, req.body);

  created(res, {
    message: 'Skill added',
    data: map,
  });
});

/**
 * DELETE /api/employees/:id/skill-map/skills/:skillName
 * Remove a skill by name.
 */
const removeSkill = catchAsync(async (req, res) => {
  const { id, skillName } = req.params;

  const map = await employeeService.removeSkill(id, decodeURIComponent(skillName));

  ok(res, {
    message: 'Skill removed',
    data: map,
  });
});

/**
 * POST /api/employees/:id/skill-map/certifications
 * Append a certification.
 */
const addCertification = catchAsync(async (req, res) => {
  const { id } = req.params;

  const map = await employeeService.addCertification(id, req.body);

  created(res, {
    message: 'Certification added',
    data: map,
  });
});

/**
 * POST /api/employees/:id/skill-map/trainings
 * Append a training record.
 */
const addTraining = catchAsync(async (req, res) => {
  const { id } = req.params;

  const map = await employeeService.addTraining(id, req.body);

  created(res, {
    message: 'Training added',
    data: map,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  SEPARATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/employees/:id/separation
 * HR initiates a separation record (Draft).
 */
const initiateSeparation = catchAsync(async (req, res) => {
  const { id } = req.params;

  const separation = await employeeService.initiateSeparation(id, req.body);

  created(res, {
    message: 'Separation initiated — Draft',
    data: separation,
  });
});

/**
 * POST /api/employees/:id/separation/submit
 * HR submits the separation for GM approval.
 */
const submitSeparation = catchAsync(async (req, res) => {
  const { id } = req.params;

  const separation = await employeeService.submitSeparation(id);

  ok(res, {
    message: 'Separation submitted for approval',
    data: separation,
  });
});

/**
 * POST /api/employees/:id/separation/approve
 * GM approves separation → Employee status = Exit, User deactivated.
 */
const approveSeparation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const approverUserId = req.user.id;

  const separation = await employeeService.approveSeparation(id, approverUserId, req.body);

  ok(res, {
    message: 'Separation approved — Employee exited',
    data: separation,
  });
});

/**
 * POST /api/employees/:id/separation/reject
 * GM rejects separation → back to Draft.
 */
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

/**
 * PATCH /api/employees/:id/separation/clearance
 * HR updates the clearance checklist.
 */
const updateClearanceTasks = catchAsync(async (req, res) => {
  const { id } = req.params;

  const separation = await employeeService.updateClearanceTasks(id, req.body);

  ok(res, {
    message: 'Clearance tasks updated',
    data: separation,
  });
});

/**
 * POST /api/employees/:id/separation/settle
 * HR marks full-and-final settlement complete.
 */
const settleFullAndFinal = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { encashmentDate } = req.body;

  const separation = await employeeService.settleFullAndFinal(id, encashmentDate);

  ok(res, {
    message: 'Full and final settlement recorded — Separation completed',
    data: separation,
  });
});


// ═════════════════════════════════════════════════════════════════════════════
//  PROMOTIONS — READ ONLY
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/employees/:id/promotions
 * All promotion/demotion records for an employee (read-only).
 */
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

/**
 * Strips HR-only fields from an employee record for non-HR callers.
 * Called on getEmployeeById when req.perms.isHR is false.
 */
const stripHRFields = (employee) => {
  const plain = employee.toJSON ? employee.toJSON() : { ...employee };

  // Remove confidential reference-check fields from external work
  if (plain.EmployeeExternalWorks) {
    plain.EmployeeExternalWorks = plain.EmployeeExternalWorks.map(w => {
      const { referenceNotes, referenceChecked, referenceCheckedOn, ...rest } = w;
      return rest;
    });
  }

  // Remove exit interview notes from separation
  if (plain.EmployeeSeparations) {
    plain.EmployeeSeparations = plain.EmployeeSeparations.map(s => {
      const { exitRemarks, wouldRehire, exitInterviewDate, ...rest } = s;
      return rest;
    });
  }

  // Remove financial/strictly-HR fields
  delete plain.nationalId;
  delete plain.passportNumber;
  delete plain.taxId;
  delete plain.socialSecurityNumber;
  delete plain.bankName;
  delete plain.bankAccountNumber;
  delete plain.bankBranch;
  delete plain.bankCode;
  delete plain.mobileMoneyNumber;
  delete plain.customFields;
  delete plain.leaveApprovedById;
  delete plain.expenseApprovedById;

  return plain;
};


// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Core profile
  createEmployee,
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
  setPrimaryContact,

  // Skill map
  getSkillMap,
  upsertSkillMap,
  addSkill,
  removeSkill,
  addCertification,
  addTraining,

  // Separation
  initiateSeparation,
  submitSeparation,
  approveSeparation,
  rejectSeparation,
  updateClearanceTasks,
  settleFullAndFinal,

  // Promotions (read-only)
  getPromotionHistory,
};