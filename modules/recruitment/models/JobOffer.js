
module.exports = (sequelize, DataTypes) => {
  const JobOffer = sequelize.define('JobOffer', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FKs ─────────────────────────────────────────────
    // JobOffer.belongsTo(JobApplicant, { foreignKey: 'jobApplicantId', allowNull: false })
    // JobOffer.belongsTo(JobOpening,   { foreignKey: 'jobOpeningId',   allowNull: false })
    // JobOffer.belongsTo(Designation,  { foreignKey: 'designationId' })
    jobApplicantId: {
      type:      DataTypes.UUID,
      allowNull: false,
      unique:    true,
      comment:   'FK → job_applicants.id — hasOne: one offer per applicant',
    },
    jobOpeningId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → job_openings.id',
    },
    designationId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → designations.id — may differ from the opening if a counter-offer is made',
    },

    // ── Offer identity ─────────────────────────────────────────
    offerDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Date the offer letter is issued',
    },
    expiryDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Deadline by which the candidate must accept or decline',
    },
    proposedJoiningDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },

    // ── Organisation placement ─────────────────────────────────
    companyId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → companies.id',
    },
    departmentId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → departments.id',
    },
    branchId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → branches.id',
    },
    employmentTypeId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employment_types.id',
    },
    gradeId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employee_grades.id',
    },

    // ── Compensation package ───────────────────────────────────
    currency: {
      type:         DataTypes.STRING(10),
      allowNull:    false,
      defaultValue: 'KES',
    },
    grossSalary: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment:   'Total gross monthly salary being offered',
    },
    // Itemised offer terms (allowances, deductions, bonuses)
    // Each entry: { componentName, componentType (Earning/Deduction), amount, isConditional }
    offerTerms: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Salary component breakdown mirroring Frappe HR Offer Terms child table',
    },

    // ── Probation ──────────────────────────────────────────────
    probationPeriodMonths: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 3,
    },

    // ── Candidate response ─────────────────────────────────────
    status: {
      type:      DataTypes.ENUM(
        'Draft',
        'Awaiting Approval',
        'Approved',
        'Rejected by HR',
        'Offer Sent',
        'Accepted',
        'Declined',
        'Expired',
        'Cancelled'
      ),
      allowNull:    false,
      defaultValue: 'Draft',
    },
    acceptedOn: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    declinedOn: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    declineReason: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    // ── Approval chain ─────────────────────────────────────────
    approvedById: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id',
    },
    approvedOn: {
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

    // ── Misc ───────────────────────────────────────────────────
    remarks: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    customFields: {
      type:      DataTypes.JSONB,
      allowNull: true,
      comment:   'Tenant-specific offer fields without schema changes',
    },
  }, {
    tableName: 'job_offers',
    comment:   'Formal job offer — hasOne per applicant; accepted offer triggers AppointmentLetter',
    indexes: [
      { unique: true, fields: ['job_applicant_id'], name: 'uq_job_offers_applicant' },
      { fields: ['job_opening_id'],                 name: 'idx_job_offers_opening' },
      { fields: ['status'],                         name: 'idx_job_offers_status' },
      { fields: ['offer_date'],                     name: 'idx_job_offers_date' },
      { fields: ['expiry_date'],                    name: 'idx_job_offers_expiry' },
    ],
  });
  return JobOffer;
};