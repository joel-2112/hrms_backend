module.exports = (sequelize, DataTypes) => {
  const AppraisalTemplate = sequelize.define(
    "AppraisalTemplate",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // ── Core identity ──────────────────────────────────────────
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        // unique:    true,
        comment:
          'e.g. "Engineering Annual Review", "Management 360°", "Sales Quarterly"',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // ── Optional designation scope ─────────────────────────────
      // Frappe HR links a template to a Designation so the right
      // template auto-selects when creating a cycle for that role.
      designationId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment:
          "FK → designations.id — soft link; null = template applies to all designations",
      },

      // ── Scoring formula ────────────────────────────────────────
      scoringMethod: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Weighted Average",
        validate: {
          isIn: {
            args: [
              [
                "Weighted Average", // each KRA has a weightage; score = Σ(score × weight / 100)
                "Simple Average", // all KRAs weighted equally
                "Manual",
              ],
            ],
            msg: "Scoring method must be Weighted Average",
          },
        },
        comment:
          "How goalScore, selfAppraisalScore, and feedbackScore are blended into finalScore",
      },
      ratingScale: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        comment:
          "Maximum score per goal / KRA e.g. 5 = ratings 1–5, 10 = ratings 1–10",
      },

      // ── Score component weights ────────────────────────────────
      // Controls how goalScore, selfAppraisalScore, and feedbackScore
      // are blended into Appraisal.finalScore.
      // Must sum to 100 when all three are non-zero.
      goalWeightPct: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 70.0,
        comment:
          "Percentage weight of manager-rated goal scores in final score",
      },
      selfAppraisalWeightPct: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 15.0,
        comment:
          "Percentage weight of employee self-appraisal score in final score",
      },
      feedbackWeightPct: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 15.0,
        comment:
          "Percentage weight of 360° peer/subordinate feedback in final score",
      },

      // ─────────────────────────────────────────────────────────
      //  KRA DEFINITIONS  (inline child rows — not a separate table)
      //
      //  Each KRA entry:
      //  {
      //    kraId        : string (uuid v4 — stable ID for Goal.kraId reference),
      //    title        : string  e.g. "Customer Satisfaction",
      //    description  : string,
      //    weightage    : number  (percentage 0–100; all KRAs must sum to 100),
      //    ratingCriteria: [      (per-score descriptor for the rating scale)
      //      { score: 1, label: "Below Expectations", description: "..." },
      //      { score: 2, label: "Needs Improvement",  description: "..." },
      //      ...up to ratingScale
      //    ]
      //  }
      // ─────────────────────────────────────────────────────────
      kras: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        comment:
          "KRA definitions with weightages and per-score rating descriptors",
      },

      // ─────────────────────────────────────────────────────────
      //  FEEDBACK CRITERIA  (inline child rows — not a separate table)
      //
      //  Used by EmployeePerformanceFeedback for structured 360° ratings.
      //  Each criterion entry:
      //  {
      //    criterionId  : string (uuid v4),
      //    title        : string  e.g. "Communication", "Leadership", "Collaboration",
      //    description  : string,
      //    type         : 'Rating' | 'Text' | 'Yes/No',
      //    isMandatory  : boolean
      //  }
      // ─────────────────────────────────────────────────────────
      feedbackCriteria: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        comment:
          "Structured 360° feedback criteria — keyed by criterionId in EmployeePerformanceFeedback",
      },

      // ── Self-appraisal ─────────────────────────────────────────
      enableSelfAppraisal: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment:
          "When true the employee fills in their own goal scores before manager review",
      },

      // ── 360° feedback settings ─────────────────────────────────
      enable360Feedback: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      feedbackRequestDeadlineDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 7,
        comment: "Days after cycle open before 360° feedback requests expire",
      },
      minFeedbackResponses: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2,
        comment:
          "Minimum number of peer responses needed before feedbackScore is computed",
      },

      // ── Visibility rules ───────────────────────────────────────
      showScoresToEmployee: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment:
          "When false the employee sees feedback qualitative text but not numeric scores",
      },
      showFeedbackReviewerNames: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment:
          "When false peer reviewer identities are hidden — anonymous 360°",
      },

      // ── Behaviour flags ────────────────────────────────────────
      disabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "appraisal_templates",
      comment:
        "Governs the structure, scoring formula, KRAs, and feedback criteria of every appraisal cycle that uses it",

      indexes: [
        {
          unique: true,
          fields: ["name", "designation_id"],
        },
      ],
    },
  );
  return AppraisalTemplate;
};
