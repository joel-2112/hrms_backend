const { validate } = require("uuid");

module.exports = (sequelize, DataTypes) => {
  const JobApplicant = sequelize.define('JobApplicant', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── FKs ────────────────────────────────────────────────────
    jobOpeningId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → job_openings.id — must be Open status',
    },
    employeeReferralId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employee_referrals.id — nullable: set only when source = Employee Referral',
    },

    // ── Applicant identity ─────────────────────────────────────
    // Frappe: applicantName and email are the core identity fields
    applicantName: {
      type:      DataTypes.STRING(255),
      allowNull: false,
    },
    email: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      validate:  { isEmail: true },
    },
    phone: {
      type:      DataTypes.STRING(30),
      allowNull: true,
    },

    // ── Application source ─────────────────────────────────────
    // Frappe: Campaign / Employee Referral / Walk In / Website Listing
    source: {
      type:      DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Website Listing',
        validate: {
          isIn: {
            args: [['Website Listing', 'Employee Referral', 'Campaign', 'Walk In']],
            msg: 'Source must be one of Website Listing, Employee Referral, Campaign, Walk In',
          },
        },
      comment:   'How the applicant learned about and applied to the opening',
    },

    // ── Candidate profile ──────────────────────────────────────
    coverLetter: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    resumeUrl: {
      type:      DataTypes.STRING(500),
      allowNull: true,
      comment:   'URL to the stored resume file (object storage)',
    },
    linkedinUrl: {
      type:      DataTypes.STRING(500),
      allowNull: true,
    },

    // ── Compensation expectation ───────────────────────────────
    currentSalary: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    expectedSalary: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },

    // ── Status ─────────────────────────────────────────────────
    // Frappe: Open → Replied → Rejected / Accepted / Hold
    status: {
      type:         DataTypes.STRING,
      allowNull:    false,
      defaultValue: 'Open',
      validate: {
        isIn: {
          args: [['Open', 'Replied', 'Hold', 'Accepted', 'Rejected']],
          msg: 'Status must be one of Open, Replied, Accepted, Rejected, Hold',
        },
      },
      comment:      'Accepted triggers JobOffer creation; Rejected closes the pipeline for this applicant',
    },

    // ── Rejection tracking ─────────────────────────────────────
    rejectionReason: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Why the applicant was rejected — for recruiter records',
    },

    // ── Rating ─────────────────────────────────────────────────
    // Frappe: overall rating set by recruiter after all interviews
    rating: {
      type:      DataTypes.DECIMAL(3, 1),
      allowNull: true,
      validate:  { min: 0, max: 5 },
      comment:   'Recruiter overall rating 0–5 after interview process',
    },
  }, {
    tableName: 'job_applicants',
    comment:   'Candidate record in the hiring pipeline — moves from Open through interviews to Accepted (→ JobOffer) or Rejected',
    indexes: [
      { fields: ['job_opening_id'],       name: 'idx_job_applicants_opening' },
      { fields: ['employee_referral_id'], name: 'idx_job_applicants_referral' },
      { fields: ['status'],               name: 'idx_job_applicants_status' },
      { fields: ['email'],                name: 'idx_job_applicants_email' },
    ],
  });
  return JobApplicant;
};