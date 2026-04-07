module.exports = (sequelize, DataTypes) => {
  const SalaryStructureAssignment = sequelize.define('SalaryStructureAssignment', {
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
      comment:   'FK → salary_structures.id — must be Submitted (docStatus = 1)',
    },

    // ── Effective date ─────────────────────────────────────────
    // Frappe: multiple assignments are allowed per employee for different periods.
    // The active structure for any given payroll date is the one with the
    // highest fromDate that is <= the payroll start date.
    fromDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Structure applies from this date — determines which structure PayrollEntry uses',
    },

    // ── Base & variable pay ────────────────────────────────────
    // Frappe: base is the fixed salary used in formula calculations as `base`.
    // Variable is discretionary / performance-linked.
    base: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Fixed base salary — available as `base` variable in SalaryComponent formulas',
    },
    variable: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Performance-linked variable pay — available as `variable` in formulas',
    },

    // ── Currency ───────────────────────────────────────────────
    // Frappe supports multi-currency salary structures
    currency: {
      type:         DataTypes.STRING(10),
      allowNull:    false,
      defaultValue: 'KES',
      comment:      'ISO 4217 — salary computed in this currency; SalarySlip stores both this and base currency',
    },
    exchangeRate: {
      type:         DataTypes.DECIMAL(10, 6),
      allowNull:    false,
      defaultValue: 1.0,
      comment:      'Rate against company currency at time of assignment',
    },

    // ── Tax slab ───────────────────────────────────────────────
    // Frappe: income tax slab is chosen per employee at assignment level,
    // not at structure level — different employees can have different tax regimes
    incomeTaxSlabId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → income_tax_slabs.id — employee preferred tax regime/slab',
    },

    // ── Cost center split (JSONB) ──────────────────────────────
    // Frappe: salary expenses can be split across multiple cost centers per employee.
    // Each entry: { costCenter: 'Engineering - ACME', percentage: 60 }
    costCenterAllocation: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Cost center split rows — percentages must sum to 100 when present',
    },

    // ── Docstatus ──────────────────────────────────────────────
    docStatus: {
      type:         DataTypes.SMALLINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },
  }, {
    tableName: 'salary_structure_assignments',
    comment:   'Links an Employee to a SalaryStructure from a given date — the active assignment drives PayrollEntry slip generation',
    indexes: [
      { fields: ['employee_id'],         name: 'idx_ssa_employee' },
      { fields: ['salary_structure_id'], name: 'idx_ssa_structure' },
      { fields: ['from_date'],           name: 'idx_ssa_from_date' },
      { fields: ['income_tax_slab_id'],  name: 'idx_ssa_tax_slab' },
      {
        // Latest assignment wins — enforce one active assignment at a time
        unique: true,
        fields: ['employee_id', 'from_date'],
        name:   'uq_ssa_employee_from_date',
      },
    ],
  });
  return SalaryStructureAssignment;
};