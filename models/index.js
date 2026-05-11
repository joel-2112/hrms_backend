'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  models/index.js
//
//  Single entry-point for the entire Sequelize layer.
//
//  Layout
//  ──────
//  1. Bootstrap  – Sequelize instance + DataTypes
//  2. Imports    – one require() per model, grouped by module
//                  Import order follows the dependency chain:
//                  role → organization → document → employee →
//  3. Associations – every belongsTo / hasMany / hasOne / belongsToMany pair
//                  declared HERE, never inside individual model files,
//                  to avoid circular-require issues.
//                  Rules applied throughout:
//                    • Every belongsTo has a matching hasMany / hasOne reverse.
//                    • Every hasMany reverse on a belongsTo is present.
//                    • as: 'camelCaseAlias' is set on EVERY call so that
//                      Sequelize eager-loading is always explicit and
//                      unambiguous, even where a model has only one FK to
//                      a target.
//                    • allowNull: false mirrors the NOT NULL constraint for
//                      mandatory FK columns.
//  4. Exports    – sequelize instance + every model by name.
//
//  Usage in controllers / services:
//    const { Employee, Department, LeaveApplication } = require('../../models');
// ─────────────────────────────────────────────────────────────────────────────


// ─────────────────────────────────────────────────────────────────────────────
//  1. BOOTSTRAP
// ─────────────────────────────────────────────────────────────────────────────

require('dotenv').config();

const { Sequelize, DataTypes } = require('sequelize');
const sequelize               = require('../config/database').sequelize;


// ─────────────────────────────────────────────────────────────────────────────
//  2. IMPORT ALL MODELS
// ─────────────────────────────────────────────────────────────────────────────

// ── 2.1  role/  ──────────────────────────────────────────────────────────────
//         Must be first – User is referenced by Employee (userId FK).

const Role            = require('../modules/role/models/Role')(sequelize, DataTypes);
const RoleProfile     = require('../modules/role/models/RoleProfile')(sequelize, DataTypes);
const RoleProfileRole = require('../modules/role/models/RoleProfileRole')(sequelize, DataTypes);  // junction
const RolePermission  = require('../modules/role/models/RolePermission')(sequelize, DataTypes);
const User            = require('../modules/role/models/User')(sequelize, DataTypes);
const UserRole        = require('../modules/role/models/UserRole')(sequelize, DataTypes);          // junction
const UserPermission  = require('../modules/role/models/UserPermission')(sequelize, DataTypes);
const UserSession     = require('../modules/role/models/UserSession')(sequelize, DataTypes);
const LoginAttempt    = require('../modules/role/models/LoginAttempt')(sequelize, DataTypes);

// ── 2.2  organization/  ───────────────────────────────────────────────────────

const Company        = require('../modules/organization/models/Company')(sequelize, DataTypes);
const Branch         = require('../modules/organization/models/Branch')(sequelize, DataTypes);
const Department     = require('../modules/organization/models/Department')(sequelize, DataTypes);
const Designation    = require('../modules/organization/models/Designation')(sequelize, DataTypes);
const EmploymentType = require('../modules/organization/models/EmploymentType')(sequelize, DataTypes);
const EmployeeGrade  = require('../modules/organization/models/EmployeeGrade')(sequelize, DataTypes);

// ── 2.3  document/  ───────────────────────────────────────────────────────────

const DocumentType    = require('../modules/document/models/DocumentType')(sequelize, DataTypes);
const Document        = require('../modules/document/models/Document')(sequelize, DataTypes);
const DocumentVersion = require('../modules/document/models/DocumentVersion')(sequelize, DataTypes);

// ── 2.4  employee/  ───────────────────────────────────────────────────────────

const Employee                 = require('../modules/employee/models/Employee')(sequelize, DataTypes);
const EmployeePromotion        = require('../modules/employee/models/EmployeePromotion')(sequelize, DataTypes);
const EmployeeSeparation       = require('../modules/employee/models/EmployeeSeparation')(sequelize, DataTypes);
const EmployeeSkillMap         = require('../modules/employee/models/EmployeeSkillMap')(sequelize, DataTypes);
const EmployeeEducation        = require('../modules/employee/models/EmployeeEducation')(sequelize, DataTypes);
const EmployeeExternalWork     = require('../modules/employee/models/EmployeeExternalWork')(sequelize, DataTypes);
const EmployeeEmergencyContact = require('../modules/employee/models/EmployeeEmergencyContact')(sequelize, DataTypes);
// ── 2.6  leave/  ──────────────────────────────────────────────────────────────

const HolidayList              = require('../modules/leave/models/HolidayList')(sequelize, DataTypes);
const LeaveType                = require('../modules/leave/models/LeaveType')(sequelize, DataTypes);
const LeavePeriod              = require('../modules/leave/models/LeavePeriod')(sequelize, DataTypes);
const LeaveBlockList           = require('../modules/leave/models/LeaveBlockList')(sequelize, DataTypes);
const LeaveApplication         = require('../modules/leave/models/LeaveApplication')(sequelize, DataTypes);
const CompensatoryLeaveRequest = require('../modules/leave/models/CompensatoryLeaveRequest')(sequelize, DataTypes);
const LeaveEncashment          = require('../modules/leave/models/LeaveEncashment')(sequelize, DataTypes);
const LeaveLedgerEntry         = require('../modules/leave/models/LeaveLedgerEntry')(sequelize, DataTypes);

