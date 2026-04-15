module.exports = (sequelize, DataTypes) => {
  const StaffingPlan = sequelize.define('StaffingPlan', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      // unique:    true,
      comment:   'e.g. "Engineering Hiring Plan Q1 2025"',
    },

    // ── Scope ──────────────────────────────────────────────────
    // Frappe: StaffingPlan can be at company level or department level.
    // Job Openings check vacancies against the active plan for the
    // company OR any parent company in the group hierarchy.
    companyId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → companies.id',
    },
    departmentId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → departments.id — null means plan covers the whole company',
    },

    // ── Plan period ────────────────────────────────────────────
    fromDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Start of the hiring plan window',
    },
    toDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'End of the hiring plan window',
    },

    // ── Staffing detail rows (JSONB) ───────────────────────────
    // Frappe stores these as a child table (Staffing Plan Detail).
    // Each entry: {
    //   designationId:            uuid,
    //   numberOfPositions:        5,      // planned headcount
    //   currentCount:             3,      // existing employees in this designation
    //   vacancies:                2,      // numberOfPositions - currentCount
    //   estimatedCostPerPosition: 80000,  // CTC per hire
    //   totalEstimatedCost:       160000  // vacancies × estimatedCostPerPosition
    // }
    planDetails: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Array of staffing detail rows per designation — drives JobOpening vacancy validation',
    },

    // ── Budget summary ─────────────────────────────────────────
    totalEstimatedBudget: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'SUM of totalEstimatedCost across all planDetail rows — denormalized for display',
    },

    // ── Docstatus ──────────────────────────────────────────────
    docStatus: {
      type:         DataTypes.SMALLINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled — JobOpenings only check Submitted plans',
    },
  }, {
    tableName: 'staffing_plans',
    comment:   'Headcount plan per company/department for a period — restricts how many JobOpenings can be created per Designation',
    indexes: [
      { unique: true, fields: ['name', 'company_id'], name: 'uq_staffing_plans_name_company' },
      { fields: ['company_id'],               name: 'idx_staffing_plans_company' },
      { fields: ['department_id'],            name: 'idx_staffing_plans_department' },
      { fields: ['from_date', 'to_date'],     name: 'idx_staffing_plans_period' },
      { fields: ['doc_status'],               name: 'idx_staffing_plans_status' },
    ],
  });
  return StaffingPlan;
};