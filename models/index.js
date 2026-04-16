
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../config/database').sequelize;
require('dotenv').config();



// ─────────────────────────────────────────────
//  2. IMPORT ALL MODELS
//     Priority order mirrors the full module stack:
//     role → organization → document → employee →
//     attendance → leave → payroll →
//     recruitment → performance
//
//     RULE: Each model file exports a factory function
//     (sequelize, DataTypes) => Model.
//     Associations are NEVER declared inside model
//     files — they are all wired in section 3 below.
// ─────────────────────────────────────────────

// ── role/  ─────────────────────────────────────
//    Must be first: User is referenced by Employee
const Role            = require('../modules/role/models/Role')(sequelize, DataTypes);
const RoleProfile     = require('../modules/role/models/RoleProfile')(sequelize, DataTypes);
const UserRole        = require('../modules/role/models/UserRole')(sequelize, DataTypes);
const RoleProfileRole = require('../modules/role/models/RoleProfileRole')(sequelize, DataTypes);
const RolePermission  = require('../modules/role/models/RolePermission')(sequelize, DataTypes);
const User            = require('../modules/role/models/User')(sequelize, DataTypes);
const UserPermission  = require('../modules/role/models/UserPermission')(sequelize, DataTypes);
const UserSession     = require('../modules/role/models/UserSession')(sequelize, DataTypes);
const LoginAttempt    = require('../modules/role/models/LoginAttempt')(sequelize, DataTypes);

// ── organization/ ──────────────────────────────
const Company        = require('../modules/organization/models/Company')(sequelize, DataTypes);
const Branch         = require('../modules/organization/models/Branch')(sequelize, DataTypes);
const Department     = require('../modules/organization/models/Department')(sequelize, DataTypes);
const Designation    = require('../modules/organization/models/Designation')(sequelize, DataTypes);
const EmploymentType = require('../modules/organization/models/EmploymentType')(sequelize, DataTypes);
const EmployeeGrade  = require('../modules/organization/models/EmployeeGrade')(sequelize, DataTypes);

// ── document/ ──────────────────────────────────
const DocumentType    = require('../modules/document/models/DocumentType')(sequelize, DataTypes);
const Document        = require('../modules/document/models/Document')(sequelize, DataTypes);
const DocumentVersion = require('../modules/document/models/DocumentVersion')(sequelize, DataTypes);

// ── employee/ ──────────────────────────────────
const Employee                 = require('../modules/employee/models/Employee')(sequelize, DataTypes);
const EmployeeOnboarding       = require('../modules/employee/models/EmployeeOnboarding')(sequelize, DataTypes);
const EmployeePromotion        = require('../modules/employee/models/EmployeePromotion')(sequelize, DataTypes);
const EmployeeTransfer         = require('../modules/employee/models/EmployeeTransfer')(sequelize, DataTypes);
const EmployeeSeparation       = require('../modules/employee/models/EmployeeSeparation')(sequelize, DataTypes);
const EmployeeSkillMap         = require('../modules/employee/models/EmployeeSkillMap')(sequelize, DataTypes);
const EmployeeEducation        = require('../modules/employee/models/EmployeeEducation')(sequelize, DataTypes);
const EmployeeExternalWork     = require('../modules/employee/models/EmployeeExternalWork')(sequelize, DataTypes);
const EmployeeEmergencyContact = require('../modules/employee/models/EmployeeEmergencyContact')(sequelize, DataTypes);
const EmployeeHealthInsurance  = require('../modules/employee/models/EmployeeHealthInsurance')(sequelize, DataTypes);

// ── attendance/ ────────────────────────────────
const ShiftType         = require('../modules/attendance/models/ShiftType')(sequelize, DataTypes);
const ShiftAssignment   = require('../modules/attendance/models/ShiftAssignment')(sequelize, DataTypes);
const ShiftRequest      = require('../modules/attendance/models/ShiftRequest')(sequelize, DataTypes);
const Attendance        = require('../modules/attendance/models/Attendance')(sequelize, DataTypes);
const EmployeeCheckin   = require('../modules/attendance/models/EmployeeCheckin')(sequelize, DataTypes);
const AttendanceRequest = require('../modules/attendance/models/AttendanceRequest')(sequelize, DataTypes);

