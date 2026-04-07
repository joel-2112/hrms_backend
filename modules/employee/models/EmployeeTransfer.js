
module.exports = (sequelize, DataTypes) => {
  const EmployeeTransfer = sequelize.define('EmployeeTransfer', {
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

    // ── Effective date & workflow ──────────────────────────────
    transferDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    status: {
      type:         DataTypes.ENUM('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Cancelled'),
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

    // ── From (source) ──────────────────────────────────────────
    fromCompanyId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → companies.id',
    },
    fromBranchId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → branches.id',
    },
    fromDepartmentId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → departments.id',
    },
    fromDesignationId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → designations.id',
    },
    fromReportsToId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id — previous line manager',
    },

    // ── To (destination) ──────────────────────────────────────
    toCompanyId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → companies.id — supports inter-company transfers',
    },
    toBranchId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → branches.id',
    },
    toDepartmentId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → departments.id',
    },
    toDesignationId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → designations.id',
    },
    toReportsToId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id — new line manager',
    },

    // ── Transfer context ───────────────────────────────────────
    transferType: {
      type:      DataTypes.ENUM(
        'Inter-Company',
        'Inter-Branch',
        'Inter-Department',
        'Project-Based',
        'Secondment'
      ),
      allowNull: false,
      defaultValue: 'Inter-Department',
    },
    isInterCompany: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'True when fromCompanyId !== toCompanyId — triggers payroll split logic',
    },
    reason: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    remarks: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'employee_transfers',
    comment:   'Records every inter-company, branch or department move for an employee',
    indexes: [
      { fields: ['employee_id'],   name: 'idx_employee_transfers_employee' },
      { fields: ['transfer_date'], name: 'idx_employee_transfers_date' },
      { fields: ['status'],        name: 'idx_employee_transfers_status' },
    ],
  });
  return EmployeeTransfer;
};
