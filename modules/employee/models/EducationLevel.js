module.exports = (sequelize, DataTypes) => {
  const EducationLevel = sequelize.define("EducationLevel", {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
    employeeEducationId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "FK → employee_educations.id",
      },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
  });
  return EducationLevel;
};
