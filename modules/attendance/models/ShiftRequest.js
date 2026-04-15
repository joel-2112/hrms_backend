
module.exports = (sequelize, DataTypes) => {
  const ShiftRequest = sequelize.define('ShiftRequest', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FKs ─────────────────────────────────────────────
    // ShiftRequest.belongsTo(Employee,  { as: 'requester', foreignKey: 'requesterId', allowNull: false })
    // ShiftRequest.belongsTo(Employee,  { as: 'approver',  foreignKey: 'approverId' })
    // ShiftRequest.belongsTo(ShiftType, { foreignKey: 'shiftTypeId', allowNull: false })
    requesterId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id — employee making the request',
    },
    approverId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id — manager / HR who approves or rejects',
    },
    shiftTypeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → shift_types.id — the shift being requested',
    },

    // ── Request window ─────────────────────────────────────────
    fromDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'First date the requested shift should apply',
    },
    toDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Last date the requested shift should apply',
    },

    // ── Request type ───────────────────────────────────────────
    requestType: {
      type:      DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Temporary',
      validate: {
        isIn: {
          args: [['Permanent', 'Temporary']],
          msg: 'Request type must be one of: Permanent, Temporary',
        },
      },
      comment:   'Permanent updates the ShiftAssignment on approval; Temporary is date-bounded only',
    },

    // ── Workflow ───────────────────────────────────────────────
    status: {
      type:         DataTypes.ENUM('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Cancelled'),
      allowNull:    false,
      defaultValue: 'Draft',
    },
    approvedOn: {
      type:      DataTypes.DATE,
      allowNull: true,
    },

    // ── Context ────────────────────────────────────────────────
    reason: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Employee-provided reason for requesting the shift change',
    },
    rejectionReason: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'shift_requests',
    comment:   'Employee-initiated shift change request — approved request updates ShiftAssignment',
    indexes: [
      { fields: ['requester_id'],       name: 'idx_shift_requests_requester' },
      { fields: ['approver_id'],        name: 'idx_shift_requests_approver' },
      { fields: ['status'],             name: 'idx_shift_requests_status' },
      { fields: ['from_date','to_date'], name: 'idx_shift_requests_window' },
    ],
  });
  return ShiftRequest;
};
