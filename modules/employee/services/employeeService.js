'use strict';

/**
 * modules/employee/services/employeeService.js
 *
 * Complete employee lifecycle service covering:
 *
 *  ── CORE PROFILE ──────────────────────────────────────────────────────
 *  createEmployee          HR creates + GM approves → User account provisioned
 *  getEmployees            Paginated list with rich filters + RBAC scope
 *  getEmployeeById         Full profile with all sub-records
 *  getMyProfile            Self-service read-only — employee reads their own record
 *  updateEmployee          HR-only field updates (no status, no promotion fields)
 *  updateEmployeeStatus    Lifecycle transitions: Active ↔ Suspended ↔ onLeave ↔ exited
 *  approveEmployee         GM approval — creates User account + temporary password
 *  searchEmployees         Full-text search across name, number, email
 *  getOrgChart             Self-ref reportsTo tree for org chart rendering
 *  getDirectReports        All employees reporting to a given manager
 *  deactivateUser          Suspends the linked User account without separating
 *  activateUser            Reactivates a suspended User account
 *  createEmployeeFromExistingUser  Create Employee record for an existing User
 *
 *  ── EDUCATION ─────────────────────────────────────────────────────────
 *  addEducation            Add a qualification record
 *  updateEducation         Edit a qualification (HR only)
 *  deleteEducation         Remove a qualification
 *  getEducation            All qualifications for an employee
 *
 *  ── EXTERNAL WORK (previous employment) ──────────────────────────────
 *  addExternalWork         Add a work history record
 *  updateExternalWork      Edit a work history record (HR only)
 *  deleteExternalWork      Remove a work history record
 *  getExternalWork         Full employment history for an employee
 *
 *  ── EMERGENCY CONTACTS ────────────────────────────────────────────────
 *  addEmergencyContact     Add an emergency contact
 *  updateEmergencyContact  Edit an emergency contact
 *  deleteEmergencyContact  Remove an emergency contact
 *  getEmergencyContacts    All contacts for an employee
 *
 *  ── SKILL MAP ─────────────────────────────────────────────────────────
 *  getSkillMap             Fetch the skill map record
 *  upsertSkillMap          Create or fully replace skill map
 *
 *  ── SEPARATION ────────────────────────────────────────────────────────
 *  initiateSeparation      HR creates the separation record (Draft)
 *  submitSeparation        HR submits for GM approval
 *  approveSeparation       GM approves → Employee.status = 'exited', User deactivated
 *  rejectSeparation        GM rejects → back to Draft
 *
 *  ── PROMOTIONS (READ-ONLY) ────────────────────────────────────────────
 *  getPromotionHistory     All promotion/demotion records for an employee
 *
 * Architecture:
 *   — No req / res — pure data in, data out
 *   — Every mutating operation that touches more than one table uses a transaction
 *   — AppError with correct HTTP status on every business rule violation
 *   — All list functions return { data, meta }
 *   — Sensitive fields (passwordHash) are explicitly excluded
 */

const { Op }     = require('sequelize');
const bcrypt     = require('bcrypt');

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
  EmployeeExternalWork,
  EmployeeEmergencyContact,
  EmployeeSkillMap,
  EmployeeSeparation,
  EmployeePromotion,
} = require('../../../models');

const { AppError }                           = require('../../../middlewares/errorMiddleware');
const { getPaginationOptions, buildMeta }    = require('../../../utils/pagination');
const logger                                 = require('../../../utils/logger');

const SALT_ROUNDS = 10;

// ─────────────────────────────────────────────────────────────────────────────
//  SHARED INCLUDE SETS
// ─────────────────────────────────────────────────────────────────────────────

const ORG_INCLUDES = [
  { model: Company, as: 'company',         attributes: ['id', 'name', 'abbr'] },
  { model: Branch, as: 'branch',           attributes: ['id', 'name'], required: false },
  { model: Department, as: 'department',   attributes: ['id', 'name'], required: false },
  { model: Designation, as: 'designation', attributes: ['id', 'name'], required: false },
  { model: EmploymentType, as: 'employmentType', attributes: ['id', 'name'], required: false },
  { model: EmployeeGrade, as: 'employeeGrade',   attributes: ['id', 'name'], required: false },
];

const MANAGER_INCLUDE = {
  model:      Employee,
  as:         'reportsTo',
  attributes: ['id', 'firstName', 'middleName', 'lastName', 'employeeNumber', 'image'],
  required:   false,
};

