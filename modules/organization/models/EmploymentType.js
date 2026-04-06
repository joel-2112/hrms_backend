
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
      unique:    true,
      comment:   'Contract category e.g. "Full-time", "Part-time", "Contract", "Intern"',
    },
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    // ── Payroll behaviour hints ────────────────────────────────
    // These flags let payroll and leave logic branch
    // without hard-coding string comparisons on the name field.
    isFullTime: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Full-time employees accrue leave and are included in statutory payroll',
    },
    isContractual: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Contract workers may have different leave and tax treatment',
    },

    // ── Behaviour flags ────────────────────────────────────────
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
  }, {
    tableName: 'employment_types',
    comment:   'Contract type master — referenced only by Employee',
  });

  EmploymentType.associate = () => {};

  return EmploymentType;
};
