module.exports = (sequelize, DataTypes) => {
  const EmployeeGrade = sequelize.define(
    "EmployeeGrade",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // ── Core identity ──────────────────────────────────────────
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        // unique:    true,
        comment:
          'Seniority tier e.g. "Grade A", "Senior", "Associate", "Executive"',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // ── Pay band boundaries ────────────────────────────────────
      minBaseSalary: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: "Lower bound of base salary for this grade (informational)",
      },
      maxBaseSalary: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: "Upper bound of base salary for this grade (informational)",
      },
      defaultLeavePolicyId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment:
          "FK → leave_policies.id — default leave policy for employees with this grade",
      },

      // ── Ordering ───────────────────────────────────────────────
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment:
          "Lower number = more junior; used to order grades in dropdowns",
      },

      // ── Behaviour flags ────────────────────────────────────────
      disabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "employee_grades",
      comment:
        "Pay band / seniority tier — referenced by Employee and SalaryStructure",
      indexes: [
        { fields: ["sort_order"], name: "idx_employee_grades_sort_order" },
        { unique: true, fields: ["name"], name: "uq_employee_grades_name" },
      ],
    },
  );
  return EmployeeGrade;
};
