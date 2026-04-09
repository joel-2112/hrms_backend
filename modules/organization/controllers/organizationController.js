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
  return created(res, { company }, 'Company created successfully');
});

const getAllCompanies = catchAsync(async (req, res) => {
  const { includeDisabled, parentCompanyId } = req.query;
  const companies = await organizationService.getAllCompanies({
    includeDisabled: includeDisabled === 'true',
    parentCompanyId: parentCompanyId || undefined,
  });
  return ok(res, { companies }, 'Companies fetched successfully', {
    results: companies.length,
  });
});

const getCompanyById = catchAsync(async (req, res) => {
  const company = await organizationService.getCompanyById(req.params.id);
  return ok(res, { company }, 'Company fetched successfully');
});

const updateCompany = catchAsync(async (req, res) => {
  const company = await organizationService.updateCompany(req.params.id, req.body);
  return ok(res, { company }, 'Company updated successfully');
});

const deleteCompany = catchAsync(async (req, res) => {
  await organizationService.deleteCompany(req.params.id);
  return noContent(res);
});

const getCompanyTree = catchAsync(async (req, res) => {
  const { rootId } = req.query;
  const tree = await organizationService.getCompanyTree(rootId || null);
  return ok(res, { tree }, 'Company tree fetched successfully');
});

// ══════════════════════════════════════════════
//  BRANCH
// ══════════════════════════════════════════════

const createBranch = catchAsync(async (req, res) => {
  const branch = await organizationService.createBranch(req.body);
  return created(res, { branch }, 'Branch created successfully');
});

const getAllBranches = catchAsync(async (req, res) => {
  const { companyId, includeDisabled } = req.query;
  const branches = await organizationService.getAllBranches({
    companyId,
    includeDisabled: includeDisabled === 'true',
  });
  return ok(res, { branches }, 'Branches fetched successfully', {
    results: branches.length,
  });
});

const getBranchById = catchAsync(async (req, res) => {
  const branch = await organizationService.getBranchById(req.params.id);
  return ok(res, { branch }, 'Branch fetched successfully');
});

const updateBranch = catchAsync(async (req, res) => {
  const branch = await organizationService.updateBranch(req.params.id, req.body);
  return ok(res, { branch }, 'Branch updated successfully');
});

const deleteBranch = catchAsync(async (req, res) => {
  await organizationService.deleteBranch(req.params.id);
  return noContent(res);
});

// ══════════════════════════════════════════════
//  DEPARTMENT
// ══════════════════════════════════════════════

const createDepartment = catchAsync(async (req, res) => {
  const department = await organizationService.createDepartment(req.body);
  return created(res, { department }, 'Department created successfully');
});

const getAllDepartments = catchAsync(async (req, res) => {
  const { companyId, parentDepartmentId, includeDisabled } = req.query;
  const departments = await organizationService.getAllDepartments({
    companyId,
    parentDepartmentId: parentDepartmentId || undefined,
    includeDisabled: includeDisabled === 'true',
  });
  return ok(res, { departments }, 'Departments fetched successfully', {
    results: departments.length,
  });
});

const getDepartmentById = catchAsync(async (req, res) => {
  const department = await organizationService.getDepartmentById(req.params.id);
  return ok(res, { department }, 'Department fetched successfully');
});

const updateDepartment = catchAsync(async (req, res) => {
  const department = await organizationService.updateDepartment(req.params.id, req.body);
  return ok(res, { department }, 'Department updated successfully');
});

const deleteDepartment = catchAsync(async (req, res) => {
  await organizationService.deleteDepartment(req.params.id);
  return noContent(res);
});

const getDepartmentTree = catchAsync(async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) {
    throw new AppError('companyId query parameter is required', 400);
  }
  const tree = await organizationService.getDepartmentTree(companyId);
  return ok(res, { tree }, 'Department tree fetched successfully');
});

// ══════════════════════════════════════════════
//  DESIGNATION
// ══════════════════════════════════════════════

const createDesignation = catchAsync(async (req, res) => {
  const designation = await organizationService.createDesignation(req.body);
  return created(res, { designation }, 'Designation created successfully');
});

