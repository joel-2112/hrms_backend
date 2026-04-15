module.exports = (sequelize, DataTypes) => {
  const Role = sequelize.define(
    "Role",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // ── Core identity ──────────────────────────────────────────
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        // unique: true,
        comment: 'Human-readable role name e.g. "HR Manager", "System Manager"',
      },
      // ── Behaviour flags ────────────────────────────────────────
      isSystemRole: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "System roles (e.g. System Manager) cannot be deleted",
      },
      disabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: "roles",
      comment:
        "Named capability set — the atomic unit of permission assignment",
      indexes: [
        {
          unique: true,
          fields: ["name"],
        },
      ],
    },
  );
  return Role;
};
