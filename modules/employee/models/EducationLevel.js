module.exports = (sequelize, DataTypes) => {
  const EducationLevel = sequelize.define(
    "EducationLevel",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      employeeEducationId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → employee_educations.id",
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: "education_levels",
      comment:
        "Lookup table for education levels (e.g. High School, Bachelor's, Master's, PhD)",
    },
  );
  return EducationLevel;
};
