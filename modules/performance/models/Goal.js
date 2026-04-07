
module.exports = (sequelize, DataTypes) => {
  const Goal = sequelize.define('Goal', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FKs ─────────────────────────────────────────────
    // Goal.belongsTo(Appraisal, { foreignKey: 'appraisalId', allowNull: false })
    // Goal.belongsTo(Employee,  { foreignKey: 'employeeId',  allowNull: false })
    // Goal.belongsTo(Goal,      { as: 'parentGoal', foreignKey: 'parentGoalId' })
    // Goal.hasMany(Goal,        { as: 'subGoals',   foreignKey: 'parentGoalId' })
    appraisalId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → appraisals.id',
    },
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id — denormalized from appraisal for direct employee-goal queries',
    },
    parentGoalId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → goals.id (self-ref) — null means this is a top-level goal',
    },

    // ── KRA alignment ──────────────────────────────────────────
    // References a kraId from AppraisalTemplate.kras[].kraId.
    // Not a DB FK — the KRA lives inline in the template JSONB.
    kraId: {
      type:      DataTypes.STRING(36),
      allowNull: true,
      comment:   'UUID string matching AppraisalTemplate.kras[].kraId — groups goals by KRA for weighted scoring',
    },

    // ── Goal definition ────────────────────────────────────────
    title: {
      type:      DataTypes.STRING(500),
      allowNull: false,
      comment:   'Concise goal statement e.g. "Achieve 95% customer satisfaction score"',
    },
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Full detail, context, and success criteria',
    },
    goalType: {
      type:      DataTypes.ENUM('KRA', 'Behavioural', 'Learning', 'Project', 'Stretch'),
      allowNull: false,
      defaultValue: 'KRA',
    },

    // ── SMART criteria ─────────────────────────────────────────
    metric: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      comment:   'How success is measured e.g. "CSAT score", "Lines of code reviewed"',
    },
    targetValue: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'The target e.g. "95%", "120 reviews", "3 certifications"',
    },
    actualValue: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'Actual outcome — filled by employee during self-appraisal',
    },
    dueDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },

    // ── Weightage within the appraisal ─────────────────────────
    weightage: {
      type:         DataTypes.DECIMAL(5, 2),
      allowNull:    false,
      defaultValue: 0.00,
      comment:      'This goal\'s share of the KRA\'s score (0–100); all goals under a KRA must sum to 100',
    },

    // ── Scores ─────────────────────────────────────────────────
    selfScore: {
      type:      DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment:   'Employee\'s self-rating (1 – template.ratingScale)',
    },
    managerScore: {
      type:      DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment:   'Manager\'s rating — the authoritative score used in goalScore computation',
    },
    finalScore: {
      type:      DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment:   'Resolved score after any calibration — defaults to managerScore unless overridden',
    },

    // ── Progress tracking ──────────────────────────────────────
    progress: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      validate:     { min: 0, max: 100 },
      comment:      'Completion percentage 0–100 — updated by employee during the cycle',
    },
    status: {
      type:      DataTypes.ENUM(
        'Draft',
        'Open',
        'In Progress',
        'Completed',
        'Cancelled',
        'Overdue'
      ),
      allowNull:    false,
      defaultValue: 'Draft',
    },

    // ── Evidence / updates ─────────────────────────────────────
    // Each entry: { date, note, attachmentPath (optional) }
    progressUpdates: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Chronological log of progress notes submitted by the employee during the cycle',
    },

    // ── Manager feedback on this goal ──────────────────────────
    managerFeedback: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Manager\'s qualitative comment on this specific goal',
    },
    employeeComments: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    // ── Sort order within appraisal ────────────────────────────
    sortOrder: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
    },
  }, {
    tableName: 'goals',
    comment:   'One goal per KRA per employee per appraisal — self-ref supports sub-goal hierarchies',
    indexes: [
      { fields: ['appraisal_id'],              name: 'idx_goals_appraisal' },
      { fields: ['employee_id'],               name: 'idx_goals_employee' },
      { fields: ['parent_goal_id'],            name: 'idx_goals_parent' },
      { fields: ['kra_id'],                    name: 'idx_goals_kra' },
      { fields: ['status'],                    name: 'idx_goals_status' },
      { fields: ['appraisal_id', 'kra_id'],    name: 'idx_goals_appraisal_kra' },
    ],
  });
  return Goal;
};