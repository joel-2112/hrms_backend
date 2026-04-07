
module.exports = (sequelize, DataTypes) => {
  const InterviewFeedback = sequelize.define('InterviewFeedback', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FKs ─────────────────────────────────────────────
    // InterviewFeedback.belongsTo(Interview, { foreignKey: 'interviewId', allowNull: false })
    // InterviewFeedback.belongsTo(Employee,  { as: 'reviewer', foreignKey: 'reviewerId', allowNull: false })
    interviewId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → interviews.id',
    },
    reviewerId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id — the panelist submitting this feedback (may differ from lead interviewer)',
    },

    // ── Skill ratings ──────────────────────────────────────────
    // Mirrors the Interview.skillCriteria list — one rating entry per skill.
    // Each entry: { skillName, score, maximumScore }
    // Score is compared against Interview.skillCriteria[n].maximumScore
    skillAssessments: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Per-skill scores — keys must match Interview.skillCriteria entries',
    },

    // ── Overall rating ─────────────────────────────────────────
    totalScore: {
      type:      DataTypes.DECIMAL(6, 2),
      allowNull: true,
      comment:   'Sum of all skill scores — computed from skillAssessments on save',
    },
    maxScore: {
      type:      DataTypes.DECIMAL(6, 2),
      allowNull: true,
      comment:   'Sum of all maximumScore values — denominator for percentage calculation',
    },
    result: {
      type:      DataTypes.ENUM('Cleared', 'Not Cleared', 'On Hold'),
      allowNull: false,
      comment:   'This panelist\'s recommendation for the applicant',
    },

    // ── Competency ratings (Frappe HR structure) ───────────────
    // Each entry: { competency, description, rating (1–5) }
    competencyRatings: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Soft-skill / behavioural competency ratings e.g. Communication, Leadership',
    },

    // ── Qualitative feedback ───────────────────────────────────
    strengths: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'What the candidate did well',
    },
    weaknesses: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Areas for development',
    },
    recommendation: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Panelist\'s overall recommendation and suggested next step',
    },

    // ── Confidentiality ────────────────────────────────────────
    isConfidential: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: true,
      comment:      'Confidential feedback is hidden from the applicant and non-HR users',
    },

    // ── Workflow ───────────────────────────────────────────────
    docStatus: {
      type:         DataTypes.SMALLINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },
  }, {
    tableName: 'interview_feedbacks',
    comment:   'One feedback record per panelist per interview round — aggregated into Interview.averageRating',
    indexes: [
      {
        unique: true,
        fields: ['interview_id', 'reviewer_id'],
        name:   'uq_interview_feedbacks_interview_reviewer',
        comment: 'One feedback submission per panelist per round',
      },
      { fields: ['interview_id'], name: 'idx_interview_feedbacks_interview' },
      { fields: ['reviewer_id'],  name: 'idx_interview_feedbacks_reviewer' },
      { fields: ['result'],       name: 'idx_interview_feedbacks_result' },
    ],
  });
  return InterviewFeedback;
};