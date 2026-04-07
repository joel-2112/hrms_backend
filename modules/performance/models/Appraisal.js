
module.exports = (sequelize, DataTypes) => {
  const Appraisal = sequelize.define('Appraisal', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FKs ─────────────────────────────────────────────
    // Appraisal.belongsTo(Employee,          { foreignKey: 'employeeId',          allowNull: false })
    // Appraisal.belongsTo(AppraisalCycle,    { foreignKey: 'appraisalCycleId',    allowNull: false })
    // Appraisal.belongsTo(AppraisalTemplate, { foreignKey: 'appraisalTemplateId', allowNull: false })
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id — the employee being appraised',
    },
    appraisalCycleId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → appraisal_cycles.id',
    },
    appraisalTemplateId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → appraisal_templates.id — denormalized from cycle for direct queries',
    },

    // ── Reviewer chain ─────────────────────────────────────────
    reviewerId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id — direct manager conducting this appraisal',
    },
    reviewerTwoId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id — second-level reviewer / skip-level (optional)',
    },

    // ── Lifecycle status ───────────────────────────────────────
    status: {
      type:      DataTypes.ENUM(
        'Draft',
        'Goal Setting',
        'Self Appraisal',
        'Manager Review',
        'Under Review',
        'Completed',
        'Cancelled'
      ),
      allowNull:    false,
      defaultValue: 'Draft',
    },

    // ── Goal scores (computed by service from Goal child rows) ──
    goalScore: {
      type:      DataTypes.DECIMAL(6, 2),
      allowNull: true,
      comment:   'Weighted average of all Goal.managerScore values — recomputed on each goal save',
    },
    selfAppraisalScore: {
      type:      DataTypes.DECIMAL(6, 2),
      allowNull: true,
      comment:   'Weighted average of all Goal.selfScore values — set when employee submits self-appraisal',
    },
    feedbackScore: {
      type:      DataTypes.DECIMAL(6, 2),
      allowNull: true,
      comment:   'Average of all EmployeePerformanceFeedback.totalScore values for this appraisal',
    },

    // ── Final score ────────────────────────────────────────────
    // Computed as:
    //   finalScore = (goalScore        × template.goalWeightPct / 100)
    //              + (selfAppraisalScore × template.selfAppraisalWeightPct / 100)
    //              + (feedbackScore     × template.feedbackWeightPct / 100)
    // Or entered manually when template.scoringMethod = 'Manual'
    finalScore: {
      type:      DataTypes.DECIMAL(6, 2),
      allowNull: true,
    },
    finalScoreNormalized: {
      type:      DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment:   'finalScore expressed as a percentage of template.ratingScale × 100',
    },

    // ── Rating label ───────────────────────────────────────────
    // Derived from finalScore against rating band thresholds —
    // HR configures bands like: < 40% = "Below Expectations",
    // 40–60% = "Meets Some", 60–80% = "Meets Expectations" etc.
    ratingLabel: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'Human-readable outcome label e.g. "Exceeds Expectations", "Meets Expectations"',
    },

    // ── Promotion / increment recommendation ───────────────────
    promotionRecommended: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    incrementRecommendedPct: {
      type:      DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment:   'Salary increment percentage recommended by reviewer',
    },

    // ── Qualitative review sections ────────────────────────────
    managerComments: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Manager\'s overall narrative review',
    },
    employeeComments: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Employee\'s response / self-assessment narrative',
    },
    hrComments: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'HR calibration notes — not visible to employee',
    },

    // ── Submission timestamps ──────────────────────────────────
    selfAppraisalSubmittedOn: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    managerReviewSubmittedOn: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    completedOn: {
      type:      DataTypes.DATE,
      allowNull: true,
    },

    // ── Workflow ───────────────────────────────────────────────
    docStatus: {
      type:         DataTypes.SMALLINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },
  }, {
    tableName: 'appraisals',
    comment:   'One appraisal per employee per cycle — the convergence point for goals, self-appraisal, and 360° feedback',
    indexes: [
      {
        unique: true,
        fields: ['employee_id', 'appraisal_cycle_id'],
        name:   'uq_appraisals_employee_cycle',
        comment: 'An employee can only have one appraisal per cycle',
      },
      { fields: ['appraisal_cycle_id'],    name: 'idx_appraisals_cycle' },
      { fields: ['appraisal_template_id'], name: 'idx_appraisals_template' },
      { fields: ['status'],                name: 'idx_appraisals_status' },
      { fields: ['reviewer_id'],           name: 'idx_appraisals_reviewer' },
    ],
  });
  return Appraisal;
};