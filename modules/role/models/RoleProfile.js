
module.exports = (sequelize, DataTypes) => {
  const RoleProfile = sequelize.define('RoleProfile', {
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
      comment:   'Template name e.g. "HR Manager", "Finance User"',
    },
    // ── Behaviour flags ────────────────────────────────────────
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
  }, {
    tableName: 'role_profiles',
    comment:   'Bundles multiple Roles into one template for mass user assignment',
    indexes: [
      {
        unique: true,
        fields: ['name'],
      },
    ],
  });
  return RoleProfile;
};
