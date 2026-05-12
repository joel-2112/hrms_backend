module.exports = (sequelize, DataTypes) => {
  const LeaveApplication = sequelize.define(
    "LeaveApplication",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // ── FKs ────────────────────────────────────────────────────
      employeeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "FK → employees.id — the applicant",
      },
      leaveTypeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "FK → leave_types.id",
      },

      approverId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → employees.id — the leave approver (self-ref)",
      },
      holidayListId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment:
          "FK → holiday_lists.id — used to exclude holidays from day count",
      },
      leavePeriodId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → leave_periods.id — the period to deduct balance from",
      },

      // ── Application period ─────────────────────────────────────
      fromDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      toDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      totalLeaveDays: {
        type: DataTypes.DECIMAL(5, 1),
        allowNull: false,
        comment:
          "Computed: working days between fromDate and toDate excluding holidays/weekends per LeaveType config",
      },

      // ── Half day support ───────────────────────────────────────
      isHalfDay: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      halfDayDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment:
          "The specific date when half-day is taken — only relevant when isHalfDay = true",
      },

      // ── Reason & communication ─────────────────────────────────
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      followUpDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Expected return-to-work date — informational",
      },

      // ── Workflow status ────────────────────────────────────────
      status: {
        type: DataTypes.ENUM(
          "Draft",
          "Open",
          "Approved",
          "Rejected",
          "Cancelled",
        ),
        allowNull: false,
        defaultValue: "Draft",
      },
      docStatus: {
        type: DataTypes.SMALLINT,
        allowNull: false,
        defaultValue: 0,
        comment: "0 = Draft, 1 = Submitted, 2 = Cancelled",
      },

      // ── Rejection tracking ─────────────────────────────────────
      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: "leave_applications",
      comment:
        "Employee leave request — the core transaction of the leave module",
      indexes: [
        { fields: ["employee_id"], name: "idx_leave_applications_employee" },
        { fields: ["leave_type_id"], name: "idx_leave_applications_type" },
        { fields: ["status"], name: "idx_leave_applications_status" },
        {
          fields: ["from_date", "to_date"],
          name: "idx_leave_applications_period",
        },
      ],
    },
  );
  return LeaveApplication;
};
