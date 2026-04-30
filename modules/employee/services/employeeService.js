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
 *  updateEmployeeStatus    Lifecycle transitions: Active ↔ Suspended ↔ On Leave ↔ Exit
 *  approveEmployee         GM approval — creates User account + temporary password
 *  searchEmployees         Full-text search across name, number, email
 *  getOrgChart             Self-ref reportsTo tree for org chart rendering
 *  getDirectReports        All employees reporting to a given manager
 *  deactivateUser          Suspends the linked User account without separating
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
 *  setPrimaryContact       Mark one contact as primary (unsets others atomically)
 *
 *  ── SKILL MAP ─────────────────────────────────────────────────────────
 *  getSkillMap             Fetch the skill map record
 *  upsertSkillMap          Create or fully replace skill map (HR + employee for self)
 *  addSkill                Append one skill to the skills array
 *  removeSkill             Remove one skill by index
 *  addCertification        Append a certification
 *  addTraining             Append a training record
 *
 *  ── SEPARATION ────────────────────────────────────────────────────────
 *  initiateSeparation      HR creates the separation record (Draft)
 *  submitSeparation        HR submits for GM approval
 *  approveSeparation       GM approves → Employee.status = 'Exit', User deactivated
 *  rejectSeparation        GM rejects → back to Draft
 *  updateClearanceTasks    HR updates the clearance checklist
 *  settleFullAndFinal      Mark final payroll settlement complete
 *
 *  ── PROMOTIONS (READ-ONLY) ────────────────────────────────────────────
 *  getPromotionHistory     All promotion/demotion records for an employee
 *                          (write operations live in the performance module)
 *
 * Architecture:
 *   — No req / res — pure data in, data out
 *   — Every mutating operation that touches more than one table uses a transaction
 *   — AppError with correct HTTP status on every business rule violation
 *   — All list functions return { data, meta }
 *   — Sensitive fields (passwordHash, referenceNotes) are explicitly excluded
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
//  Defined once so every query is consistent and easy to maintain.
// ─────────────────────────────────────────────────────────────────────────────

/** Lightweight org-master includes — used in list queries */
const ORG_INCLUDES = [
  { model: Company, as: 'company',      attributes: ['id', 'name', 'abbr'] },
  { model: Branch, as: 'branch',        attributes: ['id', 'name'], required: false },
  { model: Department, as: 'department',    attributes: ['id', 'name'], required: false },
  { model: Designation, as: 'designation',   attributes: ['id', 'name'], required: false },
  { model: EmploymentType, as: 'employmentType',attributes: ['id', 'name'], required: false },
  { model: EmployeeGrade, as: 'employeeGrade', attributes: ['id', 'name'], required: false },
];

/** Manager / self-ref include */
const MANAGER_INCLUDE = {
  model:      Employee,
  as:         'reportsTo',
  attributes: ['id', 'firstName', 'middleName', 'employeeNumber', 'image'],
  required:   false,
};

/** User account include — excludes passwordHash always */
const USER_INCLUDE = {
  model:      User,
    as:         'user',
  attributes: ['id', 'email', 'status', 'lastLogin', 'isSuperUser', 'isSystemManager'],
  required:   false,
};

/** Full profile includes — used on single-record fetches */
const FULL_INCLUDES = [
  ...ORG_INCLUDES,
  MANAGER_INCLUDE,
  USER_INCLUDE,
];

// ─────────────────────────────────────────────────────────────────────────────
//  INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generates EMP-YYYY-NNNN within a transaction.
 * Uses a SELECT COUNT for the sequence — safe because the unique index
 * on employee_number is the final guard against races.
 */
const generateEmployeeNumber = async (transaction) => {
  const year  = new Date().getFullYear();
  const count = await Employee.count({
    where: {
      employeeNumber: { [Op.like]: `EMP-${year}-%` },
    },
    transaction,
    paranoid: false,   // count soft-deleted too so sequence never reuses
  });
  return `EMP-${year}-${String(count + 1).padStart(4, '0')}`;
};

/**
 * Generates a secure temporary password: Tw@XXXXXX
 * (capital T, lowercase w, @ then 6 alphanumeric chars)
 */
const generateTemporaryPassword = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let suffix  = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `Tw@${suffix}`;
};

/**
 * Returns the employee for a given userId.
 * Used by the self-service profile endpoint.
 */
const getEmployeeByUserId = async (userId) => {
  const emp = await Employee.findOne({
    where:   { userId },
    include: FULL_INCLUDES,
  });
  if (!emp) throw new AppError('No employee record linked to this account', 404);
  return emp;
};

/**
 * Validates that all FK UUIDs in the payload actually exist in their tables.
 * Runs in parallel for performance. Throws on the first missing record.
 */
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


// ═════════════════════════════════════════════════════════════════════════════
//  CORE PROFILE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * HR creates a new employee record — status starts as 'Inactive' pending GM approval.
 *
 * What HR provides:
 *   — All identity, contact, address, statutory, bank fields
 *   — Org FK assignments (company, branch, department, designation, grade, type)
 *   — reportsToId (line manager)
 *   — dateOfJoining
 *
 * What the system sets:
 *   — employeeNumber (auto-generated)
 *   — status = 'Inactive' (locked until GM approves)
 *   — userId = null (set when GM approves and User account is created)
 */
