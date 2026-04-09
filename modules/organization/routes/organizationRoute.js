'use strict';

const express                  = require('express');
const organizationController   = require('../controllers/organizationController');
const { authenticate }         = require('../../../middleware/authenticate');
const { authorize }            = require('../../../middleware/authorize');

const router = express.Router();

// All organization routes require a valid JWT
router.use(authenticate);

// ══════════════════════════════════════════════
//  COMPANY  —  /companies
// ══════════════════════════════════════════════

/**
 * @route   GET  /companies/tree
 * @desc    Full recursive company group tree
 * @query   rootId? — start from a specific company (default: all root companies)
 * @access  canRead on organization/Company
 */
router.get(
  '/companies/tree',
  authorize('organization', 'Company', 'canRead'),
  organizationController.getCompanyTree,
);

router
  .route('/companies')
  /**
   * @route   GET /companies
   * @query   includeDisabled?, parentCompanyId?
   */
  .get(
    authorize('organization', 'Company', 'canRead'),
    organizationController.getAllCompanies,
  )
  /**
   * @route   POST /companies
   * @body    { name, abbreviation, defaultCurrency, country,
   *            parentCompanyId?, taxId?, phone?, email?,
   *            address?, website?, dateOfEstablishment? }
   */
  .post(
    authorize('organization', 'Company', 'canCreate'),
    organizationController.createCompany,
  );

router
  .route('/companies/:id')
  .get(
    authorize('organization', 'Company', 'canRead'),
    organizationController.getCompanyById,
  )
  .patch(
    authorize('organization', 'Company', 'canWrite'),
    organizationController.updateCompany,
  )
  .delete(
    authorize('organization', 'Company', 'canDelete'),
    organizationController.deleteCompany,
  );

// ══════════════════════════════════════════════
//  BRANCH  —  /branches
// ══════════════════════════════════════════════

router
  .route('/branches')
  /**
   * @query   companyId?, includeDisabled?
   */
  .get(
    authorize('organization', 'Branch', 'canRead'),
    organizationController.getAllBranches,
  )
  /**
   * @body    { name, companyId }
   */
  .post(
    authorize('organization', 'Branch', 'canCreate'),
    organizationController.createBranch,
  );

router
  .route('/branches/:id')
  .get(
    authorize('organization', 'Branch', 'canRead'),
    organizationController.getBranchById,
  )
  .patch(
    authorize('organization', 'Branch', 'canWrite'),
    organizationController.updateBranch,
  )
  .delete(
    authorize('organization', 'Branch', 'canDelete'),
    organizationController.deleteBranch,
  );

// ══════════════════════════════════════════════
//  DEPARTMENT  —  /departments
// ══════════════════════════════════════════════

/**
 * @route   GET /departments/tree
 * @query   companyId (required) — recursive tree within one company
 */
router.get(
  '/departments/tree',
  authorize('organization', 'Department', 'canRead'),
  organizationController.getDepartmentTree,
);

router
  .route('/departments')
  /**
   * @query   companyId?, parentDepartmentId?, includeDisabled?
   */
  .get(
    authorize('organization', 'Department', 'canRead'),
    organizationController.getAllDepartments,
  )
  /**
   * @body    { name, companyId, parentDepartmentId? }
   */
  .post(
    authorize('organization', 'Department', 'canCreate'),
    organizationController.createDepartment,
  );

router
  .route('/departments/:id')
  .get(
    authorize('organization', 'Department', 'canRead'),
    organizationController.getDepartmentById,
  )
  .patch(
    authorize('organization', 'Department', 'canWrite'),
    organizationController.updateDepartment,
  )
  .delete(
    authorize('organization', 'Department', 'canDelete'),
    organizationController.deleteDepartment,
  );

// ══════════════════════════════════════════════
//  DESIGNATION  —  /designations
// ══════════════════════════════════════════════

router
  .route('/designations')
  /**
   * @query   includeDisabled?, search?
   */
  .get(
    authorize('organization', 'Designation', 'canRead'),
    organizationController.getAllDesignations,
  )
  /**
   * @body    { name, description? }
   */
  .post(
    authorize('organization', 'Designation', 'canCreate'),
    organizationController.createDesignation,
  );

router
  .route('/designations/:id')
  .get(
    authorize('organization', 'Designation', 'canRead'),
    organizationController.getDesignationById,
  )
  .patch(
    authorize('organization', 'Designation', 'canWrite'),
    organizationController.updateDesignation,
  )
  .delete(
    authorize('organization', 'Designation', 'canDelete'),
    organizationController.deleteDesignation,
  );

// ══════════════════════════════════════════════
//  EMPLOYMENT TYPE  —  /employment-types
// ══════════════════════════════════════════════

router
  .route('/employment-types')
  /**
   * @query   includeDisabled?
   */
  .get(
    authorize('organization', 'EmploymentType', 'canRead'),
    organizationController.getAllEmploymentTypes,
  )
  /**
   * @body    { name, description? }
   */
  .post(
    authorize('organization', 'EmploymentType', 'canCreate'),
    organizationController.createEmploymentType,
  );

router
  .route('/employment-types/:id')
  .get(
    authorize('organization', 'EmploymentType', 'canRead'),
    organizationController.getEmploymentTypeById,
  )
  .patch(
    authorize('organization', 'EmploymentType', 'canWrite'),
    organizationController.updateEmploymentType,
  )
  .delete(
    authorize('organization', 'EmploymentType', 'canDelete'),
    organizationController.deleteEmploymentType,
  );

// ══════════════════════════════════════════════
//  EMPLOYEE GRADE  —  /employee-grades
// ══════════════════════════════════════════════

router
  .route('/employee-grades')
  /**
   * @query   includeDisabled?
   */
  .get(
    authorize('organization', 'EmployeeGrade', 'canRead'),
    organizationController.getAllEmployeeGrades,
  )
  /**
   * @body    { name, description?, defaultLeavePolicyId? }
   */
  .post(
    authorize('organization', 'EmployeeGrade', 'canCreate'),
    organizationController.createEmployeeGrade,
  );

router
  .route('/employee-grades/:id')
  .get(
    authorize('organization', 'EmployeeGrade', 'canRead'),
    organizationController.getEmployeeGradeById,
  )
  .patch(
    authorize('organization', 'EmployeeGrade', 'canWrite'),
    organizationController.updateEmployeeGrade,
  )
  .delete(
    authorize('organization', 'EmployeeGrade', 'canDelete'),
    organizationController.deleteEmployeeGrade,
  );

module.exports = router;