// ── leave/ ─────────────────────────────────────
const HolidayList              = require('../modules/leave/models/HolidayList')(sequelize, DataTypes);
const LeaveType                = require('../modules/leave/models/LeaveType')(sequelize, DataTypes);
const LeavePeriod              = require('../modules/leave/models/LeavePeriod')(sequelize, DataTypes);
const LeaveBlockList           = require('../modules/leave/models/LeaveBlockList')(sequelize, DataTypes);
const LeavePolicy              = require('../modules/leave/models/LeavePolicy')(sequelize, DataTypes);
const LeavePolicyAssignment    = require('../modules/leave/models/LeavePolicyAssignment')(sequelize, DataTypes);
const LeaveAllocation          = require('../modules/leave/models/LeaveAllocation')(sequelize, DataTypes);
const LeaveApplication         = require('../modules/leave/models/LeaveApplication')(sequelize, DataTypes);
const CompensatoryLeaveRequest = require('../modules/leave/models/CompensatoryLeaveRequest')(sequelize, DataTypes);
const LeaveEncashment          = require('../modules/leave/models/LeaveEncashment')(sequelize, DataTypes);
const LeaveLedgerEntry         = require('../modules/leave/models/LeaveLedgerEntry')(sequelize, DataTypes);

// ── payroll/ ───────────────────────────────────
const SalaryComponent                     = require('../modules/payroll/models/SalaryComponent')(sequelize, DataTypes);
const SalaryStructure                     = require('../modules/payroll/models/SalaryStructure')(sequelize, DataTypes);
const PayrollPeriod                       = require('../modules/payroll/models/PayrollPeriod')(sequelize, DataTypes);
const IncomeTaxSlab                       = require('../modules/payroll/models/IncomeTaxSlab')(sequelize, DataTypes);
const SalaryStructureAssignment           = require('../modules/payroll/models/SalaryStructureAssignment')(sequelize, DataTypes);
const PayrollEntry                        = require('../modules/payroll/models/PayrollEntry')(sequelize, DataTypes);
const SalarySlip                          = require('../modules/payroll/models/SalarySlip')(sequelize, DataTypes);
const AdditionalSalary                    = require('../modules/payroll/models/AdditionalSalary')(sequelize, DataTypes);
const RetentionBonus                      = require('../modules/payroll/models/RetentionBonus')(sequelize, DataTypes);
const EmployeeIncentive                   = require('../modules/payroll/models/EmployeeIncentive')(sequelize, DataTypes);
const EmployeeTaxExemptionDeclaration     = require('../modules/payroll/models/EmployeeTaxExemptionDeclaration')(sequelize, DataTypes);
const EmployeeTaxExemptionProofSubmission = require('../modules/payroll/models/EmployeeTaxExemptionProofSubmission')(sequelize, DataTypes);

// ── recruitment/ ───────────────────────────────
const StaffingPlan      = require('../modules/recruitment/models/StaffingPlan')(sequelize, DataTypes);
const JobOpening        = require('../modules/recruitment/models/JobOpening')(sequelize, DataTypes);
const EmployeeReferral  = require('../modules/recruitment/models/EmployeeReferral')(sequelize, DataTypes);
const JobApplicant      = require('../modules/recruitment/models/JobApplicant')(sequelize, DataTypes);
const Interview         = require('../modules/recruitment/models/Interview')(sequelize, DataTypes);
const InterviewFeedback = require('../modules/recruitment/models/InterviewFeedback')(sequelize, DataTypes);
const JobOffer          = require('../modules/recruitment/models/JobOffer')(sequelize, DataTypes);
const AppointmentLetter = require('../modules/recruitment/models/AppointmentLetter')(sequelize, DataTypes);
const JobRequisition      = require('../modules/recruitment/models/JobRequisition')(sequelize, DataTypes);
// ── performance/ ───────────────────────────────
const AppraisalTemplate           = require('../modules/performance/models/AppraisalTemplate')(sequelize, DataTypes);
const AppraisalCycle              = require('../modules/performance/models/AppraisalCycle')(sequelize, DataTypes);
const Appraisal                   = require('../modules/performance/models/Appraisal')(sequelize, DataTypes);
const Goal                        = require('../modules/performance/models/Goal')(sequelize, DataTypes);
const EmployeePerformanceFeedback = require('../modules/performance/models/EmployeePerformanceFeedback')(sequelize, DataTypes);

// ─────────────────────────────────────────────
//  3. DECLARE ALL ASSOCIATIONS
//     Every belongsTo / hasMany / hasOne pair
//     is defined here, after all models are
//     initialized, to avoid circular import
//     issues.
//
//     Convention:
//       — belongsTo  declares the FK column
//       — hasMany / hasOne is always the mirror
//       — as: 'alias' is required wherever a model
//         has more than one FK pointing at the
//         same target (e.g. reviewer vs reviewee)
// ─────────────────────────────────────────────

