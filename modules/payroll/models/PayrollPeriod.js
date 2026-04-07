module.exports = (sequelize, DataTypes) => {
  const PayrollPeriod = sequelize.define('PayrollPeriod', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      comment:   'e.g. "2025 Payroll Period", "2025-2026 (Apr-Mar)"',
    },

    // ── Scope ──────────────────────────────────────────────────
    companyId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → companies.id',
    },

    // ── Period boundaries ──────────────────────────────────────
    startDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'First day of the payroll year e.g. 2025-01-01 or 2025-04-01',
    },
    endDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Last day of the payroll year e.g. 2025-12-31 or 2026-03-31',
    },

    // ── Tax projection months ──────────────────────────────────
    // Frappe uses this to distribute projected tax across remaining months.
    // The service layer reads this to know how many months are left in the period
    // when computing monthly TDS / income tax deduction.
    taxWithholdingCategory: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'Tax withholding category reference — used for tax projection calculations',
    },

    // ── Status ─────────────────────────────────────────────────
    isActive: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: true,
      comment:      'Only one period should be active at a time per company',
    },
  }, {
    tableName: 'payroll_periods',
    comment:   'Payroll year boundary — IncomeTaxSlab rows and PayrollEntry runs are scoped to this period',
    indexes: [
      { fields: ['company_id'],             name: 'idx_payroll_periods_company' },
      { fields: ['is_active'],              name: 'idx_payroll_periods_active' },
      { fields: ['start_date', 'end_date'], name: 'idx_payroll_periods_dates' },
      {
        unique: true,
        fields: ['company_id', 'name'],
        name:   'uq_payroll_periods_company_name',
      },
    ],
  });
  return PayrollPeriod;
};