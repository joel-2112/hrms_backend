
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
      comment:   'Job title e.g. "Software Engineer", "HR Manager", "Finance Director"',
    },
    jobFunction: {
      type:      DataTypes.STRING(150),
      allowNull: true,
      comment:   'Functional area e.g. "Engineering", "Finance", "HR"',
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