// ══════════════════════════════════════════════
//  ROLE
//  Declared first — User must exist before
//  Employee can reference userId below.
// ══════════════════════════════════════════════

// RoleProfile ↔ Role  (many-to-many via RoleProfileRole junction)
RoleProfile.belongsToMany(Role, {
  through:    RoleProfileRole,
  foreignKey: 'roleProfileId',
  otherKey:   'roleId',
  as:         'roles',
});
Role.belongsToMany(RoleProfile, {
  through:    RoleProfileRole,
  foreignKey: 'roleId',
  otherKey:   'roleProfileId',
  as:         'roleProfiles',
});

// User ↔ Role  (many-to-many via UserRole junction)
User.belongsToMany(Role, {
  through:    UserRole,
  foreignKey: 'userId',
  otherKey:   'roleId',
  as:         'roles',
});
Role.belongsToMany(User, {
  through:    UserRole,
  foreignKey: 'roleId',
  otherKey:   'userId',
  as:         'users',
});

// User → RoleProfile  (optional single template FK)
User.belongsTo(RoleProfile, { foreignKey: 'roleProfileId' });
RoleProfile.hasMany(User,   { foreignKey: 'roleProfileId' });

// RolePermission → Role
RolePermission.belongsTo(Role, { foreignKey: 'roleId', allowNull: false });
Role.hasMany(RolePermission,   { foreignKey: 'roleId' });

// UserPermission → User
UserPermission.belongsTo(User, { foreignKey: 'userId', allowNull: false });
User.hasMany(UserPermission,   { foreignKey: 'userId' });
User.hasMany(UserSession, { foreignKey: 'userId' });
UserSession.belongsTo(User, { foreignKey: 'userId' });
LoginAttempt.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(LoginAttempt, { foreignKey: 'userId' });




// ══════════════════════════════════════════════
//  ORGANIZATION
// ══════════════════════════════════════════════

// Company self-ref (group companies)
Company.belongsTo(Company, { as: 'parentCompany', foreignKey: 'parentCompanyId' });
Company.hasMany(Company,   { as: 'subsidiaries',  foreignKey: 'parentCompanyId' });

// Branch → Company
Branch.belongsTo(Company, { foreignKey: 'companyId', allowNull: false });
Company.hasMany(Branch,   { foreignKey: 'companyId' });

// Department → Company  +  Department self-ref (tree)
Department.belongsTo(Company,    { foreignKey: 'companyId', allowNull: false });
Company.hasMany(Department,      { foreignKey: 'companyId' });
Department.belongsTo(Department, { as: 'parentDepartment', foreignKey: 'parentDepartmentId' });
Department.hasMany(Department,   { as: 'subDepartments',   foreignKey: 'parentDepartmentId' });


// ══════════════════════════════════════════════
//  DOCUMENT
// ══════════════════════════════════════════════

// Document → DocumentType
Document.belongsTo(DocumentType, { foreignKey: 'documentTypeId', allowNull: false });
DocumentType.hasMany(Document,   { foreignKey: 'documentTypeId' });

// Document → Employee (uploader)
Document.belongsTo(Employee, { as: 'uploadedBy', foreignKey: 'uploadedById' });
Employee.hasMany(Document,   { as: 'uploadedDocuments', foreignKey: 'uploadedById' });

// DocumentVersion → Document
DocumentVersion.belongsTo(Document, { foreignKey: 'documentId', allowNull: false });
Document.hasMany(DocumentVersion,   { foreignKey: 'documentId', as: 'versions' });

// DocumentVersion → Employee (who replaced it)
DocumentVersion.belongsTo(Employee, { as: 'replacedBy', foreignKey: 'replacedById' });


// ══════════════════════════════════════════════
//  EMPLOYEE  (core lifecycle models)
// ══════════════════════════════════════════════

// Employee → User  (the system login account for this employee)
Employee.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(Employee,    { foreignKey: 'userId' });

// Employee → organization masters
Employee.belongsTo(Company,        { foreignKey: 'companyId',        allowNull: false });
Employee.belongsTo(Branch,         { foreignKey: 'branchId' });
Employee.belongsTo(Department,     { foreignKey: 'departmentId' });
Employee.belongsTo(Designation,    { foreignKey: 'designationId' });
Employee.belongsTo(EmploymentType, { foreignKey: 'employmentTypeId' });
Employee.belongsTo(EmployeeGrade,  { foreignKey: 'employeeGradeId' });
Employee.belongsTo(RoleProfile,    { foreignKey: 'roleProfileId' });

