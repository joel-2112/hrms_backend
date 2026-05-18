module.exports = (sequelize, DataTypes) => {
  const Branch = sequelize.define(
    "Branch",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // ── Parent FK ──────────────────────────────────────────────
      companyId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "FK → companies.id",
      },

      // ── Core identity ──────────────────────────────────────────
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },

      // ── Location ───────────────────────────────────────────────
      country: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "Ethiopia",
      },
      region: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      zone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      code: {
        type: DataTypes.STRING,
        allowNull: true,
        comment:
          'Unique code for the branch, used in document numbering e.g. "NYC"',
      },
      dateOfIncorporation: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
    },
    {
      tableName: "branches",
      comment: "Physical office location — geographic presence of a company",
      indexes: [
        {
          unique: true,
          fields: ["company_id", "name"],
          name: "uq_branches_company_name",
          comment: "Branch names must be unique within a company",
        },
      ],
    },
  );
  return Branch;
};
