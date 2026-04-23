'use strict';

const express                  = require('express');
const organizationController   = require('../controllers/organizationController');
const { authenticate }         = require('../../../middlewares/authMiddleware');
const { authorize }            = require('../../../middlewares/rbacMiddleware');

const router = express.Router();

// All organization routes require a valid JWT
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Organizations
 *     description: Organization management - Companies, branches, departments, and more
 */

// ══════════════════════════════════════════════
//  COMPANY  —  /organizations/companies
// ══════════════════════════════════════════════

/**
 * @swagger
 * /organizations/companies/tree:
 *   get:
 *     summary: Get full recursive company group tree
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rootId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Start from a specific company (default: all root companies)"
 *     responses:
 *       200:
 *         description: Company tree fetched successfully
 */
router.get(
  '/companies/tree',
  authorize('Company', 'canRead'),
  organizationController.getCompanyTree,
);

/**
 * @swagger
 * /organizations/companies:
 *   get:
 *     summary: Get all companies
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
 *         description: "Include disabled companies"
 *       - in: query
 *         name: parentCompanyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Filter by parent company"
 *     responses:
 *       200:
 *         description: Companies fetched successfully
 *   post:
 *     summary: Create a new company
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               abbreviation:
 *                 type: string
 *               defaultCurrency:
 *                 type: string
 *               country:
 *                 type: string
 *               parentCompanyId:
 *                 type: string
 *                 format: uuid
 *               taxId:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               address:
 *                 type: string
 *               website:
 *                 type: string
 *               dateOfEstablishment:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Company created successfully
 *       409:
 *         description: Company already exists
 */
router
  .route('/companies')
  .get(
    authorize('Company', 'canRead'),
    organizationController.getAllCompanies,
  )
  .post(
    authorize('Company', 'canCreate'),
    organizationController.createCompany,
  );

/**
 * @swagger
 * /organizations/companies/{id}:
 *   get:
 *     summary: Get a specific company by ID
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Company ID"
 *     responses:
 *       200:
 *         description: Company fetched successfully
 *       404:
 *         description: Company not found
 *   patch:
 *     summary: Update a company
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Company ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               abbreviation:
 *                 type: string
 *               defaultCurrency:
 *                 type: string
 *               country:
 *                 type: string
 *               parentCompanyId:
 *                 type: string
 *                 format: uuid
 *               taxId:
 *                 type: string
 *               phone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               website:
 *                 type: string
 *               disabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Company updated successfully
 *       404:
 *         description: Company not found
 *   delete:
 *     summary: Delete a company
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Company ID"
 *     responses:
 *       204:
 *         description: Company deleted successfully
 *       404:
 *         description: Company not found
 *       409:
 *         description: "Cannot delete - company has subsidiaries, branches, or departments"
 */
router
  .route('/companies/:id')
  .get(
    authorize('Company', 'canRead'),
    organizationController.getCompanyById,
  )
  .patch(
    authorize('Company', 'canWrite'),
    organizationController.updateCompany,
  )
  .delete(
    authorize('Company', 'canDelete'),
    organizationController.deleteCompany,
  );

// ══════════════════════════════════════════════
//  BRANCH  —  /organizations/branches
// ══════════════════════════════════════════════

/**
 * @swagger
 * /organizations/branches:
 *   get:
 *     summary: Get all branches
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Filter by company"
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
 *         description: "Include disabled branches"
 *     responses:
 *       200:
 *         description: Branches fetched successfully
 *   post:
 *     summary: Create a new branch
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, companyId]
 *             properties:
 *               name:
 *                 type: string
 *               companyId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Branch created successfully
 *       404:
 *         description: Company not found
 *       409:
 *         description: "Branch already exists in this company"
 */
router
  .route('/branches')
  .get(
    authorize('Branch', 'canRead'),
    organizationController.getAllBranches,
  )
  .post(
    authorize('Branch', 'canCreate'),
    organizationController.createBranch,
  );

/**
 * @swagger
 * /organizations/branches/{id}:
 *   get:
 *     summary: Get a specific branch by ID
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Branch ID"
 *     responses:
 *       200:
 *         description: Branch fetched successfully
 *       404:
 *         description: Branch not found
 *   patch:
 *     summary: Update a branch
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Branch ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               disabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Branch updated successfully
 *       404:
 *         description: Branch not found
 *   delete:
 *     summary: Delete a branch
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Branch ID"
 *     responses:
 *       204:
 *         description: Branch deleted successfully
 *       404:
 *         description: Branch not found
 *       409:
 *         description: "Cannot delete - employees assigned to this branch"
 */
