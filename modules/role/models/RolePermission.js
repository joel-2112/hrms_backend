
module.exports = (sequelize, DataTypes) => {
  const RolePermission = sequelize.define('RolePermission', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FK ──────────────────────────────────────────────
    roleId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → roles.id — which role owns this permission rule',
    },

    // ── Resource targeting ─────────────────────────────────────
    moduleName: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      comment:   'Module the resource lives in e.g. "employee", "leave", "payroll"',
    },
    resourceName: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      comment:   'DocType name e.g. "Employee", "LeaveApplication", "SalarySlip"',
    },

    // ── Field-level permission depth (0 = all fields) ─────────
    permLevel: {
      type:         DataTypes.INTEGER,
      allowNull:    false,
      defaultValue: 0,
      validate:     { min: 0, max: 9 },
      comment:      'Field group level 0–9; 0 means all fields are in scope',
    },

    // ── Document-level action flags ────────────────────────────
    canRead: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    canWrite: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    canCreate: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    canDelete: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    canSubmit: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Applies only to submittable DocTypes',
    },
    canCancel: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    canAmend: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Amend a cancelled document; requires canCancel',
    },

    // ── Output flags ───────────────────────────────────────────
    canPrint: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    canEmail: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },

    // ── Data movement flags ────────────────────────────────────
    canImport: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    canExport: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    canReport: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },

    // ── Delegation flag ────────────────────────────────────────
    canSetPermissions: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Whether this role can grant UserPermission records to other users',
    },
  }, {
    tableName: 'role_permissions',
    comment:   'One rule: Role X can perform action set Y on ResourceName Z at permLevel N',
    indexes: [
      {
        // One rule per role+resource+permLevel combination
        unique: true,
        fields: ['role_id','module_name', 'resource_name', 'perm_level'],
      },
      {
        fields: ['module_name'],
      },
    ],
  });

  return RolePermission;
};
