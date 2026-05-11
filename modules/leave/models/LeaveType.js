module.exports = (sequelize, DataTypes) => {
  const LeaveType = sequelize.define(
    "LeaveType",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // ── Core identity ──────────────────────────────────────────
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'e.g. "Annual Leave", "Sick Leave", "Maternity Leave"',
      },
      // ── Eligibility ────────────────────────────────────────────
      eligibilityMonths: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "e.g., 9 for Annual Leave",
      },

      // ── Accrual rules ──────────────────────────────────────────
      baseAllocation: {
        type: DataTypes.DECIMAL(5, 1),
        allowNull: false,
        defaultValue: 0,
        comment: "Starting days for year 1 (after eligibility)",
      },
      annualIncrementDays: {
        type: DataTypes.DECIMAL(5, 1),
        allowNull: false,
        defaultValue: 0,
        comment: "Extra days added per year of service",
      },
      incrementCap: {
        type: DataTypes.DECIMAL(5, 1),
        allowNull: true,
        comment:
          "Ceiling for entitlement formula (e.g., 30) — null = unlimited",
      },

      // ── Gender-based allocation ────────────────────────────────
      allocationRules: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: null,
        comment: `Gender-based override. First match wins.
          [{ "field": "gender", "operator": "=", "value": "Female", "days": 90 }]`,
      },

      // ── Usage limit ────────────────────────────────────────────
      maxDaysPerYear: {
        type: DataTypes.DECIMAL(5, 1),
        allowNull: true,
        comment: "Maximum days allowed to be taken per leave year (e.g., 30)",
      },
      maxCarryForwardYears: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "e.g., 2 = carried balance expires on 3rd year",
      },

      // ── Application limits ─────────────────────────────────────
      maxContinuousDaysAllowed: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Max consecutive days per application — null = unlimited",
      },

      // ── Flags ──────────────────────────────────────────────────
      isEncashable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      includeHolidays: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      includeWeekends: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: true,
      },
    },
    {
      tableName: "leave_types",
      comment:
        "Leave category with accrual, carry-forward, and application rules",
      indexes: [{ unique: true, fields: ["name"] }],
    },
  );
  return LeaveType;
};