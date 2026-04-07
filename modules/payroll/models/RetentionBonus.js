module.exports = (sequelize, DataTypes) => {
  const RetentionBonus = sequelize.define('RetentionBonus', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── FKs ────────────────────────────────────────────────────
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id',
    },
    salaryComponentId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → salary_components.id — the bonus earning component',
    },

    // ── Bonus details ──────────────────────────────────────────
    bonusPaymentDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Date on which the bonus is to be paid — matched to payroll month',
    },
    bonusAmount: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: false,
      comment:   'Gross bonus amount before tax',
    },

    // ── Output FK ─────────────────────────────────────────────
    // On the payment date, a service hook creates an AdditionalSalary record.
    // This FK is set once that record is created.
    additionalSalaryId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → additional_salaries.id — set when AdditionalSalary is auto-created on payout date',
    },

    remarks: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    // ── Docstatus ──────────────────────────────────────────────
    docStatus: {
      type:         DataTypes.TINYINT,
      allowNull:    false,
      defaultValue: 0,
      comment:      '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },
  }, {
    tableName: 'retention_bonuses',
    comment:   'Scheduled retention bonus — on payout date produces an AdditionalSalary which is then pulled into the SalarySlip',
    indexes: [
      { fields: ['employee_id'],         name: 'idx_retention_bonuses_employee' },
      { fields: ['bonus_payment_date'],  name: 'idx_retention_bonuses_date' },
      { fields: ['doc_status'],          name: 'idx_retention_bonuses_status' },
    ],
  });
  return RetentionBonus;
};