// ── 2.7  payroll/  ────────────────────────────────────────────────────────────

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

// ── 2.8  recruitment/  ────────────────────────────────────────────────────────

const JobRequisition    = require('../modules/recruitment/models/JobRequisition')(sequelize, DataTypes);
const StaffingPlan      = require('../modules/recruitment/models/StaffingPlan')(sequelize, DataTypes);
const JobOpening        = require('../modules/recruitment/models/JobOpening')(sequelize, DataTypes);
const JobApplicant      = require('../modules/recruitment/models/JobApplicant')(sequelize, DataTypes);
const EmployeeReferral  = require('../modules/recruitment/models/EmployeeReferral')(sequelize, DataTypes);
const Interview         = require('../modules/recruitment/models/Interview')(sequelize, DataTypes);
const InterviewFeedback = require('../modules/recruitment/models/InterviewFeedback')(sequelize, DataTypes);
const JobOffer          = require('../modules/recruitment/models/JobOffer')(sequelize, DataTypes);
const AppointmentLetter = require('../modules/recruitment/models/AppointmentLetter')(sequelize, DataTypes);

// ── 2.9  performance/  ────────────────────────────────────────────────────────

const AppraisalTemplate           = require('../modules/performance/models/AppraisalTemplate')(sequelize, DataTypes);
const AppraisalCycle              = require('../modules/performance/models/AppraisalCycle')(sequelize, DataTypes);
const Appraisal                   = require('../modules/performance/models/Appraisal')(sequelize, DataTypes);
const Goal                        = require('../modules/performance/models/Goal')(sequelize, DataTypes);
const EmployeePerformanceFeedback = require('../modules/performance/models/EmployeePerformanceFeedback')(sequelize, DataTypes);


// ─────────────────────────────────────────────────────────────────────────────
//  3. ASSOCIATIONS
//
//  Format for every block:
//    // ChildModel.belongsTo(ParentModel) — FK lives on ChildModel
//    // ParentModel.hasMany / hasOne(ChildModel) — mirror (no new column)
//
//  Alias convention:
//    belongsTo  → singular camelCase  e.g. as: 'company', as: 'approver'
//    hasMany    → plural  camelCase   e.g. as: 'branches', as: 'employees'
//    hasOne     → singular camelCase  e.g. as: 'separation', as: 'jobOffer'
//    belongsToMany → plural camelCase e.g. as: 'roles', as: 'users'
// ─────────────────────────────────────────────────────────────────────────────


// ═════════════════════════════════════════════════════════════════════════════
//  3.1  ROLE MODULE
//       Declared first — User must exist before Employee references userId.
// ═════════════════════════════════════════════════════════════════════════════

// ── RoleProfile ↔ Role  (M:M via RoleProfileRole junction) ───────────────────
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

// ── User ↔ Role  (M:M via UserRole junction) ─────────────────────────────────
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

// ── User → RoleProfile  (optional default-template FK on User) ───────────────
User.belongsTo(RoleProfile, { foreignKey: 'roleProfileId', as: 'roleProfile' });
RoleProfile.hasMany(User,   { foreignKey: 'roleProfileId', as: 'users' });

// ── RolePermission → Role ─────────────────────────────────────────────────────
RolePermission.belongsTo(Role, { foreignKey: 'roleId', allowNull: false, as: 'role' });
Role.hasMany(RolePermission,   { foreignKey: 'roleId',                   as: 'permissions' });

// ── UserPermission → User ─────────────────────────────────────────────────────
UserPermission.belongsTo(User, { foreignKey: 'userId', allowNull: false, as: 'user' });
User.hasMany(UserPermission,   { foreignKey: 'userId',                   as: 'permissions' });

// ── UserSession → User ────────────────────────────────────────────────────────
UserSession.belongsTo(User, { foreignKey: 'userId', allowNull: false, as: 'user' });
User.hasMany(UserSession,   { foreignKey: 'userId',                   as: 'sessions' });

// ── LoginAttempt → User  (nullable — failed attempts may have no resolved user) ──
LoginAttempt.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(LoginAttempt,   { foreignKey: 'userId', as: 'loginAttempts' });


// ═════════════════════════════════════════════════════════════════════════════
//  3.2  ORGANIZATION MODULE
// ═════════════════════════════════════════════════════════════════════════════

// ── Company self-reference (parent / subsidiary tree) ────────────────────────
Company.belongsTo(Company, { foreignKey: 'parentCompanyId', as: 'parentCompany' });
Company.hasMany(Company,   { foreignKey: 'parentCompanyId', as: 'subsidiaries' });

// ── Branch → Company ──────────────────────────────────────────────────────────
Branch.belongsTo(Company, { foreignKey: 'companyId', allowNull: false, as: 'company' });
Company.hasMany(Branch,   { foreignKey: 'companyId',                   as: 'branches' });