router
  .route('/branches/:id')
  .get(
    authorize('Branch', 'canRead'),
    organizationController.getBranchById,
  )
  .patch(
    authorize('Branch', 'canWrite'),
    organizationController.updateBranch,
  )
  .delete(
    authorize('Branch', 'canDelete'),
    organizationController.deleteBranch,
  );

// ══════════════════════════════════════════════
//  DEPARTMENT  —  /organizations/departments
// ══════════════════════════════════════════════

/**
 * @swagger
 * /organizations/departments/tree:
 *   get:
 *     summary: Get recursive department tree within a company
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Company ID"
 *     responses:
 *       200:
 *         description: Department tree fetched successfully
 *       400:
 *         description: "companyId is required"
 */
router.get(
  '/departments/tree',
  authorize('Department', 'canRead'),
  organizationController.getDepartmentTree,
);

/**
 * @swagger
 * /organizations/departments:
 *   get:
 *     summary: Get all departments
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Filter by company"
 *       - in: query
 *         name: parentDepartmentId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Filter by parent department"
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
 *         description: "Include disabled departments"
 *     responses:
 *       200:
 *         description: Departments fetched successfully
 *   post:
 *     summary: Create a new department
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, companyId]
 *             properties:
 *               name:
 *                 type: string
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               parentDepartmentId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Department created successfully
 *       404:
 *         description: "Company or parent department not found"
 *       409:
 *         description: "Department already exists in this company"
 */
router
  .route('/departments')
  .get(
    authorize('Department', 'canRead'),
    organizationController.getAllDepartments,
  )
  .post(
    authorize('Department', 'canCreate'),
    organizationController.createDepartment,
  );

/**
 * @swagger
 * /organizations/departments/{id}:
 *   get:
 *     summary: Get a specific department by ID
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Department ID"
 *     responses:
 *       200:
 *         description: Department fetched successfully
 *       404:
 *         description: Department not found
 *   patch:
 *     summary: Update a department
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Department ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               parentDepartmentId:
 *                 type: string
 *                 format: uuid
 *               disabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Department updated successfully
 *       404:
 *         description: Department not found
 *   delete:
 *     summary: Delete a department
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Department ID"
 *     responses:
 *       204:
 *         description: Department deleted successfully
 *       404:
 *         description: Department not found
 *       409:
 *         description: "Cannot delete - department has sub-departments or employees"
 */
router
  .route('/departments/:id')
  .get(
    authorize('Department', 'canRead'),
    organizationController.getDepartmentById,
  )
  .patch(
    authorize('Department', 'canWrite'),
    organizationController.updateDepartment,
  )
  .delete(
    authorize('Department', 'canDelete'),
    organizationController.deleteDepartment,
  );

// ══════════════════════════════════════════════
//  DESIGNATION  —  /organizations/designations
// ══════════════════════════════════════════════

/**
 * @swagger
 * /organizations/designations:
 *   get:
 *     summary: Get all designations
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
 *         description: "Include disabled designations"
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: "Search by name"
 *     responses:
 *       200:
 *         description: Designations fetched successfully
 *   post:
 *     summary: Create a new designation
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Designation created successfully
 *       409:
 *         description: Designation already exists
 */
router
  .route('/designations')
  .get(
    authorize('Designation', 'canRead'),
    organizationController.getAllDesignations,
  )
  .post(
    authorize('Designation', 'canCreate'),
    organizationController.createDesignation,
  );

/**
 * @swagger
 * /organizations/designations/{id}:
 *   get:
 *     summary: Get a specific designation by ID
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Designation ID"
 *     responses:
 *       200:
 *         description: Designation fetched successfully
 *       404:
 *         description: Designation not found
 *   patch:
 *     summary: Update a designation
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Designation ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               disabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Designation updated successfully
 *       404:
 *         description: Designation not found
 *   delete:
 *     summary: Delete a designation
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Designation ID"
 *     responses:
 *       204:
 *         description: Designation deleted successfully
 *       404:
 *         description: Designation not found
 *       409:
 *         description: "Cannot delete - employees hold this designation"
 */
