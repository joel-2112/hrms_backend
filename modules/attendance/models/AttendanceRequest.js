
module.exports = (sequelize, DataTypes) => {
  const AttendanceRequest = sequelize.define('AttendanceRequest', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FKs ─────────────────────────────────────────────
    // AttendanceRequest.belongsTo(Employee,   { foreignKey: 'employeeId',   allowNull: false })
    // AttendanceRequest.belongsTo(Attendance, { foreignKey: 'attendanceId' })
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id — employee making the regularisation request',
    },
    attendanceId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → attendances.id — the existing record to be corrected; null if the record is missing entirely',
    },
    approverId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id — manager or HR who approves',
    },

    // ── Request dates ──────────────────────────────────────────
    fromDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Start of the date range being regularised (single day = fromDate === toDate)',
    },
    toDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },

    // ── Requested correction ───────────────────────────────────
    requestedStatus: {
      type:      DataTypes.ENUM(
        'Present',
        'Half Day',
        'Work From Home',
        'On Leave'
      ),
      allowNull: false,
      comment:   'The attendance status the employee is requesting',
    },
    requestedCheckIn: {
      type:      DataTypes.TIME,
      allowNull: true,
      comment:   'Corrected check-in time the employee is claiming',
    },
    requestedCheckOut: {
      type:      DataTypes.TIME,
      allowNull: true,
      comment:   'Corrected check-out time the employee is claiming',
    },
    halfDayType: {
      type:      DataTypes.ENUM('Morning', 'Afternoon'),
      allowNull: true,
      comment:   'Which half — populated only when requestedStatus = Half Day',
    },

    // ── Shift context ──────────────────────────────────────────
    shiftTypeId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → shift_types.id — shift active on the requested date(s)',
    },

    // ── Workflow ───────────────────────────────────────────────
    status: {
      type:         DataTypes.ENUM('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Cancelled'),
      allowNull:    false,
      defaultValue: 'Draft',
    },
    approvedOn: {
      type:      DataTypes.DATE,
      allowNull: true,
    },

    // ── Context ────────────────────────────────────────────────
    reason: {
      type:      DataTypes.TEXT,
      allowNull: false,
      comment:   'Employee-provided justification e.g. "Device malfunction", "Worked from client site"',
    },
    rejectionReason: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    // ── Evidence ───────────────────────────────────────────────
    attachments: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Supporting file paths e.g. client email, WFH approval screenshot',
    },
  }, {
    tableName: 'attendance_requests',
    comment:   'Employee request to regularise a missing or incorrect Attendance record',
    indexes: [
      { fields: ['employee_id'],           name: 'idx_attendance_requests_employee' },
      { fields: ['status'],                name: 'idx_attendance_requests_status' },
      { fields: ['from_date', 'to_date'],  name: 'idx_attendance_requests_window' },
    ],
  });

  return AttendanceRequest;
};
