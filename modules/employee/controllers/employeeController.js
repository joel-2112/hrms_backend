"use strict";

const { catchAsync } = require("../../../utils/catchAsync");
const { ok, created, noContent } = require("../../../utils/response");
const { AppError } = require("../../../middlewares/errorMiddleware");
const employeeService = require("../services/employeeService");

// ═════════════════════════════════════════════════════════════════════════════
//  CORE PROFILE
// ═════════════════════════════════════════════════════════════════════════════

const createEmployee = catchAsync(async (req, res) => {
  const employee = await employeeService.createEmployee(req.body);
  created(res, {
    message: "Employee record created — pending GM approval",
    data: employee,
  });
});

const updateAvatar = catchAsync(async (req, res) => {
  if (!req.file) throw new AppError("No image file uploaded", 422);
  const { id } = req.params;
  const { getRelativePath } = require("../../../middlewares/uploadMiddleware");
  const filePath = getRelativePath(req.file);
  const employee = await employeeService.updateAvatar(id, filePath);
  ok(res, { message: "Profile photo updated successfully", data: employee });
});

const createEmployeeFromExistingUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const employee = await employeeService.createEmployeeFromExistingUser(
    userId,
    req.body,
  );
  created(res, {
    message: "Employee record created from existing User — Active immediately",
    data: employee,
  });
});

const approveEmployee = catchAsync(async (req, res) => {
  const { id } = req.params;
  const approverUserId = req.user.id;
  const result = await employeeService.approveEmployee(id, approverUserId);
  ok(res, {
    message: "Employee approved — User account provisioned",
    data: {
      employee: result.employee,
      temporaryPassword: result.temporaryPassword,
    },
  });
});

const getEmployees = catchAsync(async (req, res) => {
  const permFilter = req.perms?.dataFilter || {};
  const { data, meta } = await employeeService.getEmployees(
    req.query,
    permFilter,
  );
  ok(res, { message: "Employees retrieved successfully", data, meta });
});

const getEmployeeById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const employee = await employeeService.getEmployeeById(id);
  ok(res, { message: "Employee retrieved successfully", data: employee });
});

const getMyProfile = catchAsync(async (req, res) => {
  const employee = await employeeService.getMyProfile(req.user.id);
  ok(res, { message: "Profile retrieved successfully", data: employee });
});

const updateEmployee = catchAsync(async (req, res) => {
  const { id } = req.params;
  const employee = await employeeService.updateEmployee(id, req.body);
  ok(res, { message: "Employee updated successfully", data: employee });
});

const updateEmployeeStatus = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;
  const changedByUserId = req.user.id;
  if (!status) throw new AppError("status is required", 422);
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

const searchEmployees = catchAsync(async (req, res) => {
  const { q, companyId, status, limit } = req.query;
  const results = await employeeService.searchEmployees(q, {
    companyId: companyId || undefined,
    status: status || undefined,
    limit: limit ? parseInt(limit, 10) : 20,
  });
  ok(res, {
    message: "Search results",
    data: results,
    meta: { total: results.length },
  });
});

const getOrgChart = catchAsync(async (req, res) => {
  const { id } = req.params;
  const maxDepth = req.query.maxDepth ? parseInt(req.query.maxDepth, 10) : 4;
  const chart = await employeeService.getOrgChart(id, 0, maxDepth);
  ok(res, { message: "Organisation chart retrieved", data: chart });
});

const getDirectReports = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { data, meta } = await employeeService.getDirectReports(id, req.query);
  ok(res, { message: "Direct reports retrieved", data, meta });
});

const deactivateUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await employeeService.deactivateUser(id);
  ok(res, { message: result.message });
});

const activateUser = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await employeeService.activateUser(id);
  ok(res, { message: result.message });
});

// ═════════════════════════════════════════════════════════════════════════════
//  EDUCATION
// ═════════════════════════════════════════════════════════════════════════════

