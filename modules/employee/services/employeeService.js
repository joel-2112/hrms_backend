"use strict";

/**
 * modules/employee/services/employeeService.js
 *
 * Complete employee lifecycle service.
 * All business logic — no req/res, pure data in / data out.
 */

const { Op } = require("sequelize");
const bcrypt = require("bcrypt");

const {
  sequelize,
  Employee,
  User,
  Company,
  Branch,
  Department,
  Designation,
  EmploymentType,
  EmployeeGrade,
  EmployeeEducation,
  EducationLevel,
  EmployeeExternalWork,
  EmployeeEmergencyContact,
  EmployeeSkillMap,
  EmployeeSeparation,
  EmployeePromotion,
  Language,
} = require("../../../models");

const { AppError } = require("../../../middlewares/errorMiddleware");
const {
  getPaginationOptions,
  buildMeta,
} = require("../../../utils/pagination");
const logger = require("../../../utils/logger");
const emailService = require("../../../utils/emailService");
const roleService = require("../../role/services/roleService");

const SALT_ROUNDS = 10;

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED INCLUDE SETS
// ─────────────────────────────────────────────────────────────────────────────

const ORG_INCLUDES = [
  {
    model: Company,
    as: "company",
    attributes: ["id", "name", "code"],
    required: false,
  },
  { model: Branch, as: "branch", attributes: ["id", "name"], required: false },
  {
    model: Department,
    as: "department",
    attributes: ["id", "name"],
    required: false,
  },
  {
    model: Designation,
    as: "designation",
    attributes: ["id", "name"],
    required: false,
  },
  {
    model: EmploymentType,
    as: "employmentType",
    attributes: ["id", "name"],
    required: false,
  },
  {
    model: EmployeeGrade,
    as: "employeeGrade",
    attributes: ["id", "name"],
    required: false,
  },
];

const MANAGER_INCLUDE = {
  model: Employee,
  as: "reportsTo",
  attributes: [
    "id",
    "firstName",
    "middleName",
    "lastName",
    "employeeNumber",
    "image",
  ],
  required: false,
};

const USER_INCLUDE = {
  model: User,
  as: "user",
  attributes: [
    "id",
    "email",
    "status",
    "lastLogin",
    "isSuperUser",
    "isSystemManager",
  ],
  required: false,
};

const FULL_INCLUDES = [...ORG_INCLUDES, MANAGER_INCLUDE, USER_INCLUDE];

// ─────────────────────────────────────────────────────────────────────────────
//  INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const generateEmployeeNumber = async (transaction) => {
  const year = new Date().getFullYear();
  const count = await Employee.count({
    where: { employeeNumber: { [Op.like]: `EMP-${year}-%` } },
    transaction,
    paranoid: false,
  });
  return `EMP-${year}-${String(count + 1).padStart(4, "0")}`;
};

const generateTemporaryPassword = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `Tw@${suffix}`;
};

const getEmployeeByUserId = async (userId) => {
  const emp = await Employee.findOne({
    where: { userId },
    include: FULL_INCLUDES,
  });
  if (!emp)
    throw new AppError("No employee record linked to this account", 404);
  return emp;
};

const validateOrgFKs = async (data) => {
  const checks = [];
  if (data.companyId)
    checks.push(
      Company.findByPk(data.companyId, { attributes: ["id"] }).then((r) => {
        if (!r) throw new AppError("Company not found", 404);
      }),
    );
  if (data.branchId)
    checks.push(
      Branch.findByPk(data.branchId, { attributes: ["id"] }).then((r) => {
        if (!r) throw new AppError("Branch not found", 404);
      }),
    );
  if (data.departmentId)
    checks.push(
      Department.findByPk(data.departmentId, { attributes: ["id"] }).then(
        (r) => {
          if (!r) throw new AppError("Department not found", 404);
        },
      ),
    );
  if (data.designationId)
    checks.push(
      Designation.findByPk(data.designationId, { attributes: ["id"] }).then(
        (r) => {
          if (!r) throw new AppError("Designation not found", 404);
        },
      ),
    );
  if (data.employmentTypeId)
    checks.push(
      EmploymentType.findByPk(data.employmentTypeId, {
        attributes: ["id"],
      }).then((r) => {
        if (!r) throw new AppError("Employment type not found", 404);
      }),
    );
  if (data.employeeGradeId)
    checks.push(
      EmployeeGrade.findByPk(data.employeeGradeId, { attributes: ["id"] }).then(
        (r) => {
          if (!r) throw new AppError("Employee grade not found", 404);
        },
      ),
    );
  if (data.reportsToId)
    checks.push(
      Employee.findByPk(data.reportsToId, { attributes: ["id"] }).then((r) => {
        if (!r) throw new AppError("Manager (reportsTo) not found", 404);
      }),
    );
  await Promise.all(checks);
};

const assertEmployeeExists = async (id) => {
  const exists = await Employee.count({ where: { id } });
  if (!exists) throw new AppError("Employee not found", 404);
};

const findSeparation = async (employeeId) => {
  const sep = await EmployeeSeparation.findOne({ where: { employeeId } });
  if (!sep)
    throw new AppError("No separation record found for this employee", 404);
  return sep;
};

// ═════════════════════════════════════════════════════════════════════════════
//  CORE PROFILE
// ═════════════════════════════════════════════════════════════════════════════