const getAllDesignations = catchAsync(async (req, res) => {
  const { includeDisabled, search } = req.query;
  const designations = await organizationService.getAllDesignations({
    includeDisabled: includeDisabled === 'true',
    search,
  });
  return ok(res, { designations }, 'Designations fetched successfully', {
    results: designations.length,
  });
});

const getDesignationById = catchAsync(async (req, res) => {
  const designation = await organizationService.getDesignationById(req.params.id);
  return ok(res, { designation }, 'Designation fetched successfully');
});

const updateDesignation = catchAsync(async (req, res) => {
  const designation = await organizationService.updateDesignation(req.params.id, req.body);
  return ok(res, { designation }, 'Designation updated successfully');
});

const deleteDesignation = catchAsync(async (req, res) => {
  await organizationService.deleteDesignation(req.params.id);
  return noContent(res);
});

// ══════════════════════════════════════════════
//  EMPLOYMENT TYPE
// ══════════════════════════════════════════════

const createEmploymentType = catchAsync(async (req, res) => {
  const employmentType = await organizationService.createEmploymentType(req.body);
  return created(res, { employmentType }, 'Employment type created successfully');
});

const getAllEmploymentTypes = catchAsync(async (req, res) => {
  const { includeDisabled } = req.query;
  const employmentTypes = await organizationService.getAllEmploymentTypes({
    includeDisabled: includeDisabled === 'true',
  });
  return ok(res, { employmentTypes }, 'Employment types fetched successfully', {
    results: employmentTypes.length,
  });
});

const getEmploymentTypeById = catchAsync(async (req, res) => {
  const employmentType = await organizationService.getEmploymentTypeById(req.params.id);
  return ok(res, { employmentType }, 'Employment type fetched successfully');
});

const updateEmploymentType = catchAsync(async (req, res) => {
  const employmentType = await organizationService.updateEmploymentType(req.params.id, req.body);
  return ok(res, { employmentType }, 'Employment type updated successfully');
});

const deleteEmploymentType = catchAsync(async (req, res) => {
  await organizationService.deleteEmploymentType(req.params.id);
  return noContent(res);
});

// ══════════════════════════════════════════════
//  EMPLOYEE GRADE
// ══════════════════════════════════════════════

const createEmployeeGrade = catchAsync(async (req, res) => {
  const grade = await organizationService.createEmployeeGrade(req.body);
  return created(res, { grade }, 'Employee grade created successfully');
});

const getAllEmployeeGrades = catchAsync(async (req, res) => {
  const { includeDisabled } = req.query;
  const grades = await organizationService.getAllEmployeeGrades({
    includeDisabled: includeDisabled === 'true',
  });
  return ok(res, { grades }, 'Employee grades fetched successfully', {
    results: grades.length,
  });
});

const getEmployeeGradeById = catchAsync(async (req, res) => {
  const grade = await organizationService.getEmployeeGradeById(req.params.id);
  return ok(res, { grade }, 'Employee grade fetched successfully');
});

const updateEmployeeGrade = catchAsync(async (req, res) => {
  const grade = await organizationService.updateEmployeeGrade(req.params.id, req.body);
  return ok(res, { grade }, 'Employee grade updated successfully');
});

const deleteEmployeeGrade = catchAsync(async (req, res) => {
  await organizationService.deleteEmployeeGrade(req.params.id);
  return noContent(res);
});

// ══════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════

module.exports = {
  // Company
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany,
  getCompanyTree,

  // Branch
  createBranch,
  getAllBranches,
  getBranchById,
  updateBranch,
  deleteBranch,

  // Department
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
  getDepartmentTree,

  // Designation
  createDesignation,
  getAllDesignations,
  getDesignationById,
  updateDesignation,
  deleteDesignation,

  // EmploymentType
  createEmploymentType,
  getAllEmploymentTypes,
  getEmploymentTypeById,
  updateEmploymentType,
  deleteEmploymentType,

  // EmployeeGrade
  createEmployeeGrade,
  getAllEmployeeGrades,
  getEmployeeGradeById,
  updateEmployeeGrade,
  deleteEmployeeGrade,
};