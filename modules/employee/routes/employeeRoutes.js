'use strict';

/**
 * modules/employee/routes/employeeRoutes.js
 *
 * Employee lifecycle routes — core profile, education, external work,
 * emergency contacts, skill map, separation, and promotion history.
 *
 * All routes require authentication.
 * Mutating routes are guarded by RBAC middleware.
 */

const router = require('express').Router();
const employeeController = require('../controllers/employeeController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize, action } = require('../../../middlewares/rbacMiddleware');

// ─────────────────────────────────────────────────────────────────────────────
//  All routes require authentication
// ─────────────────────────────────────────────────────────────────────────────
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Employees
 *     description: Employee lifecycle — core profile CRUD, status management, org chart
 *   - name: EmployeeEducation
 *     description: Employee education / qualification records
 *   - name: EmployeeExternalWork
 *     description: Previous employment history (external work)
 *   - name: EmployeeEmergencyContacts
 *     description: Emergency contact management per employee
 *   - name: EmployeeSkillMap
 *     description: Skills, certifications, and training records
 *   - name: EmployeeSeparation
 *     description: Separation / exit management workflow
 *   - name: EmployeePromotions
 *     description: Promotion / demotion history (read-only — writes via Performance module)
 */

// ═════════════════════════════════════════════════════════════════════════════
//  CORE PROFILE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Create a new employee record
 *     description: >
 *       HR creates a new employee.  The record starts **Inactive** and is
 *       pending GM approval.  A User account is **not** created yet — that
 *       happens when the GM calls `POST /employees/{id}/approve`.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - companyId
 *               - dateOfJoining
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Kedir
 *               middleName:
 *                 type: string
 *                 example: Abebe
 *               lastName:
 *                 type: string
 *                 example: Seid
 *               salutation:
 *                 type: string
 *                 enum: [Mr, Mrs, Ms, Dr, Prof]
 *                 example: Mr
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               maritalStatus:
 *                 type: string
 *                 enum: [Single, Married, Divorced, Widowed]
 *               nationality:
 *                 type: string
 *               religion:
 *                 type: string
 *               bloodGroup:
 *                 type: string
 *               # ── Org assignments ──
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               branchId:
 *                 type: string
 *                 format: uuid
 *               departmentId:
 *                 type: string
 *                 format: uuid
 *               designationId:
 *                 type: string
 *                 format: uuid
 *               employmentTypeId:
 *                 type: string
 *                 format: uuid
 *               employeeGradeId:
 *                 type: string
 *                 format: uuid
 *               reportsToId:
 *                 type: string
 *                 format: uuid
 *                 description: Line manager (Employee ID)
 *               # ── Employment ──
 *               dateOfJoining:
 *                 type: string
 *                 format: date
 *                 example: "2026-06-01"
 *               scheduledConfirmationDate:
 *                 type: string
 *                 format: date
 *               contractEndDate:
 *                 type: string
 *                 format: date
 *               noticeNumberOfDays:
 *                 type: integer
 *                 default: 30
 *               # ── Contact ──
 *               personalEmail:
 *                 type: string
 *                 format: email
 *               companyEmail:
 *                 type: string
 *                 format: email
 *                 description: Required for User account provisioning
 *               cellNumber:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               # ── Addresses ──
 *               currentAddress:
 *                 type: string
 *               currentCity:
 *                 type: string
 *               currentState:
 *                 type: string
 *               currentCountry:
 *                 type: string
 *               currentPostalCode:
 *                 type: string
 *               permanentAddress:
 *                 type: string
 *               permanentCity:
 *                 type: string
 *               permanentState:
 *                 type: string
 *               permanentCountry:
 *                 type: string
 *               permanentPostalCode:
 *                 type: string
 *               isSameAddress:
 *                 type: boolean
 *                 default: false
 *               # ── Statutory / IDs ──
 *               nationalId:
 *                 type: string
 *               passportNumber:
 *                 type: string
 *               passportExpiry:
 *                 type: string
 *                 format: date
 *               taxId:
 *                 type: string
 *               socialSecurityNumber:
 *                 type: string
 *               # ── Bank ──
 *               bankName:
 *                 type: string
 *               bankAccountNumber:
 *                 type: string
 *               bankBranch:
 *                 type: string
 *               bankCode:
 *                 type: string
 *               mobileMoneyNumber:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [Bank Transfer, Cash, Cheque, Mobile Money]
 *                 default: Bank Transfer
 *               # ── Leave / Attendance defaults ──
 *               holidayListId:
 *                 type: string
 *                 format: uuid
 *               defaultShiftId:
 *                 type: string
 *                 format: uuid
 *               attendanceDeviceId:
 *                 type: string
 *                 format: uuid
 *               leaveApprovedById:
 *                 type: string
 *                 format: uuid
 *               expenseApprovedById:
 *                 type: string
 *                 format: uuid
 *               # ── Misc ──
 *               bio:
 *                 type: string
 *               customFields:
 *                 type: object
 *     responses:
 *       201:
 *         description: Employee record created — pending GM approval
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Employee record created successfully — pending GM approval
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Validation error (missing required fields)
 *       404:
 *         description: Referenced entity not found (e.g. company, branch)
 *       409:
 *         description: companyEmail already exists
 */
router.post('/',
  authorize('Employee', action.CREATE),
  employeeController.createEmployee
);

/**
 * @swagger
 * /employees/{id}/approve:
 *   post:
 *     summary: GM approves a pending employee
 *     description: >
 *       Creates a User account (email = companyEmail),
 *       links it to the employee, and sets status to **Active**.
 *       A temporary password is returned — the caller must email it
 *       to the employee immediately.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee approved — User account provisioned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee:
 *                       $ref: '#/components/schemas/Employee'
 *                     temporaryPassword:
 *                       type: string
 *                       description: Send this to the employee — never stored in plain text
 *                       example: "Tw@K7mXp2"
 *       404:
 *         description: Employee not found
 *       422:
 *         description: >
 *           Employee status is not 'Inactive', or no companyEmail set
 */
router.post('/:id/approve',
  authorize('Employee', action.SUBMIT),
  employeeController.approveEmployee
);

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: List employees (paginated, filtered)
 *     description: >
 *       Returns a paginated list of employees.  Supports rich filtering
 *       and is automatically scoped by the caller's RBAC user-permission filter.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: designationId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: employmentTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: employeeGradeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: reportsToId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Comma-separated list, e.g. `Active,Suspended`
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Matches firstName, lastName, employeeNumber, companyEmail
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated employee list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/',
  authorize('Employee', action.READ),
  employeeController.getEmployees
);

