
module.exports = (sequelize, DataTypes) => {
  const AppointmentLetter = sequelize.define('AppointmentLetter', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FKs ─────────────────────────────────────────────
    // AppointmentLetter.belongsTo(JobApplicant, { foreignKey: 'jobApplicantId', allowNull: false })
    // AppointmentLetter.belongsTo(JobOffer,     { foreignKey: 'jobOfferId',     allowNull: false })
    jobApplicantId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → job_applicants.id',
    },
    jobOfferId: {
      type:      DataTypes.UUID,
      allowNull: false,
      unique:    true,
      comment:   'FK → job_offers.id — hasOne: one letter per offer',
    },

    // ── Letter identity ────────────────────────────────────────
    letterDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Date printed on the letter',
    },
    referenceNumber: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'HR-assigned reference e.g. "ACME/HR/2025/00042"',
    },

    // ── Letter content ─────────────────────────────────────────
    // Frappe HR uses a print format / template system.
    // We store the template key + the resolved body separately:
    // — templateKey lets the frontend know which print format to render
    // — body is the rendered HTML snapshot, frozen at the moment of issue
    //   so future template edits do not change issued letters
    templateKey: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'Print format / template identifier used to generate this letter',
    },
    body: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Rendered HTML body of the appointment letter — frozen snapshot at time of issue',
    },

    // ── Signatory ──────────────────────────────────────────────
    signedById: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id — HR director / MD who signs the letter',
    },
    signedOn: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    signatureImagePath: {
      type:      DataTypes.STRING(512),
      allowNull: true,
      comment:   'Path to the signatory\'s signature image for PDF rendering',
    },

    // ── Delivery ───────────────────────────────────────────────
    deliveryMethod: {
      type:      DataTypes.ENUM('Email', 'Physical', 'Portal', 'WhatsApp'),
      allowNull: true,
      defaultValue: 'Email',
    },
    deliveredOn: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    candidateEmail: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      comment:   'Email address used for delivery — snapshot from applicant at time of sending',
    },

    // ── Candidate acknowledgement ──────────────────────────────
    acknowledgedOn: {
      type:      DataTypes.DATE,
      allowNull: true,
      comment:   'Timestamp when the candidate confirmed receipt (portal sign-off or email reply)',
    },
    acknowledgementToken: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      comment:   'Unique token embedded in the portal link for one-click acknowledgement',
    },

    // ── File ───────────────────────────────────────────────────
    pdfPath: {
      type:      DataTypes.STRING(512),
      allowNull: true,
      comment:   'Path to the generated PDF — stored in uploads/documents/',
    },

    // ── Workflow ───────────────────────────────────────────────
    status: {
      type:      DataTypes.ENUM(
        'Draft',
        'Issued',
        'Delivered',
        'Acknowledged',
        'Cancelled'
      ),
      allowNull:    false,
      defaultValue: 'Draft',
    },
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
    tableName: 'appointment_letters',
    comment:   'Formal appointment letter — issued after JobOffer.status = Accepted; frozen HTML snapshot for audit',
    indexes: [
      { unique: true, fields: ['job_offer_id'],    name: 'uq_appointment_letters_offer' },
      { fields: ['job_applicant_id'],              name: 'idx_appointment_letters_applicant' },
      { fields: ['status'],                        name: 'idx_appointment_letters_status' },
      { fields: ['letter_date'],                   name: 'idx_appointment_letters_date' },
      { fields: ['acknowledgement_token'],         name: 'idx_appointment_letters_token' },
    ],
  });
  return AppointmentLetter;
};