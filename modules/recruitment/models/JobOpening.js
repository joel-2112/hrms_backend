module.exports = (sequelize, DataTypes) => {
  const JobOpening = sequelize.define('JobOpening', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Core identity ──────────────────────────────────────────
    // Frappe calls this field "job_title" — it is the public-facing title
    jobTitle: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      comment:   'Public job title shown on job portal e.g. "Senior Software Engineer"',
    },

    // ── FKs ────────────────────────────────────────────────────
    staffingPlanId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → staffing_plans.id — nullable: an opening may exist without a formal plan',
    },
    departmentId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → departments.id',
    },
    designationId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → designations.id — used to validate against StaffingPlan vacancies',
    },
    companyId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → companies.id',
    },

    // ── Vacancy details ────────────────────────────────────────
    // Frappe: planned number of positions from StaffingPlan is fetched automatically
    plannedNumberOfPositions: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 1,
      comment:      'Fetched from the matching StaffingPlan detail row for this Designation',
    },

    // ── Job description ────────────────────────────────────────
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Full job description — displayed on job portal when publishOnWebsite = true',
    },

    // ── Job portal ─────────────────────────────────────────────
    // Frappe: "Publish on website" flag makes the opening visible on the public job portal
    publishOnWebsite: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'When true, the opening appears on the public-facing job portal',
    },

    // ── Expected compensation ──────────────────────────────────
    expectedSalaryFrom: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment:   'Salary range lower bound for recruiter reference',
    },
    expectedSalaryTo: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment:   'Salary range upper bound for recruiter reference',
    },

    // ── Status ─────────────────────────────────────────────────
    // Frappe: Open / Closed — once Closed no new JobApplicants can be created
    status: {
      type:         DataTypes.ENUM('Open', 'Closed'),
      allowNull:    false,
      defaultValue: 'Open',
      comment:      'Closed openings reject new JobApplicant submissions',
    },
    closedDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Date the opening was closed — set automatically on status change',
    },
  }, {
    tableName: 'job_openings',
    comment:   'Published vacancy — drives applicant intake and is validated against StaffingPlan vacancy count',
    indexes: [
      { fields: ['company_id'],      name: 'idx_job_openings_company' },
      { fields: ['department_id'],   name: 'idx_job_openings_department' },
      { fields: ['designation_id'],  name: 'idx_job_openings_designation' },
      { fields: ['staffing_plan_id'], name: 'idx_job_openings_staffing_plan' },
      { fields: ['status'],          name: 'idx_job_openings_status' },
    ],
  });
  return JobOpening;
};