const createEmployee = async (data) => {
  if (!data.firstName || !data.middleName || !data.lastName)
    throw new AppError("firstName, middleName, and lastName are required", 422);
  if (!data.companyId) throw new AppError("companyId is required", 422);
  if (!data.dateOfJoining) throw new AppError("dateOfJoining is required", 422);

  await validateOrgFKs(data);

  if (data.email) {
    const emailTaken = await Employee.findOne({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (emailTaken)
      throw new AppError("An employee with this email already exists", 409);
  }

  const employee = await sequelize.transaction(async (t) => {
    const empNumber = await generateEmployeeNumber(t);

    return Employee.create(
      {
        firstName: data.firstName.trim(),
        middleName: data.middleName?.trim() || null,
        lastName: data.lastName.trim(),
        salutation: data.salutation || null,
        gender: data.gender || null,
        maritalStatus: data.maritalStatus || null,
        dateOfBirth: data.dateOfBirth || null,
        nationality: data.nationality || null,
        image: data.image || null,
        companyId: data.companyId,
        branchId: data.branchId || null,
        departmentId: data.departmentId || null,
        designationId: data.designationId || null,
        employmentTypeId: data.employmentTypeId || null,
        employeeGradeId: data.employeeGradeId || null,
        reportsToId: data.reportsToId || null,
        workLocation: data.workLocation || null,
        employeeNumber: empNumber,
        dateOfJoining: data.dateOfJoining,
        contractEndDate: data.contractEndDate || null,
        status: "pending",
        userId: null,
        salary: data.salary || null,
        portfolioUrl: data.portfolioUrl || null,
        githubUrl: data.githubUrl || null,
        linkedInUrl: data.linkedInUrl || null,
        username: data.username || null,
        email: data.email?.toLowerCase().trim() || null,
        personalEmail: data.personalEmail || null,
        phoneNumber: data.phoneNumber || null,
        alternativePhoneNumber: data.alternativePhoneNumber || null,
        Country: data.Country || "Ethiopia",
        Region: data.Region || null,
        zone: data.zone || null,
        City: data.City || null,
        bankName: data.bankName || null,
        bankAccountNumber: data.bankAccountNumber || null,
        tinNumber: data.tinNumber || null,
        nationalIdNumber: data.nationalIdNumber || null,
        holidayListId: data.holidayListId || null,
        leaveApprovedById: data.leaveApprovedById || null,
        employeeDocuments: data.employeeDocuments || null,
      },
      { transaction: t },
    );
  });

  logger.info("Employee created (pending GM approval)", {
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
    name: `${employee.firstName} ${employee.middleName} ${employee.lastName}`,
  });

  return employee;
};

const createEmployeeFromExistingUser = async (userId, data) => {
  const user = await User.findByPk(userId, {
    attributes: [
      "id",
      "email",
      "firstName",
      "middleName",
      "lastName",
      "status",
    ],
  });
  if (!user) throw new AppError("User not found", 404);
  if (user.status !== "Active")
    throw new AppError(
      "User account must be Active to create an Employee record",
      422,
    );

  const existingEmp = await Employee.findOne({ where: { userId: user.id } });
  if (existingEmp)
    throw new AppError(
      `Employee record already exists for this user (${existingEmp.employeeNumber})`,
      409,
    );

  if (!data.companyId) throw new AppError("companyId is required", 422);
  if (!data.dateOfJoining) throw new AppError("dateOfJoining is required", 422);

  await validateOrgFKs(data);

  const email = data.email || user.email;
  const emailTaken = await Employee.findOne({
    where: { email: email.toLowerCase().trim() },
  });
  if (emailTaken)
    throw new AppError("An employee with this email already exists", 409);

  const employee = await sequelize.transaction(async (t) => {
    const empNumber = await generateEmployeeNumber(t);

    return Employee.create(
      {
        userId: user.id,
        firstName: user.firstName,
        middleName: user.middleName || null,
        lastName: user.lastName,
        companyId: data.companyId,
        branchId: data.branchId || null,
        departmentId: data.departmentId || null,
        designationId: data.designationId || null,
        employmentTypeId: data.employmentTypeId || null,
        employeeGradeId: data.employeeGradeId || null,
        reportsToId: data.reportsToId || null,
        workLocation: data.workLocation || null,
        employeeNumber: empNumber,
        dateOfJoining: data.dateOfJoining,
        contractEndDate: data.contractEndDate || null,
        status: "Active",
        salary: data.salary || null,
        portfolioUrl: data.portfolioUrl || null,
        githubUrl: data.githubUrl || null,
        linkedInUrl: data.linkedInUrl || null,
        email: email.toLowerCase().trim(),
        personalEmail: data.personalEmail || null,
        phoneNumber: data.phoneNumber || null,
        alternativePhoneNumber: data.alternativePhoneNumber || null,
        Country: data.Country || "Ethiopia",
        Region: data.Region || null,
        zone: data.zone || null,
        City: data.City || null,
        bankName: data.bankName || null,
        bankAccountNumber: data.bankAccountNumber || null,
        tinNumber: data.tinNumber || null,
        nationalIdNumber: data.nationalIdNumber || null,
        holidayListId: data.holidayListId || null,
        leaveApprovedById: data.leaveApprovedById || null,
        employeeDocuments: data.employeeDocuments || null,
      },
      { transaction: t },
    );
  });

  logger.info("Employee created from existing User", {
    userId: user.id,
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
  });
  return employee;
};

const approveEmployee = async (employeeId, approverUserId) => {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new AppError("Employee not found", 404);
  if (employee.status !== "pending")
    throw new AppError(
      `Employee cannot be approved from status '${employee.status}'`,
      422,
    );
  if (!employee.email)
    throw new AppError(
      "Employee must have an email before a User account can be created",
      422,
    );

  const approver = await User.unscoped().findByPk(approverUserId, {
    attributes: ["id", "isSuperUser", "isSystemManager"],
  });
  if (!approver) throw new AppError("Approver not found", 404);

  const existingUser = await User.unscoped().findOne({
    where: { email: employee.email },
  });
  const temporaryPassword = generateTemporaryPassword();

  const result = await sequelize.transaction(async (t) => {
    let user;
    if (existingUser) {
      const newHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);
      await existingUser.update(
        {
          passwordHash: newHash,
          status: "Active",
          firstName: employee.firstName,
          middleName: employee.middleName,
          lastName: employee.lastName,
        },
        { transaction: t },
      );
      user = existingUser;
    } else {
      user = await User.create(
        {
          firstName: employee.firstName,
          middleName: employee.middleName,
          lastName: employee.lastName,
          email: employee.email,
          passwordHash: temporaryPassword,
          status: "Active",
          language: "en",
        },
        { transaction: t },
      );
    }
    await employee.update(
      { userId: user.id, status: "Active" },
      { transaction: t },
    );
    return { employee, user };
  });

  emailService
    .sendEmployeeCredentials(result.employee, temporaryPassword)
    .then((res) => {
      if (res.success)
        logger.info("Credentials email sent", {
          employeeId,
          email: result.employee.email,
        });
      else
        logger.warn("Credentials email failed", {
          employeeId,
          error: res.error,
        });
    })
    .catch((err) =>
      logger.error("Credentials email error", {
        employeeId,
        error: err.message,
      }),
    );

  roleService.invalidateUserCache(result.user.id);

  return { employee: result.employee, temporaryPassword };
};

const getEmployees = async (query = {}, permFilter = {}) => {
  const {
    companyId,
    branchId,
    departmentId,
    designationId,
    employmentTypeId,
    employeeGradeId,
    status,
    reportsToId,
    search,
  } = query;
  const { limit, offset, page } = getPaginationOptions(query);
  const where = {};

  if (companyId) where.companyId = companyId;
  if (branchId) where.branchId = branchId;
  if (departmentId) where.departmentId = departmentId;
  if (designationId) where.designationId = designationId;
  if (employmentTypeId) where.employmentTypeId = employmentTypeId;
  if (employeeGradeId) where.employeeGradeId = employeeGradeId;
  if (reportsToId) where.reportsToId = reportsToId;

  if (permFilter.employeeId) {
    where.id = permFilter.employeeId;
    delete permFilter.employeeId;
  }
  Object.assign(where, permFilter);

  if (status) {
    const statuses = status.split(",").map((s) => s.trim());
    where.status = statuses.length === 1 ? statuses[0] : { [Op.in]: statuses };
  }

  if (search) {
    const like = { [Op.iLike]: `%${search}%` };
    where[Op.or] = [
      { firstName: like },
      { middleName: like },
      { lastName: like },
      { employeeNumber: like },
      { email: like },
    ];
  }

  const { count, rows } = await Employee.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: [...ORG_INCLUDES, MANAGER_INCLUDE, USER_INCLUDE],
    distinct: true,
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};

const updateAvatar = async (employeeId, filePath) => {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new AppError("Employee not found", 404);
  if (employee.image) {
    const { deleteFile } = require("../../../middlewares/uploadMiddleware");
    await deleteFile(employee.image);
  }
  await employee.update({ image: filePath });
  return Employee.findByPk(employeeId, {
    include: [...FULL_INCLUDES],
    attributes: { exclude: ["nationalIdNumber", "bankAccountNumber"] },
  });
};

const getEmployeeById = async (id) => {
  const employee = await Employee.findByPk(id, {
    include: [
      ...FULL_INCLUDES,
      {
        model: EmployeeEducation,
        as: "educationHistory",
        required: false,
        include: [
          { model: EducationLevel, as: "educationLevels", required: false },
        ],
      },
      {
        model: EmployeeExternalWork,
        as: "externalWorkHistory",
        required: false,
      },
      {
        model: EmployeeEmergencyContact,
        as: "emergencyContacts",
        required: false,
      },
      { model: EmployeeSkillMap, as: "skillMaps", required: false },
      { model: EmployeeSeparation, as: "separations", required: false },
      { model: Language, as: "languages", required: false },
      {
        model: EmployeePromotion,
        as: "promotions",
        required: false,
        order: [["promotionDate", "DESC"]],
        separate: true,
        limit: 10,
      },
    ],
  });
  if (!employee) throw new AppError("Employee not found", 404);
  return employee;
};

const getMyProfile = async (userId) => {
  const employee = await Employee.findOne({
    where: { userId },
    include: [
      USER_INCLUDE,
      ...ORG_INCLUDES,
      MANAGER_INCLUDE,
      {
        model: EmployeeEducation,
        required: false,
        include: [
          { model: EducationLevel, as: "educationLevels", required: false },
        ],
      },
      { model: EmployeeExternalWork, required: false },
      { model: EmployeeEmergencyContact, required: false },
      { model: EmployeeSkillMap, required: false },
      { model: Language, as: "languages", required: false },
    ],
    attributes: { exclude: ["employeeDocuments"] },
  });
  if (!employee)
    throw new AppError("No employee profile found for this account", 404);
  return employee;
};

const updateEmployee = async (id, data) => {
  const employee = await Employee.findByPk(id);
  if (!employee) throw new AppError("Employee not found", 404);
  if (employee.status === "exited")
    throw new AppError("Cannot edit a separated employee record", 422);

  const blocked = ["status", "userId", "employeeNumber", "relievingDate"];
  blocked.forEach((field) => delete data[field]);

  const fkFields = [
    "companyId",
    "branchId",
    "departmentId",
    "designationId",
    "employmentTypeId",
    "employeeGradeId",
    "reportsToId",
  ];
  const fkChanges = {};
  fkFields.forEach((f) => {
    if (data[f] !== undefined) fkChanges[f] = data[f];
  });
  if (Object.keys(fkChanges).length) await validateOrgFKs(fkChanges);

  if (data.email && data.email !== employee.email) {
    const taken = await Employee.findOne({
      where: { email: data.email.toLowerCase().trim(), id: { [Op.ne]: id } },
    });
    if (taken)
      throw new AppError(
        "This email is already assigned to another employee",
        409,
      );
    if (employee.userId)
      await User.update(
        { email: data.email.toLowerCase().trim() },
        { where: { id: employee.userId } },
      );
  }

  if (data.firstName) data.firstName = data.firstName.trim();
  if (data.lastName) data.lastName = data.lastName.trim();
  if (data.middleName) data.middleName = data.middleName?.trim();
  if (data.email) data.email = data.email.toLowerCase().trim();

  await employee.update(data);
  logger.info("Employee updated", { employeeId: id });
  return employee.reload({ include: FULL_INCLUDES });
};

const updateEmployeeStatus = async (id, newStatus, reason, changedByUserId) => {
  const VALID_STATUSES = [
    "Active",
    "pending",
    "onLeave",
    "Suspended",
    "exited",
  ];
  if (!VALID_STATUSES.includes(newStatus))
    throw new AppError(`Invalid status: '${newStatus}'`, 422);

  const employee = await Employee.findByPk(id, { include: [USER_INCLUDE] });
  if (!employee) throw new AppError("Employee not found", 404);

  const current = employee.status;
  if (newStatus === "exited")
    throw new AppError(
      "Employee status cannot be set to exited directly — initiate a Separation record instead",
      422,
    );
  if (current === "pending" && newStatus === "Active")
    throw new AppError(
      "Cannot manually activate a pending employee — use the GM Approval flow instead",
      422,
    );
  if (current === "exited")
    throw new AppError(
      "Cannot change the status of an already separated employee",
      422,
    );
  if (current === newStatus)
    throw new AppError(`Employee is already in '${newStatus}' status`, 422);
  if (newStatus === "Suspended" && !reason)
    throw new AppError("A reason is required when suspending an employee", 422);

  await sequelize.transaction(async (t) => {
    await employee.update({ status: newStatus }, { transaction: t });
    if (employee.userId) {
      const userStatus = newStatus === "Suspended" ? "Suspended" : "Active";
      await User.update(
        { status: userStatus },
        { where: { id: employee.userId }, transaction: t },
      );
    }
  });

  logger.info("Employee status changed", {
    employeeId: id,
    from: current,
    to: newStatus,
    reason,
    changedBy: changedByUserId,
  });
  return employee.reload({ include: FULL_INCLUDES });
};

const searchEmployees = async (
  searchTerm,
  { companyId, status, limit = 20 } = {},
) => {
  if (!searchTerm || searchTerm.trim().length < 2)
    throw new AppError("Search term must be at least 2 characters", 422);

  const like = { [Op.iLike]: `%${searchTerm.trim()}%` };
  const where = {
    [Op.or]: [
      { firstName: like },
      { lastName: like },
      { employeeNumber: like },
      { email: like },
    ],
  };
  if (companyId) where.companyId = companyId;
  if (status) where.status = status;

  return Employee.findAll({
    where,
    limit: Math.min(limit, 50),
    order: [
      ["lastName", "ASC"],
      ["firstName", "ASC"],
    ],
    attributes: [
      "id",
      "employeeNumber",
      "firstName",
      "middleName",
      "lastName",
      "email",
      "image",
      "status",
      "designationId",
    ],
    include: [
      {
        model: Designation,
        as: "designation",
        attributes: ["id", "name"],
        required: false,
      },
    ],
  });
};

const getOrgChart = async (rootEmployeeId, depth = 0, maxDepth = 4) => {
  if (depth >= maxDepth) return null;

  const employee = await Employee.findByPk(rootEmployeeId, {
    attributes: [
      "id",
      "employeeNumber",
      "firstName",
      "middleName",
      "lastName",
      "image",
      "status",
    ],
    include: [
      {
        model: Designation,
        as: "designation",
        attributes: ["id", "name"],
        required: false,
      },
    ],
  });
  if (!employee) throw new AppError("Employee not found", 404);

  const reports = await Employee.findAll({
    where: { reportsToId: rootEmployeeId, status: { [Op.ne]: "exited" } },
    attributes: [
      "id",
      "employeeNumber",
      "firstName",
      "middleName",
      "lastName",
      "image",
      "status",
    ],
    include: [
      {
        model: Designation,
        as: "designation",
        attributes: ["id", "name"],
        required: false,
      },
    ],
    order: [["lastName", "ASC"]],
  });

  const directReports = await Promise.all(
    reports.map((r) => getOrgChart(r.id, depth + 1, maxDepth)),
  );
  return { employee, directReports: directReports.filter(Boolean) };
};

const getDirectReports = async (managerId, query = {}) => {
  const { limit, offset, page } = getPaginationOptions(query);
  const manager = await Employee.findByPk(managerId, { attributes: ["id"] });
  if (!manager) throw new AppError("Manager not found", 404);

  const { count, rows } = await Employee.findAndCountAll({
    where: { reportsToId: managerId },
    limit,
    offset,
    order: [
      ["lastName", "ASC"],
      ["firstName", "ASC"],
    ],
    include: [...ORG_INCLUDES],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};

const deactivateUser = async (employeeId) => {
  const employee = await Employee.findByPk(employeeId, {
    attributes: ["id", "userId", "status"],
  });
  if (!employee) throw new AppError("Employee not found", 404);
  if (!employee.userId)
    throw new AppError("This employee has no linked User account", 422);
  await User.update(
    { status: "Suspended" },
    { where: { id: employee.userId } },
  );
  logger.info("User account suspended independently", {
    employeeId,
    userId: employee.userId,
  });
  return { message: "User account suspended — employee record unchanged" };
};

const activateUser = async (employeeId) => {
  const employee = await Employee.findByPk(employeeId, {
    attributes: ["id", "userId", "status"],
  });
  if (!employee) throw new AppError("Employee not found", 404);
  if (!employee.userId)
    throw new AppError("This employee has no linked User account", 422);
  const user = await User.findByPk(employee.userId, {
    attributes: ["id", "status"],
  });
  if (user.status === "Active")
    throw new AppError("User account is already active", 422);
  await User.update({ status: "Active" }, { where: { id: employee.userId } });
  logger.info("User account reactivated", {
    employeeId,
    userId: employee.userId,
  });
  return { message: "User account reactivated — employee record unchanged" };
};

// ═════════════════════════════════════════════════════════════════════════════
//  EDUCATION
// ═════════════════════════════════════════════════════════════════════════════

const getEducation = async (employeeId) => {
  await assertEmployeeExists(employeeId);
  return EmployeeEducation.findAll({
    where: { employeeId },
    include: [
      { model: EducationLevel, as: "educationLevels", required: false },
    ],
    order: [["gratuationDate", "DESC"]],
  });
};

const addEducation = async (employeeId, data) => {
  await assertEmployeeExists(employeeId);
  if (!data.institution) throw new AppError("institution is required", 422);

  const record = await EmployeeEducation.create({
    employeeId,
    majorOrField: data.majorOrField || null,
    institution: data.institution.trim(),
    gratuationDate: data.gratuationDate || null,
    certificate: data.certificate || false,
    keySkills: data.keySkills || [],
  });

  if (data.educationLevels && Array.isArray(data.educationLevels)) {
    await EducationLevel.bulkCreate(
      data.educationLevels.map((name) => ({
        employeeEducationId: record.id,
        name,
      })),
    );
  }

  logger.info("Education added", { employeeId, recordId: record.id });
  return record;
};

const updateEducation = async (employeeId, recordId, data) => {
  const record = await EmployeeEducation.findOne({
    where: { id: recordId, employeeId },
  });
  if (!record) throw new AppError("Education record not found", 404);

  if (data.educationLevels) {
    await EducationLevel.destroy({ where: { employeeEducationId: recordId } });
    await EducationLevel.bulkCreate(
      data.educationLevels.map((name) => ({
        employeeEducationId: recordId,
        name,
      })),
    );
    delete data.educationLevels;
  }

  await record.update(data);
  return record;
};

const deleteEducation = async (employeeId, recordId) => {
  const record = await EmployeeEducation.findOne({
    where: { id: recordId, employeeId },
  });
  if (!record) throw new AppError("Education record not found", 404);
  await EducationLevel.destroy({ where: { employeeEducationId: recordId } });
  await record.destroy();
  logger.info("Education deleted", { employeeId, recordId });
};
// ═════════════════════════════════════════════════════════════════════════════
//  EDUCATION LEVELS (standalone — used as dropdown source)
// ═════════════════════════════════════════════════════════════════════════════

const getEducationLevels = async () => {
  return EducationLevel.findAll({
    attributes: ["id", "name"],
    order: [["name", "ASC"]],
  });
};

const createEducationLevel = async (data) => {
  if (!data.name) throw new AppError("name is required", 422);

  const exists = await EducationLevel.findOne({ where: { name: data.name } });
  if (exists)
    throw new AppError(`Education level "${data.name}" already exists`, 409);

  const level = await EducationLevel.create({ name: data.name });
  logger.info("EducationLevel created", { id: level.id, name: level.name });
  return level;
};

// ═════════════════════════════════════════════════════════════════════════════
//  EXTERNAL WORK
// ═════════════════════════════════════════════════════════════════════════════

const getExternalWork = async (employeeId) => {
  await assertEmployeeExists(employeeId);
  return EmployeeExternalWork.findAll({
    where: { employeeId },
    order: [["fromDate", "DESC"]],
  });
};

const addExternalWork = async (employeeId, data) => {
  await assertEmployeeExists(employeeId);
  if (!data.companyName || !data.fromDate)
    throw new AppError("companyName and fromDate are required", 422);
  return EmployeeExternalWork.create({
    employeeId,
    companyName: data.companyName.trim(),
    industry: data.industry || null,
    country: data.country || null,
    region: data.region || null,
    zone: data.zone || null,
    city: data.city || null,
    designation: data.designation?.trim() || null,
    department: data.department?.trim() || null,
    employmentType: data.employmentType || null,
    fromDate: data.fromDate,
    toDate: data.toDate || null,
  });
};

const updateExternalWork = async (employeeId, recordId, data) => {
  const record = await EmployeeExternalWork.findOne({
    where: { id: recordId, employeeId },
  });
  if (!record) throw new AppError("Work history record not found", 404);
  await record.update(data);
  return record;
};

const deleteExternalWork = async (employeeId, recordId) => {
  const record = await EmployeeExternalWork.findOne({
    where: { id: recordId, employeeId },
  });
  if (!record) throw new AppError("Work history record not found", 404);
  await record.destroy();
  logger.info("External work deleted", { employeeId, recordId });
};

// ═════════════════════════════════════════════════════════════════════════════
//  EMERGENCY CONTACTS
// ═════════════════════════════════════════════════════════════════════════════

const getEmergencyContacts = async (employeeId) => {
  await assertEmployeeExists(employeeId);
  return EmployeeEmergencyContact.findAll({
    where: { employeeId },
    order: [["createdAt", "ASC"]],
  });
};

const addEmergencyContact = async (employeeId, data) => {
  await assertEmployeeExists(employeeId);
  if (!data.fullName || !data.relationship || !data.phone)
    throw new AppError("fullName, relationship and phone are required", 422);
  return EmployeeEmergencyContact.create({
    employeeId,
    fullName: data.fullName.trim(),
    relationship: data.relationship,
    relationshipOther: data.relationshipOther || null,
    phone: data.phone,
    alternatePhone: data.alternatePhone || null,
    email: data.email || null,
    nationalId: data.nationalId || null,
    photo: data.photo || null,
    address: data.address || null,
  });
};

const updateEmergencyContact = async (employeeId, recordId, data) => {
  const record = await EmployeeEmergencyContact.findOne({
    where: { id: recordId, employeeId },
  });
  if (!record) throw new AppError("Emergency contact not found", 404);
  await record.update(data);
  return record;
};

const deleteEmergencyContact = async (employeeId, recordId) => {
  const record = await EmployeeEmergencyContact.findOne({
    where: { id: recordId, employeeId },
  });
  if (!record) throw new AppError("Emergency contact not found", 404);
  await record.destroy();
  logger.info("Emergency contact deleted", { employeeId, recordId });
};

// ═════════════════════════════════════════════════════════════════════════════
//  SKILL MAP & LANGUAGES
// ═════════════════════════════════════════════════════════════════════════════

const getSkillMap = async (employeeId) => {
  await assertEmployeeExists(employeeId);
  const map = await EmployeeSkillMap.findOne({ where: { employeeId } });
  return (
    map || {
      employeeId,
      skills: [],
      certifications: [],
      certificateUrls: [],
      languages: [],
    }
  );
};

const upsertSkillMap = async (employeeId, data) => {
  await assertEmployeeExists(employeeId);
  const [map] = await EmployeeSkillMap.findOrCreate({
    where: { employeeId },
    defaults: {
      employeeId,
      skills: [],
      certifications: [],
      certificateUrls: [],
      languages: [],
    },
  });
  await map.update({
    skills: data.skills ?? map.skills,
    certifications: data.certifications ?? map.certifications,
    certificateUrls: data.certificateUrls ?? map.certificateUrls,
    languages: data.languages ?? map.languages,
  });
  logger.info("SkillMap saved", { employeeId });
  return map;
};

const getLanguages = async (employeeId) => {
  await assertEmployeeExists(employeeId);
  return Language.findAll({ where: { employeeId } });
};

const addLanguage = async (employeeId, data) => {
  await assertEmployeeExists(employeeId);
  if (!data.name) throw new AppError("name is required", 422);
  return Language.create({ employeeId, name: data.name });
};

const deleteLanguage = async (employeeId, languageId) => {
  const lang = await Language.findOne({
    where: { id: languageId, employeeId },
  });
  if (!lang) throw new AppError("Language not found", 404);
  await lang.destroy();
};

// ═════════════════════════════════════════════════════════════════════════════
//  SEPARATION
// ═════════════════════════════════════════════════════════════════════════════

const initiateSeparation = async (employeeId, data) => {
  const employee = await Employee.findByPk(employeeId, {
    attributes: ["id", "status"],
  });
  if (!employee) throw new AppError("Employee not found", 404);
  if (!["Active", "Suspended"].includes(employee.status))
    throw new AppError(
      `Cannot initiate separation for an employee in '${employee.status}' status`,
      422,
    );

  const existing = await EmployeeSeparation.findOne({ where: { employeeId } });
  if (existing && !["Rejected", "Draft"].includes(existing.status))
    throw new AppError(
      "A separation process is already underway for this employee",
      409,
    );

  if (!data.separationType)
    throw new AppError("separationType is required", 422);
  if (!data.initiatedBy) throw new AppError("initiatedBy is required", 422);

  const defaults = {
    separationType: data.separationType,
    initiatedBy: data.initiatedBy,
    resignationDate: data.resignationDate || null,
    lastWorkingDay: data.lastWorkingDay || null,
    reasonForLeaving: data.reasonForLeaving || null,
    additionalNotes: data.additionalNotes || null,
    status: "Draft",
  };

  if (existing) {
    await existing.update(defaults);
    return existing;
  }

  const separation = await EmployeeSeparation.create({
    employeeId,
    ...defaults,
  });
  logger.info("Separation initiated", {
    employeeId,
    separationType: data.separationType,
  });
  return separation;
};

const submitSeparation = async (employeeId) => {
  const separation = await findSeparation(employeeId);
  if (separation.status !== "Draft")
    throw new AppError(
      "Only Draft separations can be submitted for approval",
      422,
    );
  await separation.update({ status: "Pending" });
  return separation;
};

const approveSeparation = async (
  employeeId,
  approverUserId,
  { relievingDate } = {},
) => {
  const separation = await findSeparation(employeeId);
  if (separation.status !== "Pending")
    throw new AppError("Only pending separations can be approved", 422);

  const employee = await Employee.findByPk(employeeId, {
    include: [USER_INCLUDE],
  });
  const approver = await Employee.findOne({
    where: { userId: approverUserId },
    attributes: ["id"],
  });

  await sequelize.transaction(async (t) => {
    await separation.update(
      {
        status: "Approved",
        approvedById: approver?.id || null,
        approvedOn: new Date(),
        relievingDate: relievingDate || separation.lastWorkingDay || null,
      },
      { transaction: t },
    );
    await employee.update(
      {
        status: "exited",
        relievingDate: relievingDate || separation.lastWorkingDay || null,
      },
      { transaction: t },
    );
    if (employee.userId)
      await User.update(
        { status: "Inactive" },
        { where: { id: employee.userId }, transaction: t },
      );
  });

  logger.info("Separation approved — employee exited", {
    employeeId,
    approvedBy: approverUserId,
  });
  return separation.reload();
};

const rejectSeparation = async (employeeId, approverUserId, reason) => {
  if (!reason) throw new AppError("Rejection reason is required", 422);
  const separation = await findSeparation(employeeId);
  if (separation.status !== "Pending")
    throw new AppError("Only pending separations can be rejected", 422);
  const approver = await Employee.findOne({
    where: { userId: approverUserId },
    attributes: ["id"],
  });
  await separation.update({
    status: "Rejected",
    approvedById: approver?.id || null,
    approvedOn: new Date(),
    additionalNotes: reason,
  });
  logger.info("Separation rejected", { employeeId, reason });
  return separation;
};

// ═════════════════════════════════════════════════════════════════════════════
//  PROMOTIONS — READ ONLY
// ═════════════════════════════════════════════════════════════════════════════

const getPromotionHistory = async (employeeId, query = {}) => {
  await assertEmployeeExists(employeeId);
  const { limit, offset, page } = getPaginationOptions(query);
  const { count, rows } = await EmployeePromotion.findAndCountAll({
    where: { employeeId },
    limit,
    offset,
    order: [["promotionDate", "DESC"]],
    include: [
      {
        model: Department,
        as: "previousDepartment",
        foreignKey: "previousDepartmentId",
        required: false,
      },
      {
        model: Department,
        as: "newDepartment",
        foreignKey: "newDepartmentId",
        required: false,
      },
      {
        model: Designation,
        as: "previousDesignation",
        foreignKey: "previousDesignationId",
        required: false,
      },
      {
        model: Designation,
        as: "newDesignation",
        foreignKey: "newDesignationId",
        required: false,
      },
      {
        model: EmployeeGrade,
        as: "previousGrade",
        foreignKey: "previousGradeId",
        required: false,
      },
      {
        model: EmployeeGrade,
        as: "newGrade",
        foreignKey: "newGradeId",
        required: false,
      },
    ],
  });
  return { data: rows, meta: buildMeta(count, page, limit) };
};

// ═════════════════════════════════════════════════════════════════════════════
//  DASHBOARD & STATISTICS
// ═════════════════════════════════════════════════════════════════════════════

const getEmployeeStats = async (companyId, permFilter = {}) => {
  const where = { ...permFilter };
  if (companyId) where.companyId = companyId;

  const [total, active, onLeave, suspended, pending, exited] =
    await Promise.all([
      Employee.count({ where }),
      Employee.count({ where: { ...where, status: "Active" } }),
      Employee.count({ where: { ...where, status: "onLeave" } }),
      Employee.count({ where: { ...where, status: "Suspended" } }),
      Employee.count({ where: { ...where, status: "pending" } }),
      Employee.count({ where: { ...where, status: "exited" } }),
    ]);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  const startOfMonthStr = startOfMonth.toISOString().split("T")[0];

  const [newHiresThisMonth, exitsThisMonth] = await Promise.all([
    Employee.count({
      where: { ...where, dateOfJoining: { [Op.gte]: startOfMonthStr } },
    }),
    Employee.count({
      where: {
        ...where,
        status: "exited",
        relievingDate: { [Op.gte]: startOfMonthStr },
      },
    }),
  ]);

  const permConditions = [];
  if (permFilter.branchId)
    permConditions.push(`e.branch_id = '${permFilter.branchId}'`);
  if (permFilter.departmentId)
    permConditions.push(`e.department_id = '${permFilter.departmentId}'`);
  if (permFilter.designationId)
    permConditions.push(`e.designation_id = '${permFilter.designationId}'`);
  if (permFilter.employmentTypeId)
    permConditions.push(
      `e.employment_type_id = '${permFilter.employmentTypeId}'`,
    );
  if (permFilter.employeeGradeId)
    permConditions.push(
      `e.employee_grade_id = '${permFilter.employeeGradeId}'`,
    );
  const permSqlConditions =
    permConditions.length > 0 ? "AND " + permConditions.join(" AND ") : "";

  const branchRows = await sequelize.query(
    `SELECT e.branch_id, COALESCE(b.name, 'Not Assigned') as branch_name, COUNT(e.id) as count FROM employees e LEFT JOIN branches b ON b.id = e.branch_id WHERE e.status = 'Active' ${companyId ? `AND e.company_id = '${companyId}'` : ""} ${permSqlConditions} AND e.deleted_at IS NULL GROUP BY e.branch_id, b.name ORDER BY count DESC LIMIT 15`,
    { type: sequelize.QueryTypes.SELECT },
  );

  const deptRows = await sequelize.query(
    `SELECT e.department_id, d.name as department_name, COUNT(e.id) as count FROM employees e LEFT JOIN departments d ON d.id = e.department_id WHERE e.status = 'Active' ${companyId ? `AND e.company_id = '${companyId}'` : ""} ${permSqlConditions} AND e.deleted_at IS NULL GROUP BY e.department_id, d.name ORDER BY count DESC LIMIT 10`,
    { type: sequelize.QueryTypes.SELECT },
  );

  const desigRows = await sequelize.query(
    `SELECT e.designation_id, d.name as designation_name, COUNT(e.id) as count FROM employees e LEFT JOIN designations d ON d.id = e.designation_id WHERE e.status = 'Active' ${companyId ? `AND e.company_id = '${companyId}'` : ""} ${permSqlConditions} AND e.deleted_at IS NULL GROUP BY e.designation_id, d.name ORDER BY count DESC LIMIT 10`,
    { type: sequelize.QueryTypes.SELECT },
  );

  const empTypeRows = await sequelize.query(
    `SELECT e.employment_type_id, et.name as type_name, COUNT(e.id) as count FROM employees e LEFT JOIN employment_types et ON et.id = e.employment_type_id WHERE e.status = 'Active' ${companyId ? `AND e.company_id = '${companyId}'` : ""} ${permSqlConditions} AND e.deleted_at IS NULL GROUP BY e.employment_type_id, et.name ORDER BY count DESC`,
    { type: sequelize.QueryTypes.SELECT },
  );

  const genderRows = await sequelize.query(
    `SELECT COALESCE(e.gender, 'Not Specified') as gender, COUNT(e.id) as count FROM employees e WHERE e.status = 'Active' ${companyId ? `AND e.company_id = '${companyId}'` : ""} ${permSqlConditions} AND e.deleted_at IS NULL GROUP BY COALESCE(e.gender, 'Not Specified')`,
    { type: sequelize.QueryTypes.SELECT },
  );

  const gradeRows = await sequelize.query(
    `SELECT e.employee_grade_id, COALESCE(eg.name, 'Not Assigned') as grade_name, COUNT(e.id) as count FROM employees e LEFT JOIN employee_grades eg ON eg.id = e.employee_grade_id WHERE e.status = 'Active' ${companyId ? `AND e.company_id = '${companyId}'` : ""} ${permSqlConditions} AND e.deleted_at IS NULL GROUP BY e.employee_grade_id, eg.name ORDER BY count DESC`,
    { type: sequelize.QueryTypes.SELECT },
  );

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
  const twelveMonthsAgoStr = twelveMonthsAgo.toISOString().split("T")[0];

  const permConditionsNoAlias = [];
  if (permFilter.branchId)
    permConditionsNoAlias.push(`branch_id = '${permFilter.branchId}'`);
  if (permFilter.departmentId)
    permConditionsNoAlias.push(`department_id = '${permFilter.departmentId}'`);
  if (permFilter.designationId)
    permConditionsNoAlias.push(
      `designation_id = '${permFilter.designationId}'`,
    );
  if (permFilter.employmentTypeId)
    permConditionsNoAlias.push(
      `employment_type_id = '${permFilter.employmentTypeId}'`,
    );
  if (permFilter.employeeGradeId)
    permConditionsNoAlias.push(
      `employee_grade_id = '${permFilter.employeeGradeId}'`,
    );
  const permSqlConditionsNoAlias =
    permConditionsNoAlias.length > 0
      ? "AND " + permConditionsNoAlias.join(" AND ")
      : "";

  const monthlyJoiners = await sequelize.query(
    `SELECT TO_CHAR(date_of_joining, 'YYYY-MM') as month, COUNT(id) as count FROM employees WHERE date_of_joining >= '${twelveMonthsAgoStr}' ${companyId ? `AND company_id = '${companyId}'` : ""} ${permSqlConditionsNoAlias} AND deleted_at IS NULL GROUP BY TO_CHAR(date_of_joining, 'YYYY-MM') ORDER BY month ASC`,
    { type: sequelize.QueryTypes.SELECT },
  );

  const monthlyExits = await sequelize.query(
    `SELECT TO_CHAR(relieving_date, 'YYYY-MM') as month, COUNT(id) as count FROM employees WHERE relieving_date >= '${twelveMonthsAgoStr}' AND status = 'exited' ${companyId ? `AND company_id = '${companyId}'` : ""} ${permSqlConditionsNoAlias} AND deleted_at IS NULL GROUP BY TO_CHAR(relieving_date, 'YYYY-MM') ORDER BY month ASC`,
    { type: sequelize.QueryTypes.SELECT },
  );

  const turnoverRate =
    total > 0 ? parseFloat(((exitsThisMonth / total) * 100).toFixed(2)) : 0;
  const growthRate =
    total > 0
      ? parseFloat(
          (((newHiresThisMonth - exitsThisMonth) / total) * 100).toFixed(2),
        )
      : 0;

  return {
    total,
    active,
    onLeave,
    suspended,
    pending,
    exited,
    newHiresThisMonth,
    exitsThisMonth,
    turnoverRate,
    growthRate,
    branchDistribution: branchRows.map((r) => ({
      branchId: r.branch_id,
      branchName: r.branch_name || "Unassigned",
      count: parseInt(r.count, 10),
    })),
    departmentDistribution: deptRows.map((r) => ({
      departmentId: r.department_id,
      departmentName: r.department_name || "Unknown",
      count: parseInt(r.count, 10),
    })),
    designationDistribution: desigRows.map((r) => ({
      designationId: r.designation_id,
      designationName: r.designation_name || "Unknown",
      count: parseInt(r.count, 10),
    })),
    employmentTypeDistribution: empTypeRows.map((r) => ({
      employmentTypeId: r.employment_type_id,
      typeName: r.type_name || "Unknown",
      count: parseInt(r.count, 10),
    })),
    gradeDistribution: gradeRows.map((r) => ({
      gradeId: r.employee_grade_id,
      gradeName: r.grade_name || "Unassigned",
      count: parseInt(r.count, 10),
    })),
    genderDistribution: genderRows.map((r) => ({
      gender: r.gender || "Unspecified",
      count: parseInt(r.count, 10),
    })),
    monthlyJoiners: monthlyJoiners.map((r) => ({
      month: r.month,
      count: parseInt(r.count, 10),
    })),
    monthlyExits: monthlyExits.map((r) => ({
      month: r.month,
      count: parseInt(r.count, 10),
    })),
  };
};

const getUpcomingBirthdays = async (companyId, permFilter = {}) => {
  const where = { status: "Active", ...permFilter };
  if (companyId) where.companyId = companyId;
  const currentMonth = new Date().getMonth() + 1;

  const employees = await Employee.findAll({
    where,
    attributes: [
      "id",
      "firstName",
      "middleName",
      "lastName",
      "dateOfBirth",
      "image",
      "departmentId",
      "designationId",
    ],
    include: [
      { model: Department, as: "department", attributes: ["name"] },
      { model: Designation, as: "designation", attributes: ["name"] },
    ],
  });

  return employees
    .filter(
      (e) =>
        e.dateOfBirth &&
        new Date(e.dateOfBirth).getMonth() + 1 === currentMonth,
    )
    .map((e) => ({
      id: e.id,
      name: [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" "),
      dateOfBirth: e.dateOfBirth,
      department: e.department?.name,
      designation: e.designation?.name,
      image: e.image,
      day: new Date(e.dateOfBirth).getDate(),
    }))
    .sort((a, b) => a.day - b.day);
};

const getWorkAnniversaries = async (companyId, permFilter = {}) => {
  const where = { status: "Active", ...permFilter };
  if (companyId) where.companyId = companyId;
  const currentMonth = new Date().getMonth() + 1;

  const employees = await Employee.findAll({
    where,
    attributes: [
      "id",
      "firstName",
      "middleName",
      "lastName",
      "dateOfJoining",
      "image",
      "departmentId",
    ],
    include: [{ model: Department, as: "department", attributes: ["name"] }],
  });

  return employees
    .filter(
      (e) =>
        e.dateOfJoining &&
        new Date(e.dateOfJoining).getMonth() + 1 === currentMonth,
    )
    .map((e) => ({
      id: e.id,
      name: [e.firstName, e.middleName, e.lastName].filter(Boolean).join(" "),
      dateOfJoining: e.dateOfJoining,
      department: e.department?.name,
      image: e.image,
      years: new Date().getFullYear() - new Date(e.dateOfJoining).getFullYear(),
      day: new Date(e.dateOfJoining).getDate(),
    }))
    .sort((a, b) => a.day - b.day);
};

const getRecentlyJoined = async (companyId, limit = 10, permFilter = {}) => {
  const where = { status: { [Op.in]: ["Active", "onLeave"] }, ...permFilter };
  if (companyId) where.companyId = companyId;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  where.dateOfJoining = { [Op.gte]: thirtyDaysAgo.toISOString().split("T")[0] };

  return Employee.findAll({
    where,
    attributes: [
      "id",
      "firstName",
      "lastName",
      "dateOfJoining",
      "image",
      "designationId",
    ],
    include: [{ model: Designation, as: "designation", attributes: ["name"] }],
    order: [["dateOfJoining", "DESC"]],
    limit,
  });
};

const getFilterOptions = async (companyId) => {
  const where = {};
  if (companyId) where.companyId = companyId;

  const [departments, designations, employmentTypes, employeeGrades, branches] =
    await Promise.all([
      Employee.findAll({
        attributes: ["departmentId"],
        where: { ...where, departmentId: { [Op.ne]: null } },
        include: [
          { model: Department, as: "department", attributes: ["id", "name"] },
        ],
        group: ["departmentId", "department.id", "department.name"],
      }),
      Employee.findAll({
        attributes: ["designationId"],
        where: { ...where, designationId: { [Op.ne]: null } },
        include: [
          { model: Designation, as: "designation", attributes: ["id", "name"] },
        ],
        group: ["designationId", "designation.id", "designation.name"],
      }),
      Employee.findAll({
        attributes: ["employmentTypeId"],
        where: { ...where, employmentTypeId: { [Op.ne]: null } },
        include: [
          {
            model: EmploymentType,
            as: "employmentType",
            attributes: ["id", "name"],
          },
        ],
        group: ["employmentTypeId", "employmentType.id", "employmentType.name"],
      }),
      Employee.findAll({
        attributes: ["employeeGradeId"],
        where: { ...where, employeeGradeId: { [Op.ne]: null } },
        include: [
          {
            model: EmployeeGrade,
            as: "employeeGrade",
            attributes: ["id", "name"],
          },
        ],
        group: ["employeeGradeId", "employeeGrade.id", "employeeGrade.name"],
      }),
      Employee.findAll({
        attributes: ["branchId"],
        where: { ...where, branchId: { [Op.ne]: null } },
        include: [{ model: Branch, as: "branch", attributes: ["id", "name"] }],
        group: ["branchId", "branch.id", "branch.name"],
      }),
    ]);

  return {
    departments: departments.map((d) => ({
      id: d.departmentId,
      name: d.department?.name,
    })),
    designations: designations.map((d) => ({
      id: d.designationId,
      name: d.designation?.name,
    })),
    employmentTypes: employmentTypes.map((d) => ({
      id: d.employmentTypeId,
      name: d.employmentType?.name,
    })),
    employeeGrades: employeeGrades.map((d) => ({
      id: d.employeeGradeId,
      name: d.employeeGrade?.name,
    })),
    branches: branches.map((d) => ({ id: d.branchId, name: d.branch?.name })),
  };
};

const getEmployeeTimeline = async (employeeId) => {
  await assertEmployeeExists(employeeId);

  const [promotions, separations] = await Promise.all([
    EmployeePromotion.findAll({
      where: { employeeId },
      order: [["promotionDate", "DESC"]],
      include: [
        {
          model: Designation,
          as: "newDesignation",
          foreignKey: "newDesignationId",
          attributes: ["name"],
          required: false,
        },
        {
          model: EmployeeGrade,
          as: "newGrade",
          foreignKey: "newGradeId",
          attributes: ["name"],
          required: false,
        },
      ],
    }),
    EmployeeSeparation.findAll({
      where: { employeeId },
      order: [["createdAt", "DESC"]],
    }),
  ]);

  const timeline = [
    ...promotions.map((p) => ({
      type: p.promotionType === "Promotion" ? "promotion" : "demotion",
      date: p.promotionDate,
      title: p.promotionType === "Promotion" ? "Promoted" : "Demoted",
      description: p.newDesignation?.name
        ? `${p.newDesignation.name}${p.newGrade?.name ? ` (${p.newGrade.name})` : ""}`
        : null,
      reason: p.reason,
    })),
    ...separations.map((s) => ({
      type: "separation",
      date: s.createdAt,
      title: `Separation — ${s.separationType}`,
      description: s.status === "Approved" ? "Approved" : s.status,
      reason: s.reasonForLeaving,
    })),
  ];

  return timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
};

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
  getEmployeeByUserId,
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
