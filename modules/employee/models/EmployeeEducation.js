
module.exports = (sequelize, DataTypes) => {
  const EmployeeEducation = sequelize.define('EmployeeEducation', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FK (hasMany — multiple qualifications per employee) ──
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id',
    },

    // ── Qualification details ──────────────────────────────────
    level: {
      type:      DataTypes.ENUM(
        'Primary',
        'Secondary',
        'Certificate',
        'Diploma',
        'Bachelor',
        'Postgraduate Diploma',
        'Master',
        'Doctorate',
        'Professional',
        'Other'
      ),
      allowNull: false,
    },
    qualification: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      comment:   'Degree / qualification name e.g. "BSc Computer Science"',
    },
    majorOrField: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      comment:   'Major subject or field of study',
    },
    institution: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      comment:   'School / university / college name',
    },
    country: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'Country where the institution is located',
    },

    // ── Timeline ───────────────────────────────────────────────
    fromDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Enrolment date',
    },
    toDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Graduation / completion date',
    },
    isCurrentlyEnrolled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'True for in-progress qualifications — toDate will be null',
    },

    // ── Outcome ────────────────────────────────────────────────
    grade: {
      type:      DataTypes.STRING(50),
      allowNull: true,
      comment:   'Grade, GPA, classification e.g. "First Class", "3.8 / 4.0"',
    },
    certificateAttached: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'True when a document has been uploaded to verify this qualification',
    },

    // ── Misc ───────────────────────────────────────────────────
    notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'employee_educations',
    comment:   'One row per educational qualification — supports multiple degrees per employee',
    indexes: [
      { fields: ['employee_id'], name: 'idx_employee_educations_employee' },
    ],
  });
  return EmployeeEducation;
};
