// JobRequisition.js
module.exports = (sequelize, DataTypes) => {
  const JobRequisition = sequelize.define('JobRequisition', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // ── Identity ───────────────────────────────────────────────
    requisitionNumber: {
      type: DataTypes.STRING(50),
      allowNull: false,
      // ❌ REMOVED:
      comment: 'Auto-generated e.g., REQ-2025-001',
    },

    // ── FKs ────────────────────────────────────────────────────
    departmentId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK → departments.id',
    },
    designationId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK → designations.id',
    },
    companyId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK → companies.id',
    },
    employmentTypeId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK → employment_types.id',
    },

    // ── Requester (Department Head) ────────────────────────────
    requestedById: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK → employees.id - Department Head making the request',
    },
    requestedOn: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    // ── Position Details ───────────────────────────────────────
    numberOfPositions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    replacementFor: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Name of employee being replaced (if any)',
    },
    isNewPosition: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    reasonForHiring: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Business justification from Department Head',
    },

    // ── Budget Information ─────────────────────────────────────
    proposedSalaryMin: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    proposedSalaryMax: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
    },
    currency: {
      type: DataTypes.STRING(10),
      defaultValue: 'KES',
    },

    // ── Timeline ───────────────────────────────────────────────
    targetHireDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },

    // ── Staffing Plan Headcount Snapshot ──────────────────────
    staffingSnapshot: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: `Frozen at submission time: {
        staffingPlanId: uuid,
        planName: string,
        designationId: uuid,
        designationName: string,
        plannedHeadcount: 10,
        currentHeadcount: 7,
        openRequisitions: 2,
        availableVacancies: 1
      }`,
    },

    // ── LEVEL 1: HR Manager Approval ──────────────────────────
    hrManagerId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK → employees.id - HR Manager who reviewed',
    },
    hrStatus: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
      allowNull: false,
      defaultValue: 'Pending',
    },
    hrReviewedOn: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    hrRemarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'HR Manager feedback or rejection reason',
    },

    // ── LEVEL 2: General Manager Final Approval ────────────────
    gmId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK → employees.id - General Manager who gave final approval',
    },
    gmStatus: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
      allowNull: false,
      defaultValue: 'Pending',
    },
    gmReviewedOn: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    gmRemarks: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'GM feedback or rejection reason',
    },

    // ── Overall Status ─────────────────────────────────────────
    overallStatus: {
      type: DataTypes.ENUM(
        'Draft',
        'Pending HR Review',
        'HR Rejected',
        'Pending GM Review',
        'GM Rejected',
        'Approved',
        'Cancelled'
      ),
      allowNull: false,
      defaultValue: 'Draft',
    },

    // ── Output FK ──────────────────────────────────────────────
    jobOpeningId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'FK → job_openings.id - Created when GM approves',
    },

    // ── Workflow ───────────────────────────────────────────────
    docStatus: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0,
      comment: '0 = Draft, 1 = Submitted, 2 = Cancelled',
    },

    // ── Misc ───────────────────────────────────────────────────
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    tableName: 'job_requisitions',
    comment: 'Department Head → HR Manager (L1) → General Manager (L2) approval workflow',
    indexes: [
      // ✅ Unique constraint properly placed here
      { fields: ['requisition_number'], name: 'uq_job_requisitions_number' },
      { fields: ['overall_status'], name: 'idx_job_requisitions_status' },
      { fields: ['requested_by_id'], name: 'idx_job_requisitions_requester' },
      { fields: ['department_id'], name: 'idx_job_requisitions_department' },
      { fields: ['designation_id'], name: 'idx_job_requisitions_designation' },
      { fields: ['company_id'], name: 'idx_job_requisitions_company' },
      { fields: ['hr_status'], name: 'idx_job_requisitions_hr_status' },
      { fields: ['gm_status'], name: 'idx_job_requisitions_gm_status' },
    ],
  });

  return JobRequisition;
};