module.exports = (sequelize, DataTypes) => {
  const HolidayList = sequelize.define('HolidayList', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      // unique:    true,
      comment:   'e.g. "Kenya Public Holidays 2025", "Nairobi Office 2025"',
    },

    // ── Scope ──────────────────────────────────────────────────
    // FK → companies.id — resolved via index.js association
    companyId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → companies.id — null means applies to all companies',
    },

    // ── Period ─────────────────────────────────────────────────
    fromDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    toDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },

    // ── Holiday entries (stored as JSONB array) ─────────────────
    // Each entry: { date: 'YYYY-MM-DD', description: 'New Year' }
    // Avoids a separate HolidayEntry table for a simple list.
    holidays: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Array of { date, description } objects',
    },

    // ── Behaviour flags ────────────────────────────────────────
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
  }, {
    tableName: 'holiday_lists',
    comment:   'Named list of public/company holidays for a year — referenced by ShiftType, Employee, LeaveApplication',
    indexes: [
      { unique: true, fields: ['name', 'company_id'], name: 'uq_holiday_lists_name_company' },
      { fields: ['company_id'], name: 'idx_holiday_lists_company' },
      { fields: ['from_date', 'to_date'], name: 'idx_holiday_lists_period' },
    ],
  });
  return HolidayList;
};