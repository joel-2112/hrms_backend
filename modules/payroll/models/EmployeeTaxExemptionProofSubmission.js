module.exports = (sequelize, DataTypes) => {
  const EmployeeTaxExemptionProofSubmission = sequelize.define('EmployeeTaxExemptionProofSubmission', {
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
      comment:   'FK → payroll_periods.id — proof is for this tax year',
    },

    // ── Proof entries (JSONB) ──────────────────────────────────
    // Same structure as Declaration but these are the ACTUAL verified amounts.
    // Each entry: {
    //   exemptionCategory: 'Section 80C',
    //   exemptionSubCategory: 'LIC Premium',
    //   amount: 48000,            // actual amount supported by documents
    //   maximumAllowedAmount: 150000,
    //   invoiceDate: '2025-03-01'
    // }
    proofs: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Array of verified proof rows — used for final year-end TDS settlement',
    },

    // ── Totals ─────────────────────────────────────────────────
    totalActualAmount: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'SUM of all verified amounts',
    },
    totalExemptionAmount: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Effective exemption after per-category caps — used in final slip computation',
    },

    // ── Docstatus ──────────────────────────────────────────────
    docStatus: {
      type:         DataTypes.TINYINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },
  }, {
    tableName: 'employee_tax_exemption_proof_submissions',
    comment:   'Year-end verified proof of tax-saving investments — overrides Declaration for final TDS settlement in the last salary slip',
    indexes: [
      { fields: ['employee_id'],       name: 'idx_eteps_employee' },
      { fields: ['payroll_period_id'], name: 'idx_eteps_period' },
      {
        unique: true,
        fields: ['employee_id', 'payroll_period_id'],
        name:   'uq_eteps_employee_period',
        comment: 'One proof submission per employee per payroll period',
      },
    ],
  });
  return EmployeeTaxExemptionProofSubmission;
};