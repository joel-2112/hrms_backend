
module.exports = (sequelize, DataTypes) => {
  const EmployeeCheckin = sequelize.define('EmployeeCheckin', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FKs ─────────────────────────────────────────────
    // EmployeeCheckin.belongsTo(Employee,  { foreignKey: 'employeeId',  allowNull: false })
    // EmployeeCheckin.belongsTo(ShiftType, { foreignKey: 'shiftTypeId' })
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id',
    },
    shiftTypeId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → shift_types.id — resolved by the auto-attendance job after ingestion',
    },

    // ── The checkin event ──────────────────────────────────────
    logType: {
      type:      DataTypes.ENUM('IN', 'OUT'),
      allowNull: false,
      comment:   'IN = arrival tap, OUT = departure tap',
    },
    time: {
      type:      DataTypes.DATE,
      allowNull: false,
      comment:   'Exact timestamp of the device tap / GPS ping / manual entry',
    },

    // ── Device / source metadata ───────────────────────────────
    deviceId: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'Biometric or RFID device identifier — matches Employee.attendanceDeviceId',
    },
    deviceSource: {
      type:      DataTypes.ENUM('Biometric', 'RFID', 'Mobile', 'Web', 'Manual'),
      allowNull: false,
      defaultValue: 'Manual',
    },

    // ── Location (for mobile / GPS checkin) ───────────────────
    latitude: {
      type:      DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    longitude: {
      type:      DataTypes.DECIMAL(10, 7),
      allowNull: true,
    },
    locationAccuracyMeters: {
      type:      DataTypes.DECIMAL(8, 2),
      allowNull: true,
      comment:   'GPS accuracy radius in metres — used to validate on-premise checkins',
    },

    // ── Processing state ───────────────────────────────────────
    skipAutoAttendance: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'When true this log is excluded from auto-attendance processing',
    },
    processedForAttendance: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Flipped to true once the auto-attendance job links this log to an Attendance record',
    },

    // ── Misc ───────────────────────────────────────────────────
    remarks: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'employee_checkins',
    comment:   'Raw device tap log — one row per IN or OUT event; processed into Attendance records by background job',
    indexes: [
      { fields: ['employee_id'],              name: 'idx_employee_checkins_employee' },
      { fields: ['time'],                     name: 'idx_employee_checkins_time' },
      { fields: ['device_id'],                name: 'idx_employee_checkins_device' },
      { fields: ['processed_for_attendance'], name: 'idx_employee_checkins_processed' },
      { fields: ['employee_id', 'time'],      name: 'idx_employee_checkins_employee_time' },
    ],
  });

  return EmployeeCheckin;
};
