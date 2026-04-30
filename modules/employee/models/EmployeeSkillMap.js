
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
    // ── Skills ───────────────────────────────────────────────

    skills: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Array of skill objects with proficiency and recency metadata',
    },

    // ── Certifications ─────────────────────────────────────────
    certifications: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Professional certifications and licences',
    },
    certificateUrls: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'URLs to digital copies of certifications',
    },
    // ── Languages ──────────────────────────────────────────────
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
  return EmployeeSkillMap;
};
