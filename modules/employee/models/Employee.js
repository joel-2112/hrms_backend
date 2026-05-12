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
        comment: "FK → users.id — the login account for this employee",
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

      workLocation: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment:
          "Primary work location (e.g. 'Head Office', 'Remote', 'Branch', 'anywhere') for organizational and payroll purposes",
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
      nationality: {
        type: DataTypes.STRING,
        allowNull: true,
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
      dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
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
        defaultValue: "pending",
        validate: {
          isIn: [["pending", "Active", "onLeave", "Suspended", "exited"]],
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
      linkedInUrl: {
        type: DataTypes.STRING(512),
        allowNull: true,
        validate: { isUrl: true },
        comment: "Link to LinkedIn profile for professional networking",
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
      // ─────────────────────────────────────────────
      //  SECTION 5 — CONTACT
      // ─────────────────────────────────────────────
      username: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: { isEmail: true },
        comment: "personal email — typically mirrors User.email",
      },
      personalEmail: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: { isEmail: true },
        comment: "alternative personal email for emergency contact",
      },

      phoneNumber: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: "Personal phone number",
      },
      alternativePhoneNumber: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: "Secondary phone number for emergency contact",
      },

      // ─────────────────────────────────────────────
      //  SECTION 6 — ADDRESS
      // ─────────────────────────────────────────────
      Country: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: "Ethiopia",
      },
      Region: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      zone: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      City: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      // ─────────────────────────────────────────────
      //  SECTION 9 — payroll and financial info
      // ─────────────────────────────────────────────
      bankName: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      bankAccountNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      tinNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      salary: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: "Current gross salary for payroll processing",
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
