module.exports = (sequelize, DataTypes) => {
  const EmployeeIncentive = sequelize.define('EmployeeIncentive', {
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
      comment:   'FK → salary_components.id — the incentive earning component',
    },

    // ── Incentive details ──────────────────────────────────────
    payrollDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Payroll month this incentive is applied to',
    },
    incentiveAmount: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment:   'Performance-based incentive amount',
    },

    // ── Output FK ─────────────────────────────────────────────
    // Same pattern as RetentionBonus — produces an AdditionalSalary on payout
    additionalSalaryId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → additional_salaries.id — set when AdditionalSalary is auto-created',
    },

    remarks: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    // ── Docstatus ──────────────────────────────────────────────
    docStatus: {
      type:         DataTypes.TINYINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },
  }, {
    tableName: 'employee_incentives',
    comment:   'Performance-based incentive — produces an AdditionalSalary which is pulled into the SalarySlip',
    indexes: [
      { fields: ['employee_id'],        name: 'idx_employee_incentives_employee' },
      { fields: ['salary_component_id'], name: 'idx_employee_incentives_component' },
      { fields: ['payroll_date'],       name: 'idx_employee_incentives_date' },
      { fields: ['doc_status'],         name: 'idx_employee_incentives_status' },
    ],
  });
  return EmployeeIncentive;
};