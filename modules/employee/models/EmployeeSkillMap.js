
module.exports = (sequelize, DataTypes) => {
  const EmployeeSkillMap = sequelize.define('EmployeeSkillMap', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FK (hasOne — one skill map per employee) ────────
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      unique:    true,
      comment:   'FK → employees.id',
    },

    // ── Skills ─────────────────────────────────────────────────
    // Stored as JSONB arrays for flexibility — skill taxonomy can evolve
    // without schema migrations. Each skill entry:
    // { skillName, category, proficiency (Beginner/Intermediate/Advanced/Expert),
    //   yearsOfExperience, lastUsed (date), isCurrent }
    skills: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Array of skill objects with proficiency and recency metadata',
    },

    // ── Certifications ─────────────────────────────────────────
    // Each entry: { certificationName, issuingBody, issueDate, expiryDate,
    //               certificateNumber, verificationUrl, isVerified }
    certifications: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Professional certifications and licences',
    },

    // ── Training history ───────────────────────────────────────
    // Each entry: { trainingName, provider, startDate, endDate,
    //               trainingType (Internal/External/Online), completionStatus,
    //               cost, currency, notes }
    trainings: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Internal and external trainings attended',
    },

    // ── Languages ──────────────────────────────────────────────
    // Each entry: { language, readProficiency, writeProficiency, spokenProficiency }
    // Proficiency levels: 'Basic' | 'Conversational' | 'Fluent' | 'Native'
    languages: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Language proficiency records',
    },
  }, {
    tableName: 'employee_skill_maps',
    comment:   'Skills, certifications, training history and languages for an employee',
    indexes: [
      { unique: true, fields: ['employee_id'], name: 'uq_employee_skill_maps_employee' },
    ],
  });

  EmployeeSkillMap.associate = () => {};

  return EmployeeSkillMap;
};
