
module.exports = (sequelize, DataTypes) => {
  const EmployeeOnboarding = sequelize.define('EmployeeOnboarding', {
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

    // ── Lifecycle status ───────────────────────────────────────
    status: {
      type:         DataTypes.ENUM('Pending', 'In Progress', 'Completed', 'Cancelled'),
      allowNull:    false,
      defaultValue: 'Pending',
    },

    // ── Dates ──────────────────────────────────────────────────
    joiningDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
      comment:   'Mirrors Employee.dateOfJoining — denormalized for quick checklist queries',
    },
    expectedCompletionDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },
    completedOn: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },

    // ── Checklist ──────────────────────────────────────────────
    // Stored as JSONB array so tasks can be added/removed without schema changes.
    // Each task: { taskName, description, assignedTo (userId), dueDate, completedOn, status }
    tasks: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Array of onboarding task objects — each with name, assignee, dueDate, status',
    },

    // ── Equipment & access provisioning ───────────────────────
    equipmentProvided: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'List of equipment handed over e.g. [{ item:"Laptop", serial:"XYZ" }]',
    },
    systemAccessGranted: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Systems access provisioned e.g. [{ system:"Jira", grantedOn:"..." }]',
    },

    // ── Buddy / mentor ─────────────────────────────────────────
    buddyId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id — the onboarding buddy assigned to this employee',
    },

    // ── Misc ───────────────────────────────────────────────────
    notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'employee_onboardings',
    comment:   'Structured onboarding process — tasks, equipment, system access per new hire',
    indexes: [
      { fields: ['employee_id'], name: 'idx_employee_onboardings_employee' },
      { fields: ['status'],      name: 'idx_employee_onboardings_status' },
    ],
  });

  EmployeeOnboarding.associate = () => {};

  return EmployeeOnboarding;
};
