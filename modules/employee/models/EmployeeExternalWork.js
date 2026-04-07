
module.exports = (sequelize, DataTypes) => {
  const EmployeeExternalWork = sequelize.define('EmployeeExternalWork', {
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

    // ── Employer details ───────────────────────────────────────
    companyName: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      comment:   'Previous employer name',
    },
    industry: {
      type:      DataTypes.STRING(150),
      allowNull: true,
    },
    country: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },

    // ── Role details ───────────────────────────────────────────
    designation: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      comment:   'Job title held at this employer',
    },
    department: {
      type:      DataTypes.STRING(255),
      allowNull: true,
    },
    employmentType: {
      type:      DataTypes.ENUM('Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'),
      allowNull: true,
    },

    // ── Timeline ───────────────────────────────────────────────
    fromDate: {
      type:      DataTypes.DATEONLY,
      allowNull: false,
    },
    toDate: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
      comment:   'Null if employee is currently working here (external / side engagement)',
    },
    isCurrentEmployer: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },

    // ── Reference ──────────────────────────────────────────────
    supervisorName: {
      type:      DataTypes.STRING(255),
      allowNull: true,
    },
    supervisorContact: {
      type:      DataTypes.STRING(255),
      allowNull: true,
      comment:   'Email or phone of the reference contact',
    },
    referenceChecked: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
    referenceCheckedOn: {
      type:      DataTypes.DATEONLY,
      allowNull: true,
    },
    referenceNotes: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Confidential reference check notes — not visible to employee',
    },

    // ── Exit context ───────────────────────────────────────────
    reasonForLeaving: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
    lastDrawnSalary: {
      type:      DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    lastDrawnSalaryCurrency: {
      type:         DataTypes.STRING(10),
      allowNull:    true,
      defaultValue: 'KES',
    },

    // ── Misc ───────────────────────────────────────────────────
    responsibilities: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Key responsibilities and achievements in this role',
    },
    notes: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'employee_external_works',
    comment:   'Previous employment history — one row per employer, ordered by fromDate',
    indexes: [
      { fields: ['employee_id'], name: 'idx_employee_external_works_employee' },
      { fields: ['from_date'],   name: 'idx_employee_external_works_from' },
    ],
  });
  return EmployeeExternalWork;
};
