module.exports = (sequelize, DataTypes) => {
  const EmployeeReferral = sequelize.define('EmployeeReferral', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── FKs ────────────────────────────────────────────────────
    referrerId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id — the existing employee making the referral',
    },
    jobOpeningId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → job_openings.id — the position being referred for',
    },

    // ── Candidate details ──────────────────────────────────────
    // Frappe: referral captures candidate info before a JobApplicant record exists
    candidateName: {
      type:      DataTypes.STRING(255),
      allowNull: false,
    },
    candidateEmail: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      validate:  { isEmail: true },
    },
    candidatePhone: {
      type:      DataTypes.STRING(30),
      allowNull: true,
    },

    // ── Referral context ───────────────────────────────────────
    // Frappe: source is "Employee Referral" on the resulting JobApplicant
    coverNote: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Referrer\'s note about the candidate — visible to recruiter',
    },

    // ── Status ─────────────────────────────────────────────────
    // Frappe: Pending → Accepted → Rejected / In Process
    status: {
      type:         DataTypes.ENUM('Pending', 'Accepted', 'Rejected', 'In Process'),
      allowNull:    false,
      defaultValue: 'Pending',
    },

    // ── Output FK ─────────────────────────────────────────────
    // When referral is Accepted, a JobApplicant is created.
    // This FK is set at that point.
    jobApplicantId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → job_applicants.id — set when referral is accepted and applicant record is created',
    },

    // ── Incentive tracking ─────────────────────────────────────
    // Some companies pay referral bonuses — tracked here for payroll
    referralBonusAmount: {
      type:         DataTypes.DECIMAL(15, 2),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Bonus payable to the referrer if candidate is hired — 0 means no bonus policy',
    },
    bonusPaid: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'True once the referral bonus has been processed via payroll',
    },
  }, {
    tableName: 'employee_referrals',
    comment:   'Existing employee nominates an external candidate for a JobOpening — on acceptance creates a JobApplicant',
    indexes: [
      { fields: ['referrer_id'],     name: 'idx_employee_referrals_referrer' },
      { fields: ['job_opening_id'],  name: 'idx_employee_referrals_opening' },
      { fields: ['status'],          name: 'idx_employee_referrals_status' },
      { fields: ['candidate_email'], name: 'idx_employee_referrals_email' },
    ],
  });
  return EmployeeReferral;
};