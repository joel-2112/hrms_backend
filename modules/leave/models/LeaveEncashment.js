module.exports = (sequelize, DataTypes) => {
  const LeaveEncashment = sequelize.define('LeaveEncashment', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── FKs ────────────────────────────────────────────────────
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id',
    },
    leaveTypeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → leave_types.id — must have isEncashable = true',
    },
    leavePeriodId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → leave_periods.id — encashment happens within a period',
    },

    // ── Encashment calculation ─────────────────────────────────
    leavesToEncash: {
      type:      DataTypes.DECIMAL(5, 1),
      allowNull: false,
      comment:   'Number of leave days being converted to cash',
    },
    encashmentAmount: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      comment:   'Computed payout amount — pulled into SalarySlip by payroll module',
    },
    encashmentDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Date of encashment processing',
    },

    // ── Docstatus ──────────────────────────────────────────────
    docStatus: {
      type:         DataTypes.SMALLINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },
  }, {
    tableName: 'leave_encashments',
    comment:   'Converts unused encashable leave balance to salary payout — referenced by SalarySlip',
    indexes: [
      { fields: ['employee_id'],    name: 'idx_leave_encashments_employee' },
      { fields: ['leave_type_id'],  name: 'idx_leave_encashments_type' },
      { fields: ['leave_period_id'], name: 'idx_leave_encashments_period' },
      { fields: ['doc_status'],     name: 'idx_leave_encashments_status' },
    ],
  });
  return LeaveEncashment;
};