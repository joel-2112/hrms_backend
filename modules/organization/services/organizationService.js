"use strict";

const { Op } = require("sequelize");
const {
  sequelize,
  Company,
  Branch,
  Department,
  Designation,
  EmploymentType,
  EmployeeGrade,
} = require("../../../models");
const { AppError } = require("../../../middlewares/errorMiddleware");

// ══════════════════════════════════════════════
//  COMPANY
// ══════════════════════════════════════════════

const createCompany = async ({
  name,
  country,
  region,
  zone,
  city,
  code,
  dateOfEstablishment,
  parentCompanyId,
  taxId,
  phone,
  email,
  address,
  website,
  abbreviation,
  defaultCurrency,
}) => {
  const exists = await Company.findOne({ where: { name } });
  if (exists) throw new AppError(`Company "${name}" already exists`, 409);

  return Company.create({
    name,
    abbr: abbreviation,
    currency: defaultCurrency,
    country,
    region,
    zone,
    city,
    code,
    parentCompanyId: parentCompanyId || null,
    taxId,
    phone,
    email,
    address,
    website,
    dateOfIncorporation: dateOfEstablishment,
  });
};

const getAllCompanies = async ({
  includeDisabled = false,
  parentCompanyId,
} = {}) => {
  const where = {};
  if (!includeDisabled) where.disabled = false;
  if (parentCompanyId !== undefined)
    where.parentCompanyId = parentCompanyId || null; // null = root companies

  return Company.findAll({
    where,
    include: [
      { model: Company, as: "parentCompany", attributes: ["id", "name"] },
      { model: Company, as: "subsidiaries", attributes: ["id", "name"] },
    ],
    order: [["name", "ASC"]],
  });
};

const getCompanyById = async (id) => {
  const company = await Company.findByPk(id, {
    include: [
      { model: Company, as: "parentCompany", attributes: ["id", "name"] },
      { model: Company, as: "subsidiaries", attributes: ["id", "name"] },
      { model: Branch, as: "branches", attributes: ["id", "name"] },
      { model: Department, as: "departments", attributes: ["id", "name"] },
    ],
  });
  if (!company) throw new AppError("Company not found", 404);
  return company;
};

const updateCompany = async (id, updates) => {
  const company = await Company.findByPk(id);
  if (!company) throw new AppError("Company not found", 404);

  // Prevent a company from being set as its own parent
  if (updates.parentCompanyId && updates.parentCompanyId === id)
    throw new AppError("A company cannot be its own parent", 422);

  return company.update(updates);
};

const deleteCompany = async (id) => {
  const company = await Company.findByPk(id);
  if (!company) throw new AppError("Company not found", 404);

  const [subsidiaries, branches, departments] = await Promise.all([
    Company.count({ where: { parentCompanyId: id } }),
    Branch.count({ where: { companyId: id } }),
    Department.count({ where: { companyId: id } }),
  ]);

  if (subsidiaries > 0)
    throw new AppError(
      `Cannot delete — company has ${subsidiaries} subsidiary(ies)`,
      409,
    );
  if (branches > 0)
    throw new AppError(
      `Cannot delete — company has ${branches} branch(es)`,
      409,
    );
  if (departments > 0)
    throw new AppError(
      `Cannot delete — company has ${departments} department(s)`,
      409,
    );

  await company.destroy();
};

// Get full company tree rooted at a given company (or all roots)
const getCompanyTree = async (rootId = null) => {
  const where = { parentCompanyId: rootId };
  const nodes = await Company.findAll({
    where,
    order: [["name", "ASC"]],
  });

  // Recursively attach children
  for (const node of nodes) {
    node.dataValues.children = await getCompanyTree(node.id);
  }
  return nodes;
};

// ══════════════════════════════════════════════
//  BRANCH
// ══════════════════════════════════════════════

const createBranch = async ({
  name,
  country,
  region,
  zone,
  city,
  code,
  companyId,
  dateOfIncorporation,
}) => {
  const company = await Company.findByPk(companyId);
  if (!company) throw new AppError("Company not found", 404);

  const exists = await Branch.findOne({ where: { name, companyId } });
  if (exists)
    throw new AppError(`Branch "${name}" already exists in this company`, 409);

  return Branch.create({ name, country, region, zone, city, code, companyId, dateOfIncorporation });
};

const getAllBranches = async ({ companyId, includeDisabled = false } = {}) => {
  const where = {};
  if (!includeDisabled) where.disabled = false;
  if (companyId) where.companyId = companyId;

  return Branch.findAll({
    where,
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
    order: [["name", "ASC"]],
  });
};

