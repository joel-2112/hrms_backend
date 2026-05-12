

module.exports = (sequelize, DataTypes) => {
  const Language = sequelize.define("Language", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "FK → employees.id",
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
  });

  return Language;
};
