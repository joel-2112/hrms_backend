module.exports = (sequelize, DataTypes) => {
  const SalaryStructure = sequelize.define('SalaryStructure', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      unique:    true,
      comment:   'e.g. "Standard Full-Time Structure", "Executive Structure"',
    },

    // ── Scope ──────────────────────────────────────────────────
    companyId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → companies.id',
    },

    // ── Payroll frequency ──────────────────────────────────────
    // Frappe: Monthly / Bimonthly / Fortnightly / Weekly / Daily
    payrollFrequency: {
      type:      DataTypes.ENUM('Monthly', 'Bimonthly', 'Fortnightly', 'Weekly', 'Daily'),
      allowNull: false,
      defaultValue: 'Monthly',
      comment:   'How often salaries are paid under this structure',
    },

    // ── Timesheet-based salary ─────────────────────────────────
    // Frappe: salary slip can be based on timesheets (hourly billing model)
    salarySlipBasedOnTimesheet: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'When true, PayrollEntry uses timesheet hours × hourRate instead of fixed components',
    },
    hourRate: {
      type:      DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment:   'Rate per hour — only relevant when salarySlipBasedOnTimesheet = true',
    },

    // ── Earnings & deductions (JSONB child rows) ───────────────
    // Frappe stores these as child table rows (Salary Detail).
    // We flatten to JSONB to avoid a separate table.
    // Each entry: {
    //   salaryComponentId: uuid,
    //   abbr: 'BS',
    //   formula: 'base * 0.5',       // overrides component default if set
    //   condition: '',
    //   amount: 0,
    //   amountBasedOnFormula: true,
    //   dependsOnPaymentDays: true,
    //   statisticalComponent: false,
    //   doNotIncludeInTotal: false,
    //   isFlexibleBenefit: false,
    // }
    earnings: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Array of earning component rows — each row overrides or inherits SalaryComponent defaults',
    },
    deductions: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Array of deduction component rows',
    },

    // ── Benefit & encashment settings ──────────────────────────
    maxBenefitsAmount: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    true,
      defaultValue: 0,
      comment:      'Max yearly flexible benefit amount for this structure',
    },
    leaveEncashmentAmountPerDay: {
      type:         DataTypes.DECIMAL(10, 2),
      allowNull:    true,
      comment:      'Amount paid per encashed leave day under this structure',
    },

    // ── Payment account ────────────────────────────────────────
    // Stored as string references — accounting module is out of scope
    // but we carry the field for completeness / future integration
    modeOfPayment: {
      type:      DataTypes.STRING(50),
      allowNull: true,
      comment:   'e.g. "Bank Transfer", "Cash", "Cheque"',
    },
    paymentAccount: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      comment:   'GL account name or code — used when posting payroll journal entries',
    },

    // ── Docstatus ──────────────────────────────────────────────
    docStatus: {
      type:         DataTypes.TINYINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled — must be Submitted before assignment',
    },

    // ── Behaviour flags ────────────────────────────────────────
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
  }, {
    tableName: 'salary_structures',
    comment:   'Named pay structure grouping earning and deduction components — must be Submitted before it can be assigned to employees',
    indexes: [
      { unique: true, fields: ['name'],       name: 'uq_salary_structures_name' },
      { fields: ['company_id'],               name: 'idx_salary_structures_company' },
      { fields: ['payroll_frequency'],        name: 'idx_salary_structures_frequency' },
      { fields: ['doc_status'],               name: 'idx_salary_structures_status' },
    ],
  });


  return SalaryStructure;
};