const getEducation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const records = await employeeService.getEducation(id);
  ok(res, { message: "Education records retrieved", data: records });
});

const addEducation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const record = await employeeService.addEducation(id, req.body);
  created(res, { message: "Education record added", data: record });
});

const updateEducation = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;
  const record = await employeeService.updateEducation(id, recordId, req.body);
  ok(res, { message: "Education record updated", data: record });
});

const deleteEducation = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;
  await employeeService.deleteEducation(id, recordId);
  noContent(res);
});
// ═════════════════════════════════════════════════════════════════════════════
//  EDUCATION LEVELS (standalone)
// ═════════════════════════════════════════════════════════════════════════════

const getEducationLevels = catchAsync(async (req, res) => {
  const levels = await employeeService.getEducationLevels();
  ok(res, { message: "Education levels retrieved", data: levels });
});

const createEducationLevel = catchAsync(async (req, res) => {
  const level = await employeeService.createEducationLevel(req.body);
  created(res, { message: "Education level created", data: level });
});

// ═════════════════════════════════════════════════════════════════════════════
//  EXTERNAL WORK
// ═════════════════════════════════════════════════════════════════════════════

const getExternalWork = catchAsync(async (req, res) => {
  const { id } = req.params;
  const records = await employeeService.getExternalWork(id);
  ok(res, { message: "Employment history retrieved", data: records });
});

const addExternalWork = catchAsync(async (req, res) => {
  const { id } = req.params;
  const record = await employeeService.addExternalWork(id, req.body);
  created(res, { message: "Work history record added", data: record });
});

const updateExternalWork = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;
  const record = await employeeService.updateExternalWork(
    id,
    recordId,
    req.body,
  );
  ok(res, { message: "Work history record updated", data: record });
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
  ok(res, { message: "Emergency contacts retrieved", data: contacts });
});

const addEmergencyContact = catchAsync(async (req, res) => {
  const { id } = req.params;
  const contact = await employeeService.addEmergencyContact(id, req.body);
  created(res, { message: "Emergency contact added", data: contact });
});

const updateEmergencyContact = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;
  const contact = await employeeService.updateEmergencyContact(
    id,
    recordId,
    req.body,
  );
  ok(res, { message: "Emergency contact updated", data: contact });
});

const deleteEmergencyContact = catchAsync(async (req, res) => {
  const { id, recordId } = req.params;
  await employeeService.deleteEmergencyContact(id, recordId);
  noContent(res);
});

// ═════════════════════════════════════════════════════════════════════════════
//  SKILL MAP & LANGUAGES
// ═════════════════════════════════════════════════════════════════════════════

const getSkillMap = catchAsync(async (req, res) => {
  const { id } = req.params;
  const map = await employeeService.getSkillMap(id);
  ok(res, { message: "Skill map retrieved", data: map });
});

const upsertSkillMap = catchAsync(async (req, res) => {
  const { id } = req.params;
  const map = await employeeService.upsertSkillMap(id, req.body);
  ok(res, { message: "Skill map saved", data: map });
});

const getLanguages = catchAsync(async (req, res) => {
  const { id } = req.params;
  const languages = await employeeService.getLanguages(id);
  ok(res, { message: "Languages retrieved", data: languages });
});

const addLanguage = catchAsync(async (req, res) => {
  const { id } = req.params;
  const language = await employeeService.addLanguage(id, req.body);
  created(res, { message: "Language added", data: language });
});

const deleteLanguage = catchAsync(async (req, res) => {
  const { id, languageId } = req.params;
  await employeeService.deleteLanguage(id, languageId);
  noContent(res);
});

// ═════════════════════════════════════════════════════════════════════════════
//  SEPARATION
// ═════════════════════════════════════════════════════════════════════════════

const initiateSeparation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const separation = await employeeService.initiateSeparation(id, req.body);
  created(res, { message: "Separation initiated — Draft", data: separation });
});

