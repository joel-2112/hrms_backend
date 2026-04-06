
module.exports = (sequelize, DataTypes) => {
  const UserRole = sequelize.define('UserRole', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── FKs (declared here for explicitness; also enforced via index.js associations) ──
    userId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → users.id',
    },
    roleId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → roles.id',
    },
  }, {
    tableName: 'user_roles',
    comment:   'Junction: User ↔ Role many-to-many',
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'role_id'],
        name:   'uq_user_roles_user_role',
      },
    ],
  });

  // Associations are declared in models/index.js
  UserRole.associate = () => {};

  return UserRole;
};
