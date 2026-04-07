module.exports = (sequelize, DataTypes) => {
  const SalarySlip = sequelize.define('SalarySlip', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── FKs ────────────────────────────────────────────────────
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id',
    },
    salaryStructureId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → salary_structures.id — resolved via SalaryStructureAssignment',
    },
    payrollEntryId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → payroll_entries.id — null for manually created slips',
    },
    payrollPeriodId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → payroll_periods.id — used for tax slab and YTD computation',
    },

    // ── Slip period ────────────────────────────────────────────
    // Exact column names from Frappe's salary_slip table (confirmed from GitHub issue)
    startDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    postingDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },

    // ── Payroll context flags (passed from PayrollEntry) ───────
    payrollFrequency: {
      type:      DataTypes.ENUM('Monthly', 'Bimonthly', 'Fortnightly', 'Weekly', 'Daily'),
      allowNull: false,
      defaultValue: 'Monthly',
    },
    salarySlipBasedOnTimesheet: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    deductTaxForUnclaimedEmployeeBenefits: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    deductTaxForUnsubmittedTaxExemptionProof: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },

    // ── Working days (from Frappe's exact column list) ─────────
    totalWorkingDays: {
      type:         DataTypes.DECIMAL(5, 1),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Calendar working days in the slip period per holiday list',
    },
    unmarkedDays: {
      type:         DataTypes.DECIMAL(5, 1),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Days with no attendance record',
    },
    leaveWithoutPay: {
      type:         DataTypes.DECIMAL(5, 1),
      allowNull:    false,
      defaultValue: 0,
      comment:      'LWP days — deducted from payable days',
    },
    absentDays: {
      type:         DataTypes.DECIMAL(5, 1),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Days marked Absent',
    },
    paymentDays: {
      type:         DataTypes.DECIMAL(5, 1),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Actual days used for prorating: totalWorkingDays - leaveWithoutPay - absentDays',
    },

    // ── Timesheet hours (when salarySlipBasedOnTimesheet = true) ──
    totalWorkingHours: {
      type:         DataTypes.DECIMAL(8, 2),
      allowNull:    false,
      defaultValue: 0,
    },
    hourRate: {
      type:         DataTypes.DECIMAL(10, 2),
      allowNull:    false,
      defaultValue: 0,
    },

    // ── Computed earnings & deductions (JSONB line items) ──────
    // Each entry mirrors SalaryStructure.earnings row but with resolved amounts:
    // { salaryComponentId, abbr, amount, defaultAmount, additionalAmount,
    //   isAdditionalComponent, isFlexibleBenefit, isStatistical,
    //   dependsOnPaymentDays, doNotIncludeInTotal, exemptedFromIncomeTax }
    earnings: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Resolved earning component rows with computed amounts',
    },
    deductions: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Resolved deduction component rows with computed amounts',
    },

    // ── Totals (from Frappe exact column list) ─────────────────
    grossPay: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
    },
    totalDeduction: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
    },
    netPay: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'grossPay - totalDeduction',
    },
    roundedTotal: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'netPay rounded to nearest integer',
    },
    totalInWords: {
      type:      DataTypes.STRING(500),
      allowNull: true,
      comment:   'Net pay spelled out in words for printed payslip',
    },

    // ── Multi-currency base amounts ────────────────────────────
    // Frappe stores both the slip currency and the company base currency
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
    baseGrossPay: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'grossPay × exchangeRate in company base currency',
    },
    baseTotalDeduction: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
    },
    baseNetPay: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
    },
    baseRoundedTotal: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
    },

    // ── YTD & MTD accumulators ─────────────────────────────────
    // Frappe tracks these for tax projection and payslip display
    yearToDate: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Cumulative net pay from start of payroll period to this slip',
    },
    grossYearToDate: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
    },
    monthToDate: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
    },

    // ── Tax context ────────────────────────────────────────────
    ctc: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Cost to company — grossPay + non-payable components',
    },
    incomeFromOtherSources: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Declared other income for tax projection purposes',
    },

    // ── Status ─────────────────────────────────────────────────
    status: {
      type:         DataTypes.ENUM('Draft', 'Submitted', 'Cancelled', 'On Hold'),
      allowNull:    false,
      defaultValue: 'Draft',
    },
    docStatus: {
      type:         DataTypes.TINYINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },
  }, {
    tableName: 'salary_slips',
    comment:   'Individual employee payslip — convergence point of the entire payroll system; reads from employee, attendance, leave, and payroll modules',
    indexes: [
      { fields: ['employee_id'],       name: 'idx_salary_slips_employee' },
      { fields: ['payroll_entry_id'],  name: 'idx_salary_slips_entry' },
      { fields: ['payroll_period_id'], name: 'idx_salary_slips_period' },
      { fields: ['start_date', 'end_date'], name: 'idx_salary_slips_dates' },
      { fields: ['status'],            name: 'idx_salary_slips_status' },
      {
        unique: true,
        fields: ['employee_id', 'start_date', 'end_date'],
        name:   'uq_salary_slip_employee_period',
        comment: 'One slip per employee per payroll period',
      },
    ],
  });
  return SalarySlip;
};