const submitSeparation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const separation = await employeeService.submitSeparation(id);
  ok(res, { message: "Separation submitted for approval", data: separation });
});

const approveSeparation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const approverUserId = req.user.id;
  const separation = await employeeService.approveSeparation(
    id,
    approverUserId,
    req.body,
  );
  ok(res, {
    message: "Separation approved — Employee exited",
    data: separation,
  });
});

const rejectSeparation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const approverUserId = req.user.id;
  const { reason } = req.body;
  const separation = await employeeService.rejectSeparation(
    id,
    approverUserId,
    reason,
  );
  ok(res, { message: "Separation rejected", data: separation });
});

// ═════════════════════════════════════════════════════════════════════════════
//  PROMOTIONS — READ ONLY
// ═════════════════════════════════════════════════════════════════════════════

const getPromotionHistory = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { data, meta } = await employeeService.getPromotionHistory(
    id,
    req.query,
  );
  ok(res, { message: "Promotion history retrieved", data, meta });
});

// ═════════════════════════════════════════════════════════════════════════════
//  DASHBOARD & STATISTICS
// ═════════════════════════════════════════════════════════════════════════════

const getEmployeeStats = catchAsync(async (req, res) => {
  const { companyId } = req.query;
  const permFilter = req.perms?.dataFilter || {};
  const stats = await employeeService.getEmployeeStats(companyId, permFilter);
  ok(res, { message: "Employee statistics retrieved", data: stats });
});

const getUpcomingBirthdays = catchAsync(async (req, res) => {
  const { companyId } = req.query;
  const permFilter = req.perms?.dataFilter || {};
  const birthdays = await employeeService.getUpcomingBirthdays(
    companyId,
    permFilter,
  );
  ok(res, { message: "Upcoming birthdays retrieved", data: birthdays });
});

const getWorkAnniversaries = catchAsync(async (req, res) => {
  const { companyId } = req.query;
  const permFilter = req.perms?.dataFilter || {};
  const anniversaries = await employeeService.getWorkAnniversaries(
    companyId,
    permFilter,
  );
  ok(res, { message: "Work anniversaries retrieved", data: anniversaries });
});

const getRecentlyJoined = catchAsync(async (req, res) => {
  const { companyId, limit } = req.query;
  const permFilter = req.perms?.dataFilter || {};
  const employees = await employeeService.getRecentlyJoined(
    companyId,
    limit ? parseInt(limit, 10) : 10,
    permFilter,
  );
  ok(res, { message: "Recently joined employees retrieved", data: employees });
});

// ═════════════════════════════════════════════════════════════════════════════
//  FILTER OPTIONS
// ═════════════════════════════════════════════════════════════════════════════

const getFilterOptions = catchAsync(async (req, res) => {
  const { companyId } = req.query;
  const options = await employeeService.getFilterOptions(companyId);
  ok(res, { message: "Filter options retrieved", data: options });
});

// ═════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE TIMELINE
// ═════════════════════════════════════════════════════════════════════════════

const getEmployeeTimeline = catchAsync(async (req, res) => {
  const { id } = req.params;
  const timeline = await employeeService.getEmployeeTimeline(id);
  ok(res, { message: "Employee timeline retrieved", data: timeline });
});

// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
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
  updateAvatar,

  getEducation,
  addEducation,
  updateEducation,
  deleteEducation,
  getEducationLevels,
  createEducationLevel,

  getExternalWork,
  addExternalWork,
  updateExternalWork,
  deleteExternalWork,

  getEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,

  getSkillMap,
  upsertSkillMap,
  getLanguages,
  addLanguage,
  deleteLanguage,

  initiateSeparation,
  submitSeparation,
  approveSeparation,
  rejectSeparation,

  getPromotionHistory,

  getEmployeeStats,
  getUpcomingBirthdays,
  getWorkAnniversaries,
  getRecentlyJoined,
  getFilterOptions,
  getEmployeeTimeline,
};
