
module.exports = (sequelize, DataTypes) => {
  const ShiftType = sequelize.define('ShiftType', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Cross-module FK (leave) ────────────────────────────────
    // ShiftType.belongsTo(HolidayList, { foreignKey: 'holidayListId' })
    // Stored as raw UUID — leave module is loaded after attendance in index.js
    holidayListId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → holiday_lists.id — shifts on holidays are auto-marked accordingly',
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      unique:    true,
      comment:   'e.g. "Morning Shift", "Night Shift", "Flexible"',
    },
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    // ── Shift timing ───────────────────────────────────────────
    startTime: {
      type:      DataTypes.TIME,
      allowNull: false,
      comment:   'Scheduled shift start e.g. "08:00:00"',
    },
    endTime: {
      type:      DataTypes.TIME,
      allowNull: false,
      comment:   'Scheduled shift end e.g. "17:00:00"',
    },
    isNightShift: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'True when endTime crosses midnight — needed for correct duration math',
    },

    // ── Working hours ──────────────────────────────────────────
    workingHoursThreshold: {
      type:         DataTypes.DECIMAL(4, 2),
      allowNull:    false,
      defaultValue: 8.00,
      comment:      'Minimum hours to be counted as a full working day',
    },
    totalWorkingHours: {
      type:      DataTypes.DECIMAL(4, 2),
      allowNull: true,
      comment:   'Computed shift duration in hours (endTime - startTime - breaks)',
    },

    // ── Break rules ────────────────────────────────────────────
    maxBreakDurationMinutes: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 60,
      comment:      'Total allowed break time per shift in minutes',
    },

    // ── Auto-attendance from checkin ───────────────────────────
    enableAutoAttendance: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'When true, Attendance records are auto-created from EmployeeCheckin logs',
    },
    processAttendanceAfterMinutes: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 60,
      comment:      'How long after shift start to wait before auto-processing attendance',
    },
    lastSyncedCheckinDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Watermark for the auto-attendance background job',
    },

    // ── Late arrival rules ─────────────────────────────────────
    lateEntryGraceMinutes: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      comment:      'Grace period after startTime before checkin is flagged as Late',
    },
    allowedEarlyExitMinutes: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      comment:      'How many minutes before endTime an early checkout is still acceptable',
    },

    // ── Checkin window ─────────────────────────────────────────
    // Controls which checkin logs are associated with this shift
    checkinWindowStart: {
      type:      DataTypes.INTEGER,
      allowNull: true,
      comment:   'Minutes before startTime within which a checkin is linked to this shift',
    },
    checkinWindowEnd: {
      type:      DataTypes.INTEGER,
      allowNull: true,
      comment:   'Minutes after endTime within which a checkout is still linked to this shift',
    },

    // ── Weekly off days ────────────────────────────────────────
    // Stored as a JSONB array of ISO weekday numbers: 0=Sunday … 6=Saturday
    weeklyOffDays: {
      type:         DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull:    false,
      defaultValue: [0, 6],
      comment:      'Days of week with no working obligation e.g. [0,6] = Sunday+Saturday',
    },

    // ── Colour for calendar UI ─────────────────────────────────
    color: {
      type:      DataTypes.STRING(20),
      allowNull: true,
      comment:   'Hex color code for shift blocks in the attendance calendar UI',
    },

    // ── Behaviour flags ────────────────────────────────────────
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
  }, {
    tableName: 'shift_types',
    comment:   'Shift schedule master — defines timings, break rules, late/early thresholds and auto-attendance config',
  });
  return ShiftType;
};