// Employee self-ref (reports to)
Employee.belongsTo(Employee, { as: 'reportsTo',     foreignKey: 'reportsToId' });
Employee.hasMany(Employee,   { as: 'directReports', foreignKey: 'reportsToId' });

// Reverse: organization masters have many employees
Company.hasMany(Employee,        { foreignKey: 'companyId' });
Branch.hasMany(Employee,         { foreignKey: 'branchId' });
Department.hasMany(Employee,     { foreignKey: 'departmentId' });
Designation.hasMany(Employee,    { foreignKey: 'designationId' });
EmploymentType.hasMany(Employee, { foreignKey: 'employmentTypeId' });
EmployeeGrade.hasMany(Employee,  { foreignKey: 'employeeGradeId' });

// Employee lifecycle child models → Employee
EmployeeOnboarding.belongsTo(Employee,       { foreignKey: 'employeeId', allowNull: false });
EmployeePromotion.belongsTo(Employee,        { foreignKey: 'employeeId', allowNull: false });
EmployeeTransfer.belongsTo(Employee,         { foreignKey: 'employeeId', allowNull: false });
EmployeeSeparation.belongsTo(Employee,       { foreignKey: 'employeeId', allowNull: false });
EmployeeSkillMap.belongsTo(Employee,         { foreignKey: 'employeeId', allowNull: false });
EmployeeEducation.belongsTo(Employee,        { foreignKey: 'employeeId', allowNull: false });
EmployeeExternalWork.belongsTo(Employee,     { foreignKey: 'employeeId', allowNull: false });
EmployeeEmergencyContact.belongsTo(Employee, { foreignKey: 'employeeId', allowNull: false });
EmployeeHealthInsurance.belongsTo(Employee,  { foreignKey: 'employeeId', allowNull: false });

Employee.hasMany(EmployeeOnboarding,       { foreignKey: 'employeeId' });
Employee.hasMany(EmployeePromotion,        { foreignKey: 'employeeId' });
Employee.hasMany(EmployeeTransfer,         { foreignKey: 'employeeId' });
Employee.hasMany(EmployeeSeparation,        { foreignKey: 'employeeId' });
Employee.hasMany(EmployeeSkillMap,          { foreignKey: 'employeeId' });
Employee.hasMany(EmployeeEducation,        { foreignKey: 'employeeId' });
Employee.hasMany(EmployeeExternalWork,     { foreignKey: 'employeeId' });
Employee.hasMany(EmployeeEmergencyContact, { foreignKey: 'employeeId' });
Employee.hasOne(EmployeeHealthInsurance,   { foreignKey: 'employeeId' });


// ══════════════════════════════════════════════
//  ATTENDANCE
// ══════════════════════════════════════════════

// ShiftType → HolidayList (leave module cross-ref)
ShiftType.belongsTo(HolidayList, { foreignKey: 'holidayListId' });

// ShiftAssignment → Employee + ShiftType
ShiftAssignment.belongsTo(Employee,  { foreignKey: 'employeeId',  allowNull: false });
ShiftAssignment.belongsTo(ShiftType, { foreignKey: 'shiftTypeId', allowNull: false });
Employee.hasMany(ShiftAssignment,    { foreignKey: 'employeeId' });
ShiftType.hasMany(ShiftAssignment,   { foreignKey: 'shiftTypeId' });

// ShiftRequest → Employee (requester + approver) + ShiftType
ShiftRequest.belongsTo(Employee,  { as: 'requester', foreignKey: 'requesterId', allowNull: false });
ShiftRequest.belongsTo(Employee,  { as: 'approver',  foreignKey: 'approverId' });
ShiftRequest.belongsTo(ShiftType, { foreignKey: 'shiftTypeId', allowNull: false });
Employee.hasMany(ShiftRequest,    { as: 'shiftRequests', foreignKey: 'requesterId' });
ShiftType.hasMany(ShiftRequest,   { foreignKey: 'shiftTypeId' });

// Attendance → Employee + ShiftType + LeaveApplication (cross-ref)
Attendance.belongsTo(Employee,         { foreignKey: 'employeeId',        allowNull: false });
Attendance.belongsTo(ShiftType,        { foreignKey: 'shiftTypeId' });
Attendance.belongsTo(LeaveApplication, { foreignKey: 'leaveApplicationId' });
Employee.hasMany(Attendance,           { foreignKey: 'employeeId' });
ShiftType.hasMany(Attendance,          { foreignKey: 'shiftTypeId' });

