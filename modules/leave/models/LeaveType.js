module.exports = (sequelize, DataTypes) => {
  const LeaveType = sequelize.define('LeaveType', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      // unique:    true,
      comment:   'e.g. "Annual Leave", "Sick Leave", "Maternity Leave", "LWP"',
    },
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    // ── Accrual & balance behaviour ────────────────────────────
    maxDaysAllowed: {
      type:         DataTypes.DECIMAL(5, 1),
      allowNull:    false,
      defaultValue: 0,
      comment:      'Maximum days that can be allocated per period',
    },
    maxCarryForwardedDays: {
      type:         DataTypes.DECIMAL(5, 1),
      allowNull:    false,
      defaultValue: 0,
      comment:      'How many unused days roll over to the next period',
    },
    maxContinuousDaysAllowed: {
      type:      DataTypes.INTEGER,
      allowNull: true,
      comment:   'Cap on consecutive days in one application — null means no cap',
    },

    // ── Type classification flags ──────────────────────────────
    isLeaveWithoutPay: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'LWP — payroll deducts salary for these days',
    },
    isOptionalLeave: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Employee picks from a list of optional holidays',
    },
    isCompensatory: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Earned by working on holidays — feeds CompensatoryLeaveRequest',
    },
    isEncashable: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Unused balance can be converted to salary via LeaveEncashment',
    },
    allowNegativeBalance: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Allow applications even when balance is zero',
    },
    includeHolidays: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Count holidays within the leave period as leave days',
    },
    includeWeekends: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Count weekends within the leave period as leave days',
    },

    // ── Behaviour flags ────────────────────────────────────────
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
  }, {
    tableName: 'leave_types',
    comment:   'Defines a category of leave and its accrual/encashment rules',
    indexes: [
      {
        unique: true,
        fields: ['name'],
      },
    ],
  });
  return LeaveType;
};