/**
 * @swagger
 * /employees/me:
 *   get:
 *     summary: Get current employee's own profile
 *     description: >
 *       Self-service endpoint.  The employee reads their own record.
 *       Confidential HR fields (reference notes, bank details) are excluded
 *       from the response.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Own profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *       404:
 *         description: No employee profile linked to this user account
 */
router.get('/me',
  employeeController.getMyProfile
);

/**
 * @swagger
 * /employees/search:
 *   get:
 *     summary: Full-text search across employees
 *     description: >
 *       Lightweight autocomplete / quick-search.  Searches firstName,
 *       lastName, employeeNumber, and companyEmail.  Returns a flat list
 *       (no pagination) capped at 50 results.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search term (min 2 characters)
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       employeeNumber:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       middleName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       companyEmail:
 *                         type: string
 *                       image:
 *                         type: string
 *                       status:
 *                         type: string
 *                       designation:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 */
router.get('/search',
  authorize('Employee', action.READ),
  employeeController.searchEmployees
);

/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: Get full employee profile by ID
 *     description: >
 *       Returns the employee with **all** sub-records (education, external work,
 *       emergency contacts, skill map, separations, recent promotions).
 *       Non-HR callers receive a stripped version without confidential fields.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Full employee profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *       404:
 *         description: Employee not found
 */
