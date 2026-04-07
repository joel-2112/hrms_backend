module.exports = (sequelize, DataTypes) => {
  const LeaveAllocation = sequelize.define('LeaveAllocation', {
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
      comment:   'FK → leave_types.id',
    },
    leavePeriodId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → leave_periods.id',
    },

    // ── Allocation values ──────────────────────────────────────
    newLeaves: {
      type:         DataTypes.DECIMAL(5, 1),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Fresh days granted this period',
    },
    carryForwardedLeaves: {
      type:         DataTypes.DECIMAL(5, 1),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Days rolled over from the previous period',
    },
    totalLeavesAllocated: {
      type:         DataTypes.DECIMAL(5, 1),
      allowNull:    false,
      defaultValue: 0,
      comment:      'newLeaves + carryForwardedLeaves — denormalized for fast balance queries',
    },

    // ── Period boundaries for this allocation ──────────────────
    fromDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    toDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },

    // ── Docstatus ──────────────────────────────────────────────
    docStatus: {
      type:         DataTypes.SMALLINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },
  }, {
    tableName: 'leave_allocations',
    comment:   'Actual granted days per Employee per LeaveType per LeavePeriod',
    indexes: [
      { fields: ['employee_id'],    name: 'idx_leave_allocations_employee' },
      { fields: ['leave_type_id'],  name: 'idx_leave_allocations_type' },
      { fields: ['leave_period_id'], name: 'idx_leave_allocations_period' },
      {
        unique: true,
        fields: ['employee_id', 'leave_type_id', 'leave_period_id'],
        name:   'uq_leave_allocations_employee_type_period',
        comment: 'One allocation per employee per leave type per period',
      },
    ],
  });
  return LeaveAllocation;
};