const USER_INCLUDE = {
  model:      User,
  as:         'user',
  attributes: ['id', 'email', 'status', 'lastLogin', 'isSuperUser', 'isSystemManager'],
  required:   false,
};

const FULL_INCLUDES = [
  ...ORG_INCLUDES,
  MANAGER_INCLUDE,
  USER_INCLUDE,
];

// ─────────────────────────────────────────────────────────────────────────────
//  INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const generateEmployeeNumber = async (transaction) => {
  const year  = new Date().getFullYear();
  const count = await Employee.count({
    where: {
      employeeNumber: { [Op.like]: `EMP-${year}-%` },
    },
    transaction,
    paranoid: false,
  });
  return `EMP-${year}-${String(count + 1).padStart(4, '0')}`;
};

const generateTemporaryPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let suffix  = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `Tw@${suffix}`;
};

const getEmployeeByUserId = async (userId) => {
  const emp = await Employee.findOne({
    where:   { userId },
    include: FULL_INCLUDES,
  });
  if (!emp) throw new AppError('No employee record linked to this account', 404);
  return emp;
};

const validateOrgFKs = async (data) => {
  const checks = [];

  if (data.companyId) {
    checks.push(
      Company.findByPk(data.companyId, { attributes: ['id'] })
        .then(r => { if (!r) throw new AppError('Company not found', 404); })
    );
  }
  if (data.branchId) {
    checks.push(
      Branch.findByPk(data.branchId, { attributes: ['id'] })
        .then(r => { if (!r) throw new AppError('Branch not found', 404); })
    );
  }
  if (data.departmentId) {
    checks.push(
      Department.findByPk(data.departmentId, { attributes: ['id'] })
        .then(r => { if (!r) throw new AppError('Department not found', 404); })
    );
  }
  if (data.designationId) {
    checks.push(
      Designation.findByPk(data.designationId, { attributes: ['id'] })
        .then(r => { if (!r) throw new AppError('Designation not found', 404); })
    );
  }
  if (data.employmentTypeId) {
    checks.push(
      EmploymentType.findByPk(data.employmentTypeId, { attributes: ['id'] })
        .then(r => { if (!r) throw new AppError('Employment type not found', 404); })
    );
  }
  if (data.employeeGradeId) {
    checks.push(
      EmployeeGrade.findByPk(data.employeeGradeId, { attributes: ['id'] })
        .then(r => { if (!r) throw new AppError('Employee grade not found', 404); })
    );
  }
  if (data.reportsToId) {
    checks.push(
      Employee.findByPk(data.reportsToId, { attributes: ['id'] })
        .then(r => { if (!r) throw new AppError('Manager (reportsTo) not found', 404); })
    );
  }

  await Promise.all(checks);
};

const assertEmployeeExists = async (id) => {
  const exists = await Employee.count({ where: { id } });
  if (!exists) throw new AppError('Employee not found', 404);
};

const findSeparation = async (employeeId) => {
  const sep = await EmployeeSeparation.findOne({ where: { employeeId } });
  if (!sep) throw new AppError('No separation record found for this employee', 404);
  return sep;
};


// ═════════════════════════════════════════════════════════════════════════════
//  CORE PROFILE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * HR creates a new employee record — status starts as 'Inactive' pending GM approval.
 */
