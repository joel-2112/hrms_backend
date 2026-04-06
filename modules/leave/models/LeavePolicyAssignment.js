module.exports = (sequelize, DataTypes) => {
  const LeavePolicyAssignment = sequelize.define('LeavePolicyAssignment', {
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
    leavePolicyId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → leave_policies.id',
    },
    leavePeriodId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → leave_periods.id — bounds the allocation to a specific year',
    },

    // ── Assignment metadata ────────────────────────────────────
    effectiveFrom: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Date from which this policy assignment takes effect',
    },
    effectiveTo: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Date until which this assignment is valid — null means open-ended',
    },

    // ── Processing status ──────────────────────────────────────
    // When the assignment is saved, a background job (or service hook)
    // reads LeavePolicy.leaveTypes and generates one LeaveAllocation
    // per leave type per employee. This flag tracks that.
    allocationsGenerated: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'True once LeaveAllocation rows have been created for this assignment',
    },

    // ── Docstatus (mirrors Frappe submit/cancel workflow) ──────
    docStatus: {
      type:         DataTypes.TINYINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },
  }, {
    tableName: 'leave_policy_assignments',
    comment:   'Assigns a LeavePolicy to an Employee for a LeavePeriod — triggers LeaveAllocation generation',
    indexes: [
      { fields: ['employee_id'],    name: 'idx_lpa_employee' },
      { fields: ['leave_policy_id'], name: 'idx_lpa_policy' },
      { fields: ['leave_period_id'], name: 'idx_lpa_period' },
      {
        unique: true,
        fields: ['employee_id', 'leave_period_id'],
        name:   'uq_lpa_employee_period',
        comment: 'One active policy assignment per employee per period',
      },
    ],
  });
  return LeavePolicyAssignment;
};