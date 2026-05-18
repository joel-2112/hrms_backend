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
      comment:   'e.g. "Ethiopian Christmas", "Eid al-Fitr", "Easter Weekend"',
    },

    // ── Date range ─────────────────────────────────────────────
    fromDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Start date — same as toDate for single-day holidays',
    },
    toDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'End date — same as fromDate for single-day holidays',
    },

    // ── Scope ──────────────────────────────────────────────────
    companyId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → companies.id — null means applies to all companies',
    },

    // ── Behaviour flags ────────────────────────────────────────
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
  }, {
    tableName: 'holiday_lists',
    comment:   'Holiday records — one row per holiday or holiday range',
    indexes: [
      { unique: true, fields: ['name', 'from_date', 'to_date', 'company_id'], name: 'uq_holiday_lists_name_dates_company' },
      { fields: ['company_id'], name: 'idx_holiday_lists_company' },
      { fields: ['from_date', 'to_date'], name: 'idx_holiday_lists_dates' },
    ],
  });
  return HolidayList;
};