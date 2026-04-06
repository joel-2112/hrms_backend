
module.exports = (sequelize, DataTypes) => {
  const EmployeePromotion = sequelize.define('EmployeePromotion', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FK ──────────────────────────────────────────────
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id',
    },

    // ── Effective date & workflow ──────────────────────────────
    promotionDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'The date the promotion takes effect — used to time salary revision',
    },
    status: {
      type:         DataTypes.ENUM('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Cancelled'),
      allowNull:    false,
      defaultValue: 'Draft',
    },
    approvedById: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id — who approved this promotion',
    },
    approvedOn: {
      type:      DataTypes.DATE,
      allowNull: true,
    },

    // ── Before-snapshot (what the employee had) ────────────────
    previousDesignationId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → designations.id',
    },
    previousDepartmentId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → departments.id',
    },
    previousGradeId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employee_grades.id',
    },
    previousBaseSalary: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },

    // ── After-snapshot (what the employee gets) ────────────────
    newDesignationId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → designations.id',
    },
    newDepartmentId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → departments.id',
    },
    newGradeId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employee_grades.id',
    },
    newBaseSalary: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },

    // ── Context ────────────────────────────────────────────────
    promotionType: {
      type:      DataTypes.ENUM('Promotion', 'Demotion', 'Lateral Transfer', 'Grade Change'),
      allowNull: false,
      defaultValue: 'Promotion',
    },
    reason: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    remarks: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'employee_promotions',
    comment:   'Audit trail of every grade, designation, or salary change for an employee',
    indexes: [
      { fields: ['employee_id'],    name: 'idx_employee_promotions_employee' },
      { fields: ['promotion_date'], name: 'idx_employee_promotions_date' },
      { fields: ['status'],         name: 'idx_employee_promotions_status' },
    ],
  });

  EmployeePromotion.associate = () => {};

  return EmployeePromotion;
};
