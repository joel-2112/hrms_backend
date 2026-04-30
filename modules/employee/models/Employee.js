const { validate } = require("uuid");

module.exports = (sequelize, DataTypes) => {
  const Employee = sequelize.define(
    "Employee",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // ─────────────────────────────────────────────
      //  SECTION 1 — ORGANIZATION FKs
      // ─────────────────────────────────────────────
      userId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment:
          "FK → users.id — the login account for this employee (nullable for non-system users)",
      },
      companyId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "FK → companies.id",
      },
      branchId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → branches.id",
      },
      departmentId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → departments.id",
      },
      designationId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → designations.id",
      },
      employmentTypeId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → employment_types.id",
      },
      employeeGradeId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → employee_grades.id",
      },
      reportsToId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → employees.id (self-ref) — direct line manager",
      },

      // ─────────────────────────────────────────────
      //  SECTION 2 — IDENTITY
      // ─────────────────────────────────────────────
      employeeNumber: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'HR-assigned employee ID e.g. "EMP-00042"',
      },
      nationalIdNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment:
          "Government-issued national ID number (e.g. 1222223333344444) for identity verification",
      },
      firstName: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      middleName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      lastName: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      salutation: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: [["Mr", "Mrs", "Ms", "Dr", "Prof"]],
        },
      },
      gender: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: [["Male", "Female", "Non-binary"]],
        },
      },
      maritalStatus: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: [["Single", "Married", "Divorced", "Widowed"]],
        },
      },
      // ─────────────────────────────────────────────
      //  SECTION 3 — PHOTO and docuuments
      // ─────────────────────────────────────────────
      image: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Relative path to avatar file e.g. "avatars/emp-uuid.jpg"',
      },
      employeeDocuments: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment:
          "Structured JSON for storing document metadata and file paths, e.g. { nationalId: { number: '1222223333344444', filePath: 'docs/emp-uuid/national-id.pdf' }, resume: { filePath: 'docs/emp-uuid/resume.pdf' } }",
      },

      // ─────────────────────────────────────────────
      //  SECTION 4 — EMPLOYMENT DETAILS
      // ─────────────────────────────────────────────
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Active",
        validate: {
          isIn: [["Active", "Inactive", "onLeave", "Suspended", "exited"]],
        },
      },
      dateOfJoining: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      portfolioUrl: {
        type: DataTypes.STRING(512),
        allowNull: true,
        validate: { isUrl: true },
        comment: "Link to personal portfolio or LinkedIn profile",
      },
      githubUrl: {
        type: DataTypes.STRING(512),
        allowNull: true,
        validate: { isUrl: true },
        comment: "Link to GitHub profile for technical employees",
      },
      contractEndDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "For fixed-term contracts — triggers expiry alerts",
      },
      relievingDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Last working day — populated on separation",
      },
      encashmentDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Date of final leave encashment on exit",
      },

      // ─────────────────────────────────────────────
      //  SECTION 5 — CONTACT
      // ─────────────────────────────────────────────
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: { isEmail: true },
        comment: "Work email — typically mirrors User.email",
      },
      phoneNumber: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: "Office / desk phone",
      },

      // ─────────────────────────────────────────────
      //  SECTION 6 — ADDRESS
      // ─────────────────────────────────────────────
      City: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      Region: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      zone: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      Country: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      currentPostalCode: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      // ─────────────────────────────────────────────
      //  SECTION 9 — BANK DETAILS
      // ─────────────────────────────────────────────
      bankName: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      bankAccountNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      mobileMoneyNumber: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment:
          "telebitt or equivalent mobile money number for payroll disbursement",
      },
      paymentMethod: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "Bank Transfer",
        validate: {
          isIn: [["Bank Transfer", "Tele Birr ", "Cheque", "Cash"]],
        },
      },

      // ─────────────────────────────────────────────
      //  SECTION 10 — LEAVE
      // ─────────────────────────────────────────────
      holidayListId: {
        type: DataTypes.UUID,
        allowNull: true,
        comment:
          "FK → holiday_lists.id — employee-level override; falls back to company default",
      },
      leaveApprovedById: {
        type: DataTypes.UUID,
        allowNull: true,
        comment:
          "FK → employees.id — default leave approver (overrides department rule)",
      },
    },
    {
      tableName: "employees",
      comment: "Core employee record — the subject of every HRMS transaction",
      indexes: [
        {
          unique: true,
          fields: ["employee_number"],
          name: "uq_employees_number",
        },
        { fields: ["company_id"], name: "idx_employees_company" },
        { fields: ["department_id"], name: "idx_employees_department" },
        { fields: ["status"], name: "idx_employees_status" },
        { fields: ["reports_to_id"], name: "idx_employees_reports_to" },
        { fields: ["date_of_joining"], name: "idx_employees_joining" },
      ],
    },
  );
  return Employee;
};
