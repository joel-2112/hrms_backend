const { validate } = require("uuid");

module.exports = (sequelize, DataTypes) => {
  const EmployeeEmergencyContact = sequelize.define('EmployeeEmergencyContact', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FK ──────────────────────────────────────────────
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → employees.id',
    },

    // ── Contact identity ───────────────────────────────────────
    fullName: {
      type:      DataTypes.STRING,
      allowNull: false,
    },
    relationship: {
      type:      DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [[
        'Spouse',
        'Parent',
        'Sibling',
        'Child',
        'Friend',
        'Guardian',
        'Other',
        ]],
      },
    },
    relationshipOther: {
      type:      DataTypes.STRING(100),
      allowNull: true,
      comment:   'Free text when relationship = "Other"',
    },

    // ── Contact details ────────────────────────────────────────
    phone: {
      type:      DataTypes.STRING(30),
      allowNull: false,
    },
    alternatePhone: {
      type:      DataTypes.STRING(30),
      allowNull: true,
    },
    email: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      validate:  { isEmail: true },
    },
  }, {
    tableName: 'employee_emergency_contacts',
    comment:   'Emergency contacts — hasMany allows multiple contacts per employee',
    indexes: [
      { fields: ['employee_id'], name: 'idx_employee_emergency_contacts_employee' },
    ],
  });
  return EmployeeEmergencyContact;
};
