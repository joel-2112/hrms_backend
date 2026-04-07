
module.exports = (sequelize, DataTypes) => {
  const Interview = sequelize.define('Interview', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FKs ─────────────────────────────────────────────
    // Interview.belongsTo(JobApplicant, { foreignKey: 'jobApplicantId', allowNull: false })
    // Interview.belongsTo(JobOpening,   { foreignKey: 'jobOpeningId',   allowNull: false })
    // Interview.belongsTo(Employee,     { as: 'interviewer', foreignKey: 'interviewerId', allowNull: false })
    jobApplicantId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → job_applicants.id',
    },
    jobOpeningId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → job_openings.id — denormalized from applicant for direct querying',
    },
    interviewerId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id — lead interviewer / panel coordinator',
    },

    // ── Interview identity ─────────────────────────────────────
    name: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      comment:   'Round label e.g. "HR Screening", "Technical Round 1", "Final Panel"',
    },
    interviewRound: {
      type:      DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment:   'Sequential round number — used to order rounds in the pipeline view',
    },
    interviewType: {
      type:      DataTypes.ENUM(
        'One-on-One',
        'Panel',
        'Technical',
        'HR',
        'Case Study',
        'Group Discussion',
        'Video Call',
        'Phone Screening'
      ),
      allowNull: false,
      defaultValue: 'One-on-One',
    },

    // ── Schedule ───────────────────────────────────────────────
    scheduledOn: {
      type:      DataTypes.DATE,
      allowNull: false,
      comment:   'Planned date and time of the interview',
    },
    duration: {
      type:      DataTypes.INTEGER,
      allowNull: true,
      comment:   'Expected interview length in minutes',
    },
    location: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      comment:   'Physical address, meeting room, or video call link',
    },

    // ── Panel members ──────────────────────────────────────────
    // Additional panelists beyond the lead interviewer.
    // Each entry: { employeeId, name, role (e.g. "Technical Evaluator") }
    panelMembers: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Additional panel interviewers alongside the lead interviewerId',
    },

    // ── Skill criteria ─────────────────────────────────────────
    // Each entry: { skillName, maximumScore, weightage }
    // Mirrors Frappe HR's Interview Skill Assessment child table
    skillCriteria: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Skills to be evaluated and their maximum scores / weightages',
    },

    // ── Outcome ────────────────────────────────────────────────
    status: {
      type:      DataTypes.ENUM(
        'Scheduled',
        'Under Review',
        'Pending',
        'Cleared',
        'Not Cleared',
        'Cancelled',
        'No Show'
      ),
      allowNull:    false,
      defaultValue: 'Scheduled',
    },
    averageRating: {
      type:      DataTypes.DECIMAL(4, 2),
      allowNull: true,
      comment:   'Computed average of all InterviewFeedback ratings for this round',
    },

    // ── Candidate experience ───────────────────────────────────
    calendarEventId: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      comment:   'Google Calendar / Outlook event ID for sync',
    },
    candidateNotified: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },

    // ── Workflow ───────────────────────────────────────────────
    docStatus: {
      type:         DataTypes.SMALLINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },

    // ── Misc ───────────────────────────────────────────────────
    remarks: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'interviews',
    comment:   'One interview round — links an applicant to a panel for a specific job opening',
    indexes: [
      { fields: ['job_applicant_id'],              name: 'idx_interviews_applicant' },
      { fields: ['job_opening_id'],                name: 'idx_interviews_opening' },
      { fields: ['interviewer_id'],                name: 'idx_interviews_interviewer' },
      { fields: ['scheduled_on'],                  name: 'idx_interviews_scheduled' },
      { fields: ['status'],                        name: 'idx_interviews_status' },
    ],
  });
  return Interview;
};