// ── Department → Company  +  Department self-reference (tree) ────────────────
Department.belongsTo(Company,    { foreignKey: 'companyId',        allowNull: false, as: 'company' });
Company.hasMany(Department,      { foreignKey: 'companyId',                          as: 'departments' });
Department.belongsTo(Department, { foreignKey: 'parentDepartmentId',                 as: 'parentDepartment' });
Department.hasMany(Department,   { foreignKey: 'parentDepartmentId',                 as: 'subDepartments' });

// ── Designation → Company ─────────────────────────────────────────────────────
Designation.belongsTo(Company, { foreignKey: 'companyId', allowNull: false, as: 'company' });
Company.hasMany(Designation,   { foreignKey: 'companyId',                   as: 'designations' });

// ── EmploymentType → Company ──────────────────────────────────────────────────
EmploymentType.belongsTo(Company, { foreignKey: 'companyId', allowNull: false, as: 'company' });
Company.hasMany(EmploymentType,   { foreignKey: 'companyId',                   as: 'employmentTypes' });

// ── EmployeeGrade → Company  (default policy for this grade) ────
EmployeeGrade.belongsTo(Company,     { foreignKey: 'companyId',         allowNull: false, as: 'company' });
Company.hasMany(EmployeeGrade,       { foreignKey: 'companyId',                           as: 'employeeGrades' });


// ═════════════════════════════════════════════════════════════════════════════
//  3.3  DOCUMENT MODULE
// ═════════════════════════════════════════════════════════════════════════════

// ── Document → DocumentType ───────────────────────────────────────────────────
Document.belongsTo(DocumentType, { foreignKey: 'documentTypeId', allowNull: false, as: 'documentType' });
DocumentType.hasMany(Document,   { foreignKey: 'documentTypeId',                   as: 'documents' });

// ── Document → Employee (uploader) ───────────────────────────────────────────
Document.belongsTo(Employee, { foreignKey: 'uploadedById', as: 'uploadedBy' });
Employee.hasMany(Document,   { foreignKey: 'uploadedById', as: 'uploadedDocuments' });

// ── Document → Company (owner entity — documents can belong to a company, not just an employee) ─
Document.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });
Company.hasMany(Document,   { foreignKey: 'companyId', as: 'documents' });

// ── DocumentVersion → Document ────────────────────────────────────────────────
DocumentVersion.belongsTo(Document, { foreignKey: 'documentId', allowNull: false, as: 'document' });
Document.hasMany(DocumentVersion,   { foreignKey: 'documentId',                   as: 'versions' });

// ── DocumentVersion → Employee (who uploaded this specific version) ───────────
DocumentVersion.belongsTo(Employee, { foreignKey: 'uploadedById', as: 'uploadedBy' });
Employee.hasMany(DocumentVersion,   { foreignKey: 'uploadedById', as: 'documentVersions' });


// ═════════════════════════════════════════════════════════════════════════════
//  3.4  EMPLOYEE MODULE
// ═════════════════════════════════════════════════════════════════════════════

// ── Employee → User  (ERP login account for this employee) ───────────────────
Employee.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasOne(Employee,    { foreignKey: 'userId', as: 'employee' });

// ── Employee → organization masters ──────────────────────────────────────────
Employee.belongsTo(Company,        { foreignKey: 'companyId',        allowNull: false, as: 'company' });
Employee.belongsTo(Branch,         { foreignKey: 'branchId',                           as: 'branch' });
Employee.belongsTo(Department,     { foreignKey: 'departmentId',                       as: 'department' });
Employee.belongsTo(Designation,    { foreignKey: 'designationId',                      as: 'designation' });
Employee.belongsTo(EmploymentType, { foreignKey: 'employmentTypeId',                   as: 'employmentType' });
Employee.belongsTo(EmployeeGrade,  { foreignKey: 'employeeGradeId',                    as: 'employeeGrade' });
Employee.belongsTo(RoleProfile,    { foreignKey: 'roleProfileId',                      as: 'roleProfile' });

// ── Reverse: organization masters → Employee ──────────────────────────────────
Company.hasMany(Employee,        { foreignKey: 'companyId',        as: 'employees' });
Branch.hasMany(Employee,         { foreignKey: 'branchId',         as: 'employees' });
Department.hasMany(Employee,     { foreignKey: 'departmentId',     as: 'employees' });
Designation.hasMany(Employee,    { foreignKey: 'designationId',    as: 'employees' });
EmploymentType.hasMany(Employee, { foreignKey: 'employmentTypeId', as: 'employees' });
EmployeeGrade.hasMany(Employee,  { foreignKey: 'employeeGradeId',  as: 'employees' });
RoleProfile.hasMany(Employee,    { foreignKey: 'roleProfileId',    as: 'employees' });

// ── Employee self-reference (reporting line) ──────────────────────────────────
Employee.belongsTo(Employee, { foreignKey: 'reportsToId', as: 'reportsTo' });
Employee.hasMany(Employee,   { foreignKey: 'reportsToId', as: 'directReports' });
// ── EmployeePromotion → Employee  +  optional FK to approver ─────────────────
EmployeePromotion.belongsTo(Employee, { foreignKey: 'employeeId',  allowNull: false, as: 'employee' });
EmployeePromotion.belongsTo(Employee, { foreignKey: 'approvedById',                  as: 'approvedBy' });
Employee.hasMany(EmployeePromotion,   { foreignKey: 'employeeId',                    as: 'promotions' });
Employee.hasMany(EmployeePromotion,   { foreignKey: 'approvedById',                  as: 'approvedPromotions' });

