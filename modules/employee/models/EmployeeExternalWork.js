module.exports = (sequelize, DataTypes) => {
  const EmployeeExternalWork = sequelize.define(
    "EmployeeExternalWork",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // ── Parent FK ──────────────────────────────────────────────
      employeeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "FK → employees.id",
      },

      // ── Employer details ──────────────────────────────────────
      companyName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: "Previous employer name",
      },
      industry: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      region: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      zone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // ── Role details ───────────────────────────────────────────
      designation: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Job title held at this employer",
      },
      department: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      employmentType: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: [
            [
              "Full-time",
              "Part-time",
              "Contract",
              "Internship",
              "Freelance",
              "Other",
            ],
          ],
        },
      },

      // ── Timeline ───────────────────────────────────────────────
      fromDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      toDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment:
          "Null if employee is currently working here (external / side engagement)",
      },

      // ── Exit context ───────────────────────────────────────────
      exitReason: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: "employee_external_works",
      comment:
        "Previous employment history — one row per employer, ordered by fromDate",
      indexes: [
        {
          fields: ["employee_id"],
          name: "idx_employee_external_works_employee",
        },
        { fields: ["from_date"], name: "idx_employee_external_works_from" },
      ],
    },
  );
  return EmployeeExternalWork;
};
