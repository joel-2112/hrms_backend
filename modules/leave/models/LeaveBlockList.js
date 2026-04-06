module.exports = (sequelize, DataTypes) => {
  const LeaveBlockList = sequelize.define('LeaveBlockList', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      unique:    true,
      comment:   'e.g. "Year-End Freeze 2025", "Q4 Block"',
    },

    // ── Scope ──────────────────────────────────────────────────
    companyId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → companies.id',
    },

    // ── Blocked dates (JSONB array) ────────────────────────────
    // Each entry: { date: 'YYYY-MM-DD', reason: 'Year-end close' }
    // Same pattern as HolidayList.holidays — avoids a child table
    // for a simple date list.
    blockDates: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Array of { date, reason } — dates on which leave is restricted',
    },

    // ── Scope control ──────────────────────────────────────────
    appliesToAllDepartments: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: true,
      comment:      'When false, restriction applies only to allowedDepartments list',
    },

    // Array of department UUIDs when appliesToAllDepartments = false
    allowedDepartments: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Array of department UUIDs — only relevant when appliesToAllDepartments = false',
    },

    // ── Behaviour flags ────────────────────────────────────────
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
  }, {
    tableName: 'leave_block_lists',
    comment:   'Dates on which leave applications are blocked company or department wide',
    indexes: [
      { fields: ['company_id'], name: 'idx_leave_block_lists_company' },
    ],
  });


  return LeaveBlockList;
};