// ── EmployeeSeparation → Employee + optional FK to approver ──────────────────
EmployeeSeparation.belongsTo(Employee, { foreignKey: 'employeeId',  allowNull: false, as: 'employee' });
EmployeeSeparation.belongsTo(Employee, { foreignKey: 'approvedById',                  as: 'approvedBy' });
Employee.hasMany(EmployeeSeparation,   { foreignKey: 'employeeId',                    as: 'separations' });
Employee.hasMany(EmployeeSeparation,   { foreignKey: 'approvedById',                  as: 'approvedSeparations' });

// ── EmployeeSkillMap → Employee ───────────────────────────────────────────────
//    hasMany — an employee may accumulate many skill records over time.
EmployeeSkillMap.belongsTo(Employee, { foreignKey: 'employeeId', allowNull: false, as: 'employee' });
Employee.hasMany(EmployeeSkillMap,   { foreignKey: 'employeeId',                   as: 'skillMaps' });

// ── EmployeeEducation → Employee ──────────────────────────────────────────────
EmployeeEducation.belongsTo(Employee, { foreignKey: 'employeeId', allowNull: false, as: 'employee' });
Employee.hasMany(EmployeeEducation,   { foreignKey: 'employeeId',                   as: 'educationHistory' });

// ── EmployeeExternalWork → Employee ──────────────────────────────────────────
EmployeeExternalWork.belongsTo(Employee, { foreignKey: 'employeeId', allowNull: false, as: 'employee' });
Employee.hasMany(EmployeeExternalWork,   { foreignKey: 'employeeId',                   as: 'externalWorkHistory' });

// ── EmployeeEmergencyContact → Employee ──────────────────────────────────────
EmployeeEmergencyContact.belongsTo(Employee, { foreignKey: 'employeeId', allowNull: false, as: 'employee' });
Employee.hasMany(EmployeeEmergencyContact,   { foreignKey: 'employeeId',                   as: 'emergencyContacts' });

// ═════════════════════════════════════════════════════════════════════════════
//  3.6  LEAVE MODULE
// ═════════════════════════════════════════════════════════════════════════════

// ── LeaveBlockList → Company  (block list is scoped to a company) ─────────────
LeaveBlockList.belongsTo(Company, { foreignKey: 'companyId', allowNull: false, as: 'company' });
Company.hasMany(LeaveBlockList,   { foreignKey: 'companyId',                   as: 'leaveBlockLists' });

// ── LeaveApplication → Employee (applicant & approver) + LeaveType + HolidayList ──
LeaveApplication.belongsTo(Employee,    { foreignKey: 'employeeId',   allowNull: false, as: 'applicant' });
LeaveApplication.belongsTo(Employee,    { foreignKey: 'approverId',                     as: 'approver' });
LeaveApplication.belongsTo(LeaveType,   { foreignKey: 'leaveTypeId',  allowNull: false, as: 'leaveType' });
LeaveApplication.belongsTo(HolidayList, { foreignKey: 'holidayListId',                  as: 'holidayList' });
Employee.hasMany(LeaveApplication,      { foreignKey: 'employeeId',                     as: 'leaveApplications' });
Employee.hasMany(LeaveApplication,      { foreignKey: 'approverId',                     as: 'approvedLeaveApplications' });
LeaveType.hasMany(LeaveApplication,     { foreignKey: 'leaveTypeId',                    as: 'applications' });
HolidayList.hasMany(LeaveApplication,   { foreignKey: 'holidayListId',                  as: 'leaveApplications' });

// ── CompensatoryLeaveRequest → Employee + LeaveType ───────────────────────────
CompensatoryLeaveRequest.belongsTo(Employee,  { foreignKey: 'employeeId',  allowNull: false, as: 'employee' });
CompensatoryLeaveRequest.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', allowNull: false, as: 'leaveType' });
Employee.hasMany(CompensatoryLeaveRequest,    { foreignKey: 'employeeId',                    as: 'compensatoryLeaveRequests' });
LeaveType.hasMany(CompensatoryLeaveRequest,   { foreignKey: 'leaveTypeId',                   as: 'compensatoryRequests' });

// ── LeaveEncashment → Employee + LeaveType + LeavePeriod ─────────────────────
LeaveEncashment.belongsTo(Employee,    { foreignKey: 'employeeId',    allowNull: false, as: 'employee' });
LeaveEncashment.belongsTo(LeaveType,   { foreignKey: 'leaveTypeId',   allowNull: false, as: 'leaveType' });
LeaveEncashment.belongsTo(LeavePeriod, { foreignKey: 'leavePeriodId', allowNull: false, as: 'leavePeriod' });
Employee.hasMany(LeaveEncashment,      { foreignKey: 'employeeId',                      as: 'leaveEncashments' });
LeaveType.hasMany(LeaveEncashment,     { foreignKey: 'leaveTypeId',                     as: 'encashments' });
LeavePeriod.hasMany(LeaveEncashment,   { foreignKey: 'leavePeriodId',                   as: 'leaveEncashments' });

