
module.exports = (sequelize, DataTypes) => {
  const AppraisalCycle = sequelize.define('AppraisalCycle', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FK ──────────────────────────────────────────────
    // AppraisalCycle.belongsTo(AppraisalTemplate, { foreignKey: 'appraisalTemplateId', allowNull: false })
    appraisalTemplateId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → appraisal_templates.id — all KRAs, criteria and weights inherited from here',
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      comment:   'e.g. "FY 2025 Annual Appraisal — Engineering", "Q3 2025 Sales Review"',
    },
    cycleType: {
      type:      DataTypes.ENUM(
        'Annual',
        'Semi-Annual',
        'Quarterly',
        'Monthly',
        'Probation',
        'Ad Hoc'
      ),
      allowNull: false,
      defaultValue: 'Annual',
    },

    // ── Cycle window ───────────────────────────────────────────
    startDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'First day of the performance period being evaluated',
    },
    endDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Last day of the performance period being evaluated',
    },

    // ── Key milestone dates ────────────────────────────────────
    goalSettingDeadline: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Deadline by which employees must finalise their goals',
    },
    selfAppraisalDeadline: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Deadline for employees to submit their self-appraisal scores',
    },
    managerReviewDeadline: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Deadline for managers to submit final ratings',
    },
    feedbackDeadline: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   '360° peer feedback submission deadline',
    },

    // ── Scope filters ──────────────────────────────────────────
    // When the cycle is created, the service queries Employee with
    // these optional filters to determine which employees get Appraisals.
    // All three are nullable — null = no filter on that dimension.
    companyId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → companies.id — null = all companies',
    },
    departmentId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → departments.id — null = all departments',
    },
    branchId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → branches.id — null = all branches',
    },
    designationId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → designations.id — null = all designations',
    },
    gradeId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employee_grades.id — null = all grades',
    },

    // ── Lifecycle status ───────────────────────────────────────
    status: {
      type:      DataTypes.ENUM(
        'Draft',
        'Goal Setting',      // employees setting goals
        'Self Appraisal',    // employees rating themselves
        'Manager Review',    // managers submitting ratings
        'Feedback',          // 360° feedback collection
        'Completed',
        'Cancelled'
      ),
      allowNull:    false,
      defaultValue: 'Draft',
      comment:      'Controls which actions are available at each stage of the cycle',
    },

    // ── Progress counters (denormalized for dashboard queries) ──
    totalAppraisals: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      comment:      'Count of Appraisal records created for this cycle',
    },
    completedAppraisals: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      comment:      'Count of Appraisals where status = Completed — updated by trigger/service',
    },

    // ── Misc ───────────────────────────────────────────────────
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    remarks: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'appraisal_cycles',
    comment:   'A time-boxed performance review cycle — bulk-creates one Appraisal per matched employee on launch',
    indexes: [
      { fields: ['appraisal_template_id'],    name: 'idx_appraisal_cycles_template' },
      { fields: ['status'],                   name: 'idx_appraisal_cycles_status' },
      { fields: ['start_date', 'end_date'],   name: 'idx_appraisal_cycles_window' },
      { fields: ['company_id'],               name: 'idx_appraisal_cycles_company' },
      { fields: ['department_id'],            name: 'idx_appraisal_cycles_department' },
    ],
  });
  return AppraisalCycle;
};