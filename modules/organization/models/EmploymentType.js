
module.exports = (sequelize, DataTypes) => {
  const EmploymentType = sequelize.define('EmploymentType', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      comment:   'Contract category e.g. "Full-time", "Part-time", "Contract", "Intern"',
    },
    isActive: {
      type:         DataTypes.BOOLEAN,
      allowNull:    true,
      defaultValue: true,
      comment:      'Soft delete flag',
    },
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

  }, {
    tableName: 'employment_types',
    comment:   'Contract type master — referenced only by Employee',
    indexes: [
      {
        unique: true,
        fields: ['name'],
      },
    ],
  });
  return EmploymentType;
};
