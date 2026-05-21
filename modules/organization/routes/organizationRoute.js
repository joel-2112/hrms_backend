'use strict';

const express = require('express');
const organizationController = require('../controllers/organizationController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize, action } = require('../../../middlewares/rbacMiddleware');

const router = express.Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Organizations
 *     description: Organization management - Companies, branches, departments, designations, employment types, grades
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
 *     responses:
 *       200:
 *         description: Company tree fetched successfully
 */
router.get('/companies/tree', authorize('Company', action.READ), organizationController.getCompanyTree);

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
 *       - in: query
 *         name: parentCompanyId
 *         schema:
 *           type: string
 *           format: uuid
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
 *             required: [name, country]
 *             properties:
 *               name:
 *                 type: string
 *               country:
 *                 type: string
 *               region:
 *                 type: string
 *               zone:
 *                 type: string
 *               city:
 *                 type: string
 *               code:
 *                 type: string
 *               dateOfIncorporation:
 *                 type: string
 *                 format: date
 *               parentCompanyId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Company created successfully
 */
router
  .route('/companies')
  .get(authorize('Company', action.READ), organizationController.getAllCompanies)
  .post(authorize('Company', action.CREATE), organizationController.createCompany);

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
 *     responses:
 *       200:
 *         description: Company fetched successfully
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               country:
 *                 type: string
 *               region:
 *                 type: string
 *               zone:
 *                 type: string
 *               city:
 *                 type: string
 *               code:
 *                 type: string
 *               dateOfIncorporation:
 *                 type: string
 *                 format: date
 *               parentCompanyId:
 *                 type: string
 *                 format: uuid
 *               disabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Company updated successfully
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
 *     responses:
 *       204:
 *         description: Company deleted successfully
 */
router
  .route('/companies/:id')
  .get(authorize('Company', action.READ), organizationController.getCompanyById)
  .patch(authorize('Company', action.WRITE), organizationController.updateCompany)
  .delete(authorize('Company', action.DELETE), organizationController.deleteCompany);

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
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
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
 *               country:
 *                 type: string
 *               region:
 *                 type: string
 *               zone:
 *                 type: string
 *               city:
 *                 type: string
 *               code:
 *                 type: string
 *               dateOfIncorporation:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Branch created successfully
 */
router
  .route('/branches')
  .get(authorize('Branch', action.READ), organizationController.getAllBranches)
  .post(authorize('Branch', action.CREATE), organizationController.createBranch);

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
 *     responses:
 *       200:
 *         description: Branch fetched successfully
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
 *               country:
 *                 type: string
 *               region:
 *                 type: string
 *               zone:
 *                 type: string
 *               city:
 *                 type: string
 *               code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Branch updated successfully
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
 *     responses:
 *       204:
 *         description: Branch deleted successfully
 */
router
  .route('/branches/:id')
  .get(authorize('Branch', action.READ), organizationController.getBranchById)
  .patch(authorize('Branch', action.WRITE), organizationController.updateBranch)
  .put(authorize('Branch', action.WRITE), organizationController.updateBranch)
  .delete(authorize('Branch', action.DELETE), organizationController.deleteBranch);

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
 *     responses:
 *       200:
 *         description: Department tree fetched successfully
 */
router.get('/departments/tree', authorize('Department', action.READ), organizationController.getDepartmentTree);

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
 *       - in: query
 *         name: parentDepartmentId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
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
 */
router
  .route('/departments')
  .get(authorize('Department', action.READ), organizationController.getAllDepartments)
  .post(authorize('Department', action.CREATE), organizationController.createDepartment);

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
 *     responses:
 *       200:
 *         description: Department fetched successfully
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
 *     responses:
 *       200:
 *         description: Department updated successfully
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
 *     responses:
 *       204:
 *         description: Department deleted successfully
 */
router
  .route('/departments/:id')
  .get(authorize('Department', action.READ), organizationController.getDepartmentById)
  .patch(authorize('Department', action.WRITE), organizationController.updateDepartment)
  .delete(authorize('Department', action.DELETE), organizationController.deleteDepartment);

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
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
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
 *     responses:
 *       201:
 *         description: Designation created successfully
 */
router
  .route('/designations')
  .get(authorize('Designation', action.READ), organizationController.getAllDesignations)
  .post(authorize('Designation', action.CREATE), organizationController.createDesignation);

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
 *     responses:
 *       200:
 *         description: Designation fetched successfully
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Designation updated successfully
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
 *     responses:
 *       204:
 *         description: Designation deleted successfully
 */
router
  .route('/designations/:id')
  .get(authorize('Designation', action.READ), organizationController.getDesignationById)
  .patch(authorize('Designation', action.WRITE), organizationController.updateDesignation)
  .delete(authorize('Designation', action.DELETE), organizationController.deleteDesignation);

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
 *         name: includeInactive
 *         schema:
 *           type: boolean
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
 *     responses:
 *       201:
 *         description: Employment type created successfully
 */
router
  .route('/employment-types')
  .get(authorize('EmploymentType', action.READ), organizationController.getAllEmploymentTypes)
  .post(authorize('EmploymentType', action.CREATE), organizationController.createEmploymentType);

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
 *     responses:
 *       200:
 *         description: Employment type fetched successfully
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Employment type updated successfully
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
 *     responses:
 *       204:
 *         description: Employment type deleted successfully
 */
router
  .route('/employment-types/:id')
  .get(authorize('EmploymentType', action.READ), organizationController.getEmploymentTypeById)
  .patch(authorize('EmploymentType', action.WRITE), organizationController.updateEmploymentType)
  .delete(authorize('EmploymentType', action.DELETE), organizationController.deleteEmploymentType);

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
 *               minBaseSalary:
 *                 type: number
 *               maxBaseSalary:
 *                 type: number
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Employee grade created successfully
 */
router
  .route('/employee-grades')
  .get(authorize('EmployeeGrade', action.READ), organizationController.getAllEmployeeGrades)
  .post(authorize('EmployeeGrade', action.CREATE), organizationController.createEmployeeGrade);

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
 *     responses:
 *       200:
 *         description: Employee grade fetched successfully
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               minBaseSalary:
 *                 type: number
 *               maxBaseSalary:
 *                 type: number
 *               sortOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Employee grade updated successfully
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
 *     responses:
 *       204:
 *         description: Employee grade deleted successfully
 */
router
  .route('/employee-grades/:id')
  .get(authorize('EmployeeGrade', action.READ), organizationController.getEmployeeGradeById)
  .patch(authorize('EmployeeGrade', action.WRITE), organizationController.updateEmployeeGrade)
  .delete(authorize('EmployeeGrade', action.DELETE), organizationController.deleteEmployeeGrade);

module.exports = router;