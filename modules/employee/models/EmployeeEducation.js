module.exports = (sequelize, DataTypes) => {
  const EmployeeEducation = sequelize.define(
    "EmployeeEducation",
    {
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
      majorOrField: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Major subject or field of study",
      },
      institution: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "School / university / college name",
      },
      gratuationDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Graduation / completion date",
      },
      certificate: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: false,
        comment:
          "True when a document has been uploaded to verify this qualification",
      },
      keySkills: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
        comment:
          "Array of key skills or subjects related to this qualification for search and recommendation purposes",
      },
    },
    {
      tableName: "employee_educations",
      comment:
        "One row per educational qualification — supports multiple degrees per employee",
      indexes: [
        { fields: ["employee_id"], name: "idx_employee_educations_employee" },
      ],
    },
  );
  return EmployeeEducation;
};