const getBranchById = async (id) => {
  const branch = await Branch.findByPk(id, {
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
  });
  if (!branch) throw new AppError("Branch not found", 404);
  return branch;
};

const updateBranch = async (id, updates) => {
  const branch = await Branch.findByPk(id);
  if (!branch) throw new AppError("Branch not found", 404);

  // If moving to a different company, verify it exists
  if (updates.companyId && updates.companyId !== branch.companyId) {
    const company = await Company.findByPk(updates.companyId);
    if (!company) throw new AppError("Target company not found", 404);
  }

  return branch.update(updates);
};

const deleteBranch = async (id) => {
  const branch = await Branch.findByPk(id);
  if (!branch) throw new AppError("Branch not found", 404);

  // Guarded by employee FK — check via raw count to avoid circular import
  const { Employee } = require("../../../models");
  const empCount = await Employee.count({ where: { branchId: id } });
  if (empCount > 0)
    throw new AppError(
      `Cannot delete — ${empCount} employee(s) assigned to this branch`,
      409,
    );

  await branch.destroy();
};

// ══════════════════════════════════════════════
//  DEPARTMENT
// ══════════════════════════════════════════════

const createDepartment = async ({ name, companyId, parentDepartmentId }) => {
  const company = await Company.findByPk(companyId);
  if (!company) throw new AppError("Company not found", 404);

  if (parentDepartmentId) {
    const parent = await Department.findByPk(parentDepartmentId);
    if (!parent) throw new AppError("Parent department not found", 404);
    if (parent.companyId !== companyId)
      throw new AppError(
        "Parent department must belong to the same company",
        422,
      );
  }

  const exists = await Department.findOne({ where: { name, companyId } });
  if (exists)
    throw new AppError(
      `Department "${name}" already exists in this company`,
      409,
    );

  return Department.create({
    name,
    companyId,
    parentDepartmentId: parentDepartmentId || null,
  });
};

const getAllDepartments = async ({
  companyId,
  parentDepartmentId,
  includeDisabled = false,
} = {}) => {
  const where = {};
  if (!includeDisabled) where.disabled = false;
  if (companyId) where.companyId = companyId;
  if (parentDepartmentId !== undefined)
    where.parentDepartmentId = parentDepartmentId || null;

  return Department.findAll({
    where,
    include: [
      { model: Company, as: "company", attributes: ["id", "name"] },
      { model: Department, as: "parentDepartment", attributes: ["id", "name"] },
      { model: Department, as: "subDepartments", attributes: ["id", "name"] },
    ],
    order: [["name", "ASC"]],
  });
};

const getDepartmentById = async (id) => {
  const dept = await Department.findByPk(id, {
    include: [
      { model: Company, as: "company", attributes: ["id", "name"] },
      { model: Department, as: "parentDepartment", attributes: ["id", "name"] },
      { model: Department, as: "subDepartments", attributes: ["id", "name"] },
    ],
  });
  if (!dept) throw new AppError("Department not found", 404);
  return dept;
};

const updateDepartment = async (id, updates) => {
  const dept = await Department.findByPk(id);
  if (!dept) throw new AppError("Department not found", 404);

  if (updates.parentDepartmentId) {
    if (updates.parentDepartmentId === id)
      throw new AppError("A department cannot be its own parent", 422);

    const parent = await Department.findByPk(updates.parentDepartmentId);
    if (!parent) throw new AppError("Parent department not found", 404);
    if (parent.companyId !== dept.companyId)
      throw new AppError(
        "Parent department must belong to the same company",
        422,
      );
  }

  return dept.update(updates);
};

const deleteDepartment = async (id) => {
  const dept = await Department.findByPk(id);
  if (!dept) throw new AppError("Department not found", 404);

  const [subDepts, empCount] = await Promise.all([
    Department.count({ where: { parentDepartmentId: id } }),
    require("../../../models").Employee.count({ where: { departmentId: id } }),
  ]);

  if (subDepts > 0)
    throw new AppError(
      `Cannot delete — department has ${subDepts} sub-department(s)`,
      409,
    );
  if (empCount > 0)
    throw new AppError(
      `Cannot delete — ${empCount} employee(s) assigned to this department`,
      409,
    );

  await dept.destroy();
};

// Recursive department tree within a company
const getDepartmentTree = async (companyId, parentDepartmentId = null) => {
  const nodes = await Department.findAll({
    where: { companyId, parentDepartmentId },
    order: [["name", "ASC"]],
  });

  for (const node of nodes) {
    node.dataValues.children = await getDepartmentTree(companyId, node.id);
  }
  return nodes;
};

