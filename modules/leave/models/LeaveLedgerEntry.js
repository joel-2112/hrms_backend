module.exports = (sequelize, DataTypes) => {
  const LeaveLedgerEntry = sequelize.define(
    "LeaveLedgerEntry",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // ── FKs ────────────────────────────────────────────────────
      employeeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "FK → employees.id",
      },
      leaveTypeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "FK → leave_types.id",
      },

      // ── Polymorphic source reference ───────────────────────────
      // Points back to whichever document created this entry.
      // voucherType + voucherNo pattern — no FK constraint at DB level,
      // resolved in the service layer.
      voucherType: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: {
            args: [
              [
                "LeaveApplication",
                "LeaveEncashment",
                "CompensatoryLeaveRequest",
                "LeaveAllocation",
                "Expiration"
              ],
            ],
          },
        },
        comment: "Which DocType created this ledger entry",
      },
      voucherNo: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "The UUID of the source document",
      },

      // ── Balance movement ───────────────────────────────────────
      // Positive = credit (allocation, comp-off)
      // Negative = debit  (application, encashment)
      leaves: {
        type: DataTypes.DECIMAL(5, 1),
        allowNull: false,
        comment: "Signed value: positive = credit, negative = debit",
      },

      // ── Period scope ───────────────────────────────────────────
      fromDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      toDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },

      // ── Immutability flag ──────────────────────────────────────
      // This table is append-only. Rows are never updated.
      // Balance = SUM(leaves) per employee per leaveType.
      // This flag is a safety guard — the service layer checks it
      // before allowing any write attempt.
      isExpired: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment:
          "True when the associated leave period has ended — balance can no longer be used",
      },
    },
    {
      tableName: "leave_ledger_entries",
      comment:
        "Immutable audit log — every balance movement writes one row. Current balance = SUM(leaves) per employee per leaveType",
      indexes: [
        { fields: ["employee_id"], name: "idx_lle_employee" },
        { fields: ["leave_type_id"], name: "idx_lle_leave_type" },
        { fields: ["voucher_type", "voucher_no"], name: "idx_lle_voucher" },
        { fields: ["from_date", "to_date"], name: "idx_lle_period" },
      ],
    },
  );
  return LeaveLedgerEntry;
};
