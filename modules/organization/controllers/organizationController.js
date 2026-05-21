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
  created(res, company, 'Company created successfully');
});

const getAllCompanies = catchAsync(async (req, res) => {
  const { includeDisabled, parentCompanyId } = req.query;
  const companies = await organizationService.getAllCompanies({
    includeDisabled: includeDisabled === 'true',
    parentCompanyId: parentCompanyId || undefined,
  });
  ok(res, companies, 'Companies fetched successfully');
});

const getCompanyById = catchAsync(async (req, res) => {
  const company = await organizationService.getCompanyById(req.params.id);
  ok(res, company, 'Company fetched successfully');
});

const updateCompany = catchAsync(async (req, res) => {
  const company = await organizationService.updateCompany(req.params.id, req.body);
  ok(res, company, 'Company updated successfully');
});

const deleteCompany = catchAsync(async (req, res) => {
  await organizationService.deleteCompany(req.params.id);
  noContent(res);
});

const getCompanyTree = catchAsync(async (req, res) => {
  const { rootId } = req.query;
  const tree = await organizationService.getCompanyTree(rootId || null);
  ok(res, tree, 'Company tree fetched successfully');
});

// ══════════════════════════════════════════════
//  BRANCH
// ══════════════════════════════════════════════

const createBranch = catchAsync(async (req, res) => {
  const branch = await organizationService.createBranch(req.body);
  created(res, branch, 'Branch created successfully');
});

const getAllBranches = catchAsync(async (req, res) => {
  const { companyId, includeDisabled } = req.query;
  const branches = await organizationService.getAllBranches({ companyId, includeDisabled: includeDisabled === 'true' });
  ok(res, branches, 'Branches fetched successfully');
});

const getBranchById = catchAsync(async (req, res) => {
  const branch = await organizationService.getBranchById(req.params.id);
  ok(res, branch, 'Branch fetched successfully');
});

const updateBranch = catchAsync(async (req, res) => {
  const branch = await organizationService.updateBranch(req.params.id, req.body);
  ok(res, branch, 'Branch updated successfully');
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
  created(res, department, 'Department created successfully');
});

const getAllDepartments = catchAsync(async (req, res) => {
  const { companyId, parentDepartmentId, includeDisabled } = req.query;
  const departments = await organizationService.getAllDepartments({
    companyId,
    parentDepartmentId: parentDepartmentId || undefined,
    includeDisabled: includeDisabled === 'true',
  });
  ok(res, departments, 'Departments fetched successfully');
});

const getDepartmentById = catchAsync(async (req, res) => {
  const department = await organizationService.getDepartmentById(req.params.id);
  ok(res, department, 'Department fetched successfully');
});

const updateDepartment = catchAsync(async (req, res) => {
  const department = await organizationService.updateDepartment(req.params.id, req.body);
  ok(res, department, 'Department updated successfully');
});

const deleteDepartment = catchAsync(async (req, res) => {
  await organizationService.deleteDepartment(req.params.id);
  noContent(res);
});

const getDepartmentTree = catchAsync(async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) throw new AppError('companyId query parameter is required', 400);
  const tree = await organizationService.getDepartmentTree(companyId);
  ok(res, tree, 'Department tree fetched successfully');
});

// ══════════════════════════════════════════════
//  DESIGNATION
// ══════════════════════════════════════════════

const createDesignation = catchAsync(async (req, res) => {
  const designation = await organizationService.createDesignation(req.body);
  created(res, designation, 'Designation created successfully');
});

const getAllDesignations = catchAsync(async (req, res) => {
  const { includeDisabled, search } = req.query;
  const designations = await organizationService.getAllDesignations({
    includeDisabled: includeDisabled === 'true', search,
  });
  ok(res, designations, 'Designations fetched successfully');
});

const getDesignationById = catchAsync(async (req, res) => {
  const designation = await organizationService.getDesignationById(req.params.id);
  ok(res, designation, 'Designation fetched successfully');
});

const updateDesignation = catchAsync(async (req, res) => {
  const designation = await organizationService.updateDesignation(req.params.id, req.body);
  ok(res, designation, 'Designation updated successfully');
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
  created(res, employmentType, 'Employment type created successfully');
});

const getAllEmploymentTypes = catchAsync(async (req, res) => {
  const { includeDisabled } = req.query;
  const employmentTypes = await organizationService.getAllEmploymentTypes({ includeDisabled: includeDisabled === 'true' });
  ok(res, employmentTypes, 'Employment types fetched successfully');
});

const getEmploymentTypeById = catchAsync(async (req, res) => {
  const employmentType = await organizationService.getEmploymentTypeById(req.params.id);
  ok(res, employmentType, 'Employment type fetched successfully');
});

const updateEmploymentType = catchAsync(async (req, res) => {
  const employmentType = await organizationService.updateEmploymentType(req.params.id, req.body);
  ok(res, employmentType, 'Employment type updated successfully');
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
  created(res, grade, 'Employee grade created successfully');
});

const getAllEmployeeGrades = catchAsync(async (req, res) => {
  const { includeDisabled } = req.query;
  const grades = await organizationService.getAllEmployeeGrades({ includeDisabled: includeDisabled === 'true' });
  ok(res, grades, 'Employee grades fetched successfully');
});

const getEmployeeGradeById = catchAsync(async (req, res) => {
  const grade = await organizationService.getEmployeeGradeById(req.params.id);
  ok(res, grade, 'Employee grade fetched successfully');
});

const updateEmployeeGrade = catchAsync(async (req, res) => {
  const grade = await organizationService.updateEmployeeGrade(req.params.id, req.body);
  ok(res, grade, 'Employee grade updated successfully');
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
