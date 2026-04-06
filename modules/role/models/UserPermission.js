
module.exports = (sequelize, DataTypes) => {
  const UserPermission = sequelize.define('UserPermission', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FK ──────────────────────────────────────────────
    userId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → users.id — which user is being restricted',
    },

    // ── Restriction targeting ──────────────────────────────────
    allowDocType: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      comment:   'The DocType this restriction applies TO e.g. "Branch", "Department"',
    },
    allowValue: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      comment:   'The specific record the user is allowed to see e.g. "Nairobi", "Finance"',
    },

    // ── Cascade flag ───────────────────────────────────────────
    applyToAllDocTypes: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'When true, restriction cascades to all DocTypes linked to this one',
    },
  }, {
    tableName: 'user_permissions',
    comment:   'Record-level restriction: user can only see specific values of a DocType',
    indexes: [
      {
        fields: ['user_id', 'allow_doc_type'],
        name:   'idx_user_permissions_user_doctype',
      },
    ],
  });

  // Associations are declared in models/index.js
  UserPermission.associate = () => {};

  return UserPermission;
};