// ── LeaveLedgerEntry → Employee + LeaveType ───────────────────────────────────
//    voucherType + voucherNo are plain string columns (polymorphic reference —
//    not FK-constrained) so no Sequelize association is declared for them.
LeaveLedgerEntry.belongsTo(Employee,  { foreignKey: 'employeeId',  allowNull: false, as: 'employee' });
LeaveLedgerEntry.belongsTo(LeaveType, { foreignKey: 'leaveTypeId', allowNull: false, as: 'leaveType' });
Employee.hasMany(LeaveLedgerEntry,    { foreignKey: 'employeeId',                    as: 'leaveLedgerEntries' });
LeaveType.hasMany(LeaveLedgerEntry,   { foreignKey: 'leaveTypeId',                   as: 'ledgerEntries' });


// ═════════════════════════════════════════════════════════════════════════════
//  3.7  PAYROLL MODULE
// ═════════════════════════════════════════════════════════════════════════════

// ── IncomeTaxSlab → PayrollPeriod ─────────────────────────────────────────────
IncomeTaxSlab.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', allowNull: false, as: 'payrollPeriod' });
PayrollPeriod.hasMany(IncomeTaxSlab,   { foreignKey: 'payrollPeriodId',                   as: 'incomeTaxSlabs' });

// ── SalaryStructure → Company ─────────────────────────────────────────────────
SalaryStructure.belongsTo(Company, { foreignKey: 'companyId', allowNull: false, as: 'company' });
Company.hasMany(SalaryStructure,   { foreignKey: 'companyId',                   as: 'salaryStructures' });

// ── SalaryStructureAssignment → Employee + SalaryStructure ───────────────────
SalaryStructureAssignment.belongsTo(Employee,        { foreignKey: 'employeeId',        allowNull: false, as: 'employee' });
SalaryStructureAssignment.belongsTo(SalaryStructure, { foreignKey: 'salaryStructureId', allowNull: false, as: 'salaryStructure' });
Employee.hasMany(SalaryStructureAssignment,          { foreignKey: 'employeeId',                          as: 'salaryStructureAssignments' });
SalaryStructure.hasMany(SalaryStructureAssignment,   { foreignKey: 'salaryStructureId',                   as: 'assignments' });

// ── PayrollEntry → PayrollPeriod + Company ────────────────────────────────────
PayrollEntry.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', allowNull: false, as: 'payrollPeriod' });
PayrollEntry.belongsTo(Company,       { foreignKey: 'companyId',        allowNull: false, as: 'company' });
PayrollPeriod.hasMany(PayrollEntry,   { foreignKey: 'payrollPeriodId',                    as: 'payrollEntries' });
Company.hasMany(PayrollEntry,         { foreignKey: 'companyId',                          as: 'payrollEntries' });

// ── SalarySlip → Employee + SalaryStructure + PayrollEntry + PayrollPeriod ────
SalarySlip.belongsTo(Employee,        { foreignKey: 'employeeId',        allowNull: false, as: 'employee' });
SalarySlip.belongsTo(SalaryStructure, { foreignKey: 'salaryStructureId', allowNull: false, as: 'salaryStructure' });
SalarySlip.belongsTo(PayrollEntry,    { foreignKey: 'payrollEntryId',                      as: 'payrollEntry' });
SalarySlip.belongsTo(PayrollPeriod,   { foreignKey: 'payrollPeriodId',   allowNull: false, as: 'payrollPeriod' });
Employee.hasMany(SalarySlip,          { foreignKey: 'employeeId',                          as: 'salarySlips' });
SalaryStructure.hasMany(SalarySlip,   { foreignKey: 'salaryStructureId',                   as: 'salarySlips' });
PayrollEntry.hasMany(SalarySlip,      { foreignKey: 'payrollEntryId',                      as: 'salarySlips' });
PayrollPeriod.hasMany(SalarySlip,     { foreignKey: 'payrollPeriodId',                     as: 'salarySlips' });

// ── AdditionalSalary → Employee + SalaryComponent ────────────────────────────
AdditionalSalary.belongsTo(Employee,        { foreignKey: 'employeeId',        allowNull: false, as: 'employee' });
AdditionalSalary.belongsTo(SalaryComponent, { foreignKey: 'salaryComponentId', allowNull: false, as: 'salaryComponent' });
Employee.hasMany(AdditionalSalary,          { foreignKey: 'employeeId',                          as: 'additionalSalaries' });
SalaryComponent.hasMany(AdditionalSalary,   { foreignKey: 'salaryComponentId',                   as: 'additionalSalaries' });

// ── RetentionBonus → Employee + SalaryComponent ───────────────────────────────
RetentionBonus.belongsTo(Employee,        { foreignKey: 'employeeId',        allowNull: false, as: 'employee' });
RetentionBonus.belongsTo(SalaryComponent, { foreignKey: 'salaryComponentId', allowNull: false, as: 'salaryComponent' });
Employee.hasMany(RetentionBonus,          { foreignKey: 'employeeId',                          as: 'retentionBonuses' });
SalaryComponent.hasMany(RetentionBonus,   { foreignKey: 'salaryComponentId',                   as: 'retentionBonuses' });

