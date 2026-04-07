module.exports = (sequelize, DataTypes) => {
  const AdditionalSalary = sequelize.define('AdditionalSalary', {
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
    salaryComponentId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → salary_components.id — must match component type (Earning or Deduction)',
    },

    // ── Amount ─────────────────────────────────────────────────
    amount: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment:   'One-off or recurring amount to add/deduct outside the normal structure',
    },

    // ── Applicability ──────────────────────────────────────────
    // Frappe: Additional Salary can be one-time or recurring across multiple months
    payrollDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'The payroll month this amount applies to — matched against SalarySlip.startDate',
    },
    isRecurring: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'When true, applies every month until toDate',
    },
    toDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Last payroll month for recurring additional salary — null means indefinite',
    },

    // ── Tax option ─────────────────────────────────────────────
    deductFullTaxOnSelectedPayrollDate: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Deduct full applicable tax in the month this is paid vs spreading over remaining months',
    },

    // ── Processing flag ────────────────────────────────────────
    overwriteSalaryStructureAmount: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'When true, this amount replaces (not adds to) the component amount in the slip',
    },

    reason: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'e.g. "Performance Bonus Q3", "Travel Reimbursement Oct"',
    },

    // ── Docstatus ──────────────────────────────────────────────
    docStatus: {
      type:         DataTypes.TINYINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled — only Submitted records are pulled into slips',
    },
  }, {
    tableName: 'additional_salaries',
    comment:   'One-off or recurring earning/deduction outside the normal salary structure — pulled into SalarySlip on generation',
    indexes: [
      { fields: ['employee_id'],        name: 'idx_additional_salaries_employee' },
      { fields: ['salary_component_id'], name: 'idx_additional_salaries_component' },
      { fields: ['payroll_date'],       name: 'idx_additional_salaries_date' },
      { fields: ['doc_status'],         name: 'idx_additional_salaries_status' },
    ],
  });
  return AdditionalSalary;
};