module.exports = (sequelize, DataTypes) => {
  const SalaryComponent = sequelize.define('SalaryComponent', {
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
      comment:   'e.g. "Basic Salary", "House Rent Allowance", "Income Tax"',
    },
    abbreviation: {
      type:      DataTypes.STRING(10),
      allowNull: false,
      unique:    true,
      comment:   'Short code used in formulas e.g. "BS", "HRA", "IT"',
    },
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    // ── Type ───────────────────────────────────────────────────
    // Frappe: only Earnings show in earnings table, only Deductions in deductions table
    type: {
      type:      DataTypes.ENUM('Earning', 'Deduction'),
      allowNull: false,
      comment:   'Earning = adds to gross; Deduction = subtracted from gross',
    },

    // ── Formula / amount ───────────────────────────────────────
    // Frappe allows either a fixed amount or a formula string.
    // The formula is evaluated at slip generation time by the service layer.
    amountBasedOnFormula: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'When true, formula is used; when false, amount is used directly',
    },
    formula: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Python-style formula e.g. "base * 0.4" — evaluated at slip generation',
    },
    condition: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Optional condition that must be true for this component to apply e.g. "base > 10000"',
    },
    amount: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Fixed amount — used when amountBasedOnFormula = false',
    },

    // ── Behaviour flags (directly from Frappe docs) ────────────
    isPayable: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: true,
      comment:      'If false, component is part of CTC but not actually paid out',
    },
    dependsOnPaymentDays: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: true,
      comment:      'When true, amount is prorated by working days / total days',
    },
    isTaxApplicable: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Earning components only — marks this as part of taxable income',
    },
    deductFullTaxOnSelectedPayrollDate: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'For Additional Salary: deduct full tax in the month the bonus is paid vs spreading over the year',
    },
    roundToNearestInteger: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Round the computed amount to nearest whole number',
    },
    statisticalComponent: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Value is computed but does NOT add to earnings or deductions total — can be referenced by other formulas',
    },
    doNotIncludeInTotal: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Excluded from gross total e.g. company car usage — part of CTC but not payable',
    },
    variableBasedOnTaxableSalary: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Auto-computed from taxable income via IncomeTaxSlab e.g. TDS / Income Tax component',
    },
    exemptedFromIncomeTax: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Full amount deducted from taxable income before tax calc e.g. Professional Tax in India',
    },

    // ── Flexible benefit fields ────────────────────────────────
    isFlexibleBenefit: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Earning components only — employee can claim up to maxBenefitAmount per year',
    },
    maxBenefitAmount: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    true,
      comment:      'Yearly cap for this flexible benefit component',
    },
    payAgainstBenefitClaim: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Pay this benefit only when an Employee Benefit Claim is submitted',
    },
    onlyTaxImpact: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Flexible benefit is taxable but cannot be claimed as cash',
    },

    // ── Behaviour flags ────────────────────────────────────────
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Disabled components cannot be added to salary structures',
    },
  }, {
    tableName: 'salary_components',
    comment:   'Atomic earning or deduction unit — referenced by SalaryStructure (via JSONB rows) and SalarySlip line items',
    indexes: [
      { unique: true, fields: ['name'],         name: 'uq_salary_components_name' },
      { unique: true, fields: ['abbreviation'], name: 'uq_salary_components_abbr' },
      { fields: ['type'],                       name: 'idx_salary_components_type' },
    ],
  });


  return SalaryComponent;
};