module.exports = (sequelize, DataTypes) => {
  const EmployeePromotion = sequelize.define(
    "EmployeePromotion",
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

      // ── Effective date & workflow ──────────────────────────────
      promotionDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment:
          "The date the promotion takes effect — used to time salary revision",
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Pending",
        validate: {
          isIn: [["Pending", "Approved", "Rejected"]],
        },
      },
      approvedById: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → employees.id — who approved this promotion",
      },
      approvedOn: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      // ── Before-snapshot (what the employee had) ────────────────
      previousDepartmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → departments.id",
      },
      previousDesignationId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → designations.id",
      },
      previousGradeId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → employee_grades.id",
      },
      previousBaseSalary: {
        type: DataTypes.DECIMAL,
        allowNull: true,
      },

      // ── After-snapshot (what the employee gets) ────────────────
      newDepartmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → departments.id",
      },
      newDesignationId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → designations.id",
      },
      newGradeId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → employee_grades.id",
      },
      newBaseSalary: {
        type: DataTypes.DECIMAL,
        allowNull: true,
      },

      // ── Context ────────────────────────────────────────────────
      promotionType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Promotion",
        validate: {
          isIn: [["Promotion", "Demotion"]],
        },
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "employee_promotions",
      comment:
        "Audit trail of every grade, designation, or salary change for an employee",
      indexes: [
        { fields: ["employee_id"], name: "idx_employee_promotions_employee" },
        { fields: ["promotion_date"], name: "idx_employee_promotions_date" },
        { fields: ["status"], name: "idx_employee_promotions_status" },
      ],
    },
  );
  return EmployeePromotion;
};
