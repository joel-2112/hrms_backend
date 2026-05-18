'use strict';

const organizationService = require('../services/organizationService');
const { catchAsync } = require('../../../utils/catchAsync');
const { ok, created, noContent } = require('../../../utils/response');
const { AppError } = require('../../../middlewares/errorMiddleware');

// ══════════════════════════════════════════════
//  COMPANY
// ══════════════════════════════════════════════

const createCompany = catchAsync(async (req, res) => {
  const company = await organizationService.createCompany(req.body);
  created(res, { message: 'Company created successfully', data: company });
});

const getAllCompanies = catchAsync(async (req, res) => {
  const { includeDisabled, parentCompanyId } = req.query;
  const companies = await organizationService.getAllCompanies({
    includeDisabled: includeDisabled === 'true',
    parentCompanyId: parentCompanyId || undefined,
  });
  ok(res, { message: 'Companies fetched successfully', data: companies });
});

const getCompanyById = catchAsync(async (req, res) => {
  const company = await organizationService.getCompanyById(req.params.id);
  ok(res, { message: 'Company fetched successfully', data: company });
});

const updateCompany = catchAsync(async (req, res) => {
  const company = await organizationService.updateCompany(req.params.id, req.body);
  ok(res, { message: 'Company updated successfully', data: company });
});

const deleteCompany = catchAsync(async (req, res) => {
  await organizationService.deleteCompany(req.params.id);
  noContent(res);
});

const getCompanyTree = catchAsync(async (req, res) => {
  const { rootId } = req.query;
  const tree = await organizationService.getCompanyTree(rootId || null);
  ok(res, { message: 'Company tree fetched successfully', data: tree });
});

// ══════════════════════════════════════════════
//  BRANCH
// ══════════════════════════════════════════════

const createBranch = catchAsync(async (req, res) => {
  const branch = await organizationService.createBranch(req.body);
  created(res, { message: 'Branch created successfully', data: branch });
});

const getAllBranches = catchAsync(async (req, res) => {
  const { companyId, includeDisabled } = req.query;
  const branches = await organizationService.getAllBranches({ companyId, includeDisabled: includeDisabled === 'true' });
  ok(res, { message: 'Branches fetched successfully', data: branches });
});

const getBranchById = catchAsync(async (req, res) => {
  const branch = await organizationService.getBranchById(req.params.id);
  ok(res, { message: 'Branch fetched successfully', data: branch });
});

const updateBranch = catchAsync(async (req, res) => {
  const branch = await organizationService.updateBranch(req.params.id, req.body);
  ok(res, { message: 'Branch updated successfully', data: branch });
});

const deleteBranch = catchAsync(async (req, res) => {
  await organizationService.deleteBranch(req.params.id);
  noContent(res);
});

// ══════════════════════════════════════════════
//  DEPARTMENT
// ══════════════════════════════════════════════

const createDepartment = catchAsync(async (req, res) => {
  const department = await organizationService.createDepartment(req.body);
  created(res, { message: 'Department created successfully', data: department });
});

const getAllDepartments = catchAsync(async (req, res) => {
  const { companyId, parentDepartmentId, includeDisabled } = req.query;
  const departments = await organizationService.getAllDepartments({
    companyId,
    parentDepartmentId: parentDepartmentId || undefined,
    includeDisabled: includeDisabled === 'true',
  });
  ok(res, { message: 'Departments fetched successfully', data: departments });
});

const getDepartmentById = catchAsync(async (req, res) => {
  const department = await organizationService.getDepartmentById(req.params.id);
  ok(res, { message: 'Department fetched successfully', data: department });
});

const updateDepartment = catchAsync(async (req, res) => {
  const department = await organizationService.updateDepartment(req.params.id, req.body);
  ok(res, { message: 'Department updated successfully', data: department });
});

const deleteDepartment = catchAsync(async (req, res) => {
  await organizationService.deleteDepartment(req.params.id);
  noContent(res);
});

const getDepartmentTree = catchAsync(async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) throw new AppError('companyId query parameter is required', 400);
  const tree = await organizationService.getDepartmentTree(companyId);
  ok(res, { message: 'Department tree fetched successfully', data: tree });
});

