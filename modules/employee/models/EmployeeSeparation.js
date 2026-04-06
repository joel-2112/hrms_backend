
module.exports = (sequelize, DataTypes) => {
  const EmployeeSeparation = sequelize.define('EmployeeSeparation', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FK (hasOne — one separation per employee) ───────
    employeeId: {
      type:      DataTypes.UUID,
      allowNull: false,
      unique:    true,
      comment:   'FK → employees.id',
    },

    // ── Workflow ───────────────────────────────────────────────
    status: {
      type:         DataTypes.ENUM('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Completed'),
      allowNull:    false,
      defaultValue: 'Draft',
    },
    approvedById: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id',
    },
    approvedOn: {
      type:      DataTypes.DATE,
      allowNull: true,
    },

    // ── Exit classification ────────────────────────────────────
    separationType: {
      type:      DataTypes.ENUM(
        'Resignation',
        'Termination',
        'Retirement',
        'End of Contract',
        'Redundancy',
        'Death',
        'Abandonment',
        'Mutual Agreement'
      ),
      allowNull: false,
    },
    initiatedBy: {
      type:         DataTypes.ENUM('Employee', 'Employer'),
      allowNull:    false,
      defaultValue: 'Employee',
    },

    // ── Key dates ──────────────────────────────────────────────
    resignationDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Date the resignation letter / notice was submitted',
    },
    lastWorkingDay: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },
    relievingDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Official relieving / exit date — mirrors Employee.relievingDate',
    },

    // ── Exit interview ─────────────────────────────────────────
    exitInterviewDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },
    exitInterviewConductedById: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id — HR officer who conducted exit interview',
    },
    exitRemarks: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Exit interview summary / confidential notes',
    },
    reasonForLeaving: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    wouldRehire: {
      type:      DataTypes.BOOLEAN,
      allowNull: true,
      comment:   'HR assessment — is this employee eligible for future rehire',
    },

    // ── Clearance checklist ────────────────────────────────────
    clearanceTasks: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Offboarding tasks e.g. [{ task:"Return laptop", assignedTo, completedOn, status }]',
    },
    equipmentReturned: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Equipment returned e.g. [{ item:"Laptop", serial:"XYZ", returnedOn:"..." }]',
    },
    systemAccessRevoked: {
      type:         DataTypes.JSONB,
      allowNull:    false,
      defaultValue: [],
      comment:      'Systems access revoked e.g. [{ system:"GitHub", revokedOn:"..." }]',
    },
    fullAndFinalSettled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'True when final payroll settlement has been processed',
    },
    fullAndFinalDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },

    // ── Notice period ──────────────────────────────────────────
    noticePeriodServed: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    noticePeriodWaived: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    noticeShortfallDays: {
      type:      DataTypes.INTEGER,
      allowNull: true,
      comment:   'Days of notice NOT served — relevant for recovery from final payroll',
    },

    // ── Misc ───────────────────────────────────────────────────
    additionalNotes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'employee_separations',
    comment:   'Full offboarding record — exit classification, clearance, final settlement',
    indexes: [
      { unique: true, fields: ['employee_id'], name: 'uq_employee_separations_employee' },
      { fields: ['status'],                    name: 'idx_employee_separations_status' },
      { fields: ['last_working_day'],          name: 'idx_employee_separations_lwd' },
    ],
  });

  EmployeeSeparation.associate = () => {};

  return EmployeeSeparation;
};