// EmployeeCheckin → Employee + ShiftType
EmployeeCheckin.belongsTo(Employee,  { foreignKey: 'employeeId',  allowNull: false });
EmployeeCheckin.belongsTo(ShiftType, { foreignKey: 'shiftTypeId' });
Employee.hasMany(EmployeeCheckin,    { foreignKey: 'employeeId' });

// AttendanceRequest → Employee + Attendance (approved request updates a record)
AttendanceRequest.belongsTo(Employee,   { foreignKey: 'employeeId',   allowNull: false });
AttendanceRequest.belongsTo(Attendance, { foreignKey: 'attendanceId' });
Employee.hasMany(AttendanceRequest,     { foreignKey: 'employeeId' });


// ══════════════════════════════════════════════
//  LEAVE
// ══════════════════════════════════════════════

// LeavePolicy → LeaveType (policy bundles many leave type rows)
LeavePolicy.hasMany(LeaveType,   { foreignKey: 'leavePolicyId' });
LeaveType.belongsTo(LeavePolicy, { foreignKey: 'leavePolicyId' });

// LeavePolicyAssignment → Employee + LeavePolicy + LeavePeriod
LeavePolicyAssignment.belongsTo(Employee,    { foreignKey: 'employeeId',    allowNull: false });
LeavePolicyAssignment.belongsTo(LeavePolicy, { foreignKey: 'leavePolicyId', allowNull: false });
LeavePolicyAssignment.belongsTo(LeavePeriod, { foreignKey: 'leavePeriodId', allowNull: false });
Employee.hasMany(LeavePolicyAssignment,      { foreignKey: 'employeeId' });
LeavePolicy.hasMany(LeavePolicyAssignment,   { foreignKey: 'leavePolicyId' });
LeavePeriod.hasMany(LeavePolicyAssignment,   { foreignKey: 'leavePeriodId' });

// LeaveAllocation → Employee + LeaveType + LeavePeriod
LeaveAllocation.belongsTo(Employee,    { foreignKey: 'employeeId',    allowNull: false });
LeaveAllocation.belongsTo(LeaveType,   { foreignKey: 'leaveTypeId',   allowNull: false });
LeaveAllocation.belongsTo(LeavePeriod, { foreignKey: 'leavePeriodId', allowNull: false });
Employee.hasMany(LeaveAllocation,      { foreignKey: 'employeeId' });
LeaveType.hasMany(LeaveAllocation,     { foreignKey: 'leaveTypeId' });
LeavePeriod.hasMany(LeaveAllocation,   { foreignKey: 'leavePeriodId' });

// LeaveApplication → Employee (applicant + approver) + LeaveType + HolidayList
LeaveApplication.belongsTo(Employee,    { as: 'applicant', foreignKey: 'employeeId',  allowNull: false });
LeaveApplication.belongsTo(Employee,    { as: 'approver',  foreignKey: 'approverId' });
LeaveApplication.belongsTo(LeaveType,   { foreignKey: 'leaveTypeId',  allowNull: false });
LeaveApplication.belongsTo(HolidayList, { foreignKey: 'holidayListId' });
Employee.hasMany(LeaveApplication,      { as: 'leaveApplications', foreignKey: 'employeeId' });
LeaveType.hasMany(LeaveApplication,     { foreignKey: 'leaveTypeId' });

// CompensatoryLeaveRequest → Employee + LeaveType
CompensatoryLeaveRequest.belongsTo(Employee,  { foreignKey: 'employeeId',  allowNull: false });
CompensatoryLeaveRequest.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', allowNull: false });
Employee.hasMany(CompensatoryLeaveRequest,    { foreignKey: 'employeeId' });

// LeaveEncashment → Employee + LeaveType + LeavePeriod
LeaveEncashment.belongsTo(Employee,    { foreignKey: 'employeeId',    allowNull: false });
LeaveEncashment.belongsTo(LeaveType,   { foreignKey: 'leaveTypeId',   allowNull: false });
LeaveEncashment.belongsTo(LeavePeriod, { foreignKey: 'leavePeriodId', allowNull: false });
Employee.hasMany(LeaveEncashment,      { foreignKey: 'employeeId' });

