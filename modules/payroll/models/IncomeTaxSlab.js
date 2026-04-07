module.exports = (sequelize, DataTypes) => {
  const IncomeTaxSlab = sequelize.define('IncomeTaxSlab', {
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
      comment:   'e.g. "India Tax 2025-26 - New Regime", "Kenya PAYE 2025"',
    },

    // ── Scope ──────────────────────────────────────────────────
    payrollPeriodId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → payroll_periods.id — slab is valid within this period only',
    },
    currency: {
      type:         DataTypes.STRING(10),
      allowNull:    false,
      defaultValue: 'KES',
      comment:      'ISO 4217 — must match the company currency for correct tax computation',
    },

    // ── Slab rows (JSONB) ──────────────────────────────────────
    // Each entry: {
    //   fromAmount:  0,
    //   toAmount:    300000,    // null = no upper bound (top slab)
    //   percent:     0,
    //   fixedAmount: 0,         // flat tax on the slab band before % applies
    //   condition:   ''         // optional formula condition
    // }
    slabs: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Array of tax band rows ordered by fromAmount ascending',
    },

    // ── Standard deductions (JSONB) ────────────────────────────
    // Amounts automatically deducted from taxable income before slab application.
    // Each entry: { allowance: 'Standard Deduction', maxAmount: 50000 }
    standardDeductions: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Deductions applied to taxable income before slab calculation',
    },

    // ── Tax rebates (JSONB) ────────────────────────────────────
    // e.g. Section 87A rebate in India: { rebateAmount: 25000, eligibleIncome: 700000 }
    taxRebates: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Direct rebates subtracted from computed tax e.g. Section 87A',
    },

    // ── Behaviour flags ────────────────────────────────────────
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
  }, {
    tableName: 'income_tax_slabs',
    comment:   'Tax bracket table for a PayrollPeriod — referenced by SalaryStructureAssignment and SalarySlip for TDS computation',
    indexes: [
      { fields: ['payroll_period_id'], name: 'idx_income_tax_slabs_period' },
    ],
  });
  return IncomeTaxSlab;
};