// ══════════════════════════════════════════════
//  DESIGNATION
// ══════════════════════════════════════════════

const createDesignation = async ({ name, jobFunction }) => {
  const exists = await Designation.findOne({ where: { name } });
  if (exists) throw new AppError(`Designation "${name}" already exists`, 409);
  return Designation.create({ name, jobFunction });
};

const getAllDesignations = async ({ includeDisabled = false, search } = {}) => {
  const where = {};
  if (!includeDisabled) where.disabled = false;
  if (search) where.name = { [Op.iLike]: `%${search}%` };

  return Designation.findAll({ where, order: [["name", "ASC"]] });
};

const getDesignationById = async (id) => {
  const designation = await Designation.findByPk(id);
  if (!designation) throw new AppError("Designation not found", 404);
  return designation;
};

const updateDesignation = async (id, updates) => {
  const designation = await Designation.findByPk(id);
  if (!designation) throw new AppError("Designation not found", 404);
  return designation.update(updates);
};

const deleteDesignation = async (id) => {
  const designation = await Designation.findByPk(id);
  if (!designation) throw new AppError("Designation not found", 404);

  const empCount = await require("../../../models").Employee.count({
    where: { designationId: id },
  });
  if (empCount > 0)
    throw new AppError(
      `Cannot delete — ${empCount} employee(s) hold this designation`,
      409,
    );

  await designation.destroy();
};

// ══════════════════════════════════════════════
//  EMPLOYMENT TYPE
// ══════════════════════════════════════════════

const createEmploymentType = async ({ name, description }) => {
  const exists = await EmploymentType.findOne({ where: { name } });
  if (exists)
    throw new AppError(`Employment type "${name}" already exists`, 409);
  return EmploymentType.create({ name, description });
};

const getAllEmploymentTypes = async ({ includeDisabled = false } = {}) => {
  const where = includeDisabled ? {} : { disabled: false };
  return EmploymentType.findAll({ where, order: [["name", "ASC"]] });
};

const getEmploymentTypeById = async (id) => {
  const type = await EmploymentType.findByPk(id);
  if (!type) throw new AppError("Employment type not found", 404);
  return type;
};

const updateEmploymentType = async (id, updates) => {
  const type = await EmploymentType.findByPk(id);
  if (!type) throw new AppError("Employment type not found", 404);
  return type.update(updates);
};

const deleteEmploymentType = async (id) => {
  const type = await EmploymentType.findByPk(id);
  if (!type) throw new AppError("Employment type not found", 404);

  const empCount = await require("../../../models").Employee.count({
    where: { employmentTypeId: id },
  });
  if (empCount > 0)
    throw new AppError(
      `Cannot delete — ${empCount} employee(s) use this employment type`,
      409,
    );

  await type.destroy();
};

// ══════════════════════════════════════════════
//  EMPLOYEE GRADE
// ══════════════════════════════════════════════

const createEmployeeGrade = async ({
  name,
  description,
  defaultLeavePolicyId,
}) => {
  const exists = await EmployeeGrade.findOne({ where: { name } });
  if (exists)
    throw new AppError(`Employee grade "${name}" already exists`, 409);
  return EmployeeGrade.create({
    name,
    description,
    defaultLeavePolicyId: defaultLeavePolicyId || null,
  });
};

const getAllEmployeeGrades = async ({ includeDisabled = false } = {}) => {
  const where = includeDisabled ? {} : { disabled: false };
  return EmployeeGrade.findAll({ where, order: [["name", "ASC"]] });
};

const getEmployeeGradeById = async (id) => {
  const grade = await EmployeeGrade.findByPk(id);
  if (!grade) throw new AppError("Employee grade not found", 404);
  return grade;
};

const updateEmployeeGrade = async (id, updates) => {
  const grade = await EmployeeGrade.findByPk(id);
  if (!grade) throw new AppError("Employee grade not found", 404);
  return grade.update(updates);
};

const deleteEmployeeGrade = async (id) => {
  const grade = await EmployeeGrade.findByPk(id);
  if (!grade) throw new AppError("Employee grade not found", 404);

  const empCount = await require("../../../models").Employee.count({
    where: { employeeGradeId: id },
  });
  if (empCount > 0)
    throw new AppError(
      `Cannot delete — ${empCount} employee(s) assigned to this grade`,
      409,
    );

  await grade.destroy();
};

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
