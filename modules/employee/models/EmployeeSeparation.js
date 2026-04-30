const { valid } = require("joi");

module.exports = (sequelize, DataTypes) => {
  const EmployeeSeparation = sequelize.define('EmployeeSeparation', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FK (hasOne — one separation per employee) ───────
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      unique:    true,
      comment:   'FK → employees.id',
    },

    // ── Workflow ───────────────────────────────────────────────
    status: {
      type:         DataTypes.STRING,
      allowNull:    false,
      defaultValue: 'Draft',
      validate: {
        isIn: [['Draft', 'Pending', 'Approved', 'Rejected']],
      },
    },
    approvedById: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id',
    },
    approvedOn: {
      type:      DataTypes.DATE,
      allowNull: true,
    },

    // ── Exit classification ────────────────────────────────────
    separationType: {
      type:      DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [[
        'Resignation',
        'Termination',
        'End of Contract',
        ]],
      },
    },
    initiatedBy: {
      type:         DataTypes.STRING,
      allowNull:    false,
      defaultValue: 'Employee',
      validate: {
        isIn: [['Employee', 'Employer']],
      },
    },

    // ── Key dates ──────────────────────────────────────────────
    resignationDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Date the resignation letter / notice was submitted',
    },
    lastWorkingDay: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },
    relievingDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Official relieving / exit date — mirrors Employee.relievingDate',
    },

    // ── Exit interview ─────────────────────────────────────────
    reasonForLeaving: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    // ── Misc ───────────────────────────────────────────────────
    additionalNotes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'employee_separations',
    comment:   'Full offboarding record — exit classification, clearance, final settlement',
    indexes: [
      { unique: true, fields: ['employee_id'], name: 'uq_employee_separations_employee' },
      { fields: ['status'],                    name: 'idx_employee_separations_status' },
      { fields: ['last_working_day'],          name: 'idx_employee_separations_lwd' },
    ],
  });
  return EmployeeSeparation;
};