// LeaveLedgerEntry → Employee + LeaveType
// voucherType + voucherNo are plain string columns (polymorphic — not FK-constrained)
LeaveLedgerEntry.belongsTo(Employee,  { foreignKey: 'employeeId',  allowNull: false });
LeaveLedgerEntry.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', allowNull: false });
Employee.hasMany(LeaveLedgerEntry,    { foreignKey: 'employeeId' });


// ══════════════════════════════════════════════
//  PAYROLL
// ══════════════════════════════════════════════

// IncomeTaxSlab → PayrollPeriod
IncomeTaxSlab.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', allowNull: false });
PayrollPeriod.hasMany(IncomeTaxSlab,   { foreignKey: 'payrollPeriodId' });

// SalaryStructureAssignment → Employee + SalaryStructure
SalaryStructureAssignment.belongsTo(Employee,        { foreignKey: 'employeeId',        allowNull: false });
SalaryStructureAssignment.belongsTo(SalaryStructure, { foreignKey: 'salaryStructureId', allowNull: false });
Employee.hasMany(SalaryStructureAssignment,          { foreignKey: 'employeeId' });
SalaryStructure.hasMany(SalaryStructureAssignment,   { foreignKey: 'salaryStructureId' });

// PayrollEntry → PayrollPeriod  (produces SalarySlip records)
PayrollEntry.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', allowNull: false });
PayrollPeriod.hasMany(PayrollEntry,   { foreignKey: 'payrollPeriodId' });

// SalarySlip → Employee + SalaryStructure + PayrollEntry + PayrollPeriod
SalarySlip.belongsTo(Employee,        { foreignKey: 'employeeId',        allowNull: false });
SalarySlip.belongsTo(SalaryStructure, { foreignKey: 'salaryStructureId', allowNull: false });
SalarySlip.belongsTo(PayrollEntry,    { foreignKey: 'payrollEntryId' });
SalarySlip.belongsTo(PayrollPeriod,   { foreignKey: 'payrollPeriodId',   allowNull: false });
Employee.hasMany(SalarySlip,          { foreignKey: 'employeeId' });
PayrollEntry.hasMany(SalarySlip,      { foreignKey: 'payrollEntryId' });
PayrollPeriod.hasMany(SalarySlip,     { foreignKey: 'payrollPeriodId' });

// AdditionalSalary → Employee + SalaryComponent
AdditionalSalary.belongsTo(Employee,        { foreignKey: 'employeeId',        allowNull: false });
AdditionalSalary.belongsTo(SalaryComponent, { foreignKey: 'salaryComponentId', allowNull: false });
Employee.hasMany(AdditionalSalary,          { foreignKey: 'employeeId' });

// RetentionBonus → Employee + SalaryComponent
RetentionBonus.belongsTo(Employee,        { foreignKey: 'employeeId',        allowNull: false });
RetentionBonus.belongsTo(SalaryComponent, { foreignKey: 'salaryComponentId', allowNull: false });
Employee.hasMany(RetentionBonus,          { foreignKey: 'employeeId' });

// EmployeeIncentive → Employee + SalaryComponent
EmployeeIncentive.belongsTo(Employee,        { foreignKey: 'employeeId',        allowNull: false });
EmployeeIncentive.belongsTo(SalaryComponent, { foreignKey: 'salaryComponentId', allowNull: false });
Employee.hasMany(EmployeeIncentive,          { foreignKey: 'employeeId' });

// EmployeeTaxExemptionDeclaration → Employee + PayrollPeriod
EmployeeTaxExemptionDeclaration.belongsTo(Employee,      { foreignKey: 'employeeId',      allowNull: false });
EmployeeTaxExemptionDeclaration.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', allowNull: false });
Employee.hasMany(EmployeeTaxExemptionDeclaration,        { foreignKey: 'employeeId' });

// EmployeeTaxExemptionProofSubmission → Employee + PayrollPeriod
EmployeeTaxExemptionProofSubmission.belongsTo(Employee,      { foreignKey: 'employeeId',      allowNull: false });
EmployeeTaxExemptionProofSubmission.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', allowNull: false });
Employee.hasMany(EmployeeTaxExemptionProofSubmission,        { foreignKey: 'employeeId' });


// ══════════════════════════════════════════════
//  RECRUITMENT
// ══════════════════════════════════════════════

// StaffingPlan → Department + Designation
StaffingPlan.belongsTo(Department,  { foreignKey: 'departmentId' });
StaffingPlan.belongsTo(Designation, { foreignKey: 'designationId' });
Department.hasMany(StaffingPlan,    { foreignKey: 'departmentId' });
Designation.hasMany(StaffingPlan,   { foreignKey: 'designationId' });

