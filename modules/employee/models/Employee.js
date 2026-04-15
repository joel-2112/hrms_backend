
module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define('Employee', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ─────────────────────────────────────────────
    //  SECTION 1 — ORGANIZATION FKs
    //  All wired in models/index.js
    // ─────────────────────────────────────────────
    userId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → users.id — the login account for this employee (nullable for non-system users)',
    },
    companyId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → companies.id',
    },
    branchId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → branches.id',
    },
    departmentId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → departments.id',
    },
    designationId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → designations.id',
    },
    employmentTypeId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employment_types.id',
    },
    employeeGradeId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employee_grades.id',
    },
    reportsToId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id (self-ref) — direct line manager',
    },

    // ─────────────────────────────────────────────
    //  SECTION 2 — IDENTITY
    // ─────────────────────────────────────────────
    employeeNumber: {
      type:      DataTypes.STRING(50),
      allowNull: false,
      // unique:    true,
      comment:   'HR-assigned employee ID e.g. "EMP-00042"',
    },
    firstName: {
      type:      DataTypes.STRING(100),
      allowNull: false,
    },
    middleName: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    lastName: {
      type:      DataTypes.STRING(100),
      allowNull: false,
    },
    salutation: {
      type:      DataTypes.ENUM('Mr', 'Mrs', 'Ms', 'Dr', 'Prof'),
      allowNull: true,
    },
    gender: {
      type:      DataTypes.ENUM('Male', 'Female', 'Non-binary', 'Prefer not to say'),
      allowNull: true,
    },
    dateOfBirth: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },
    maritalStatus: {
      type:      DataTypes.ENUM('Single', 'Married', 'Divorced', 'Widowed', 'Separated'),
      allowNull: true,
    },
    nationality: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    nationalId: {
      type:      DataTypes.INTEGER(16),
      allowNull: true,
    },
    religion: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    bloodGroup: {
      type:      DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      allowNull: true,
    },

    // ─────────────────────────────────────────────
    //  SECTION 3 — PHOTO
    // ─────────────────────────────────────────────
    image: {
      type:      DataTypes.STRING(512),
      allowNull: true,
      comment:   'Relative path to avatar file e.g. "avatars/emp-uuid.jpg"',
    },

    // ─────────────────────────────────────────────
    //  SECTION 4 — EMPLOYMENT DETAILS
    // ─────────────────────────────────────────────
    status: {
      type:         DataTypes.ENUM('Active', 'Inactive', 'On Leave', 'Suspended', 'Left'),
      allowNull:    false,
      defaultValue: 'Active',
    },
    dateOfJoining: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    dateOfConfirmation: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'When probation ended and employment was confirmed',
    },
    scheduledConfirmationDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },
    contractEndDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'For fixed-term contracts — triggers expiry alerts',
    },
    noticeNumberOfDays: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 30,
      comment:      'Notice period in calendar days',
    },
    relievingDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Last working day — populated on separation',
    },
    encashmentDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Date of final leave encashment on exit',
    },

    // ─────────────────────────────────────────────
    //  SECTION 5 — CONTACT
    // ─────────────────────────────────────────────
    personalEmail: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      validate:  { isEmail: true },
    },
    companyEmail: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      validate:  { isEmail: true },
      comment:   'Work email — typically mirrors User.email',
    },
    cellNumber: {
      type:      DataTypes.STRING(30),
      allowNull: true,
    },
    phoneNumber: {
      type:      DataTypes.STRING(30),
      allowNull: true,
      comment:   'Office / desk phone',
    },

    // ─────────────────────────────────────────────
    //  SECTION 6 — CURRENT ADDRESS
    // ─────────────────────────────────────────────
    currentAddress: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    currentCity: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    currentState: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    currentCountry: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    currentPostalCode: {
      type:      DataTypes.STRING(20),
      allowNull: true,
    },

    // ─────────────────────────────────────────────
    //  SECTION 7 — PERMANENT ADDRESS
    // ─────────────────────────────────────────────
    permanentAddress: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    permanentCity: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    permanentState: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    permanentCountry: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    permanentPostalCode: {
      type:      DataTypes.STRING(20),
      allowNull: true,
    },
    isSameAddress: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'UI shortcut — when true current address mirrors permanent address',
    },

    // ─────────────────────────────────────────────
    //  SECTION 8 — NATIONAL IDs & STATUTORY
    // ─────────────────────────────────────────────
    nationalId: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    passportNumber: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    passportExpiry: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },
    taxId: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'KRA PIN / TIN / PAN or equivalent statutory tax identifier',
    },
    socialSecurityNumber: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'NSSF / NHIF number or equivalent',
    },
    healthInsuranceProvider: {
      type:      DataTypes.STRING(150),
      allowNull: true,
    },
    healthInsuranceNumber: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },

    // ─────────────────────────────────────────────
    //  SECTION 9 — BANK DETAILS
    // ─────────────────────────────────────────────
    bankName: {
      type:      DataTypes.STRING(150),
      allowNull: true,
    },
    bankAccountNumber: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    bankBranch: {
      type:      DataTypes.STRING(150),
      allowNull: true,
    },
    bankCode: {
      type:      DataTypes.STRING(50),
      allowNull: true,
      comment:   'Sort code / SWIFT / routing number',
    },
    mobileMoneyNumber: {
      type:      DataTypes.STRING(30),
      allowNull: true,
      comment:   'M-Pesa or equivalent mobile money number for payroll disbursement',
    },
    paymentMethod: {
      type:         DataTypes.ENUM('Bank Transfer', 'Cash', 'Cheque', 'Mobile Money'),
      allowNull:    false,
      defaultValue: 'Bank Transfer',
    },

    // ─────────────────────────────────────────────
    //  SECTION 10 — LEAVE & ATTENDANCE DEFAULTS
    // ─────────────────────────────────────────────
    holidayListId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → holiday_lists.id — employee-level override; falls back to company default',
    },
    defaultShiftId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → shift_types.id — employee-level default shift',
    },
    attendanceDeviceId: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'Biometric / RFID device ID for auto-checkin reconciliation',
    },
    leaveApprovedById: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id — default leave approver (overrides department rule)',
    },
    expenseApprovedById: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id — default expense approver',
    },

    // ─────────────────────────────────────────────
    //  SECTION 11 — MISC / META
    // ─────────────────────────────────────────────
    bio: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Short public biography shown on org chart and profile pages',
    },
    customFields: {
      type:      DataTypes.JSONB,
      allowNull: true,
      comment:   'Escape hatch for tenant-specific fields without schema migrations',
    },
  }, {
    tableName: 'employees',
    comment:   'Core employee record — the subject of every HRMS transaction',
    indexes: [
      { unique: true, fields: ['employee_number'],  name: 'uq_employees_number' },
      { fields: ['company_id'],                     name: 'idx_employees_company' },
      { fields: ['department_id'],                  name: 'idx_employees_department' },
      { fields: ['status'],                         name: 'idx_employees_status' },
      { fields: ['reports_to_id'],                  name: 'idx_employees_reports_to' },
      { fields: ['date_of_joining'],                name: 'idx_employees_joining' },
    ],
  });
  return Employee;
};