const createEmployee = async (data) => {
  if (!data.firstName || !data.lastName) {
    throw new AppError('firstName and lastName are required', 422);
  }
  if (!data.companyId) {
    throw new AppError('companyId is required', 422);
  }
  if (!data.dateOfJoining) {
    throw new AppError('dateOfJoining is required', 422);
  }

  await validateOrgFKs(data);

  if (data.email) {
    const emailTaken = await Employee.findOne({
      where: { email: data.email.toLowerCase().trim() },
    });
    if (emailTaken) {
      throw new AppError('An employee with this email already exists', 409);
    }
  }

  const employee = await sequelize.transaction(async (t) => {
    const empNumber = await generateEmployeeNumber(t);

    const emp = await Employee.create({
      // Identity
      firstName:      data.firstName.trim(),
      middleName:     data.middleName?.trim() || null,
      lastName:       data.lastName.trim(),
      salutation:     data.salutation   || null,
      gender:         data.gender       || null,
      maritalStatus:  data.maritalStatus || null,
      image:          data.image        || null,

      // Org FKs
      companyId:        data.companyId,
      branchId:         data.branchId         || null,
      departmentId:     data.departmentId     || null,
      designationId:    data.designationId    || null,
      employmentTypeId: data.employmentTypeId || null,
      employeeGradeId:  data.employeeGradeId  || null,
      reportsToId:      data.reportsToId      || null,

      // Employment
      employeeNumber:   empNumber,
      dateOfJoining:    data.dateOfJoining,
      contractEndDate:  data.contractEndDate || null,
      relievingDate:    null,
      encashmentDate:   null,
      status:           'Inactive',
      userId:           null,

      // Professional links
      portfolioUrl: data.portfolioUrl || null,
      githubUrl:    data.githubUrl    || null,

      // Contact
      email:       data.email?.toLowerCase().trim() || null,
      phoneNumber: data.phoneNumber || null,

      // Address
      City:               data.City               || null,
      Region:             data.Region             || null,
      zone:               data.zone               || null,
      Country:            data.Country            || null,
      currentPostalCode:  data.currentPostalCode  || null,

      // Bank
      bankName:          data.bankName          || null,
      bankAccountNumber: data.bankAccountNumber || null,
      mobileMoneyNumber: data.mobileMoneyNumber || null,
      paymentMethod:     data.paymentMethod     || 'Bank Transfer',

      // Leave / Attendance defaults
      holidayListId:     data.holidayListId     || null,
      leaveApprovedById: data.leaveApprovedById || null,

      // Documents & IDs
      employeeDocuments: data.employeeDocuments || null,
      nationalIdNumber:  data.nationalIdNumber  || null,
    }, { transaction: t });

    return emp;
  });

  logger.info('Employee created (pending GM approval)', {
    employeeId:     employee.id,
    employeeNumber: employee.employeeNumber,
    name:           `${employee.firstName} ${employee.lastName}`,
  });

  return employee;
};

/**
 * Create an Employee record for an existing User account.
 */
const createEmployeeFromExistingUser = async (userId, data) => {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'email', 'firstName', 'middleName', 'lastName', 'status']
  });
  
  if (!user) throw new AppError('User not found', 404);
  if (user.status !== 'Active') {
    throw new AppError('User account must be Active to create an Employee record', 422);
  }

  const existingEmp = await Employee.findOne({ where: { userId: user.id } });
  if (existingEmp) {
    throw new AppError(`Employee record already exists for this user (${existingEmp.employeeNumber})`, 409);
  }

  if (!data.companyId) throw new AppError('companyId is required', 422);
  if (!data.dateOfJoining) throw new AppError('dateOfJoining is required', 422);
  
  await validateOrgFKs(data);

  const email = data.email || user.email;
  const emailTaken = await Employee.findOne({
    where: { email: email.toLowerCase().trim() }
  });
  if (emailTaken) {
    throw new AppError('An employee with this email already exists', 409);
  }

  const employee = await sequelize.transaction(async (t) => {
    const empNumber = await generateEmployeeNumber(t);

    const emp = await Employee.create({
      userId:     user.id,
      firstName:  user.firstName,
      middleName: user.middleName || null,
      lastName:   user.lastName,

      companyId:        data.companyId,
      branchId:         data.branchId         || null,
      departmentId:     data.departmentId     || null,
      designationId:    data.designationId    || null,
      employmentTypeId: data.employmentTypeId || null,
      employeeGradeId:  data.employeeGradeId  || null,
      reportsToId:      data.reportsToId      || null,

      employeeNumber:   empNumber,
      dateOfJoining:    data.dateOfJoining,
      contractEndDate:  data.contractEndDate || null,
      status:           'Active',

      portfolioUrl: data.portfolioUrl || null,
      githubUrl:    data.githubUrl    || null,

      email:       email.toLowerCase().trim(),
      phoneNumber: data.phoneNumber || null,

      City:               data.City               || null,
      Region:             data.Region             || null,
      zone:               data.zone               || null,
      Country:            data.Country            || null,
      currentPostalCode:  data.currentPostalCode  || null,

      bankName:          data.bankName          || null,
      bankAccountNumber: data.bankAccountNumber || null,
      mobileMoneyNumber: data.mobileMoneyNumber || null,
      paymentMethod:     data.paymentMethod     || 'Bank Transfer',

      holidayListId:     data.holidayListId     || null,
      leaveApprovedById: data.leaveApprovedById || null,

      employeeDocuments: data.employeeDocuments || null,
      nationalIdNumber:  data.nationalIdNumber  || null,
    }, { transaction: t });

    return emp;
  });

  logger.info('Employee created from existing User', {
    userId:     user.id,
    employeeId: employee.id,
    employeeNumber: employee.employeeNumber,
  });

  return employee;
};

