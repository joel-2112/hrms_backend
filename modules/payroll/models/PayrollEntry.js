module.exports = (sequelize, DataTypes) => {
  const PayrollEntry = sequelize.define('PayrollEntry', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Scope & period ─────────────────────────────────────────
    companyId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → companies.id',
    },
    payrollPeriodId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → payroll_periods.id',
    },

    // ── Run period ─────────────────────────────────────────────
    // Frappe: start_date / end_date define the payroll month being processed
    startDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'First day of the payroll month e.g. 2025-08-01',
    },
    endDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Last day of the payroll month e.g. 2025-08-31',
    },
    postingDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Date of the accounting journal entry for this payroll run',
    },

    // ── Frequency ──────────────────────────────────────────────
    payrollFrequency: {
      type:      DataTypes.ENUM('Monthly', 'Bimonthly', 'Fortnightly', 'Weekly', 'Daily'),
      allowNull: false,
      defaultValue: 'Monthly',
    },

    // ── Filters used when fetching employees ──────────────────
    // Frappe: PayrollEntry can be scoped to Branch, Department, or Designation.
    // These are optional filters — null means all employees in the company.
    branchId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → branches.id — scope this run to one branch',
    },
    departmentId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → departments.id — scope this run to one department',
    },
    designationId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → designations.id — scope this run to one designation',
    },

    // ── Processing options ─────────────────────────────────────
    // Frappe: validateAttendance deducts salary for unmarked/absent days
    validateAttendance: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'When true, absent and unmarked days reduce payment_days in each slip',
    },
    salarySlipBasedOnTimesheet: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'When true, slip earnings are computed from timesheet hours × hourRate',
    },

    // ── Tax deduction options ──────────────────────────────────
    // Frappe exposes both on PayrollEntry — they pass through to each SalarySlip
    deductTaxForUnclaimedEmployeeBenefits: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Deduct tax on flexible benefits not yet claimed by the employee',
    },
    deductTaxForUnsubmittedTaxExemptionProof: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Treat unsubmitted proof as no exemption and deduct full tax',
    },

    // ── Payment details ────────────────────────────────────────
    modeOfPayment: {
      type:      DataTypes.STRING(50),
      allowNull: true,
      comment:   'e.g. "Bank Transfer", "Cash", "Cheque"',
    },
    paymentAccount: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      comment:   'Bank/GL account used in the journal entry',
    },
    currency: {
      type:         DataTypes.STRING(10),
      allowNull:    false,
      defaultValue: 'KES',
    },
    exchangeRate: {
      type:         DataTypes.DECIMAL(10, 6),
      allowNull:    false,
      defaultValue: 1.0,
    },

    // ── Aggregated totals (populated after slip submission) ────
    totalGrossPay: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'SUM of gross_pay across all submitted slips in this entry',
    },
    totalDeduction: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'SUM of total_deduction across all submitted slips',
    },
    totalNetPay: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'SUM of net_pay across all submitted slips',
    },

    // ── Processing status ──────────────────────────────────────
    salarySlipsCreated: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'True once Create Salary Slips has been run',
    },
    salarySlipsSubmitted: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'True once Submit Salary Slips has been run',
    },

    // ── Docstatus ──────────────────────────────────────────────
    docStatus: {
      type:         DataTypes.TINYINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },
  }, {
    tableName: 'payroll_entries',
    comment:   'Batch payroll run — produces one SalarySlip per employee matching the scope filters',
    indexes: [
      { fields: ['company_id'],       name: 'idx_payroll_entries_company' },
      { fields: ['payroll_period_id'], name: 'idx_payroll_entries_period' },
      { fields: ['start_date', 'end_date'], name: 'idx_payroll_entries_dates' },
      { fields: ['doc_status'],       name: 'idx_payroll_entries_status' },
      {
        unique: true,
        fields: ['company_id', 'start_date', 'end_date', 'branch_id', 'department_id', 'designation_id'],
        name:   'uq_payroll_entry_run',
        comment: 'Prevent duplicate payroll runs for the same scope and period',
      },
    ],
  });

  return PayrollEntry;
};