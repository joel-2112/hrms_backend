module.exports = (sequelize, DataTypes) => {
  const LeavePeriod = sequelize.define('LeavePeriod', {
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
      comment:   'e.g. "2025 (Jan-Dec)", "2025-26 (Apr-Mar)"',
    },

    // ── Scope ──────────────────────────────────────────────────
    companyId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → companies.id',
    },

    // ── Period boundaries ──────────────────────────────────────
    startDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    endDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },

    // ── Status ─────────────────────────────────────────────────
    isActive: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: true,
      comment:      'Only one period should be active at a time per company',
    },
  }, {
    tableName: 'leave_periods',
    comment:   'Financial/leave year boundary — allocations and encashments are bounded by this',
    indexes: [
      { fields: ['company_id'], name: 'idx_leave_periods_company' },
      { fields: ['is_active'],  name: 'idx_leave_periods_active' },
      {
        unique: true,
        fields: ['company_id', 'name'],
        name:   'uq_leave_periods_company_name',
      },
    ],
  });

  return LeavePeriod;
};