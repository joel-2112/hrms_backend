
module.exports = (sequelize, DataTypes) => {
  const Branch = sequelize.define('Branch', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FK ──────────────────────────────────────────────
    // association: Branch.belongsTo(Company, { foreignKey: 'companyId', allowNull: false })
    companyId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → companies.id',
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(255),
      allowNull: false,
    },

    // ── Location ───────────────────────────────────────────────
    country: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    city: {
      type:      DataTypes.STRING(100),
      allowNull: true,
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

    // ── Behaviour flags ────────────────────────────────────────
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
  }, {
    tableName: 'branches',
    comment:   'Physical office location — geographic presence of a company',
    indexes: [
      {
        unique: true,
        fields: ['company_id', 'name'],
        name:   'uq_branches_company_name',
        comment: 'Branch names must be unique within a company',
      },
    ],
  });

  Branch.associate = () => {};

  return Branch;
};
