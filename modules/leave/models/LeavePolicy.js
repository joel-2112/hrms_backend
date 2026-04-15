module.exports = (sequelize, DataTypes) => {
  const LeavePolicy = sequelize.define('LeavePolicy', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      // unique:    true,
      comment:   'e.g. "Standard Full-Time Policy", "Contract Staff Policy"',
    },

    // ── Leave allocations (JSONB array of leave type rows) ─────
    // Each entry: { leaveTypeId: 'uuid', annualAllocation: 21 }
    // This mirrors Frappe's child table (Leave Policy Detail).
    // Storing as JSONB keeps the model flat — the LeavePolicyAssignment
    // service reads this array and generates one LeaveAllocation row
    // per entry per employee when the policy is assigned.
    leaveTypes: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Array of { leaveTypeId, annualAllocation } — the entitlement matrix',
    },

    // ── Behaviour flags ────────────────────────────────────────
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
  }, {
    tableName: 'leave_policies',
    comment:   'Named entitlement template — maps leave types to annual day allocations',
    indexes: [
      {
        unique: true,
        fields: ['name'],
      },
    ],
  });
  return LeavePolicy;
};