// JobOpening → StaffingPlan + Department + Designation
JobOpening.belongsTo(StaffingPlan,  { foreignKey: 'staffingPlanId' });
JobOpening.belongsTo(Department,    { foreignKey: 'departmentId' });
JobOpening.belongsTo(Designation,   { foreignKey: 'designationId' });
StaffingPlan.hasMany(JobOpening,    { foreignKey: 'staffingPlanId' });
Department.hasMany(JobOpening,      { foreignKey: 'departmentId' });
Designation.hasMany(JobOpening,     { foreignKey: 'designationId' });

// EmployeeReferral → Employee (referrer) + JobOpening
EmployeeReferral.belongsTo(Employee,   { as: 'referrer',  foreignKey: 'referrerId',    allowNull: false });
EmployeeReferral.belongsTo(JobOpening, { foreignKey: 'jobOpeningId', allowNull: false });
Employee.hasMany(EmployeeReferral,     { as: 'referrals', foreignKey: 'referrerId' });
JobOpening.hasMany(EmployeeReferral,   { foreignKey: 'jobOpeningId' });

// JobApplicant → JobOpening + EmployeeReferral (nullable)
JobApplicant.belongsTo(JobOpening,       { foreignKey: 'jobOpeningId',       allowNull: false });
JobApplicant.belongsTo(EmployeeReferral, { foreignKey: 'employeeReferralId' });
JobOpening.hasMany(JobApplicant,         { foreignKey: 'jobOpeningId' });

// Interview → JobApplicant + JobOpening + Employee (interviewer)
Interview.belongsTo(JobApplicant, { foreignKey: 'jobApplicantId', allowNull: false });
Interview.belongsTo(JobOpening,   { foreignKey: 'jobOpeningId',   allowNull: false });
Interview.belongsTo(Employee,     { as: 'interviewer', foreignKey: 'interviewerId', allowNull: false });
JobApplicant.hasMany(Interview,   { foreignKey: 'jobApplicantId' });

// InterviewFeedback → Interview + Employee (feedback author)
InterviewFeedback.belongsTo(Interview, { foreignKey: 'interviewId', allowNull: false });
InterviewFeedback.belongsTo(Employee,  { as: 'reviewer', foreignKey: 'reviewerId', allowNull: false });
Interview.hasMany(InterviewFeedback,   { foreignKey: 'interviewId' });

// JobOffer → JobApplicant + JobOpening + Designation
JobOffer.belongsTo(JobApplicant, { foreignKey: 'jobApplicantId', allowNull: false });
JobOffer.belongsTo(JobOpening,   { foreignKey: 'jobOpeningId',   allowNull: false });
JobOffer.belongsTo(Designation,  { foreignKey: 'designationId' });
JobApplicant.hasOne(JobOffer,    { foreignKey: 'jobApplicantId' });

// AppointmentLetter → JobApplicant + JobOffer
AppointmentLetter.belongsTo(JobApplicant, { foreignKey: 'jobApplicantId', allowNull: false });
JobApplicant.hasOne(AppointmentLetter,   { foreignKey: 'jobApplicantId' });
AppointmentLetter.belongsTo(JobOffer,     { foreignKey: 'jobOfferId',     allowNull: false });
JobOffer.hasOne(AppointmentLetter,        { foreignKey: 'jobOfferId' });
// JobRequisition → Department + Designation + Company + EmploymentType
JobRequisition.belongsTo(Department,     { foreignKey: 'departmentId',     allowNull: false });
JobRequisition.belongsTo(Designation,    { foreignKey: 'designationId',    allowNull: false });
JobRequisition.belongsTo(Company,        { foreignKey: 'companyId',        allowNull: false });
JobRequisition.belongsTo(EmploymentType, { foreignKey: 'employmentTypeId' });

// JobRequisition → Employee (requester, HR manager, GM)
JobRequisition.belongsTo(Employee, { as: 'requestedBy',    foreignKey: 'requestedById', allowNull: false });
JobRequisition.belongsTo(Employee, { as: 'hrManager',      foreignKey: 'hrManagerId' });
JobRequisition.belongsTo(Employee, { as: 'generalManager', foreignKey: 'gmId' });

// JobRequisition → JobOpening
JobRequisition.hasOne(JobOpening, { foreignKey: 'requisitionId' });
JobOpening.belongsTo(JobRequisition, { foreignKey: 'requisitionId' });

