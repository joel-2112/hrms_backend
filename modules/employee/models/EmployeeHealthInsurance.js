
module.exports = (sequelize, DataTypes) => {
  const EmployeeHealthInsurance = sequelize.define('EmployeeHealthInsurance', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FK (hasOne — one active policy record per employee) ──
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      unique:    true,
      comment:   'FK → employees.id',
    },

    // ── Policy identity ────────────────────────────────────────
    provider: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      comment:   'Insurance company name e.g. "NHIF", "AAR", "Jubilee Health"',
    },
    policyNumber: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    membershipNumber: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'Employee-specific membership / card number',
    },
    planName: {
      type:      DataTypes.STRING(150),
      allowNull: true,
      comment:   'Plan tier e.g. "Gold", "Inpatient + Outpatient", "Family Cover"',
    },

    // ── Coverage window ────────────────────────────────────────
    effectiveDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },
    expiryDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },

    // ── Cover limits ───────────────────────────────────────────
    inpatientLimit: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment:   'Annual inpatient cover limit in the company currency',
    },
    outpatientLimit: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    dentalLimit: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    opticalLimit: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    maternityCover: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    maternityLimit: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },

    // ── Contribution ───────────────────────────────────────────
    employeeContribution: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment:   'Employee monthly premium deduction',
    },
    employerContribution: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment:   'Employer monthly premium contribution',
    },

    // ── Dependants ─────────────────────────────────────────────
    // Each entry: { name, relationship, dateOfBirth, membershipNumber }
    dependants: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Family members covered under this policy',
    },

    // ── Status ─────────────────────────────────────────────────
    status: {
      type:         DataTypes.ENUM('Active', 'Expired', 'Cancelled', 'Pending Enrolment'),
      allowNull:    false,
      defaultValue: 'Pending Enrolment',
    },

    // ── Misc ───────────────────────────────────────────────────
    notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'employee_health_insurances',
    comment:   'Health insurance policy details — hasOne per employee, JSONB for dependants',
    indexes: [
      { unique: true, fields: ['employee_id'], name: 'uq_employee_health_insurances_employee' },
      { fields: ['status'],                    name: 'idx_employee_health_insurances_status' },
      { fields: ['expiry_date'],               name: 'idx_employee_health_insurances_expiry' },
    ],
  });

  EmployeeHealthInsurance.associate = () => {};

  return EmployeeHealthInsurance;
};
