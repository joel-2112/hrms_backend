'use strict';

module.exports = (sequelize, DataTypes) => {
  const EmployeePerformanceFeedback = sequelize.define('EmployeePerformanceFeedback', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FKs ─────────────────────────────────────────────
    // EmployeePerformanceFeedback.belongsTo(Appraisal, { foreignKey: 'appraisalId', allowNull: false })
    // EmployeePerformanceFeedback.belongsTo(Employee,  { as: 'reviewee', foreignKey: 'revieweeId', allowNull: false })
    // EmployeePerformanceFeedback.belongsTo(Employee,  { as: 'reviewer', foreignKey: 'reviewerId', allowNull: false })
    appraisalId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → appraisals.id — which appraisal this feedback feeds into',
    },
    revieweeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id — the employee being reviewed',
    },
    reviewerId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id — the peer / subordinate / manager submitting feedback',
    },

    // ── Reviewer relationship ──────────────────────────────────
    reviewerType: {
      type:      DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: {
          args: [['Manager', 'Peer', 'Subordinate', 'Self', 'External']],
          msg: 'Reviewer type must be one of Manager, Peer, Subordinate, Self, External',
        },
      },
      comment:   'Relationship of reviewer to reviewee — drives 360° weighting logic',
    },

    // ── Structured criteria responses ──────────────────────────
    // References AppraisalTemplate.feedbackCriteria[].criterionId.
    // Each entry:
    // {
    //   criterionId  : string  (matches template feedbackCriteria),
    //   criterionTitle: string (snapshot at submission time),
    //   type         : 'Rating' | 'Text' | 'Yes/No',
    //   rating       : number | null,   (for type = Rating)
    //   response     : string | null,   (for type = Text or Yes/No)
    // }
    criteriaResponses: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Structured responses keyed to AppraisalTemplate.feedbackCriteria criterionIds',
    },

    // ── Computed aggregate score ───────────────────────────────
    totalScore: {
      type:      DataTypes.DECIMAL(6, 2),
      allowNull: true,
      comment:   'Average of all Rating-type criteriaResponses — recomputed on save; null when no rating criteria exist',
    },

    // ── Qualitative sections (Frappe HR structure) ─────────────
    strengths: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'What the reviewee does particularly well',
    },
    areasOfImprovement: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    trainingRecommendations: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Skills or courses the reviewer recommends for the reviewee',
    },
    overallRecommendation: {
      type:      DataTypes.ENUM(
        'Strongly Recommend',
        'Recommend',
        'Neutral',
        'Does Not Recommend'
      ),
      allowNull: true,
    },

    // ── Anonymity ──────────────────────────────────────────────
    isAnonymous: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Inherited from template.showFeedbackReviewerNames — stored here for audit even if template later changes',
    },

    // ── Request / invitation tracking ─────────────────────────
    requestedOn: {
      type:      DataTypes.DATE,
      allowNull: true,
      comment:   'When the feedback request was sent to the reviewer',
    },
    reminderSentOn: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    submittedOn: {
      type:      DataTypes.DATE,
      allowNull: true,
      comment:   'When the reviewer submitted — null = still pending',
    },
    feedbackToken: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      comment:   'One-time token embedded in the feedback request link for portal submission without login',
    },

    // ── Status ─────────────────────────────────────────────────
    status: {
      type:      DataTypes.ENUM('Pending', 'Submitted', 'Expired', 'Cancelled'),
      allowNull:    false,
      defaultValue: 'Pending',
    },
  }, {
    tableName: 'employee_performance_feedbacks',
    comment:   '360° feedback record — one row per reviewer per appraisal; aggregated into Appraisal.feedbackScore',
    indexes: [
      {
        unique: true,
        fields: ['appraisal_id', 'reviewer_id'],
        name:   'uq_epf_appraisal_reviewer',
        comment: 'One feedback submission per reviewer per appraisal',
      },
      { fields: ['appraisal_id'],  name: 'idx_epf_appraisal' },
      { fields: ['reviewee_id'],   name: 'idx_epf_reviewee' },
      { fields: ['reviewer_id'],   name: 'idx_epf_reviewer' },
      { fields: ['reviewer_type'], name: 'idx_epf_reviewer_type' },
      { fields: ['status'],        name: 'idx_epf_status' },
      { fields: ['feedback_token'],name: 'idx_epf_token' },
    ],
  });
  return EmployeePerformanceFeedback;
};