
module.exports = (sequelize, DataTypes) => {
  const Company = sequelize.define('Company', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Self-ref FK (group company hierarchy) ──────────────────
    // associations: Company.belongsTo(Company, { as: 'parentCompany', foreignKey: 'parentCompanyId' })
    //               Company.hasMany(Company,   { as: 'subsidiaries',  foreignKey: 'parentCompanyId' })
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
    abbr: {
      type:      DataTypes.STRING(10),
      allowNull: false,
      // unique:    true,
      comment:   'Short code used as prefix in document naming e.g. "ACME"',
    },

    // ── Legal & registration ───────────────────────────────────
    legalName: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      comment:   'Full registered legal name if different from trading name',
    },
    registrationNumber: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    taxId: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'VAT / TIN / KRA PIN or equivalent',
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
    currency: {
      type:         DataTypes.STRING(10),
      allowNull:    false,
      defaultValue: 'KES',
      comment:      'ISO 4217 currency code — default currency for payroll and transactions',
    },
    address: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    phone: {
      type:      DataTypes.STRING(30),
      allowNull: true,
    },
    email: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      validate:  { isEmail: true },
    },
    website: {
      type:      DataTypes.STRING(255),
      allowNull: true,
    },

    // ── Payroll defaults ───────────────────────────────────────
    defaultHolidayListId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → holiday_lists.id — resolved at runtime to avoid circular import',
    },

    // ── Behaviour flags ────────────────────────────────────────
    isGroup: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'True when this company is a holding entity with subsidiaries',
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
      { unique: true, fields: ['abbr'], name: 'uq_companies_abbr' },
    ],
  });

  return Company;
};