// ── EmployeeIncentive → Employee + SalaryComponent ───────────────────────────
EmployeeIncentive.belongsTo(Employee,        { foreignKey: 'employeeId',        allowNull: false, as: 'employee' });
EmployeeIncentive.belongsTo(SalaryComponent, { foreignKey: 'salaryComponentId', allowNull: false, as: 'salaryComponent' });
Employee.hasMany(EmployeeIncentive,          { foreignKey: 'employeeId',                          as: 'incentives' });
SalaryComponent.hasMany(EmployeeIncentive,   { foreignKey: 'salaryComponentId',                   as: 'incentives' });

// ── EmployeeTaxExemptionDeclaration → Employee + PayrollPeriod ───────────────
EmployeeTaxExemptionDeclaration.belongsTo(Employee,      { foreignKey: 'employeeId',      allowNull: false, as: 'employee' });
EmployeeTaxExemptionDeclaration.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', allowNull: false, as: 'payrollPeriod' });
Employee.hasMany(EmployeeTaxExemptionDeclaration,        { foreignKey: 'employeeId',                        as: 'taxExemptionDeclarations' });
PayrollPeriod.hasMany(EmployeeTaxExemptionDeclaration,   { foreignKey: 'payrollPeriodId',                   as: 'taxExemptionDeclarations' });

// ── EmployeeTaxExemptionProofSubmission → Employee + PayrollPeriod ────────────
EmployeeTaxExemptionProofSubmission.belongsTo(Employee,      { foreignKey: 'employeeId',      allowNull: false, as: 'employee' });
EmployeeTaxExemptionProofSubmission.belongsTo(PayrollPeriod, { foreignKey: 'payrollPeriodId', allowNull: false, as: 'payrollPeriod' });
Employee.hasMany(EmployeeTaxExemptionProofSubmission,        { foreignKey: 'employeeId',                        as: 'taxExemptionProofSubmissions' });
PayrollPeriod.hasMany(EmployeeTaxExemptionProofSubmission,   { foreignKey: 'payrollPeriodId',                   as: 'taxExemptionProofSubmissions' });


// ═════════════════════════════════════════════════════════════════════════════
//  3.8  RECRUITMENT MODULE
// ═════════════════════════════════════════════════════════════════════════════

// ── JobRequisition → Department + Designation + Company + EmploymentType ──────
JobRequisition.belongsTo(Department,     { foreignKey: 'departmentId',     allowNull: false, as: 'department' });
JobRequisition.belongsTo(Designation,    { foreignKey: 'designationId',    allowNull: false, as: 'designation' });
JobRequisition.belongsTo(Company,        { foreignKey: 'companyId',        allowNull: false, as: 'company' });
JobRequisition.belongsTo(EmploymentType, { foreignKey: 'employmentTypeId',                   as: 'employmentType' });
JobRequisition.belongsTo(EmployeeGrade,  { foreignKey: 'employeeGradeId',                    as: 'employeeGrade' });
Department.hasMany(JobRequisition,       { foreignKey: 'departmentId',                        as: 'jobRequisitions' });
Designation.hasMany(JobRequisition,      { foreignKey: 'designationId',                       as: 'jobRequisitions' });
Company.hasMany(JobRequisition,          { foreignKey: 'companyId',                           as: 'jobRequisitions' });
EmploymentType.hasMany(JobRequisition,   { foreignKey: 'employmentTypeId',                    as: 'jobRequisitions' });
EmployeeGrade.hasMany(JobRequisition,    { foreignKey: 'employeeGradeId',                     as: 'jobRequisitions' });

// ── JobRequisition → Employee (requester, HR manager, GM approver) ────────────
JobRequisition.belongsTo(Employee, { foreignKey: 'requestedById', allowNull: false, as: 'requestedBy' });
JobRequisition.belongsTo(Employee, { foreignKey: 'hrManagerId',                     as: 'hrManager' });
JobRequisition.belongsTo(Employee, { foreignKey: 'gmId',                            as: 'generalManager' });
Employee.hasMany(JobRequisition,   { foreignKey: 'requestedById',                   as: 'jobRequisitions' });
Employee.hasMany(JobRequisition,   { foreignKey: 'hrManagerId',                     as: 'managedJobRequisitions' });
Employee.hasMany(JobRequisition,   { foreignKey: 'gmId',                            as: 'approvedJobRequisitions' });

// ── StaffingPlan → Department + Designation + Company ────────────────────────
StaffingPlan.belongsTo(Department,  { foreignKey: 'departmentId',  as: 'department' });
StaffingPlan.belongsTo(Designation, { foreignKey: 'designationId', as: 'designation' });
StaffingPlan.belongsTo(Company,     { foreignKey: 'companyId',     as: 'company' });
Department.hasMany(StaffingPlan,    { foreignKey: 'departmentId',  as: 'staffingPlans' });
Designation.hasMany(StaffingPlan,   { foreignKey: 'designationId', as: 'staffingPlans' });
Company.hasMany(StaffingPlan,       { foreignKey: 'companyId',     as: 'staffingPlans' });