router.get('/:id',
  authorize('Employee', action.READ),
  employeeController.getEmployeeById
);

/**
 * @swagger
 * /employees/{id}:
 *   patch:
 *     summary: Update employee record (HR only)
 *     description: >
 *       Updates a subset of employee fields.  Immutable fields
 *       (`status`, `userId`, `employeeNumber`, `relievingDate`,
 *       `encashmentDate`) are silently stripped from the payload.
 *       Use dedicated endpoints for status changes and separation.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EmployeeUpdate'
 *     responses:
 *       200:
 *         description: Employee updated
 *       404:
 *         description: Employee not found
 *       409:
 *         description: companyEmail already assigned to another employee
 *       422:
 *         description: Cannot edit a separated employee
 */
router.patch('/:id',
  authorize('Employee', action.WRITE),
  employeeController.updateEmployee
);

/**
 * @swagger
 * /employees/{id}/status:
 *   patch:
 *     summary: Change employee lifecycle status
 *     description: >
 *       Transitions an employee between statuses.
 *       Allowed transitions:
 *       `Active → Suspended`, `Active → On Leave`,
 *       `Suspended → Active`, `On Leave → Active`.
 *       **Exit can only be set via the Separation workflow**.
 *       **Inactive → Active can only be done via approveEmployee**.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Active, Suspended, On Leave]
 *               reason:
 *                 type: string
 *                 description: Required when suspending
 *     responses:
 *       200:
 *         description: Status changed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: Employee status changed to 'Suspended'
 *                 data:
 *                   $ref: '#/components/schemas/Employee'
 *       422:
 *         description: Invalid transition or missing reason
 */
router.patch('/:id/status',
  authorize('Employee', action.SUBMIT),
  employeeController.updateEmployeeStatus
);

/**
 * @swagger
 * /employees/{id}/deactivate-user:
 *   post:
 *     summary: Suspend linked User account without changing employee status
 *     description: >
 *       Used for security lockouts while HR investigates — the employee
 *       record stays **Active** but the user cannot log in.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: User account suspended
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Employee not found
 *       422:
 *         description: No linked User account
 */
router.post('/:id/deactivate-user',
  authorize('Employee', action.SUBMIT),
  employeeController.deactivateUser
);

/**
 * @swagger
 * /employees/{id}/org-chart:
 *   get:
 *     summary: Organisation chart rooted at an employee
 *     description: >
 *       Recursively builds the `reportsTo` tree down to a configurable depth
 *       (default 4 levels).
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Root employee ID
 *       - in: query
 *         name: maxDepth
 *         schema:
 *           type: integer
 *           default: 4
 *     responses:
 *       200:
 *         description: Nested org chart
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee:
 *                       type: object
 *                     directReports:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Employee not found
 */
router.get('/:id/org-chart',
  authorize('Employee', action.READ),
  employeeController.getOrgChart
);

/**
 * @swagger
 * /employees/{id}/direct-reports:
 *   get:
 *     summary: Direct reports of a manager
 *     description: Flat paginated list of employees reporting to the given manager.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Manager employee ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Direct reports list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employee'
 *                 meta:
 *                   type: object
 *       404:
 *         description: Manager not found
 */
router.get('/:id/direct-reports',
  authorize('Employee', action.READ),
  employeeController.getDirectReports
);

/**
 * @swagger
 * /employees/{id}/activate-user:
 *   post:
 *     summary: Reactivate a suspended User account
 *     description: >
 *       Re-enables the linked User account (e.g., after suspension is lifted).
 *       Does NOT change employee status.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: User account reactivated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: User account reactivated — employee record unchanged
 *       404:
 *         description: Employee not found
 *       422:
 *         description: No linked User account or already active
 */
router.post('/:id/activate-user',
  authorize('Employee', action.SUBMIT),
  employeeController.activateUser
);

