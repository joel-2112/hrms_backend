const { valid } = require("joi");

module.exports = (sequelize, DataTypes) => {
  const Attendance = sequelize.define('Attendance', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FKs ─────────────────────────────────────────────
    // Attendance.belongsTo(Employee,         { foreignKey: 'employeeId',        allowNull: false })
    // Attendance.belongsTo(ShiftType,        { foreignKey: 'shiftTypeId' })
    // Attendance.belongsTo(LeaveApplication, { foreignKey: 'leaveApplicationId' })
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id',
    },
    shiftTypeId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → shift_types.id — the shift active on this attendance date',
    },
    leaveApplicationId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → leave_applications.id — set when this day is an approved leave day',
    },

    // ── The attendance date ────────────────────────────────────
    attendanceDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'The calendar date this record covers — one row per employee per day',
    },

    // ── Status ─────────────────────────────────────────────────
    status: {
      type:      DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Present',
      validate: {
        isIn: {
          args: [['Present',
        'Absent',
        'Half Day',
        'Work From Home',
        'On Leave',
        'Holiday',
        'Weekly Off']],
          msg: 'Status must be one of: Present, Absent, Half Day, On Leave, Holiday, Weekly Off',
        },
      },
    },

    // ── Actual checkin / checkout times ───────────────────────
    checkInTime: {
      type:      DataTypes.DATE,
      allowNull: true,
      comment:   'Actual check-in timestamp — sourced from EmployeeCheckin or manual entry',
    },
    checkOutTime: {
      type:      DataTypes.DATE,
      allowNull: true,
      comment:   'Actual check-out timestamp',
    },

    // ── Computed durations ─────────────────────────────────────
    workingHours: {
      type:      DataTypes.DECIMAL(5, 2),
      allowNull: true,
      comment:   'Total hours worked = checkOut - checkIn - breaks (computed on save)',
    },
    lateEntryMinutes: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      comment:      'Minutes after shiftType.startTime + lateEntryGrace that the employee checked in',
    },
    earlyExitMinutes: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      comment:      'Minutes before shiftType.endTime that the employee checked out',
    },
    overtimeHours: {
      type:         DataTypes.DECIMAL(5, 2),
      allowNull:    false,
      defaultValue: 0.00,
      comment:      'Hours worked beyond the shift threshold — used by payroll for OT calculation',
    },

    // ── Half-day classification ────────────────────────────────
    halfDayDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Echoes attendanceDate when status = Half Day — kept for Frappe compatibility',
    },

    // ── Source of record ───────────────────────────────────────
    attendanceSource: {
      type:      DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Manual',
      validate: {
        isIn: {
          args: [['Auto', 'Manual', 'Biometric', 'Mobile']],
          msg: 'Attendance source must be one of: Manual, Auto, Leave Application, Shift Assignment',
        },
      },
      comment:   'How this record was created — Auto = from EmployeeCheckin job',
    },

    // ── Workflow ───────────────────────────────────────────────
    // In Frappe HR, Attendance is a submittable DocType
    docStatus: {
      type:         DataTypes.SMALLINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled — mirrors Frappe docstatus',
    },

    // ── Amendments ─────────────────────────────────────────────
    amendedFromId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → attendance.id — points to the cancelled record this amends',
    },

    // ── Company scope ──────────────────────────────────────────
    companyId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → companies.id — denormalized for fast company-scoped reporting',
    },

    // ── Misc ───────────────────────────────────────────────────
    remarks: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'attendances',
    comment:   'One row per employee per working day — the source of truth for payroll and leave deductions',
    indexes: [
      {
        unique: true,
        fields: ['employee_id', 'attendance_date'],
        name:   'uq_attendances_employee_date',
        comment: 'Prevents duplicate attendance records for the same employee on the same day',
      },
      { fields: ['attendance_date'],  name: 'idx_attendances_date' },
      { fields: ['status'],           name: 'idx_attendances_status' },
      { fields: ['company_id'],       name: 'idx_attendances_company' },
      { fields: ['doc_status'],       name: 'idx_attendances_docstatus' },
    ],
  });

  return Attendance;
};