router
  .route('/designations/:id')
  .get(
    authorize('Designation', 'canRead'),
    organizationController.getDesignationById,
  )
  .patch(
    authorize('Designation', 'canWrite'),
    organizationController.updateDesignation,
  )
  .delete(
    authorize('Designation', 'canDelete'),
    organizationController.deleteDesignation,
  );

// ══════════════════════════════════════════════
//  EMPLOYMENT TYPE  —  /organizations/employment-types
// ══════════════════════════════════════════════

/**
 * @swagger
 * /organizations/employment-types:
 *   get:
 *     summary: Get all employment types
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
 *         description: "Include disabled employment types"
 *     responses:
 *       200:
 *         description: Employment types fetched successfully
 *   post:
 *     summary: Create a new employment type
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Employment type created successfully
 *       409:
 *         description: Employment type already exists
 */
router
  .route('/employment-types')
  .get(
    authorize('EmploymentType', 'canRead'),
    organizationController.getAllEmploymentTypes,
  )
  .post(
    authorize('EmploymentType', 'canCreate'),
    organizationController.createEmploymentType,
  );

/**
 * @swagger
 * /organizations/employment-types/{id}:
 *   get:
 *     summary: Get a specific employment type by ID
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Employment type ID"
 *     responses:
 *       200:
 *         description: Employment type fetched successfully
 *       404:
 *         description: Employment type not found
 *   patch:
 *     summary: Update an employment type
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Employment type ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               disabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Employment type updated successfully
 *       404:
 *         description: Employment type not found
 *   delete:
 *     summary: Delete an employment type
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Employment type ID"
 *     responses:
 *       204:
 *         description: Employment type deleted successfully
 *       404:
 *         description: Employment type not found
 *       409:
 *         description: "Cannot delete - employees use this employment type"
 */
router
  .route('/employment-types/:id')
  .get(
    authorize('EmploymentType', 'canRead'),
    organizationController.getEmploymentTypeById,
  )
  .patch(
    authorize('EmploymentType', 'canWrite'),
    organizationController.updateEmploymentType,
  )
  .delete(
    authorize('EmploymentType', 'canDelete'),
    organizationController.deleteEmploymentType,
  );

// ══════════════════════════════════════════════
//  EMPLOYEE GRADE  —  /organizations/employee-grades
// ══════════════════════════════════════════════

/**
 * @swagger
 * /organizations/employee-grades:
 *   get:
 *     summary: Get all employee grades
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
 *         description: "Include disabled grades"
 *     responses:
 *       200:
 *         description: Employee grades fetched successfully
 *   post:
 *     summary: Create a new employee grade
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               defaultLeavePolicyId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Employee grade created successfully
 *       409:
 *         description: Employee grade already exists
 */
router
  .route('/employee-grades')
  .get(
    authorize('EmployeeGrade', 'canRead'),
    organizationController.getAllEmployeeGrades,
  )
  .post(
    authorize('EmployeeGrade', 'canCreate'),
    organizationController.createEmployeeGrade,
  );

/**
 * @swagger
 * /organizations/employee-grades/{id}:
 *   get:
 *     summary: Get a specific employee grade by ID
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Employee grade ID"
 *     responses:
 *       200:
 *         description: Employee grade fetched successfully
 *       404:
 *         description: Employee grade not found
 *   patch:
 *     summary: Update an employee grade
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Employee grade ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               defaultLeavePolicyId:
 *                 type: string
 *                 format: uuid
 *               disabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Employee grade updated successfully
 *       404:
 *         description: Employee grade not found
 *   delete:
 *     summary: Delete an employee grade
 *     tags: [Organizations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: "Employee grade ID"
 *     responses:
 *       204:
 *         description: Employee grade deleted successfully
 *       404:
 *         description: Employee grade not found
 *       409:
 *         description: "Cannot delete - employees assigned to this grade"
 */
router
  .route('/employee-grades/:id')
  .get(
    authorize('EmployeeGrade', 'canRead'),
    organizationController.getEmployeeGradeById,
  )
  .patch(
    authorize('EmployeeGrade', 'canWrite'),
    organizationController.updateEmployeeGrade,
  )
  .delete(
    authorize('EmployeeGrade', 'canDelete'),
    organizationController.deleteEmployeeGrade,
  );

module.exports = router;