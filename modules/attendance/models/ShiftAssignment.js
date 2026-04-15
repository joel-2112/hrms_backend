const { validate } = require("uuid");

module.exports = (sequelize, DataTypes) => {
  const ShiftAssignment = sequelize.define('ShiftAssignment', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FKs ─────────────────────────────────────────────
    // ShiftAssignment.belongsTo(Employee,  { foreignKey: 'employeeId',  allowNull: false })
    // ShiftAssignment.belongsTo(ShiftType, { foreignKey: 'shiftTypeId', allowNull: false })
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id',
    },
    shiftTypeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → shift_types.id',
    },

    // ── Assignment window ──────────────────────────────────────
    startDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'First date this assignment is in effect',
    },
    endDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Last date this assignment is in effect — null means open-ended',
    },

    // ── Status ─────────────────────────────────────────────────
    status: {
      type:         DataTypes.STRING,
      allowNull:    false,
      defaultValue: 'Active',
      validate: {
        isIn: {
          args: [['Active', 'Inactive', 'Pending', 'Cancelled']],
          msg: 'Status must be one of: Active, Inactive, Pending, Cancelled',
        },
      },
      comment:      'Only one Active assignment should exist per employee at any time',
    },

    // ── Scope context ──────────────────────────────────────────
    // Stored as raw UUID references — avoids importing organization models here
    companyId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → companies.id — for filtering assignments by company',
    },
    branchId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → branches.id — for filtering assignments by branch',
    },

    // ── Misc ───────────────────────────────────────────────────
    notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'shift_assignments',
    comment:   'Assigns a ShiftType to an Employee for a given date range',
    indexes: [
      { fields: ['employee_id'],              name: 'idx_shift_assignments_employee' },
      { fields: ['shift_type_id'],            name: 'idx_shift_assignments_shift_type' },
      { fields: ['start_date', 'end_date'],   name: 'idx_shift_assignments_window' },
      { fields: ['status'],                   name: 'idx_shift_assignments_status' },
    ],
  });
  return ShiftAssignment;
};