/**
 * GM approves a pending employee — creates User account + temp password.
 */
const approveEmployee = async (employeeId, approverUserId) => {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new AppError('Employee not found', 404);
  if (employee.status !== 'Inactive') {
    throw new AppError(`Employee cannot be approved from status '${employee.status}'`, 422);
  }
  if (!employee.email) {
    throw new AppError('Employee must have an email before a User account can be created', 422);
  }

  const approver = await User.unscoped().findByPk(approverUserId, { attributes: ['id', 'isSuperUser', 'isSystemManager'] });
  if (!approver) throw new AppError('Approver not found', 404);

  const existingUser = await User.unscoped().findOne({ where: { email: employee.email } });
  const temporaryPassword = generateTemporaryPassword();

  const result = await sequelize.transaction(async (t) => {
    let user;

    if (existingUser) {
      const newHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);
      await existingUser.update({
        passwordHash: newHash,
        status:       'Active',
        firstName:    employee.firstName,
        middleName:   employee.middleName,
        lastName:     employee.lastName,
      }, { transaction: t });
      user = existingUser;
    } else {
      user = await User.create({
        firstName:    employee.firstName,
        middleName:   employee.middleName,
        lastName:     employee.lastName,
        email:        employee.email,
        passwordHash: temporaryPassword,
        status:       'Active',
        language:     'en',
      }, { transaction: t });
    }

    await employee.update({ userId: user.id, status: 'Active' }, { transaction: t });

    return { employee, user };
  });

  logger.info('Employee approved — User account provisioned', {
    employeeId,
    userId:     result.user.id,
    email:      employee.email,
    approvedBy: approverUserId,
  });

  return { employee: result.employee, temporaryPassword };
};

/**
 * Paginated employee list with rich filtering.
 */