// ═════════════════════════════════════════════════════════════════════════════
//  EDUCATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /employees/{id}/education:
 *   get:
 *     summary: Get all education records
 *     tags: [EmployeeEducation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: List of education records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EmployeeEducation'
 */
router.get('/:id/education',
  authorize('Employee', action.READ),
  employeeController.getEducation
);

/**
 * @swagger
 * /employees/{id}/education:
 *   post:
 *     summary: Add an education record
 *     tags: [EmployeeEducation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - level
 *               - qualification
 *               - institution
 *             properties:
 *               level:
 *                 type: string
 *                 example: Bachelors
 *               qualification:
 *                 type: string
 *                 example: Computer Science
 *               majorOrField:
 *                 type: string
 *               institution:
 *                 type: string
 *                 example: Addis Ababa University
 *               country:
 *                 type: string
 *               fromDate:
 *                 type: string
 *                 format: date
 *               toDate:
 *                 type: string
 *                 format: date
 *               isCurrentlyEnrolled:
 *                 type: boolean
 *                 default: false
 *               grade:
 *                 type: string
 *                 example: "3.8 GPA"
 *               certificateAttached:
 *                 type: boolean
 *                 default: false
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Education record created
 *       422:
 *         description: toDate must be empty when isCurrentlyEnrolled is true
 */
router.post('/:id/education',
  authorize('Employee', action.WRITE),
  employeeController.addEducation
);

/**
 * @swagger
 * /employees/{id}/education/{recordId}:
 *   patch:
 *     summary: Update an education record
 *     tags: [EmployeeEducation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: recordId
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
 *     responses:
 *       200:
 *         description: Education record updated
 *       404:
 *         description: Record not found
 */
router.patch('/:id/education/:recordId',
  authorize('Employee', action.WRITE),
  employeeController.updateEducation
);

/**
 * @swagger
 * /employees/{id}/education/{recordId}:
 *   delete:
 *     summary: Delete an education record
 *     tags: [EmployeeEducation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Education record deleted
 *       404:
 *         description: Record not found
 */
router.delete('/:id/education/:recordId',
  authorize('Employee', action.DELETE),
  employeeController.deleteEducation
);


// ═════════════════════════════════════════════════════════════════════════════
//  EXTERNAL WORK (previous employment)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /employees/{id}/external-work:
 *   get:
 *     summary: Get employment history
 *     tags: [EmployeeExternalWork]
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
 *         description: List of previous employment records
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EmployeeExternalWork'
 */
router.get('/:id/external-work',
  authorize('Employee', action.READ),
  employeeController.getExternalWork
);

/**
 * @swagger
 * /employees/{id}/external-work:
 *   post:
 *     summary: Add a work history record
 *     tags: [EmployeeExternalWork]
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
 *             required:
 *               - companyName
 *               - fromDate
 *             properties:
 *               companyName:
 *                 type: string
 *               industry:
 *                 type: string
 *               country:
 *                 type: string
 *               designation:
 *                 type: string
 *               department:
 *                 type: string
 *               employmentType:
 *                 type: string
 *               fromDate:
 *                 type: string
 *                 format: date
 *               toDate:
 *                 type: string
 *                 format: date
 *               isCurrentEmployer:
 *                 type: boolean
 *                 default: false
 *               supervisorName:
 *                 type: string
 *               supervisorContact:
 *                 type: string
 *               referenceChecked:
 *                 type: boolean
 *               referenceCheckedOn:
 *                 type: string
 *                 format: date
 *               referenceNotes:
 *                 type: string
 *                 description: HR-only — confidential
 *               reasonForLeaving:
 *                 type: string
 *               lastDrawnSalary:
 *                 type: number
 *               lastDrawnSalaryCurrency:
 *                 type: string
 *                 default: ETB
 *               responsibilities:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Work history record created
 *       422:
 *         description: fromDate must be before toDate
 */
router.post('/:id/external-work',
  authorize('Employee', action.WRITE),
  employeeController.addExternalWork
);

/**
 * @swagger
 * /employees/{id}/external-work/{recordId}:
 *   patch:
 *     summary: Update a work history record
 *     tags: [EmployeeExternalWork]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: recordId
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
 *     responses:
 *       200:
 *         description: Work history record updated
 *       404:
 *         description: Record not found
 */
router.patch('/:id/external-work/:recordId',
  authorize('Employee', action.WRITE),
  employeeController.updateExternalWork
);

/**
 * @swagger
 * /employees/{id}/external-work/{recordId}:
 *   delete:
 *     summary: Delete a work history record
 *     tags: [EmployeeExternalWork]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Work history record deleted
 *       404:
 *         description: Record not found
 */
router.delete('/:id/external-work/:recordId',
  authorize('Employee', action.DELETE),
  employeeController.deleteExternalWork
);


// ═════════════════════════════════════════════════════════════════════════════
//  EMERGENCY CONTACTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /employees/{id}/emergency-contacts:
 *   get:
 *     summary: Get all emergency contacts
 *     tags: [EmployeeEmergencyContacts]
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
 *         description: List of emergency contacts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EmployeeEmergencyContact'
 */
router.get('/:id/emergency-contacts',
  authorize('Employee', action.READ),
  employeeController.getEmergencyContacts
);

/**
 * @swagger
 * /employees/{id}/emergency-contacts:
 *   post:
 *     summary: Add an emergency contact
 *     description: >
 *       If `isPrimary` is true, all other contacts for this employee are
 *       automatically unset as primary.
 *     tags: [EmployeeEmergencyContacts]
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
 *             required:
 *               - fullName
 *               - relationship
 *               - phone
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: Fatima Seid
 *               relationship:
 *                 type: string
 *                 example: Spouse
 *               relationshipOther:
 *                 type: string
 *               phone:
 *                 type: string
 *               alternatePhone:
 *                 type: string
 *               email:
 *                 type: string
 *               address:
 *                 type: string
 *               isPrimary:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Emergency contact created
 */
router.post('/:id/emergency-contacts',
  authorize('Employee', action.WRITE),
  employeeController.addEmergencyContact
);

/**
 * @swagger
 * /employees/{id}/emergency-contacts/{recordId}:
 *   patch:
 *     summary: Update an emergency contact
 *     tags: [EmployeeEmergencyContacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: recordId
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
 *     responses:
 *       200:
 *         description: Emergency contact updated
 *       404:
 *         description: Contact not found
 */
router.patch('/:id/emergency-contacts/:recordId',
  authorize('Employee', action.WRITE),
  employeeController.updateEmergencyContact
);

/**
 * @swagger
 * /employees/{id}/emergency-contacts/{recordId}:
 *   delete:
 *     summary: Delete an emergency contact
 *     tags: [EmployeeEmergencyContacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Emergency contact deleted
 *       404:
 *         description: Contact not found
 */
router.delete('/:id/emergency-contacts/:recordId',
  authorize('Employee', action.DELETE),
  employeeController.deleteEmergencyContact
);

/**
 * @swagger
 * /employees/{id}/emergency-contacts/{recordId}/primary:
 *   patch:
 *     summary: Set a contact as primary
 *     description: >
 *       Atomically sets this contact as primary and unsets all others
 *       in a single transaction.
 *     tags: [EmployeeEmergencyContacts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Primary contact updated
 *       404:
 *         description: Contact not found
 */
router.patch('/:id/emergency-contacts/:recordId/primary',
  authorize('Employee', action.WRITE),
  employeeController.setPrimaryContact
);


// ═════════════════════════════════════════════════════════════════════════════
//  SKILL MAP
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /employees/{id}/skill-map:
 *   get:
 *     summary: Get the skill map record
 *     description: >
 *       Returns the skill map or an empty structure if none exists yet.
 *     tags: [EmployeeSkillMap]
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
 *         description: Skill map
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/EmployeeSkillMap'
 */
router.get('/:id/skill-map',
  authorize('Employee', action.READ),
  employeeController.getSkillMap
);

/**
 * @swagger
 * /employees/{id}/skill-map:
 *   put:
 *     summary: Create or replace the entire skill map
 *     description: >
 *       Full upsert — sends the complete `{ skills, certifications, trainings, languages }` object.
 *     tags: [EmployeeSkillMap]
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
 *               skills:
 *                 type: array
 *                 items:
 *                   type: object
 *               certifications:
 *                 type: array
 *                 items:
 *                   type: object
 *               trainings:
 *                 type: array
 *                 items:
 *                   type: object
 *               languages:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Skill map saved
 */
router.put('/:id/skill-map',
  authorize('Employee', action.WRITE),
  employeeController.upsertSkillMap
);

/**
 * @swagger
 * /employees/{id}/skill-map/skills:
 *   post:
 *     summary: Add a single skill
 *     description: Prevents duplicates by `skillName` (case-insensitive).
 *     tags: [EmployeeSkillMap]
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
 *             required:
 *               - skillName
 *             properties:
 *               skillName:
 *                 type: string
 *                 example: JavaScript
 *               proficiency:
 *                 type: string
 *                 enum: [Beginner, Intermediate, Advanced, Expert]
 *               yearsOfExperience:
 *                 type: number
 *     responses:
 *       201:
 *         description: Skill added
 *       409:
 *         description: Skill already exists
 */
router.post('/:id/skill-map/skills',
  authorize('Employee', action.WRITE),
  employeeController.addSkill
);

/**
 * @swagger
 * /employees/{id}/skill-map/skills/{skillName}:
 *   delete:
 *     summary: Remove a skill by name
 *     tags: [EmployeeSkillMap]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: skillName
 *         required: true
 *         schema:
 *           type: string
 *         description: URL-encoded skill name, e.g. `C%2B%2B` for C++
 *     responses:
 *       200:
 *         description: Skill removed
 *       404:
 *         description: Skill not found
 */
router.delete('/:id/skill-map/skills/:skillName',
  authorize('Employee', action.WRITE),
  employeeController.removeSkill
);

/**
 * @swagger
 * /employees/{id}/skill-map/certifications:
 *   post:
 *     summary: Add a certification
 *     tags: [EmployeeSkillMap]
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
 *             required:
 *               - certificationName
 *             properties:
 *               certificationName:
 *                 type: string
 *                 example: AWS Solutions Architect
 *               issuingAuthority:
 *                 type: string
 *               dateObtained:
 *                 type: string
 *                 format: date
 *               expiryDate:
 *                 type: string
 *                 format: date
 *               certificationId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Certification added
 *       409:
 *         description: Certification already exists
 */
router.post('/:id/skill-map/certifications',
  authorize('Employee', action.WRITE),
  employeeController.addCertification
);

/**
 * @swagger
 * /employees/{id}/skill-map/trainings:
 *   post:
 *     summary: Add a training record
 *     tags: [EmployeeSkillMap]
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
 *             required:
 *               - trainingName
 *             properties:
 *               trainingName:
 *                 type: string
 *                 example: Leadership Essentials
 *               provider:
 *                 type: string
 *               fromDate:
 *                 type: string
 *                 format: date
 *               toDate:
 *                 type: string
 *                 format: date
 *               certificateAttached:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Training record added
 */
router.post('/:id/skill-map/trainings',
  authorize('Employee', action.WRITE),
  employeeController.addTraining
);


// ═════════════════════════════════════════════════════════════════════════════
//  SEPARATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /employees/{id}/separation:
 *   post:
 *     summary: Initiate a separation (Draft)
 *     description: >
 *       HR creates a separation record.  Employee status does **not** change
 *       until GM approves.  Only one active separation per employee.
 *     tags: [EmployeeSeparation]
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
 *             required:
 *               - separationType
 *               - initiatedBy
 *             properties:
 *               separationType:
 *                 type: string
 *                 enum: [Resignation, Termination, Retirement, End of Contract, Death, Abandonment]
 *               initiatedBy:
 *                 type: string
 *                 enum: [Employee, Employer, Mutual]
 *               resignationDate:
 *                 type: string
 *                 format: date
 *               lastWorkingDay:
 *                 type: string
 *                 format: date
 *               reasonForLeaving:
 *                 type: string
 *               noticePeriodServed:
 *                 type: boolean
 *               noticePeriodWaived:
 *                 type: boolean
 *               noticeShortfallDays:
 *                 type: integer
 *               additionalNotes:
 *                 type: string
 *               clearanceTasks:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Separation initiated — Draft
 *       409:
 *         description: Separation already in progress
 *       422:
 *         description: Employee status does not allow separation
 */
router.post('/:id/separation',
  authorize('Employee', action.SUBMIT),
  employeeController.initiateSeparation
);

/**
 * @swagger
 * /employees/{id}/separation/submit:
 *   post:
 *     summary: Submit separation for GM approval
 *     tags: [EmployeeSeparation]
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
 *         description: Separation submitted for approval
 *       422:
 *         description: Only Draft separations can be submitted
 */
router.post('/:id/separation/submit',
  authorize('Employee', action.SUBMIT),
  employeeController.submitSeparation
);

/**
 * @swagger
 * /employees/{id}/separation/approve:
 *   post:
 *     summary: GM approves separation
 *     description: >
 *       Finalises the separation: sets Employee status to **Exit**,
 *       deactivates the User account, records relievingDate.
 *     tags: [EmployeeSeparation]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               exitInterviewDate:
 *                 type: string
 *                 format: date
 *               exitRemarks:
 *                 type: string
 *               wouldRehire:
 *                 type: boolean
 *               relievingDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Separation approved — Employee exited
 *       422:
 *         description: Only separations pending approval can be approved
 */
router.post('/:id/separation/approve',
  authorize('Employee', action.SUBMIT),
  employeeController.approveSeparation
);

/**
 * @swagger
 * /employees/{id}/separation/reject:
 *   post:
 *     summary: GM rejects separation
 *     description: Returns separation to Draft status.
 *     tags: [EmployeeSeparation]
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
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: Insufficient notice period documentation
 *     responses:
 *       200:
 *         description: Separation rejected
 *       422:
 *         description: Only separations pending approval can be rejected
 */
router.post('/:id/separation/reject',
  authorize('Employee', action.SUBMIT),
  employeeController.rejectSeparation
);

/**
 * @swagger
 * /employees/{id}/separation/clearance:
 *   patch:
 *     summary: Update clearance checklist
 *     description: >
 *       HR updates the clearance tasks, equipment returned,
 *       and system access revocation status as each item is completed.
 *     tags: [EmployeeSeparation]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               clearanceTasks:
 *                 type: array
 *               equipmentReturned:
 *                 type: array
 *               systemAccessRevoked:
 *                 type: array
 *     responses:
 *       200:
 *         description: Clearance tasks updated
 */
router.patch('/:id/separation/clearance',
  authorize('Employee', action.WRITE),
  employeeController.updateClearanceTasks
);

/**
 * @swagger
 * /employees/{id}/separation/settle:
 *   post:
 *     summary: Mark full and final settlement complete
 *     description: >
 *       Records the encashment date on both the Separation and Employee records.
 *       Sets separation status to **Completed**.
 *     tags: [EmployeeSeparation]
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               encashmentDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Full and final settlement recorded — Separation completed
 *       422:
 *         description: Separation must be Approved before settlement
 */
router.post('/:id/separation/settle',
  authorize('Employee', action.SUBMIT),
  employeeController.settleFullAndFinal
);


// ═════════════════════════════════════════════════════════════════════════════
//  PROMOTIONS — READ ONLY
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /employees/{id}/promotions:
 *   get:
 *     summary: Get promotion / demotion history
 *     description: >
 *       Returns all promotion and demotion records for the employee.
 *       **Read-only** — write operations are performed by the Performance module
 *       via the EmployeePromotion service.
 *     tags: [EmployeePromotions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Paginated promotion history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EmployeePromotion'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/:id/promotions',
  authorize('Employee', action.READ),
  employeeController.getPromotionHistory
);


// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = router;