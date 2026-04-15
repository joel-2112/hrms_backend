
module.exports = (sequelize, DataTypes) => {
  const Designation = sequelize.define('Designation', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      // unique:    true,
      comment:   'Job title e.g. "Software Engineer", "HR Manager", "Finance Director"',
    },
    // ── Classification ─────────────────────────────────────────
    jobFunction: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'Functional area e.g. "Engineering", "Human Resources", "Finance"',
    },

    // ── Behaviour flags ────────────────────────────────────────
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
  }, {
    tableName: 'designations',
    comment:   'Job title master — referenced by Employee, JobOpening, JobOffer, AppraisalTemplate',
    indexes: [
      {
        unique: true,
        fields: ['name'],
      },
    ],

  });
  return Designation;
};