const getEmployees = async (query = {}, permFilter = {}) => {
  const {
    companyId, branchId, departmentId, designationId,
    employmentTypeId, employeeGradeId, status, reportsToId,
    search,
  } = query;

  const { limit, offset, page } = getPaginationOptions(query);
  const where = { ...permFilter };

  if (companyId)        where.companyId        = companyId;
  if (branchId)         where.branchId         = branchId;
  if (departmentId)     where.departmentId     = departmentId;
  if (designationId)    where.designationId    = designationId;
  if (employmentTypeId) where.employmentTypeId = employmentTypeId;
  if (employeeGradeId)  where.employeeGradeId  = employeeGradeId;
  if (reportsToId)      where.reportsToId      = reportsToId;

  if (status) {
    const statuses = status.split(',').map(s => s.trim());
    where.status = statuses.length === 1 ? statuses[0] : { [Op.in]: statuses };
  }

  if (search) {
    const like = { [Op.iLike]: `%${search}%` };
    where[Op.or] = [
      { firstName:      like },
      { lastName:       like },
      { employeeNumber: like },
      { email:          like },
    ];
  }

  const { count, rows } = await Employee.findAndCountAll({
    where,
    limit,
    offset,
    order: [['status', 'ASC'], ['lastName', 'ASC'], ['firstName', 'ASC']],
    include: [...ORG_INCLUDES, MANAGER_INCLUDE, USER_INCLUDE],
    attributes: {
      exclude: ['nationalIdNumber', 'bankAccountNumber', 'mobileMoneyNumber', 'employeeDocuments'],
    },
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};

/**
 * Full employee profile — all sub-records included.
 */
const getEmployeeById = async (id) => {
  const employee = await Employee.findByPk(id, {
    include: [
      ...FULL_INCLUDES,
      { model: EmployeeEducation,        required: false },
      { model: EmployeeExternalWork,     required: false },
      { model: EmployeeEmergencyContact, required: false },
      { model: EmployeeSkillMap,         required: false },
      { model: EmployeeSeparation,       required: false },
      {
        model:    EmployeePromotion,
        required: false,
        order:    [['promotionDate', 'DESC']],
        separate: true,
        limit:    10,
      },
    ],
  });

  if (!employee) throw new AppError('Employee not found', 404);
  return employee;
};

/**
 * Self-service profile — employee reads their own record.
 */
const getMyProfile = async (userId) => {
  const employee = await Employee.findOne({
    where: { userId },
    include: [
      USER_INCLUDE,
      ...ORG_INCLUDES,
      MANAGER_INCLUDE,
      { model: EmployeeEducation,        required: false },
      { model: EmployeeExternalWork,     required: false },
      { model: EmployeeEmergencyContact, required: false },
      { model: EmployeeSkillMap,         required: false },
    ],
    attributes: { exclude: ['employeeDocuments'] },
  });

  if (!employee) throw new AppError('No employee profile found for this account', 404);
  return employee;
};

/**
 * HR updates a subset of employee fields.
 */
const updateEmployee = async (id, data) => {
  const employee = await Employee.findByPk(id);
  if (!employee) throw new AppError('Employee not found', 404);
  if (employee.status === 'exited') {
    throw new AppError('Cannot edit a separated employee record', 422);
  }

  const blocked = ['status', 'userId', 'employeeNumber', 'relievingDate', 'encashmentDate'];
  blocked.forEach(field => delete data[field]);

  const fkFields = ['companyId','branchId','departmentId','designationId','employmentTypeId','employeeGradeId','reportsToId'];
  const fkChanges = {};
  fkFields.forEach(f => { if (data[f] !== undefined) fkChanges[f] = data[f]; });
  if (Object.keys(fkChanges).length) await validateOrgFKs(fkChanges);

  if (data.email && data.email !== employee.email) {
    const taken = await Employee.findOne({
      where: { email: data.email.toLowerCase().trim(), id: { [Op.ne]: id } },
    });
    if (taken) throw new AppError('This email is already assigned to another employee', 409);

    if (employee.userId) {
      await User.update(
        { email: data.email.toLowerCase().trim() },
        { where: { id: employee.userId } },
      );
    }
  }

  if (data.firstName)   data.firstName   = data.firstName.trim();
  if (data.lastName)    data.lastName    = data.lastName.trim();
  if (data.middleName)  data.middleName  = data.middleName?.trim();
  if (data.email)       data.email       = data.email.toLowerCase().trim();

  await employee.update(data);

  logger.info('Employee updated', { employeeId: id });
  return employee.reload({ include: FULL_INCLUDES });
};

/**
 * Lifecycle status transitions.
 */
const updateEmployeeStatus = async (id, newStatus, reason, changedByUserId) => {
  const VALID_STATUSES = ['Active', 'Inactive', 'onLeave', 'Suspended', 'exited'];
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new AppError(`Invalid status: '${newStatus}'`, 422);
  }

  const employee = await Employee.findByPk(id, { include: [USER_INCLUDE] });
  if (!employee) throw new AppError('Employee not found', 404);

  const current = employee.status;

  if (newStatus === 'exited') {
    throw new AppError('Employee status cannot be set to exited directly — initiate a Separation record instead', 422);
  }
  if (current === 'Inactive' && newStatus === 'Active') {
    throw new AppError('Cannot manually activate an Inactive employee — use the GM Approval flow instead', 422);
  }
  if (current === 'exited') {
    throw new AppError('Cannot change the status of an already separated employee', 422);
  }
  if (current === newStatus) {
    throw new AppError(`Employee is already in '${newStatus}' status`, 422);
  }
  if (newStatus === 'Suspended' && !reason) {
    throw new AppError('A reason is required when suspending an employee', 422);
  }

  await sequelize.transaction(async (t) => {
    await employee.update({ status: newStatus }, { transaction: t });

    if (employee.userId) {
      const userStatus = newStatus === 'Suspended' ? 'Suspended' : 'Active';
      await User.update(
        { status: userStatus },
        { where: { id: employee.userId }, transaction: t },
      );
    }
  });

  logger.info('Employee status changed', {
    employeeId: id, from: current, to: newStatus, reason, changedBy: changedByUserId,
  });

  return employee.reload({ include: FULL_INCLUDES });
};

/**
 * Full-text search across the employee table.
 */
const searchEmployees = async (searchTerm, { companyId, status, limit = 20 } = {}) => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    throw new AppError('Search term must be at least 2 characters', 422);
  }

  const like  = { [Op.iLike]: `%${searchTerm.trim()}%` };
  const where = {
    [Op.or]: [
      { firstName: like }, { lastName: like }, { employeeNumber: like }, { email: like },
    ],
  };

  if (companyId) where.companyId = companyId;
  if (status)    where.status    = status;

  return Employee.findAll({
    where,
    limit: Math.min(limit, 50),
    order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    attributes: ['id', 'employeeNumber', 'firstName', 'middleName', 'lastName', 'email', 'image', 'status', 'designationId'],
    include: [{ model: Designation, as: 'designation', attributes: ['id', 'name'], required: false }],
  });
};