// ══════════════════════════════════════════════
//  PERFORMANCE
// ══════════════════════════════════════════════

// AppraisalCycle → AppraisalTemplate
AppraisalCycle.belongsTo(AppraisalTemplate, { foreignKey: 'appraisalTemplateId', allowNull: false });
AppraisalTemplate.hasMany(AppraisalCycle,   { foreignKey: 'appraisalTemplateId' });

// Appraisal → Employee + AppraisalCycle + AppraisalTemplate
Appraisal.belongsTo(Employee,          { foreignKey: 'employeeId',          allowNull: false });
Appraisal.belongsTo(AppraisalCycle,    { foreignKey: 'appraisalCycleId',    allowNull: false });
Appraisal.belongsTo(AppraisalTemplate, { foreignKey: 'appraisalTemplateId', allowNull: false });
Employee.hasMany(Appraisal,            { foreignKey: 'employeeId' });
AppraisalCycle.hasMany(Appraisal,      { foreignKey: 'appraisalCycleId' });

// Goal → Appraisal + Employee + Goal self-ref (sub-goals)
Goal.belongsTo(Appraisal, { foreignKey: 'appraisalId', allowNull: false });
Goal.belongsTo(Employee,  { foreignKey: 'employeeId',  allowNull: false });
Goal.belongsTo(Goal,      { as: 'parentGoal', foreignKey: 'parentGoalId' });
Goal.hasMany(Goal,        { as: 'subGoals',   foreignKey: 'parentGoalId' });
Appraisal.hasMany(Goal,   { foreignKey: 'appraisalId' });
Employee.hasMany(Goal,    { foreignKey: 'employeeId' });

// EmployeePerformanceFeedback → Appraisal + Employee (reviewee) + Employee (reviewer)
EmployeePerformanceFeedback.belongsTo(Appraisal, { foreignKey: 'appraisalId', allowNull: false });
EmployeePerformanceFeedback.belongsTo(Employee,  { as: 'reviewee', foreignKey: 'revieweeId', allowNull: false });
EmployeePerformanceFeedback.belongsTo(Employee,  { as: 'reviewer', foreignKey: 'reviewerId', allowNull: false });
Appraisal.hasMany(EmployeePerformanceFeedback,   { foreignKey: 'appraisalId' });


// ─────────────────────────────────────────────
//  4. EXPORT
//     Export the sequelize instance + every model
//     by name. Controllers and services destructure
//     only what they need:
//       const { Employee, Department } = require('../../models');
// ─────────────────────────────────────────────
module.exports = {
  sequelize,
  Sequelize,

  // role
  Role,
  RoleProfile,
  UserRole,
  RoleProfileRole,
  RolePermission,
  User,
  UserPermission,
  UserSession,
  LoginAttempt,

  // organization
  Company,
  Branch,
  Department,
  Designation,
  EmploymentType,
  EmployeeGrade,

  // document
  DocumentType,
  Document,
  DocumentVersion,

  // employee
  Employee,
  EmployeeOnboarding,
  EmployeePromotion,
  EmployeeTransfer,
  EmployeeSeparation,
  EmployeeSkillMap,
  EmployeeEducation,
  EmployeeExternalWork,
  EmployeeEmergencyContact,
  EmployeeHealthInsurance,

  // attendance
  ShiftType,
  ShiftAssignment,
  ShiftRequest,
  Attendance,
  EmployeeCheckin,
  AttendanceRequest,

  // leave
  HolidayList,
  LeaveType,
  LeavePeriod,
  LeaveBlockList,
  LeavePolicy,
  LeavePolicyAssignment,
  LeaveAllocation,
  LeaveApplication,
  CompensatoryLeaveRequest,
  LeaveEncashment,
  LeaveLedgerEntry,

  // payroll
  SalaryComponent,
  SalaryStructure,
  PayrollPeriod,
  IncomeTaxSlab,
  SalaryStructureAssignment,
  PayrollEntry,
  SalarySlip,
  AdditionalSalary,
  RetentionBonus,
  EmployeeIncentive,
  EmployeeTaxExemptionDeclaration,
  EmployeeTaxExemptionProofSubmission,

  // recruitment
  StaffingPlan,
  JobOpening,
  EmployeeReferral,
  JobApplicant,
  Interview,
  InterviewFeedback,
  JobOffer,
  AppointmentLetter,
  JobRequisition,

  // performance
  AppraisalTemplate,
  AppraisalCycle,
  Appraisal,
  Goal,
  EmployeePerformanceFeedback,
};