// ══════════════════════════════════════════════
//  DESIGNATION
// ══════════════════════════════════════════════

const createDesignation = catchAsync(async (req, res) => {
  const designation = await organizationService.createDesignation(req.body);
  created(res, { message: 'Designation created successfully', data: designation });
});

const getAllDesignations = catchAsync(async (req, res) => {
  const { includeDisabled, search } = req.query;
  const designations = await organizationService.getAllDesignations({
    includeDisabled: includeDisabled === 'true', search,
  });
  ok(res, { message: 'Designations fetched successfully', data: designations });
});

const getDesignationById = catchAsync(async (req, res) => {
  const designation = await organizationService.getDesignationById(req.params.id);
  ok(res, { message: 'Designation fetched successfully', data: designation });
});

const updateDesignation = catchAsync(async (req, res) => {
  const designation = await organizationService.updateDesignation(req.params.id, req.body);
  ok(res, { message: 'Designation updated successfully', data: designation });
});

const deleteDesignation = catchAsync(async (req, res) => {
  await organizationService.deleteDesignation(req.params.id);
  noContent(res);
});

// ══════════════════════════════════════════════
//  EMPLOYMENT TYPE
// ══════════════════════════════════════════════

const createEmploymentType = catchAsync(async (req, res) => {
  const employmentType = await organizationService.createEmploymentType(req.body);
  created(res, { message: 'Employment type created successfully', data: employmentType });
});

const getAllEmploymentTypes = catchAsync(async (req, res) => {
  const { includeDisabled } = req.query;
  const employmentTypes = await organizationService.getAllEmploymentTypes({ includeDisabled: includeDisabled === 'true' });
  ok(res, { message: 'Employment types fetched successfully', data: employmentTypes });
});

const getEmploymentTypeById = catchAsync(async (req, res) => {
  const employmentType = await organizationService.getEmploymentTypeById(req.params.id);
  ok(res, { message: 'Employment type fetched successfully', data: employmentType });
});

const updateEmploymentType = catchAsync(async (req, res) => {
  const employmentType = await organizationService.updateEmploymentType(req.params.id, req.body);
  ok(res, { message: 'Employment type updated successfully', data: employmentType });
});

const deleteEmploymentType = catchAsync(async (req, res) => {
  await organizationService.deleteEmploymentType(req.params.id);
  noContent(res);
});

// ══════════════════════════════════════════════
//  EMPLOYEE GRADE
// ══════════════════════════════════════════════

const createEmployeeGrade = catchAsync(async (req, res) => {
  const grade = await organizationService.createEmployeeGrade(req.body);
  created(res, { message: 'Employee grade created successfully', data: grade });
});

const getAllEmployeeGrades = catchAsync(async (req, res) => {
  const { includeDisabled } = req.query;
  const grades = await organizationService.getAllEmployeeGrades({ includeDisabled: includeDisabled === 'true' });
  ok(res, { message: 'Employee grades fetched successfully', data: grades });
});

const getEmployeeGradeById = catchAsync(async (req, res) => {
  const grade = await organizationService.getEmployeeGradeById(req.params.id);
  ok(res, { message: 'Employee grade fetched successfully', data: grade });
});

const updateEmployeeGrade = catchAsync(async (req, res) => {
  const grade = await organizationService.updateEmployeeGrade(req.params.id, req.body);
  ok(res, { message: 'Employee grade updated successfully', data: grade });
});

const deleteEmployeeGrade = catchAsync(async (req, res) => {
  await organizationService.deleteEmployeeGrade(req.params.id);
  noContent(res);
});

// ══════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════

module.exports = {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  getCompanyTree,

  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch,

  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentTree,

  createDesignation,
  getAllDesignations,
  getDesignationById,
  updateDesignation,
  deleteDesignation,

  createEmploymentType,
  getAllEmploymentTypes,
  getEmploymentTypeById,
  updateEmploymentType,
  deleteEmploymentType,

  createEmployeeGrade,
  getAllEmployeeGrades,
  getEmployeeGradeById,
  updateEmployeeGrade,
  deleteEmployeeGrade,
};