/**
 * Returns the org-chart tree rooted at a given employee.
 */
const getOrgChart = async (rootEmployeeId, depth = 0, maxDepth = 4) => {
  if (depth >= maxDepth) return null;

  const employee = await Employee.findByPk(rootEmployeeId, {
    attributes: ['id', 'employeeNumber', 'firstName', 'middleName', 'lastName', 'image', 'status'],
    include: [{ model: Designation, as: 'designation', attributes: ['id', 'name'], required: false }],
  });
  if (!employee) throw new AppError('Employee not found', 404);

  const reports = await Employee.findAll({
    where: { reportsToId: rootEmployeeId, status: { [Op.ne]: 'exited' } },
    attributes: ['id', 'employeeNumber', 'firstName', 'middleName', 'lastName', 'image', 'status'],
    include: [{ model: Designation, as: 'designation', attributes: ['id', 'name'], required: false }],
    order: [['lastName', 'ASC']],
  });

  const directReports = await Promise.all(reports.map(r => getOrgChart(r.id, depth + 1, maxDepth)));

  return { employee, directReports: directReports.filter(Boolean) };
};

/**
 * Returns all direct reports for a manager — flat list, paginated.
 */
const getDirectReports = async (managerId, query = {}) => {
  const { limit, offset, page } = getPaginationOptions(query);
  const manager = await Employee.findByPk(managerId, { attributes: ['id'] });
  if (!manager) throw new AppError('Manager not found', 404);

  const { count, rows } = await Employee.findAndCountAll({
    where: { reportsToId: managerId },
    limit, offset,
    order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    include: [...ORG_INCLUDES],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};

/**
 * Suspends the linked User account without changing the employee's status.
 */
const deactivateUser = async (employeeId) => {
  const employee = await Employee.findByPk(employeeId, { attributes: ['id', 'userId', 'status'] });
  if (!employee) throw new AppError('Employee not found', 404);
  if (!employee.userId) throw new AppError('This employee has no linked User account', 422);

  await User.update({ status: 'Suspended' }, { where: { id: employee.userId } });
  logger.info('User account suspended independently', { employeeId, userId: employee.userId });
  return { message: 'User account suspended — employee record unchanged' };
};

/**
 * Reactivates the linked User account.
 */
const activateUser = async (employeeId) => {
  const employee = await Employee.findByPk(employeeId, { attributes: ['id', 'userId', 'status'] });
  if (!employee) throw new AppError('Employee not found', 404);
  if (!employee.userId) throw new AppError('This employee has no linked User account', 422);

  const user = await User.findByPk(employee.userId, { attributes: ['id', 'status'] });
  if (user.status === 'Active') throw new AppError('User account is already active', 422);

  await User.update({ status: 'Active' }, { where: { id: employee.userId } });
  logger.info('User account reactivated', { employeeId, userId: employee.userId });
  return { message: 'User account reactivated — employee record unchanged' };
};


// ═════════════════════════════════════════════════════════════════════════════
//  EDUCATION
// ═════════════════════════════════════════════════════════════════════════════

const getEducation = async (employeeId) => {
  await assertEmployeeExists(employeeId);
  return EmployeeEducation.findAll({
    where: { employeeId },
    order: [['toDate', 'DESC'], ['fromDate', 'DESC']],
  });
};

const addEducation = async (employeeId, data) => {
  await assertEmployeeExists(employeeId);

  if (!data.level || !data.qualification || !data.institution) {
    throw new AppError('level, qualification and institution are required', 422);
  }

  const record = await EmployeeEducation.create({
    employeeId,
    level:         data.level,
    qualification: data.qualification.trim(),
    majorOrField:  data.majorOrField?.trim() || null,
    institution:   data.institution.trim(),
    fromDate:      data.fromDate || null,
    toDate:        data.toDate   || null,
    grade:         data.grade?.trim() || null,
    certificateUrl: data.certificateUrl || null,
  });

  logger.info('Education added', { employeeId, recordId: record.id });
  return record;
};

const updateEducation = async (employeeId, recordId, data) => {
  const record = await EmployeeEducation.findOne({ where: { id: recordId, employeeId } });
  if (!record) throw new AppError('Education record not found', 404);
  await record.update(data);
  return record;
};

const deleteEducation = async (employeeId, recordId) => {
  const record = await EmployeeEducation.findOne({ where: { id: recordId, employeeId } });
  if (!record) throw new AppError('Education record not found', 404);
  await record.destroy();
  logger.info('Education deleted', { employeeId, recordId });
};


// ═════════════════════════════════════════════════════════════════════════════
//  EXTERNAL WORK (previous employment history)
// ═════════════════════════════════════════════════════════════════════════════

const getExternalWork = async (employeeId) => {
  await assertEmployeeExists(employeeId);
  return EmployeeExternalWork.findAll({
    where: { employeeId },
    order: [['fromDate', 'DESC']],
  });
};

const addExternalWork = async (employeeId, data) => {
  await assertEmployeeExists(employeeId);

  if (!data.companyName || !data.fromDate) {
    throw new AppError('companyName and fromDate are required', 422);
  }

  const record = await EmployeeExternalWork.create({
    employeeId,
    companyName:    data.companyName.trim(),
    industry:       data.industry    || null,
    country:        data.country     || null,
    region:         data.region      || null,
    zone:           data.zone        || null,
    city:           data.city        || null,
    designation:    data.designation?.trim() || null,
    department:     data.department?.trim()  || null,
    employmentType: data.employmentType || null,
    fromDate:       data.fromDate,
    toDate:         data.toDate || null,
    exitReason:     data.exitReason || null,
  });

  logger.info('External work added', { employeeId, recordId: record.id });
  return record;
};

const updateExternalWork = async (employeeId, recordId, data) => {
  const record = await EmployeeExternalWork.findOne({ where: { id: recordId, employeeId } });
  if (!record) throw new AppError('Work history record not found', 404);
  await record.update(data);
  return record;
};

const deleteExternalWork = async (employeeId, recordId) => {
  const record = await EmployeeExternalWork.findOne({ where: { id: recordId, employeeId } });
  if (!record) throw new AppError('Work history record not found', 404);
  await record.destroy();
  logger.info('External work deleted', { employeeId, recordId });
};


// ═════════════════════════════════════════════════════════════════════════════
//  EMERGENCY CONTACTS
// ═════════════════════════════════════════════════════════════════════════════

const getEmergencyContacts = async (employeeId) => {
  await assertEmployeeExists(employeeId);
  return EmployeeEmergencyContact.findAll({
    where: { employeeId },
    order: [['createdAt', 'ASC']],
  });
};

const addEmergencyContact = async (employeeId, data) => {
  await assertEmployeeExists(employeeId);

  if (!data.fullName || !data.relationship || !data.phone) {
    throw new AppError('fullName, relationship and phone are required', 422);
  }

  return EmployeeEmergencyContact.create({
    employeeId,
    fullName:          data.fullName.trim(),
    relationship:      data.relationship,
    relationshipOther: data.relationshipOther || null,
    phone:             data.phone,
    alternatePhone:    data.alternatePhone || null,
    email:             data.email          || null,
  });
};

const updateEmergencyContact = async (employeeId, recordId, data) => {
  const record = await EmployeeEmergencyContact.findOne({ where: { id: recordId, employeeId } });
  if (!record) throw new AppError('Emergency contact not found', 404);
  await record.update(data);
  return record;
};

const deleteEmergencyContact = async (employeeId, recordId) => {
  const record = await EmployeeEmergencyContact.findOne({ where: { id: recordId, employeeId } });
  if (!record) throw new AppError('Emergency contact not found', 404);
  await record.destroy();
  logger.info('Emergency contact deleted', { employeeId, recordId });
};


// ═════════════════════════════════════════════════════════════════════════════
//  SKILL MAP
// ═════════════════════════════════════════════════════════════════════════════

const getSkillMap = async (employeeId) => {
  await assertEmployeeExists(employeeId);
  const map = await EmployeeSkillMap.findOne({ where: { employeeId } });
  return map || { employeeId, skills: [], certifications: [], certificateUrls: [], languages: [] };
};

const upsertSkillMap = async (employeeId, data) => {
  await assertEmployeeExists(employeeId);

  const [map] = await EmployeeSkillMap.findOrCreate({
    where:    { employeeId },
    defaults: { employeeId, skills: [], certifications: [], certificateUrls: [], languages: [] },
  });

  await map.update({
    skills:          data.skills          ?? map.skills,
    certifications:  data.certifications  ?? map.certifications,
    certificateUrls: data.certificateUrls ?? map.certificateUrls,
    languages:       data.languages       ?? map.languages,
  });

  logger.info('SkillMap saved', { employeeId });
  return map;
};


// ═════════════════════════════════════════════════════════════════════════════
//  SEPARATION
// ═════════════════════════════════════════════════════════════════════════════

const initiateSeparation = async (employeeId, data) => {
  const employee = await Employee.findByPk(employeeId, { attributes: ['id', 'status'] });
  if (!employee) throw new AppError('Employee not found', 404);

  if (!['Active', 'Suspended'].includes(employee.status)) {
    throw new AppError(`Cannot initiate separation for an employee in '${employee.status}' status`, 422);
  }

  const existing = await EmployeeSeparation.findOne({ where: { employeeId } });
  if (existing && !['Rejected', 'Draft'].includes(existing.status)) {
    throw new AppError('A separation process is already underway for this employee', 409);
  }

  if (!data.separationType) throw new AppError('separationType is required', 422);
  if (!data.initiatedBy)    throw new AppError('initiatedBy is required', 422);

  const defaults = {
    separationType:   data.separationType,
    initiatedBy:      data.initiatedBy,
    resignationDate:  data.resignationDate  || null,
    lastWorkingDay:   data.lastWorkingDay   || null,
    reasonForLeaving: data.reasonForLeaving || null,
    additionalNotes:  data.additionalNotes  || null,
    status:           'Draft',
  };

  if (existing) {
    await existing.update(defaults);
    return existing;
  }

  const separation = await EmployeeSeparation.create({ employeeId, ...defaults });
  logger.info('Separation initiated', { employeeId, separationType: data.separationType });
  return separation;
};

const submitSeparation = async (employeeId) => {
  const separation = await findSeparation(employeeId);
  if (separation.status !== 'Draft') {
    throw new AppError('Only Draft separations can be submitted for approval', 422);
  }
  await separation.update({ status: 'Pending' });
  return separation;
};

const approveSeparation = async (employeeId, approverUserId, { relievingDate } = {}) => {
  const separation = await findSeparation(employeeId);
  if (separation.status !== 'Pending') {
    throw new AppError('Only pending separations can be approved', 422);
  }

  const employee = await Employee.findByPk(employeeId, { include: [USER_INCLUDE] });
  const approver = await Employee.findOne({ where: { userId: approverUserId }, attributes: ['id'] });

  await sequelize.transaction(async (t) => {
    await separation.update({
      status:         'Approved',
      approvedById:   approver?.id || null,
      approvedOn:     new Date(),
      relievingDate:  relievingDate || separation.lastWorkingDay || null,
    }, { transaction: t });

    await employee.update({
      status:        'exited',
      relievingDate: relievingDate || separation.lastWorkingDay || null,
    }, { transaction: t });

    if (employee.userId) {
      await User.update(
        { status: 'Inactive' },
        { where: { id: employee.userId }, transaction: t },
      );
    }
  });

  logger.info('Separation approved — employee exited', { employeeId, approvedBy: approverUserId });
  return separation.reload();
};

const rejectSeparation = async (employeeId, approverUserId, reason) => {
  if (!reason) throw new AppError('Rejection reason is required', 422);

  const separation = await findSeparation(employeeId);
  if (separation.status !== 'Pending') {
    throw new AppError('Only pending separations can be rejected', 422);
  }

  const approver = await Employee.findOne({ where: { userId: approverUserId }, attributes: ['id'] });

  await separation.update({
    status:          'Rejected',
    approvedById:    approver?.id || null,
    approvedOn:      new Date(),
    additionalNotes: reason,
  });

  logger.info('Separation rejected', { employeeId, reason });
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
    limit, offset,
    order: [['promotionDate', 'DESC']],
    include: [
      { model: Department,  as: 'previousDepartment',  foreignKey: 'previousDepartmentId',  required: false },
      { model: Department,  as: 'newDepartment',       foreignKey: 'newDepartmentId',       required: false },
      { model: Designation, as: 'previousDesignation', foreignKey: 'previousDesignationId', required: false },
      { model: Designation, as: 'newDesignation',      foreignKey: 'newDesignationId',      required: false },
      { model: EmployeeGrade, as: 'previousGrade',     foreignKey: 'previousGradeId',       required: false },
      { model: EmployeeGrade, as: 'newGrade',          foreignKey: 'newGradeId',            required: false },
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};


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
  getEmployeeByUserId,

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
};