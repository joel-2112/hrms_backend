module.exports = (sequelize, DataTypes) => {
  const CompensatoryLeaveRequest = sequelize.define('CompensatoryLeaveRequest', {
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
      comment:   'FK → leave_types.id — must be a compensatory leave type',
    },

    // ── Work done details ──────────────────────────────────────
    workDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'The holiday or weekend the employee worked on',
    },
    reason: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Why the employee worked on a non-working day',
    },

    // ── Workflow status ────────────────────────────────────────
    status: {
      type:         DataTypes.ENUM('Draft', 'Approved', 'Rejected', 'Cancelled'),
      allowNull:    false,
      defaultValue: 'Draft',
    },
    docStatus: {
      type:         DataTypes.TINYINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },

    // ── Output FK ─────────────────────────────────────────────
    // Populated after approval — points to the LeaveAllocation
    // created by this request (credits the balance).
    leaveAllocationId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → leave_allocations.id — set when request is approved and allocation is created',
    },
  }, {
    tableName: 'compensatory_leave_requests',
    comment:   'Employee claims comp-off for working on a holiday/weekend — on approval creates a LeaveAllocation',
    indexes: [
      { fields: ['employee_id'],  name: 'idx_clr_employee' },
      { fields: ['leave_type_id'], name: 'idx_clr_leave_type' },
      { fields: ['status'],       name: 'idx_clr_status' },
      { fields: ['work_date'],    name: 'idx_clr_work_date' },
    ],
  });

  return CompensatoryLeaveRequest;
};