// ── JobOpening → JobRequisition + StaffingPlan + Department + Designation ─────
JobOpening.belongsTo(JobRequisition, { foreignKey: 'requisitionId',   as: 'requisition' });
JobOpening.belongsTo(StaffingPlan,   { foreignKey: 'staffingPlanId',  as: 'staffingPlan' });
JobOpening.belongsTo(Department,     { foreignKey: 'departmentId',    as: 'department' });
JobOpening.belongsTo(Designation,    { foreignKey: 'designationId',   as: 'designation' });
JobRequisition.hasOne(JobOpening,    { foreignKey: 'requisitionId',   as: 'jobOpening' });
StaffingPlan.hasMany(JobOpening,     { foreignKey: 'staffingPlanId',  as: 'jobOpenings' });
Department.hasMany(JobOpening,       { foreignKey: 'departmentId',    as: 'jobOpenings' });
Designation.hasMany(JobOpening,      { foreignKey: 'designationId',   as: 'jobOpenings' });

// ── EmployeeReferral → Employee (referrer) + JobOpening ───────────────────────
EmployeeReferral.belongsTo(Employee,   { foreignKey: 'referrerId',    allowNull: false, as: 'referrer' });
EmployeeReferral.belongsTo(JobOpening, { foreignKey: 'jobOpeningId',  allowNull: false, as: 'jobOpening' });
Employee.hasMany(EmployeeReferral,     { foreignKey: 'referrerId',                      as: 'referrals' });
JobOpening.hasMany(EmployeeReferral,   { foreignKey: 'jobOpeningId',                    as: 'referrals' });

// ── JobApplicant → JobOpening + EmployeeReferral (nullable) ───────────────────
JobApplicant.belongsTo(JobOpening,       { foreignKey: 'jobOpeningId',       allowNull: false, as: 'jobOpening' });
JobApplicant.belongsTo(EmployeeReferral, { foreignKey: 'employeeReferralId',               as: 'referral' });
JobOpening.hasMany(JobApplicant,         { foreignKey: 'jobOpeningId',                      as: 'applicants' });
EmployeeReferral.hasMany(JobApplicant,   { foreignKey: 'employeeReferralId',                as: 'applicants' });

// ── Interview → JobApplicant + JobOpening + Employee (interviewer) ─────────────
Interview.belongsTo(JobApplicant, { foreignKey: 'jobApplicantId', allowNull: false, as: 'jobApplicant' });
Interview.belongsTo(JobOpening,   { foreignKey: 'jobOpeningId',   allowNull: false, as: 'jobOpening' });
Interview.belongsTo(Employee,     { foreignKey: 'interviewerId',  allowNull: false, as: 'interviewer' });
JobApplicant.hasMany(Interview,   { foreignKey: 'jobApplicantId',                   as: 'interviews' });
JobOpening.hasMany(Interview,     { foreignKey: 'jobOpeningId',                     as: 'interviews' });
Employee.hasMany(Interview,       { foreignKey: 'interviewerId',                    as: 'conductedInterviews' });

// ── InterviewFeedback → Interview + Employee (feedback author) ─────────────────
InterviewFeedback.belongsTo(Interview, { foreignKey: 'interviewId', allowNull: false, as: 'interview' });
InterviewFeedback.belongsTo(Employee,  { foreignKey: 'reviewerId',  allowNull: false, as: 'reviewer' });
Interview.hasMany(InterviewFeedback,   { foreignKey: 'interviewId',                   as: 'feedbacks' });
Employee.hasMany(InterviewFeedback,    { foreignKey: 'reviewerId',                    as: 'interviewFeedbacks' });

// ── JobOffer → JobApplicant + JobOpening + Designation ────────────────────────
JobOffer.belongsTo(JobApplicant, { foreignKey: 'jobApplicantId', allowNull: false, as: 'jobApplicant' });
JobOffer.belongsTo(JobOpening,   { foreignKey: 'jobOpeningId',   allowNull: false, as: 'jobOpening' });
JobOffer.belongsTo(Designation,  { foreignKey: 'designationId',                    as: 'designation' });
JobApplicant.hasOne(JobOffer,    { foreignKey: 'jobApplicantId',                   as: 'jobOffer' });
JobOpening.hasMany(JobOffer,     { foreignKey: 'jobOpeningId',                     as: 'jobOffers' });
Designation.hasMany(JobOffer,    { foreignKey: 'designationId',                    as: 'jobOffers' });

// ── AppointmentLetter → JobApplicant + JobOffer ───────────────────────────────
AppointmentLetter.belongsTo(JobApplicant, { foreignKey: 'jobApplicantId', allowNull: false, as: 'jobApplicant' });
AppointmentLetter.belongsTo(JobOffer,     { foreignKey: 'jobOfferId',     allowNull: false, as: 'jobOffer' });
JobApplicant.hasOne(AppointmentLetter,    { foreignKey: 'jobApplicantId',                   as: 'appointmentLetter' });
JobOffer.hasOne(AppointmentLetter,        { foreignKey: 'jobOfferId',                        as: 'appointmentLetter' });


