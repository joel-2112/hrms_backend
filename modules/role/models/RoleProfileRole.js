
module.exports = (sequelize, DataTypes) => {
  const RoleProfileRole = sequelize.define('RoleProfileRole', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── FKs ────────────────────────────────────────────────────
    roleProfileId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → role_profiles.id',
    },
    roleId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → roles.id',
    },
  }, {
    tableName: 'role_profile_roles',
    comment:   'Junction: RoleProfile ↔ Role many-to-many',
    indexes: [
      {
        unique: true,
        fields: ['role_profile_id', 'role_id'],
        name:   'uq_role_profile_roles_profile_role',
      },
    ],
  });
  return RoleProfileRole;
};
