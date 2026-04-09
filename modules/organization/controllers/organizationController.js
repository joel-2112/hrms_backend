'use strict';

const organizationService = require('../services/organizationService');
const { catchAsync }      = require('../../../utils/catchAsync');

// ══════════════════════════════════════════════
//  COMPANY
// ══════════════════════════════════════════════

const createCompany = catchAsync(async (req, res) => {
  const company = await organizationService.createCompany(req.body);
  res.status(201).json({ status: 'success', data: { company } });
});

const getAllCompanies = catchAsync(async (req, res) => {
  const { includeDisabled, parentCompanyId } = req.query;
  const companies = await organizationService.getAllCompanies({
    includeDisabled:  includeDisabled === 'true',
    parentCompanyId:  parentCompanyId || undefined,
  });
  res.status(200).json({
    status:  'success',
    results: companies.length,
    data:    { companies },
  });
});

const getCompanyById = catchAsync(async (req, res) => {
  const company = await organizationService.getCompanyById(req.params.id);
  res.status(200).json({ status: 'success', data: { company } });
});

const updateCompany = catchAsync(async (req, res) => {
  const company = await organizationService.updateCompany(req.params.id, req.body);
  res.status(200).json({ status: 'success', data: { company } });
});

const deleteCompany = catchAsync(async (req, res) => {
  await organizationService.deleteCompany(req.params.id);
  res.status(204).send();
});

const getCompanyTree = catchAsync(async (req, res) => {
  const { rootId } = req.query;
  const tree = await organizationService.getCompanyTree(rootId || null);
  res.status(200).json({ status: 'success', data: { tree } });
});

// ══════════════════════════════════════════════
//  BRANCH
// ══════════════════════════════════════════════

const createBranch = catchAsync(async (req, res) => {
  const branch = await organizationService.createBranch(req.body);
  res.status(201).json({ status: 'success', data: { branch } });
});

const getAllBranches = catchAsync(async (req, res) => {
  const { companyId, includeDisabled } = req.query;
  const branches = await organizationService.getAllBranches({
    companyId,
    includeDisabled: includeDisabled === 'true',
  });
  res.status(200).json({
    status:  'success',
    results: branches.length,
    data:    { branches },
  });
});

const getBranchById = catchAsync(async (req, res) => {
  const branch = await organizationService.getBranchById(req.params.id);
  res.status(200).json({ status: 'success', data: { branch } });
});

const updateBranch = catchAsync(async (req, res) => {
  const branch = await organizationService.updateBranch(req.params.id, req.body);
  res.status(200).json({ status: 'success', data: { branch } });
});

const deleteBranch = catchAsync(async (req, res) => {
  await organizationService.deleteBranch(req.params.id);
  res.status(204).send();
});

// ══════════════════════════════════════════════
//  DEPARTMENT
// ══════════════════════════════════════════════

const createDepartment = catchAsync(async (req, res) => {
  const department = await organizationService.createDepartment(req.body);
  res.status(201).json({ status: 'success', data: { department } });
});

const getAllDepartments = catchAsync(async (req, res) => {
  const { companyId, parentDepartmentId, includeDisabled } = req.query;
  const departments = await organizationService.getAllDepartments({
    companyId,
    parentDepartmentId: parentDepartmentId || undefined,
    includeDisabled:    includeDisabled === 'true',
  });
  res.status(200).json({
    status:  'success',
    results: departments.length,
    data:    { departments },
  });
});

const getDepartmentById = catchAsync(async (req, res) => {
  const department = await organizationService.getDepartmentById(req.params.id);
  res.status(200).json({ status: 'success', data: { department } });
});

const updateDepartment = catchAsync(async (req, res) => {
  const department = await organizationService.updateDepartment(req.params.id, req.body);
  res.status(200).json({ status: 'success', data: { department } });
});

const deleteDepartment = catchAsync(async (req, res) => {
  await organizationService.deleteDepartment(req.params.id);
  res.status(204).send();
});

const getDepartmentTree = catchAsync(async (req, res) => {
  const { companyId } = req.query;
  if (!companyId) {
    return res.status(400).json({
      status:  'fail',
      message: 'companyId query parameter is required',
    });
  }
  const tree = await organizationService.getDepartmentTree(companyId);
  res.status(200).json({ status: 'success', data: { tree } });
});

// ══════════════════════════════════════════════
//  DESIGNATION
// ══════════════════════════════════════════════