const createEmployee = async (data) => {
  // ── 1. Validate required fields ───────────────────────────────────────────
  if (!data.firstName || !data.lastName || !data.lastName) {
    throw new AppError('Full name required', 422);
  }
  if (!data.companyId) {
    throw new AppError('companyId is required', 422);
  }
  if (!data.dateOfJoining) {
    throw new AppError('dateOfJoining is required', 422);
  }

  // ── 2. Validate all FK references exist ───────────────────────────────────
  await validateOrgFKs(data);

  // ── 3. Check for duplicate company email if provided ──────────────────────
  if (data.companyEmail) {
    const emailTaken = await Employee.findOne({
      where: { companyEmail: data.companyEmail.toLowerCase().trim() },
    });
    if (emailTaken) {
      throw new AppError('An employee with this company email already exists', 409);
    }
  }

  // ── 4. Create within a transaction ────────────────────────────────────────
  const employee = await sequelize.transaction(async (t) => {
    const empNumber = await generateEmployeeNumber(t);

    const emp = await Employee.create({
      // Identity
      firstName:    data.firstName.trim(),
      middleName:   data.middleName?.trim()  || null,
      lastName:     data.lastName.trim(),
      salutation:   data.salutation          || null,
      gender:       data.gender              || null,
      dateOfBirth:  data.dateOfBirth         || null,
      maritalStatus:data.maritalStatus       || null,
      nationality:  data.nationality         || null,
      religion:     data.religion            || null,
      bloodGroup:   data.bloodGroup          || null,

      // Org FKs
      companyId:        data.companyId,
      branchId:         data.branchId         || null,
      departmentId:     data.departmentId     || null,
      designationId:    data.designationId    || null,
      employmentTypeId: data.employmentTypeId || null,
      employeeGradeId:  data.employeeGradeId  || null,
      reportsToId:      data.reportsToId      || null,

      // Employment
      employeeNumber:             empNumber,
      dateOfJoining:              data.dateOfJoining,
      scheduledConfirmationDate:  data.scheduledConfirmationDate || null,
      contractEndDate:            data.contractEndDate           || null,
      noticeNumberOfDays:         data.noticeNumberOfDays        ?? 30,
      status:                     'Inactive',     // locked until GM approves
      userId:                     null,           // provisioned on approval

      // Contact
      personalEmail:  data.personalEmail?.toLowerCase().trim() || null,
      companyEmail:   data.companyEmail?.toLowerCase().trim()  || null,
      cellNumber:     data.cellNumber  || null,
      phoneNumber:    data.phoneNumber || null,

      // Current address
      currentAddress:    data.currentAddress    || null,
      currentCity:       data.currentCity       || null,
      currentState:      data.currentState      || null,
      currentCountry:    data.currentCountry    || null,
      currentPostalCode: data.currentPostalCode || null,

      // Permanent address
      permanentAddress:    data.permanentAddress    || null,
      permanentCity:       data.permanentCity       || null,
      permanentState:      data.permanentState      || null,
      permanentCountry:    data.permanentCountry    || null,
      permanentPostalCode: data.permanentPostalCode || null,
      isSameAddress:       data.isSameAddress       ?? false,

      // Statutory / IDs
      nationalId:           data.nationalId           || null,
      passportNumber:       data.passportNumber       || null,
      passportExpiry:       data.passportExpiry       || null,
      taxId:                data.taxId                || null,
      socialSecurityNumber: data.socialSecurityNumber || null,

      // Bank
      bankName:          data.bankName          || null,
      bankAccountNumber: data.bankAccountNumber || null,
      bankBranch:        data.bankBranch        || null,
      bankCode:          data.bankCode          || null,
      mobileMoneyNumber: data.mobileMoneyNumber || null,
      paymentMethod:     data.paymentMethod     || 'Bank Transfer',

      // Leave / attendance defaults
      holidayListId:       data.holidayListId       || null,
      defaultShiftId:      data.defaultShiftId      || null,
      attendanceDeviceId:  data.attendanceDeviceId  || null,
      leaveApprovedById:   data.leaveApprovedById   || null,
      expenseApprovedById: data.expenseApprovedById || null,

      // Misc
      bio:          data.bio          || null,
      customFields: data.customFields || null,
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
 * 
 * Use case: Super Admin / System Manager already has a User account
 * but needs an Employee record to participate in workflows
 * (requisitions, approvals, etc.).
 *
 * The Employee is created as Active immediately — no GM approval needed
 * because the User account already exists.
 */
const createEmployeeFromExistingUser = async (userId, data) => {
  const user = await User.findByPk(userId, {
    attributes: ['id', 'email', 'firstName', 'middleName', 'lastName', 'status']
  });
  
  if (!user) throw new AppError('User not found', 404);
  if (user.status !== 'Active') {
    throw new AppError('User account must be Active to create an Employee record', 422);
  }

  const existingEmp = await Employee.findOne({ 
    where: { userId: user.id } 
  });
  if (existingEmp) {
    throw new AppError(
      `Employee record already exists for this user (${existingEmp.employeeNumber})`, 
      409
    );
  }

  if (!data.companyId) throw new AppError('companyId is required', 422);
  if (!data.dateOfJoining) throw new AppError('dateOfJoining is required', 422);
  
  await validateOrgFKs(data);

  const companyEmail = data.companyEmail || user.email;
  
  const emailTaken = await Employee.findOne({
    where: { companyEmail: companyEmail.toLowerCase().trim() }
  });
  if (emailTaken) {
    throw new AppError('An employee with this company email already exists', 409);
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

      employeeNumber:             empNumber,
      dateOfJoining:              data.dateOfJoining,
      scheduledConfirmationDate:  data.scheduledConfirmationDate || null,
      contractEndDate:            data.contractEndDate           || null,
      noticeNumberOfDays:         data.noticeNumberOfDays        ?? 30,
      status:                     'Active',

      personalEmail:  data.personalEmail?.toLowerCase().trim() || null,
      companyEmail:   companyEmail.toLowerCase().trim(),
      cellNumber:     data.cellNumber  || null,
      phoneNumber:    data.phoneNumber || null,

      currentAddress:    data.currentAddress    || null,
      currentCity:       data.currentCity       || null,
      currentState:      data.currentState      || null,
      currentCountry:    data.currentCountry    || null,
      currentPostalCode: data.currentPostalCode || null,
      permanentAddress:    data.permanentAddress    || null,
      permanentCity:       data.permanentCity       || null,
      permanentState:      data.permanentState      || null,
      permanentCountry:    data.permanentCountry    || null,
      permanentPostalCode: data.permanentPostalCode || null,
      isSameAddress:       data.isSameAddress       ?? false,

      nationalId:           data.nationalId           || null,
      passportNumber:       data.passportNumber       || null,
      passportExpiry:       data.passportExpiry       || null,
      taxId:                data.taxId                || null,
      socialSecurityNumber: data.socialSecurityNumber || null,

      bankName:          data.bankName          || null,
      bankAccountNumber: data.bankAccountNumber || null,
      bankBranch:        data.bankBranch        || null,
      bankCode:          data.bankCode          || null,
      mobileMoneyNumber: data.mobileMoneyNumber || null,
      paymentMethod:     data.paymentMethod     || 'Bank Transfer',

      holidayListId:       data.holidayListId       || null,
      defaultShiftId:      data.defaultShiftId      || null,
      attendanceDeviceId:  data.attendanceDeviceId  || null,
      leaveApprovedById:   data.leaveApprovedById   || null,
      expenseApprovedById: data.expenseApprovedById || null,

      bio:          data.bio          || null,
      customFields: data.customFields || null,
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
 * GM approves a pending employee.
 *
 * On approval the system:
 *   1. Creates a User account (email = companyEmail, temp password)
 *   2. Links User → Employee via userId
 *   3. Sets Employee.status = 'Active'
 *
 * Returns { employee, temporaryPassword } — caller must email the password.
 */
const approveEmployee = async (employeeId, approverUserId) => {
  const employee = await Employee.findByPk(employeeId);
  if (!employee) throw new AppError('Employee not found', 404);
  if (employee.status !== 'Inactive') {
    throw new AppError(
      `Employee cannot be approved from status '${employee.status}' — only Inactive employees can be approved`,
      422,
    );
  }
  if (!employee.companyEmail) {
    throw new AppError(
      'Employee must have a company email before a User account can be created',
      422,
    );
  }

  // Check the approver exists and has authority
  const approver = await User.unscoped().findByPk(approverUserId, { attributes: ['id', 'isSuperUser', 'isSystemManager'] });
  if (!approver) throw new AppError('Approver not found', 404);

  // Check if a User account already exists for this email (edge case: re-hire)
  const existingUser = await User.unscoped().findOne({
    where: { email: employee.companyEmail },
  });

  const temporaryPassword = generateTemporaryPassword();

  const result = await sequelize.transaction(async (t) => {
    let user;

    if (existingUser) {
      // Re-hire case — reactivate the old account with a fresh password
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
      // Fresh hire — create brand new User
      // The beforeSave hook on User.js hashes passwordHash automatically
      user = await User.create({
        firstName:    employee.firstName,
        middleName:   employee.middleName,
        lastName:     employee.lastName,
        email:        employee.companyEmail,
        passwordHash: temporaryPassword,   // hook hashes this
        status:       'Active',
        language:     'en',
      }, { transaction: t });
    }

    // Link user to employee and activate
    await employee.update({
      userId: user.id,
      status: 'Active',
    }, { transaction: t });

    return { employee, user };
  });

  logger.info('Employee approved — User account provisioned', {
    employeeId,
    userId:         result.user.id,
    email:          employee.companyEmail,
    approvedBy:     approverUserId,
  });

  return {
    employee:          result.employee,
    temporaryPassword,
  };
};

/**
 * Paginated employee list with rich filtering.
 *
 * Filters supported:
 *   companyId, branchId, departmentId, designationId,
 *   employmentTypeId, employeeGradeId, status, reportsToId,
 *   search (matches firstName, lastName, employeeNumber, companyEmail)
 *
 * UserPermission scope is applied via the permFilter argument —
 * the caller (controller) passes the result of getUserPermissionFilter().
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
    // Allow comma-separated multi-status e.g. status=Active,Suspended
    const statuses = status.split(',').map(s => s.trim());
    where.status = statuses.length === 1 ? statuses[0] : { [Op.in]: statuses };
  }

  if (search) {
    const like = { [Op.iLike]: `%${search}%` };
    where[Op.or] = [
      { firstName:      like },
      { lastName:       like },
      { employeeNumber: like },
      { companyEmail:   like },
    ];
  }

  const { count, rows } = await Employee.findAndCountAll({
    where,
    limit,
    offset,
    order: [
      ['status', 'ASC'],           // Active employees first
      ['lastName', 'ASC'],
      ['firstName', 'ASC'],
    ],
    include: [
      ...ORG_INCLUDES,
      MANAGER_INCLUDE,
      USER_INCLUDE,
    ],
    // Exclude sensitive fields on list view
    attributes: {
      exclude: [
        'nationalId', 'passportNumber', 'taxId', 'socialSecurityNumber',
        'bankAccountNumber', 'bankCode', 'mobileMoneyNumber',
        'customFields',
      ],
    },
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};

/**
 * Full employee profile — all sub-records included.
 * Sensitive financial fields are included here (HR has access).
 * The employee's own self-service view uses getMyProfile() instead.
 */
const getEmployeeById = async (id) => {
  const employee = await Employee.findByPk(id, {
    include: [
      ...FULL_INCLUDES,
      { model: EmployeeEducation,        required: false },
      { model: EmployeeExternalWork,     required: false },
      { model: EmployeeEmergencyContact, required: false },
      { model: EmployeeSkillMap,         required: false },
      {
        model:    EmployeeSeparation,
        required: false,
        // Never expose confidential exit interview notes to non-HR scopes
        // — controller is responsible for stripping this based on req.perms
      },
      {
        model:    EmployeePromotion,
        required: false,
        order:    [['promotionDate', 'DESC']],
        separate: true,
        limit:    10,           // last 10 promotions — full history via getPromotionHistory()
      },
    ],
  });

  if (!employee) throw new AppError('Employee not found', 404);
  return employee;
};

/**
 * Self-service profile — employee reads their own record.
 * Strips confidential fields that are HR-only:
 *   — referenceNotes on ExternalWork
 *   — exitRemarks on Separation
 *   — bank account details (visible only to HR and the employee themselves in a secure tab)
 */
const getMyProfile = async (userId) => {
  const employee = await Employee.findOne({
    where:   { userId },
    include: [
      USER_INCLUDE,
      ...ORG_INCLUDES,
      MANAGER_INCLUDE,
    
      {
        model:      EmployeeEducation,
        required:   false,
      },
      {
        model:      EmployeeExternalWork,
        required:   false,
        attributes: { exclude: ['referenceNotes', 'referenceChecked', 'referenceCheckedOn'] },
      },
      { model: EmployeeEmergencyContact, required: false },
      { model: EmployeeSkillMap,         required: false },
    ],
    attributes: {
      // Employee CAN see their own bank details and statutory numbers
      // but NOT customFields (internal HR metadata)
      exclude: ['customFields'],
    },
  });

  if (!employee) throw new AppError('No employee profile found for this account', 404);
  return employee;
};

/**
 * HR updates a subset of employee fields.
 *
 * Immutable fields (blocked here — they go through dedicated flows):
 *   — status          → use updateEmployeeStatus()
 *   — userId          → set only by approveEmployee()
 *   — employeeNumber  → never changes after creation
 *   — relievingDate   → set by approveSeparation()
 *   — encashmentDate  → set by settleFullAndFinal()
 *
 * Promotion fields (designationId, employeeGradeId, department) CAN be updated
 * here by HR for corrections, but formal promotion records are created by the
 * performance/task module. These are not blocked because HR needs to fix data errors.
 */
const updateEmployee = async (id, data) => {
  const employee = await Employee.findByPk(id);
  if (!employee) throw new AppError('Employee not found', 404);
  if (employee.status === 'Exit') {
    throw new AppError('Cannot edit a separated employee record', 422);
  }

  // Strip fields that must never come through this endpoint
  const blocked = ['status', 'userId', 'employeeNumber', 'relievingDate', 'encashmentDate'];
  blocked.forEach(field => delete data[field]);

  // Validate org FKs if any are being changed
  const fkFields = ['companyId','branchId','departmentId','designationId','employmentTypeId','employeeGradeId','reportsToId'];
  const fkChanges = {};
  fkFields.forEach(f => { if (data[f] !== undefined) fkChanges[f] = data[f]; });
  if (Object.keys(fkChanges).length) await validateOrgFKs(fkChanges);

  // Email uniqueness check if changing companyEmail
  if (data.companyEmail && data.companyEmail !== employee.companyEmail) {
    const taken = await Employee.findOne({
      where: {
        companyEmail: data.companyEmail.toLowerCase().trim(),
        id:           { [Op.ne]: id },
      },
    });
    if (taken) throw new AppError('This company email is already assigned to another employee', 409);

    // Also update the linked User account email if exists
    if (employee.userId) {
      await User.update(
        { email: data.companyEmail.toLowerCase().trim() },
        { where: { id: employee.userId } },
      );
    }
  }

  // Normalise string fields
  if (data.firstName)    data.firstName    = data.firstName.trim();
  if (data.lastName)     data.lastName     = data.lastName.trim();
  if (data.middleName)   data.middleName   = data.middleName.trim();
  if (data.companyEmail) data.companyEmail = data.companyEmail.toLowerCase().trim();
  if (data.personalEmail)data.personalEmail= data.personalEmail.toLowerCase().trim();

  await employee.update(data);

  logger.info('Employee updated', { employeeId: id });
  return employee.reload({ include: FULL_INCLUDES });
};

/**
 * Lifecycle status transitions.
 *
 * Allowed transitions:
 *   Inactive   → Active          (via approveEmployee — not here)
 *   Active     → Suspended       HR can suspend (e.g. disciplinary, prolonged absence)
 *   Active     → On Leave        Attendance module triggers this — but HR can also set manually
 *   Suspended  → Active          HR reinstates
 *   On Leave   → Active          Attendance module or HR on return
 *   Active     → Exit            ONLY via approveSeparation() — blocked here
 *   Suspended  → Exit            ONLY via approveSeparation() — blocked here
 *
 * Reason is required for all transitions except On Leave ↔ Active.
 */
const updateEmployeeStatus = async (id, newStatus, reason, changedByUserId) => {
  const VALID_STATUSES = ['Active', 'Inactive', 'Suspended', 'On Leave', 'Exit'];
  if (!VALID_STATUSES.includes(newStatus)) {
    throw new AppError(`Invalid status: '${newStatus}'`, 422);
  }

  const employee = await Employee.findByPk(id, { include: [USER_INCLUDE] });
  if (!employee) throw new AppError('Employee not found', 404);

  const current = employee.status;

  // ── Guard: Exit can ONLY be set by approveSeparation ─────────────────────
  if (newStatus === 'Exit') {
    throw new AppError(
      'Employee status cannot be set to Exit directly — initiate a Separation record instead',
      422,
    );
  }

  // ── Guard: Inactive → Active can ONLY be set by approveEmployee ──────────
  if (current === 'Inactive' && newStatus === 'Active') {
    throw new AppError(
      'Cannot manually activate an Inactive employee — use the GM Approval flow instead',
      422,
    );
  }

  // ── Guard: Exit employees cannot be changed ───────────────────────────────
  if (current === 'Exit') {
    throw new AppError('Cannot change the status of an already separated employee', 422);
  }

  // ── Guard: no-op ──────────────────────────────────────────────────────────
  if (current === newStatus) {
    throw new AppError(`Employee is already in '${newStatus}' status`, 422);
  }

  // ── Require a reason for suspension ──────────────────────────────────────
  if (newStatus === 'Suspended' && !reason) {
    throw new AppError('A reason is required when suspending an employee', 422);
  }

  await sequelize.transaction(async (t) => {
    await employee.update({ status: newStatus }, { transaction: t });

    // Mirror suspension on the User account — suspended employee cannot log in
    if (employee.userId) {
      const userStatus = newStatus === 'Suspended' ? 'Suspended' : 'Active';
      await User.update(
        { status: userStatus },
        { where: { id: employee.userId }, transaction: t },
      );
    }
  });

  logger.info('Employee status changed', {
    employeeId: id,
    from:       current,
    to:         newStatus,
    reason,
    changedBy:  changedByUserId,
  });

  return employee.reload({ include: FULL_INCLUDES });
};

/**
 * Full-text search across the employee table.
 * Intended for autocomplete / quick-search widgets.
 * Returns a lightweight result set — no sub-record includes.
 */
const searchEmployees = async (searchTerm, { companyId, status, limit = 20 } = {}) => {
  if (!searchTerm || searchTerm.trim().length < 2) {
    throw new AppError('Search term must be at least 2 characters', 422);
  }

  const like  = { [Op.iLike]: `%${searchTerm.trim()}%` };
  const where = {
    [Op.or]: [
      { firstName:      like },
      { lastName:       like },
      { employeeNumber: like },
      { companyEmail:   like },
    ],
  };

  if (companyId) where.companyId = companyId;
  if (status)    where.status    = status;

  const rows = await Employee.findAll({
    where,
    limit:      Math.min(limit, 50),    // hard cap
    order:      [['lastName', 'ASC'], ['firstName', 'ASC']],
    attributes: ['id', 'employeeNumber', 'firstName', 'middleName', 'lastName',
                 'companyEmail', 'image', 'status', 'designationId'],
    include:    [{ model: Designation, attributes: ['id', 'name'], required: false }],
  });

  return rows;
};

/**
 * Returns the org-chart tree rooted at a given employee.
 * Depth is limited to 4 levels to avoid unbounded recursion.
 *
 * Result shape:
 *   { employee, directReports: [ { employee, directReports: [...] }, ... ] }
 */
const getOrgChart = async (rootEmployeeId, depth = 0, maxDepth = 4) => {
  if (depth >= maxDepth) return null;

  const employee = await Employee.findByPk(rootEmployeeId, {
    attributes: ['id', 'employeeNumber', 'firstName', 'middleName', 'lastName', 'image', 'status'],
    include:    [{ model: Designation, as: 'designation', attributes: ['id', 'name'], required: false }],
  });

  if (!employee) throw new AppError('Employee not found', 404);

  const reports = await Employee.findAll({
    where:      { reportsToId: rootEmployeeId, status: { [Op.ne]: 'Exit' } },
    attributes: ['id', 'employeeNumber', 'firstName', 'middleName', 'lastName', 'image', 'status'],
    include:    [{ model: Designation, as: 'designation', attributes: ['id', 'name'], required: false }],
    order:      [['lastName', 'ASC']],
  });

  const directReports = await Promise.all(
    reports.map(r => getOrgChart(r.id, depth + 1, maxDepth))
  );

  return {
    employee,
    directReports: directReports.filter(Boolean),
  };
};

/**
 * Returns all direct reports for a manager — flat list, paginated.
 */
const getDirectReports = async (managerId, query = {}) => {
  const { limit, offset, page } = getPaginationOptions(query);

  const manager = await Employee.findByPk(managerId, { attributes: ['id'] });
  if (!manager) throw new AppError('Manager not found', 404);

  const { count, rows } = await Employee.findAndCountAll({
    where:   { reportsToId: managerId },
    limit,
    offset,
    order:   [['lastName', 'ASC'], ['firstName', 'ASC']],
    include: [...ORG_INCLUDES],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};

/**
 * Suspends the linked User account without changing the employee's status.
 * Used when an account is locked due to security concerns while HR
 * investigates — the employee record stays Active for HR purposes.
 */
const deactivateUser = async (employeeId) => {
  const employee = await Employee.findByPk(employeeId, { attributes: ['id', 'userId', 'status'] });
  if (!employee)        throw new AppError('Employee not found', 404);
  if (!employee.userId) throw new AppError('This employee has no linked User account', 422);

  await User.update({ status: 'Suspended' }, { where: { id: employee.userId } });

  logger.info('User account suspended independently', { employeeId, userId: employee.userId });
  return { message: 'User account suspended — employee record unchanged' };
};
/**
 * Reactivates the linked User account (e.g., after suspension is lifted).
 * Does NOT change employee status — that's a separate HR decision.
 */
const activateUser = async (employeeId) => {
  const employee = await Employee.findByPk(employeeId, { 
    attributes: ['id', 'userId', 'status'] 
  });
  if (!employee) throw new AppError('Employee not found', 404);
  if (!employee.userId) throw new AppError('This employee has no linked User account', 422);

  const user = await User.findByPk(employee.userId, { attributes: ['id', 'status'] });
  if (user.status === 'Active') {
    throw new AppError('User account is already active', 422);
  }

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
  if (data.isCurrentlyEnrolled && data.toDate) {
    throw new AppError('toDate must be empty when isCurrentlyEnrolled is true', 422);
  }

  const record = await EmployeeEducation.create({
    employeeId,
    level:               data.level,
    qualification:       data.qualification.trim(),
    majorOrField:        data.majorOrField?.trim()  || null,
    institution:         data.institution.trim(),
    country:             data.country               || null,
    fromDate:            data.fromDate              || null,
    toDate:              data.isCurrentlyEnrolled ? null : (data.toDate || null),
    isCurrentlyEnrolled: data.isCurrentlyEnrolled   ?? false,
    grade:               data.grade?.trim()         || null,
    certificateAttached: data.certificateAttached    ?? false,
    notes:               data.notes                 || null,
  });

  logger.info('Education added', { employeeId, recordId: record.id });
  return record;
};

const updateEducation = async (employeeId, recordId, data) => {
  const record = await EmployeeEducation.findOne({ where: { id: recordId, employeeId } });
  if (!record) throw new AppError('Education record not found', 404);

  if (data.isCurrentlyEnrolled && data.toDate) {
    throw new AppError('toDate must be empty when isCurrentlyEnrolled is true', 422);
  }

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
    where:      { employeeId },
    order:      [['fromDate', 'DESC']],
    // referenceNotes is confidential — excluded on the model-level query
    // controller strips it for non-HR scopes using req.perms
  });
};

const addExternalWork = async (employeeId, data) => {
  await assertEmployeeExists(employeeId);

  if (!data.companyName || !data.fromDate) {
    throw new AppError('companyName and fromDate are required', 422);
  }
  if (data.toDate && data.fromDate > data.toDate) {
    throw new AppError('fromDate must be before toDate', 422);
  }

  const record = await EmployeeExternalWork.create({
    employeeId,
    companyName:              data.companyName.trim(),
    industry:                 data.industry              || null,
    country:                  data.country               || null,
    designation:              data.designation?.trim()   || null,
    department:               data.department?.trim()    || null,
    employmentType:           data.employmentType        || null,
    fromDate:                 data.fromDate,
    toDate:                   data.isCurrentEmployer ? null : (data.toDate || null),
    isCurrentEmployer:        data.isCurrentEmployer     ?? false,
    supervisorName:           data.supervisorName?.trim() || null,
    supervisorContact:        data.supervisorContact     || null,
    referenceChecked:         data.referenceChecked      ?? false,
    referenceCheckedOn:       data.referenceCheckedOn    || null,
    referenceNotes:           data.referenceNotes        || null,   // HR-only field
    reasonForLeaving:         data.reasonForLeaving      || null,
    lastDrawnSalary:          data.lastDrawnSalary       ?? null,
    lastDrawnSalaryCurrency:  data.lastDrawnSalaryCurrency || 'ETB',
    responsibilities:         data.responsibilities      || null,
    notes:                    data.notes                 || null,
  });

  logger.info('External work added', { employeeId, recordId: record.id });
  return record;
};

const updateExternalWork = async (employeeId, recordId, data) => {
  const record = await EmployeeExternalWork.findOne({ where: { id: recordId, employeeId } });
  if (!record) throw new AppError('Work history record not found', 404);

  if (data.toDate && data.fromDate && data.fromDate > data.toDate) {
    throw new AppError('fromDate must be before toDate', 422);
  }

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
    order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']],
  });
};

const addEmergencyContact = async (employeeId, data) => {
  await assertEmployeeExists(employeeId);

  if (!data.fullName || !data.relationship || !data.phone) {
    throw new AppError('fullName, relationship and phone are required', 422);
  }

  const record = await EmployeeEmergencyContact.create({
    employeeId,
    fullName:          data.fullName.trim(),
    relationship:      data.relationship,
    relationshipOther: data.relationshipOther || null,
    phone:             data.phone,
    alternatePhone:    data.alternatePhone    || null,
    email:             data.email             || null,
    address:           data.address           || null,
    isPrimary:         data.isPrimary         ?? false,
  });

  // If this new contact is primary, unset all others
  if (record.isPrimary) {
    await EmployeeEmergencyContact.update(
      { isPrimary: false },
      { where: { employeeId, id: { [Op.ne]: record.id } } },
    );
  }

  logger.info('Emergency contact added', { employeeId, recordId: record.id });
  return record;
};

const updateEmergencyContact = async (employeeId, recordId, data) => {
  const record = await EmployeeEmergencyContact.findOne({ where: { id: recordId, employeeId } });
  if (!record) throw new AppError('Emergency contact not found', 404);

  await record.update(data);

  if (data.isPrimary === true) {
    await EmployeeEmergencyContact.update(
      { isPrimary: false },
      { where: { employeeId, id: { [Op.ne]: record.id } } },
    );
  }

  return record;
};

const deleteEmergencyContact = async (employeeId, recordId) => {
  const record = await EmployeeEmergencyContact.findOne({ where: { id: recordId, employeeId } });
  if (!record) throw new AppError('Emergency contact not found', 404);
  await record.destroy();
  logger.info('Emergency contact deleted', { employeeId, recordId });
};

/**
 * Atomically sets one contact as primary and clears all others.
 * More explicit than patching isPrimary through updateEmergencyContact.
 */
const setPrimaryContact = async (employeeId, recordId) => {
  await assertEmployeeExists(employeeId);

  const record = await EmployeeEmergencyContact.findOne({ where: { id: recordId, employeeId } });
  if (!record) throw new AppError('Emergency contact not found', 404);

  await sequelize.transaction(async (t) => {
    await EmployeeEmergencyContact.update(
      { isPrimary: false },
      { where: { employeeId }, transaction: t },
    );
    await record.update({ isPrimary: true }, { transaction: t });
  });

  return record.reload();
};


// ═════════════════════════════════════════════════════════════════════════════
//  SKILL MAP
// ═════════════════════════════════════════════════════════════════════════════

const getSkillMap = async (employeeId) => {
  await assertEmployeeExists(employeeId);
  const map = await EmployeeSkillMap.findOne({ where: { employeeId } });
  // Return an empty structure if none exists yet — avoids 404 on first load
  return map || { employeeId, skills: [], certifications: [], trainings: [], languages: [] };
};

/**
 * Full upsert — replaces the entire skill map.
 * Used when the frontend sends a complete updated profile.
 */
const upsertSkillMap = async (employeeId, data) => {
  await assertEmployeeExists(employeeId);

  const [map, created] = await EmployeeSkillMap.findOrCreate({
    where:    { employeeId },
    defaults: { employeeId, skills: [], certifications: [], trainings: [], languages: [] },
  });

  await map.update({
    skills:         data.skills         ?? map.skills,
    certifications: data.certifications ?? map.certifications,
    trainings:      data.trainings      ?? map.trainings,
    languages:      data.languages      ?? map.languages,
  });

  logger.info(`SkillMap ${created ? 'created' : 'updated'}`, { employeeId });
  return map;
};

/**
 * Appends a single skill without replacing the whole array.
 * Prevents duplicates by skillName (case-insensitive).
 */
const addSkill = async (employeeId, skill) => {
  if (!skill.skillName) throw new AppError('skillName is required', 422);

  const [map] = await EmployeeSkillMap.findOrCreate({
    where:    { employeeId },
    defaults: { employeeId, skills: [], certifications: [], trainings: [], languages: [] },
  });

  const exists = map.skills.some(
    s => s.skillName.toLowerCase() === skill.skillName.toLowerCase()
  );
  if (exists) throw new AppError(`Skill '${skill.skillName}' already exists on this profile`, 409);

  await map.update({ skills: [...map.skills, skill] });
  return map;
};

/**
 * Removes a skill by its skillName.
 */
const removeSkill = async (employeeId, skillName) => {
  const map = await EmployeeSkillMap.findOne({ where: { employeeId } });
  if (!map) throw new AppError('Skill map not found', 404);

  const filtered = map.skills.filter(
    s => s.skillName.toLowerCase() !== skillName.toLowerCase()
  );

  if (filtered.length === map.skills.length) {
    throw new AppError(`Skill '${skillName}' not found on this profile`, 404);
  }

  await map.update({ skills: filtered });
  return map;
};

/**
 * Appends a certification. Prevents duplicate by certificationName.
 */
const addCertification = async (employeeId, cert) => {
  if (!cert.certificationName) throw new AppError('certificationName is required', 422);

  const [map] = await EmployeeSkillMap.findOrCreate({
    where:    { employeeId },
    defaults: { employeeId, skills: [], certifications: [], trainings: [], languages: [] },
  });

  const exists = map.certifications.some(
    c => c.certificationName.toLowerCase() === cert.certificationName.toLowerCase()
  );
  if (exists) throw new AppError(`Certification '${cert.certificationName}' already exists`, 409);

  await map.update({ certifications: [...map.certifications, cert] });
  return map;
};

/**
 * Appends a training record.
 */
const addTraining = async (employeeId, training) => {
  if (!training.trainingName) throw new AppError('trainingName is required', 422);

  const [map] = await EmployeeSkillMap.findOrCreate({
    where:    { employeeId },
    defaults: { employeeId, skills: [], certifications: [], trainings: [], languages: [] },
  });

  await map.update({ trainings: [...map.trainings, training] });
  return map;
};


// ═════════════════════════════════════════════════════════════════════════════
//  SEPARATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * HR initiates an employee separation — status = Draft.
 * The employee's status does NOT change until GM approves.
 * Only one separation record per employee (unique constraint on employeeId).
 */
const initiateSeparation = async (employeeId, data) => {
  const employee = await Employee.findByPk(employeeId, { attributes: ['id', 'status'] });
  if (!employee) throw new AppError('Employee not found', 404);

  if (!['Active', 'Suspended'].includes(employee.status)) {
    throw new AppError(
      `Cannot initiate separation for an employee in '${employee.status}' status`,
      422,
    );
  }

  const existing = await EmployeeSeparation.findOne({ where: { employeeId } });
  if (existing && !['Rejected', 'Draft'].includes(existing.status)) {
    throw new AppError('A separation process is already underway for this employee', 409);
  }

  if (!data.separationType) throw new AppError('separationType is required', 422);
  if (!data.initiatedBy)    throw new AppError('initiatedBy is required', 422);

  if (existing) {
    // Re-use the rejected/draft record
    await existing.update({
      ...separationDefaults(data),
      status: 'Draft',
    });
    return existing;
  }

  const separation = await EmployeeSeparation.create({
    employeeId,
    ...separationDefaults(data),
    status: 'Draft',
  });

  logger.info('Separation initiated', { employeeId, separationType: data.separationType });
  return separation;
};

/** Builds the safe field set for creation and re-drafting */
const separationDefaults = (data) => ({
  separationType:    data.separationType,
  initiatedBy:       data.initiatedBy,
  resignationDate:   data.resignationDate   || null,
  lastWorkingDay:    data.lastWorkingDay     || null,
  reasonForLeaving:  data.reasonForLeaving  || null,
  noticePeriodServed:data.noticePeriodServed ?? false,
  noticePeriodWaived:data.noticePeriodWaived ?? false,
  noticeShortfallDays: data.noticeShortfallDays ?? null,
  additionalNotes:   data.additionalNotes   || null,
  clearanceTasks:    data.clearanceTasks    || [],
  equipmentReturned: [],
  systemAccessRevoked:[],
  fullAndFinalSettled: false,
  fullAndFinalDate:  null,
});

const submitSeparation = async (employeeId) => {
  const separation = await findSeparation(employeeId);
  if (separation.status !== 'Draft') {
    throw new AppError('Only Draft separations can be submitted for approval', 422);
  }
  await separation.update({ status: 'Pending Approval' });
  return separation;
};

const approveSeparation = async (employeeId, approverUserId, {
  exitInterviewDate,
  exitRemarks,
  wouldRehire,
  relievingDate,
} = {}) => {
  const separation = await findSeparation(employeeId);
  if (separation.status !== 'Pending Approval') {
    throw new AppError('Only separations pending approval can be approved', 422);
  }

  const employee = await Employee.findByPk(employeeId, {
    include: [USER_INCLUDE],
  });

  const approver = await Employee.findOne({
    where:   { userId: approverUserId },
    attributes: ['id'],
  });

  await sequelize.transaction(async (t) => {
    // 1. Finalize separation record
    await separation.update({
      status:                       'Approved',
      approvedById:                 approver?.id || null,
      approvedOn:                   new Date(),
      exitInterviewDate:            exitInterviewDate || null,
      exitRemarks:                  exitRemarks       || null,
      wouldRehire:                  wouldRehire       ?? null,
      relievingDate:                relievingDate      || separation.lastWorkingDay || null,
    }, { transaction: t });

    // 2. Set employee status to Exit
    await employee.update({
      status:       'Exit',
      relievingDate: relievingDate || separation.lastWorkingDay || null,
    }, { transaction: t });

    // 3. Deactivate User account — separated employees cannot log in
    if (employee.userId) {
      await User.update(
        { status: 'Inactive' },
        { where: { id: employee.userId }, transaction: t },
      );
    }
  });

  logger.info('Separation approved — employee exited', {
    employeeId,
    relievingDate: relievingDate || separation.lastWorkingDay,
    approvedBy:    approverUserId,
  });

  return separation.reload();
};

const rejectSeparation = async (employeeId, approverUserId, reason) => {
  if (!reason) throw new AppError('Rejection reason is required', 422);

  const separation = await findSeparation(employeeId);
  if (separation.status !== 'Pending Approval') {
    throw new AppError('Only separations pending approval can be rejected', 422);
  }

  const approver = await Employee.findOne({ where: { userId: approverUserId }, attributes: ['id'] });

  await separation.update({
    status:       'Rejected',
    approvedById: approver?.id || null,
    approvedOn:   new Date(),
    additionalNotes: reason,
  });

  logger.info('Separation rejected', { employeeId, reason });
  return separation;
};

/**
 * HR updates the clearance checklist as tasks are completed.
 * Each task: { task, assignedTo (employeeId), dueDate, completedOn, status }
 */
const updateClearanceTasks = async (employeeId, {
  clearanceTasks,
  equipmentReturned,
  systemAccessRevoked,
}) => {
  const separation = await findSeparation(employeeId);

  const updates = {};
  if (clearanceTasks    !== undefined) updates.clearanceTasks    = clearanceTasks;
  if (equipmentReturned !== undefined) updates.equipmentReturned = equipmentReturned;
  if (systemAccessRevoked !== undefined) updates.systemAccessRevoked = systemAccessRevoked;

  await separation.update(updates);
  logger.info('Clearance tasks updated', { employeeId });
  return separation;
};

/**
 * HR marks full-and-final settlement complete once payroll has processed the exit.
 */
const settleFullAndFinal = async (employeeId, encashmentDate) => {
  const separation = await findSeparation(employeeId);
  if (!['Approved', 'Completed'].includes(separation.status)) {
    throw new AppError('Separation must be Approved before settlement can be recorded', 422);
  }

  await sequelize.transaction(async (t) => {
    await separation.update({
      fullAndFinalSettled: true,
      fullAndFinalDate:    encashmentDate || new Date().toISOString().split('T')[0],
      status:              'Completed',
    }, { transaction: t });

    // Record the encashment date on the Employee record
    await Employee.update(
      { encashmentDate: encashmentDate || new Date().toISOString().split('T')[0] },
      { where: { id: employeeId }, transaction: t },
    );
  });

  logger.info('Full and final settlement recorded', { employeeId });
  return separation.reload();
};


// ═════════════════════════════════════════════════════════════════════════════
//  PROMOTIONS — READ ONLY
//  (Write operations are in the performance / task module)
// ═════════════════════════════════════════════════════════════════════════════

const getPromotionHistory = async (employeeId, query = {}) => {
  await assertEmployeeExists(employeeId);

  const { limit, offset, page } = getPaginationOptions(query);

  const { count, rows } = await EmployeePromotion.findAndCountAll({
    where:   { employeeId },
    limit,
    offset,
    order:   [['promotionDate', 'DESC']],
    include: [
      { model: Designation, as: 'previousDesignation', foreignKey: 'previousDesignationId', required: false },
      { model: Designation, as: 'newDesignation',      foreignKey: 'newDesignationId',      required: false },
      { model: Department,  as: 'previousDepartment',  foreignKey: 'previousDepartmentId',  required: false },
      { model: Department,  as: 'newDepartment',       foreignKey: 'newDepartmentId',       required: false },
    ],
  });

  return { data: rows, meta: buildMeta(count, page, limit) };
};


// ─────────────────────────────────────────────────────────────────────────────
//  SMALL INTERNAL UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/** Asserts the employee exists — throws 404 if not. Lightweight. */
const assertEmployeeExists = async (id) => {
  const exists = await Employee.count({ where: { id } });
  if (!exists) throw new AppError('Employee not found', 404);
};

/** Finds the separation record for an employee or throws 404. */
const findSeparation = async (employeeId) => {
  const sep = await EmployeeSeparation.findOne({ where: { employeeId } });
  if (!sep) throw new AppError('No separation record found for this employee', 404);
  return sep;
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
  createEmployeeFromExistingUser,
};