// ═════════════════════════════════════════════════════════════════════════════
//  3.9  PERFORMANCE MODULE
// ═════════════════════════════════════════════════════════════════════════════

// ── AppraisalCycle → AppraisalTemplate ───────────────────────────────────────
AppraisalCycle.belongsTo(AppraisalTemplate, { foreignKey: 'appraisalTemplateId', allowNull: false, as: 'appraisalTemplate' });
AppraisalTemplate.hasMany(AppraisalCycle,   { foreignKey: 'appraisalTemplateId',                   as: 'appraisalCycles' });

// ── Appraisal → Employee + AppraisalCycle + AppraisalTemplate ────────────────
Appraisal.belongsTo(Employee,          { foreignKey: 'employeeId',          allowNull: false, as: 'employee' });
Appraisal.belongsTo(AppraisalCycle,    { foreignKey: 'appraisalCycleId',    allowNull: false, as: 'appraisalCycle' });
Appraisal.belongsTo(AppraisalTemplate, { foreignKey: 'appraisalTemplateId', allowNull: false, as: 'appraisalTemplate' });
Employee.hasMany(Appraisal,            { foreignKey: 'employeeId',                            as: 'appraisals' });
AppraisalCycle.hasMany(Appraisal,      { foreignKey: 'appraisalCycleId',                      as: 'appraisals' });
AppraisalTemplate.hasMany(Appraisal,   { foreignKey: 'appraisalTemplateId',                   as: 'appraisals' });

// ── Goal → Appraisal + Employee + Goal self-reference (sub-goals) ─────────────
Goal.belongsTo(Appraisal, { foreignKey: 'appraisalId', allowNull: false, as: 'appraisal' });
Goal.belongsTo(Employee,  { foreignKey: 'employeeId',  allowNull: false, as: 'employee' });
Goal.belongsTo(Goal,      { foreignKey: 'parentGoalId',                  as: 'parentGoal' });
Goal.hasMany(Goal,        { foreignKey: 'parentGoalId',                  as: 'subGoals' });
Appraisal.hasMany(Goal,   { foreignKey: 'appraisalId',                   as: 'goals' });
Employee.hasMany(Goal,    { foreignKey: 'employeeId',                    as: 'goals' });

// ── EmployeePerformanceFeedback → Appraisal + Employee (reviewee & reviewer) ──
EmployeePerformanceFeedback.belongsTo(Appraisal, { foreignKey: 'appraisalId', allowNull: false, as: 'appraisal' });
EmployeePerformanceFeedback.belongsTo(Employee,  { foreignKey: 'revieweeId',  allowNull: false, as: 'reviewee' });
EmployeePerformanceFeedback.belongsTo(Employee,  { foreignKey: 'reviewerId',  allowNull: false, as: 'reviewer' });
Appraisal.hasMany(EmployeePerformanceFeedback,   { foreignKey: 'appraisalId',                   as: 'feedbacks' });
Employee.hasMany(EmployeePerformanceFeedback,    { foreignKey: 'revieweeId',                    as: 'receivedFeedbacks' });
Employee.hasMany(EmployeePerformanceFeedback,    { foreignKey: 'reviewerId',                    as: 'givenFeedbacks' });


// ─────────────────────────────────────────────────────────────────────────────
//  4. EXPORTS
//
//  Export the sequelize instance + Sequelize class + every model by name,
//  grouped by module in the same order as the imports above.
//  Controllers and services destructure only what they need:
//    const { Employee, Department, LeaveApplication } = require('../../models');
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  sequelize,
  Sequelize,

  // ── role ──────────────────────────────────────────────────────────────────
  Role,
  RoleProfile,
  RoleProfileRole,
  RolePermission,
  User,
  UserRole,
  UserPermission,
  UserSession,
  LoginAttempt,

  // ── organization ──────────────────────────────────────────────────────────
  Company,
  Branch,
  Department,
  Designation,
  EmploymentType,
  EmployeeGrade,

  // ── document ──────────────────────────────────────────────────────────────
  DocumentType,
  Document,
  DocumentVersion,

  // ── employee ──────────────────────────────────────────────────────────────
  Employee,
  EmployeePromotion,
  EmployeeSeparation,
  EmployeeSkillMap,
  EmployeeEducation,
  EmployeeExternalWork,
  EmployeeEmergencyContact,

  // ── leave ─────────────────────────────────────────────────────────────────
  HolidayList,
  LeaveType,
  LeavePeriod,
  LeaveBlockList,

  LeaveApplication,
  CompensatoryLeaveRequest,
  LeaveEncashment,
  LeaveLedgerEntry,

  // ── payroll ───────────────────────────────────────────────────────────────
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

  // ── recruitment ───────────────────────────────────────────────────────────
  JobRequisition,
  StaffingPlan,
  JobOpening,
  JobApplicant,
  EmployeeReferral,
  Interview,
  InterviewFeedback,
  JobOffer,
  AppointmentLetter,

  // ── performance ───────────────────────────────────────────────────────────
  AppraisalTemplate,
  AppraisalCycle,
  Appraisal,
  Goal,
  EmployeePerformanceFeedback,
};