const createDesignation = catchAsync(async (req, res) => {
  const designation = await organizationService.createDesignation(req.body);
  res.status(201).json({ status: 'success', data: { designation } });
});

const getAllDesignations = catchAsync(async (req, res) => {
  const { includeDisabled, search } = req.query;
  const designations = await organizationService.getAllDesignations({
    includeDisabled: includeDisabled === 'true',
    search,
  });
  res.status(200).json({
    status:  'success',
    results: designations.length,
    data:    { designations },
  });
});

const getDesignationById = catchAsync(async (req, res) => {
  const designation = await organizationService.getDesignationById(req.params.id);
  res.status(200).json({ status: 'success', data: { designation } });
});

const updateDesignation = catchAsync(async (req, res) => {
  const designation = await organizationService.updateDesignation(req.params.id, req.body);
  res.status(200).json({ status: 'success', data: { designation } });
});

const deleteDesignation = catchAsync(async (req, res) => {
  await organizationService.deleteDesignation(req.params.id);
  res.status(204).send();
});

// ══════════════════════════════════════════════
//  EMPLOYMENT TYPE
// ══════════════════════════════════════════════

const createEmploymentType = catchAsync(async (req, res) => {
  const employmentType = await organizationService.createEmploymentType(req.body);
  res.status(201).json({ status: 'success', data: { employmentType } });
});

const getAllEmploymentTypes = catchAsync(async (req, res) => {
  const { includeDisabled } = req.query;
  const employmentTypes = await organizationService.getAllEmploymentTypes({
    includeDisabled: includeDisabled === 'true',
  });
  res.status(200).json({
    status:  'success',
    results: employmentTypes.length,
    data:    { employmentTypes },
  });
});

const getEmploymentTypeById = catchAsync(async (req, res) => {
  const employmentType = await organizationService.getEmploymentTypeById(req.params.id);
  res.status(200).json({ status: 'success', data: { employmentType } });
});

const updateEmploymentType = catchAsync(async (req, res) => {
  const employmentType = await organizationService.updateEmploymentType(req.params.id, req.body);
  res.status(200).json({ status: 'success', data: { employmentType } });
});

const deleteEmploymentType = catchAsync(async (req, res) => {
  await organizationService.deleteEmploymentType(req.params.id);
  res.status(204).send();
});

// ══════════════════════════════════════════════
//  EMPLOYEE GRADE
// ══════════════════════════════════════════════

const createEmployeeGrade = catchAsync(async (req, res) => {
  const grade = await organizationService.createEmployeeGrade(req.body);
  res.status(201).json({ status: 'success', data: { grade } });
});

const getAllEmployeeGrades = catchAsync(async (req, res) => {
  const { includeDisabled } = req.query;
  const grades = await organizationService.getAllEmployeeGrades({
    includeDisabled: includeDisabled === 'true',
  });
  res.status(200).json({
    status:  'success',
    results: grades.length,
    data:    { grades },
  });
});

const getEmployeeGradeById = catchAsync(async (req, res) => {
  const grade = await organizationService.getEmployeeGradeById(req.params.id);
  res.status(200).json({ status: 'success', data: { grade } });
});

const updateEmployeeGrade = catchAsync(async (req, res) => {
  const grade = await organizationService.updateEmployeeGrade(req.params.id, req.body);
  res.status(200).json({ status: 'success', data: { grade } });
});

const deleteEmployeeGrade = catchAsync(async (req, res) => {
  await organizationService.deleteEmployeeGrade(req.params.id);
  res.status(204).send();
});

// ══════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════

module.exports = {
  // Company
  createCompany, getAllCompanies, getCompanyById,
  updateCompany, deleteCompany, getCompanyTree,

  // Branch
  createBranch, getAllBranches, getBranchById,
  updateBranch, deleteBranch,

  // Department
  createDepartment, getAllDepartments, getDepartmentById,
  updateDepartment, deleteDepartment, getDepartmentTree,

  // Designation
  createDesignation, getAllDesignations, getDesignationById,
  updateDesignation, deleteDesignation,

  // EmploymentType
  createEmploymentType, getAllEmploymentTypes, getEmploymentTypeById,
  updateEmploymentType, deleteEmploymentType,

  // EmployeeGrade
  createEmployeeGrade, getAllEmployeeGrades, getEmployeeGradeById,
  updateEmployeeGrade, deleteEmployeeGrade,
};