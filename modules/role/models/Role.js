
module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define('Role', {
    id: {
      type:          DataTypes.UUID,
      defaultValue:  DataTypes.UUIDV4,
      primaryKey:    true,
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      unique:    true,
      comment:   'Human-readable role name e.g. "HR Manager", "System Manager"',
    },
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    // ── Behaviour flags ────────────────────────────────────────
    isSystemRole: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'System roles (e.g. System Manager) cannot be deleted',
    },
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },

    // ── Desk access flags (mirrors Frappe) ─────────────────────
    deskAccess: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: true,
      comment:      'Whether this role grants access to the back-office desk',
    },
    homeSettings: {
      type:      DataTypes.JSONB,
      allowNull: true,
      comment:   'Optional per-role dashboard / home page config',
    },
  }, {
    tableName: 'roles',
    comment:   'Named capability set — the atomic unit of permission assignment',
  });

  // Associations are declared in models/index.js
  Role.associate = () => {};

  return Role;
};
