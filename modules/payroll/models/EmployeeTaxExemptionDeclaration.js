module.exports = (sequelize, DataTypes) => {
  const EmployeeTaxExemptionDeclaration = sequelize.define('EmployeeTaxExemptionDeclaration', {
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
    payrollPeriodId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → payroll_periods.id — declaration is for this tax year',
    },

    // ── Declaration entries (JSONB) ────────────────────────────
    // Each entry: {
    //   exemptionCategory: 'Section 80C',   // e.g. India investment category
    //   exemptionSubCategory: 'LIC Premium',
    //   amount: 50000,
    //   maximumAllowedAmount: 150000
    // }
    declarations: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Array of declared investment/exemption rows — used for mid-year tax projection',
    },

    // ── Totals ─────────────────────────────────────────────────
    totalDeclaredAmount: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'SUM of all declared amounts — denormalized for fast tax computation queries',
    },
    totalExemptionAmount: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Effective exemption after applying per-category caps',
    },

    // ── Docstatus ──────────────────────────────────────────────
    docStatus: {
      type:         DataTypes.TINYINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },
  }, {
    tableName: 'employee_tax_exemption_declarations',
    comment:   'Mid-year employee declaration of tax-saving investments — used by SalarySlip for projected TDS calculation',
    indexes: [
      { fields: ['employee_id'],       name: 'idx_eted_employee' },
      { fields: ['payroll_period_id'], name: 'idx_eted_period' },
      {
        unique: true,
        fields: ['employee_id', 'payroll_period_id'],
        name:   'uq_eted_employee_period',
        comment: 'One declaration per employee per payroll period',
      },
    ],
  });
  return EmployeeTaxExemptionDeclaration;
};