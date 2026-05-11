
module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define('Company', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Self-ref FK (group company hierarchy) ──────────────────
    parentCompanyId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → companies.id — null means this is a root / standalone company',
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      // unique:    true,
    },
    dateOfIncorporation: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },

    // ── Address ────────────────────────────────────────────────
    country: {
      type:      DataTypes.STRING(100),
      allowNull: false,
    },

    region:{
      type: DataTypes.STRING,
      allowNull: true,
    },
    zone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type:      DataTypes.STRING,
      allowNull: true,
    },
    code: {
      type:      DataTypes.STRING(20),
      allowNull: true,
      comment:   'Unique code for the company, used in document numbering e.g. "NYC"',
    },
    // ── Payroll defaults ───────────────────────────────────────
    defaultHolidayListId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → holiday_lists.id — resolved at runtime to avoid circular import',
    },
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
  }, {
    tableName: 'companies',
    comment:   'Top-level legal entity — root of the organization hierarchy',
    indexes: [
      { fields: ['parent_company_id'], name: 'idx_companies_parent' },
      { unique: true, fields: ['code'], name: 'uq_companies_code' },
    ],
  });

  return Company;
};
