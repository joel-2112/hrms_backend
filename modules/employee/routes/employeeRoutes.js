"use strict";

/**
 * modules/employee/routes/employeeRoutes.js
 *
 * Employee lifecycle routes — core profile, education, external work,
 * emergency contacts, skill map, separation, and promotion history.
 *
 * All routes require authentication.
 * Mutating routes are guarded by RBAC middleware.
 */

const router = require("express").Router();
const employeeController = require("../controllers/employeeController");
const { authenticate } = require("../../../middlewares/authMiddleware");
const { authorize, action } = require("../../../middlewares/rbacMiddleware");
const { uploadAvatar } = require("../../../middlewares/uploadMiddleware");

// ─────────────────────────────────────────────────────────────────────────────
//  All routes require authentication
// ─────────────────────────────────────────────────────────────────────────────
router.use(authenticate);
/**
 * @swagger
 * /employees/pending-work-email:
 *   get:
 *     summary: Get employees pending work email assignment
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Pending work email employees retrieved
 */
router.get(
  '/pending-work-email',
  authorize('Employee', action.READ),
  employeeController.getPendingWorkEmail,
);

/**
 * @swagger
 * /employees/{id}/assign-work-email:
 *   patch:
 *     summary: IT assigns work email to an employee
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [workEmail]
 *             properties:
 *               workEmail:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Work email assigned successfully
 */
router.patch(
  '/:id/assign-work-email',
  authorize('Employee', action.WRITE),
  employeeController.assignWorkEmail,
);
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


  /**
 * @swagger
 * /employees/education-levels:
 *   get:
 *     summary: Get all education levels
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Education levels retrieved
 *   post:
 *     summary: Create a new education level
 *     tags: [Employees]
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
 *                 example: "Bachelor"
 *     responses:
 *       201:
 *         description: Education level created
 *       409:
 *         description: Education level already exists
 */
router
  .route("/education-levels")
  .get(authorize("Employee", action.READ), employeeController.getEducationLevels)
  .post(authorize("Employee", action.WRITE), employeeController.createEducationLevel);

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
 *               # ── Identity ──
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
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Non-binary]
 *               maritalStatus:
 *                 type: string
 *                 enum: [Single, Married, Divorced, Widowed]
 *               # ── Photo ──
 *               image:
 *                 type: string
 *                 description: Relative path to avatar file e.g. "avatars/emp-uuid.jpg"
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
 *               contractEndDate:
 *                 type: string
 *                 format: date
 *                 description: For fixed-term contracts
 *               relievingDate:
 *                 type: string
 *                 format: date
 *                 description: Last working day — set on separation
 *               encashmentDate:
 *                 type: string
 *                 format: date
 *                 description: Date of final leave encashment on exit
 *               # ── Professional links ──
 *               portfolioUrl:
 *                 type: string
 *                 format: url
 *                 description: Personal portfolio or LinkedIn URL
 *               githubUrl:
 *                 type: string
 *                 format: url
 *                 description: GitHub profile URL
 *               # ── Contact ──
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Work email — used for User account provisioning
 *               phoneNumber:
 *                 type: string
 *                 description: Office / desk phone
 *               # ── Address ──
 *               City:
 *                 type: string
 *               Region:
 *                 type: string
 *               zone:
 *                 type: string
 *               Country:
 *                 type: string
 *               currentPostalCode:
 *                 type: string
 *               # ── Bank ──
 *               bankName:
 *                 type: string
 *               bankAccountNumber:
 *                 type: string
 *               mobileMoneyNumber:
 *                 type: string
 *                 description: Telebirr or equivalent mobile money number
 *               paymentMethod:
 *                 type: string
 *                 enum: [Bank Transfer, Tele Birr, Cheque, Cash]
 *                 default: Bank Transfer
 *               # ── Leave / Attendance defaults ──
 *               holidayListId:
 *                 type: string
 *                 format: uuid
 *                 description: Employee-level holiday list override
 *               leaveApprovedById:
 *                 type: string
 *                 format: uuid
 *                 description: Default leave approver for this employee
 *               # ── Documents ──
 *               employeeDocuments:
 *                 type: object
 *                 description: Structured JSON for document metadata and file paths
 *               # ── Identity document ──
 *               nationalIdNumber:
 *                 type: string
 *                 description: Government-issued national ID number
 *     responses:
 *       201:
 *         description: Employee record created — pending GM approval
 *       400:
 *         description: Validation error (missing required fields)
 *       404:
 *         description: Referenced entity not found (e.g. company, branch)
 *       409:
 *         description: email already exists
 */
router.post(
  "/",
  authorize("Employee", action.CREATE),
  employeeController.createEmployee,
);

/**
 * @swagger
 * /employees/from-user/{userId}:
 *   post:
 *     summary: Create Employee from existing User
 *     description: >
 *       For users who already have a User account (Super Admin, System Manager)
 *       but need an Employee record. Reuses firstName, middleName, lastName, email
 *       from the User. Employee is created immediately as **Active** — no approval needed.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Existing User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - companyId
 *               - dateOfJoining
 *             properties:
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               dateOfJoining:
 *                 type: string
 *                 format: date
 *               email:
 *                 type: string
 *                 description: Defaults to User's email if not provided
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
 *               paymentMethod:
 *                 type: string
 *                 enum: [Bank Transfer, Tele Birr, Cheque, Cash]
 *               bankAccountNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Employee created from existing User
 *       404:
 *         description: User not found
 *       409:
 *         description: Employee already exists for this user
 */
router.post(
  "/from-user/:userId",
  authorize("Employee", action.CREATE),
  employeeController.createEmployeeFromExistingUser,
);

/**
 * @swagger
 * /employees/{id}/approve:
 *   post:
 *     summary: GM approves a pending employee
 *     description: >
 *       Creates a User account (email = email),
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     employee:
 *                       type: object
 *                     temporaryPassword:
 *                       type: string
 *                       description: Send this to the employee — never stored in plain text
 *                       example: "Tw@K7mXp2"
 *       404:
 *         description: Employee not found
 *       422:
 *         description: >
 *           Employee status is not 'Inactive', or no email set
 */
router.post(
  "/:id/approve",
  authorize("Employee", action.SUBMIT),
  employeeController.approveEmployee,
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
 *         description: Matches firstName, lastName, employeeNumber, email
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
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
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
router.get(
  "/",
  authorize("Employee", action.READ),
  employeeController.getEmployees,
);
/**
 * @swagger
 * /employees/{id}/avatar:
 *   put:
 *     summary: Upload employee avatar/profile photo
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
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [avatar]
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 */
router.put('/:id/avatar',
  authorize('Employee', action.WRITE),
  uploadAvatar.single('avatar'),
  employeeController.updateAvatar
);


// ═════════════════════════════════════════════════════════════════════════════
//  LANGUAGES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /employees/{id}/languages:
 *   get:
 *     summary: Get all languages for an employee
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
 *     responses:
 *       200:
 *         description: Languages retrieved
 *   post:
 *     summary: Add a language to an employee
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
 *         description: Language added
 */
router
  .route("/:id/languages")
  .get(authorize("Employee", action.READ), employeeController.getLanguages)
  .post(authorize("Employee", action.WRITE), employeeController.addLanguage);

/**
 * @swagger
 * /employees/{id}/languages/{languageId}:
 *   delete:
 *     summary: Delete a language from an employee
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
 *       - in: path
 *         name: languageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       204:
 *         description: Language deleted
 */
router.delete(
  "/:id/languages/:languageId",
  authorize("Employee", action.DELETE),
  employeeController.deleteLanguage,
);
// ═════════════════════════════════════════════════════════════════════════════
//  DASHBOARD & STATISTICS (static routes — must be before /:id)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /employees/stats:
 *   get:
 *     summary: Get employee dashboard statistics
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Employee statistics
 */
router.get('/stats',
  authorize('Employee', action.READ),
  employeeController.getEmployeeStats
);

/**
 * @swagger
 * /employees/birthdays:
 *   get:
 *     summary: Get upcoming birthdays this month
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Upcoming birthdays
 */
router.get('/birthdays',
  authorize('Employee', action.READ),
  employeeController.getUpcomingBirthdays
);

/**
 * @swagger
 * /employees/anniversaries:
 *   get:
 *     summary: Get work anniversaries this month
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Work anniversaries
 */
router.get('/anniversaries',
  authorize('Employee', action.READ),
  employeeController.getWorkAnniversaries
);

/**
 * @swagger
 * /employees/recently-joined:
 *   get:
 *     summary: Get recently joined employees (last 30 days)
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
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recently joined employees
 */
router.get('/recently-joined',
  authorize('Employee', action.READ),
  employeeController.getRecentlyJoined
);

/**
 * @swagger
 * /employees/filter-options:
 *   get:
 *     summary: Get distinct values for filter dropdowns
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Filter options
 */
router.get('/filter-options',
  authorize('Employee', action.READ),
  employeeController.getFilterOptions
);

/**
 * @swagger
 * /employees/me:
 *   get:
 *     summary: Get current employee's own profile
 *     description: >
 *       Self-service endpoint.  The employee reads their own record.
 *       Confidential HR fields are excluded from the response.
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Own profile
 *       404:
 *         description: No employee profile linked to this user account
 */
router.get("/me", employeeController.getMyProfile);

/**
 * @swagger
 * /employees/search:
 *   get:
 *     summary: Full-text search across employees
 *     description: >
 *       Lightweight autocomplete / quick-search.  Searches firstName,
 *       lastName, employeeNumber, and email.  Returns a flat list
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
 */
router.get(
  "/search",
  authorize("Employee", action.READ),
  employeeController.searchEmployees,
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
 *       404:
 *         description: Employee not found
 */
router.get(
  "/:id",
  authorize("Employee", [action.READ, action.READ_SELF]),
  employeeController.getEmployeeById,
);

/**
 * @swagger
 * /employees/{id}:
 *   patch:
 *     summary: Update employee record (HR only)
 *     description: >
 *       Updates a subset of employee fields.  Immutable fields
 *       (`status`, `userId`, `employeeNumber`, `relievingDate`,
 *       `encashmentDate`) are silently stripped.
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
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               middleName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               salutation:
 *                 type: string
 *                 enum: [Mr, Mrs, Ms, Dr, Prof]
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Non-binary]
 *               maritalStatus:
 *                 type: string
 *                 enum: [Single, Married, Divorced, Widowed]
 *               image:
 *                 type: string
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
 *               dateOfJoining:
 *                 type: string
 *                 format: date
 *               contractEndDate:
 *                 type: string
 *                 format: date
 *               email:
 *                 type: string
 *                 format: email
 *               phoneNumber:
 *                 type: string
 *               City:
 *                 type: string
 *               Region:
 *                 type: string
 *               zone:
 *                 type: string
 *               Country:
 *                 type: string
 *               currentPostalCode:
 *                 type: string
 *               bankName:
 *                 type: string
 *               bankAccountNumber:
 *                 type: string
 *               mobileMoneyNumber:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [Bank Transfer, Tele Birr, Cheque, Cash]
 *               holidayListId:
 *                 type: string
 *                 format: uuid
 *               leaveApprovedById:
 *                 type: string
 *                 format: uuid
 *               portfolioUrl:
 *                 type: string
 *                 format: url
 *               githubUrl:
 *                 type: string
 *                 format: url
 *               employeeDocuments:
 *                 type: object
 *               nationalIdNumber:
 *                 type: string
 *     responses:
 *       200:
 *         description: Employee updated
 *       404:
 *         description: Employee not found
 *       409:
 *         description: email already assigned to another employee
 *       422:
 *         description: Cannot edit a separated employee
 */
router.patch(
  "/:id",
  authorize("Employee", action.WRITE),
  employeeController.updateEmployee,
);

/**
 * @swagger
 * /employees/{id}/status:
 *   patch:
 *     summary: Change employee lifecycle status
 *     description: >
 *       Transitions an employee between statuses.
 *       Allowed: `Active → onLeave`, `Active → Suspended`,
 *       `Suspended → Active`, `onLeave → Active`.
 *       **exited can only be set via the Separation workflow**.
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
 *                 enum: [Active, Inactive, onLeave, Suspended, exited]
 *               reason:
 *                 type: string
 *                 description: Required when suspending
 *     responses:
 *       200:
 *         description: Status changed
 *       422:
 *         description: Invalid transition or missing reason
 */
router.patch(
  "/:id/status",
  authorize("Employee", action.SUBMIT),
  employeeController.updateEmployeeStatus,
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
 *       404:
 *         description: Employee not found
 *       422:
 *         description: No linked User account
 */
router.post(
  "/:id/deactivate-user",
  authorize("Employee", action.SUBMIT),
  employeeController.deactivateUser,
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
 *       404:
 *         description: Employee not found
 *       422:
 *         description: No linked User account or already active
 */
router.post(
  "/:id/activate-user",
  authorize("Employee", action.SUBMIT),
  employeeController.activateUser,
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
 *       404:
 *         description: Employee not found
 */
router.get(
  "/:id/org-chart",
  authorize("Employee", action.READ),
  employeeController.getOrgChart,
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
 *       404:
 *         description: Manager not found
 */
router.get(
  "/:id/direct-reports",
  authorize("Employee", action.READ),
  employeeController.getDirectReports,
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
 *                 enum: [Primary, Secondary, Certificate, Diploma, Bachelor, Postgraduate Diploma, Master, Doctorate, Professional]
 *               qualification:
 *                 type: string
 *                 example: "BSc Computer Science"
 *               majorOrField:
 *                 type: string
 *               institution:
 *                 type: string
 *                 example: Addis Ababa University
 *               fromDate:
 *                 type: string
 *                 format: date
 *               toDate:
 *                 type: string
 *                 format: date
 *               grade:
 *                 type: string
 *                 example: "3.8 GPA"
 *               certificateUrl:
 *                 type: string
 *                 description: URL to uploaded certificate file
 *     responses:
 *       201:
 *         description: Education record created
 */
router
  .route("/:id/education")
  .get(authorize("Employee", action.READ), employeeController.getEducation)
  .post(authorize("Employee", action.WRITE), employeeController.addEducation);

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
router
  .route("/:id/education/:recordId")
  .patch(
    authorize("Employee", action.WRITE),
    employeeController.updateEducation,
  )
  .delete(
    authorize("Employee", action.DELETE),
    employeeController.deleteEducation,
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
 *               region:
 *                 type: string
 *               zone:
 *                 type: string
 *               city:
 *                 type: string
 *               designation:
 *                 type: string
 *               department:
 *                 type: string
 *               employmentType:
 *                 type: string
 *                 enum: [Full-time, Part-time, Contract, Internship, Freelance, Other]
 *               fromDate:
 *                 type: string
 *                 format: date
 *               toDate:
 *                 type: string
 *                 format: date
 *               exitReason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Work history record created
 */
router
  .route("/:id/external-work")
  .get(authorize("Employee", action.READ), employeeController.getExternalWork)
  .post(
    authorize("Employee", action.WRITE),
    employeeController.addExternalWork,
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
router
  .route("/:id/external-work/:recordId")
  .patch(
    authorize("Employee", action.WRITE),
    employeeController.updateExternalWork,
  )
  .delete(
    authorize("Employee", action.DELETE),
    employeeController.deleteExternalWork,
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
 *   post:
 *     summary: Add an emergency contact
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
 *               relationship:
 *                 type: string
 *                 enum: [Spouse, Parent, Sibling, Child, Friend, Guardian, Other]
 *               relationshipOther:
 *                 type: string
 *                 description: Free text when relationship is "Other"
 *               phone:
 *                 type: string
 *               alternatePhone:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       201:
 *         description: Emergency contact created
 */
router
  .route("/:id/emergency-contacts")
  .get(
    authorize("Employee", action.READ),
    employeeController.getEmergencyContacts,
  )
  .post(
    authorize("Employee", action.WRITE),
    employeeController.addEmergencyContact,
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
router
  .route("/:id/emergency-contacts/:recordId")
  .patch(
    authorize("Employee", action.WRITE),
    employeeController.updateEmergencyContact,
  )
  .delete(
    authorize("Employee", action.DELETE),
    employeeController.deleteEmergencyContact,
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
 *   put:
 *     summary: Create or replace the entire skill map
 *     description: >
 *       Full upsert — sends the complete `{ skills, certifications, languages }` object.
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
 *               certificateUrls:
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
router
  .route("/:id/skill-map")
  .get(authorize("Employee", action.READ), employeeController.getSkillMap)
  .put(authorize("Employee", action.WRITE), employeeController.upsertSkillMap);

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
 *                 enum: [Resignation, Termination, End of Contract]
 *               initiatedBy:
 *                 type: string
 *                 enum: [Employee, Employer]
 *               resignationDate:
 *                 type: string
 *                 format: date
 *               lastWorkingDay:
 *                 type: string
 *                 format: date
 *               reasonForLeaving:
 *                 type: string
 *               additionalNotes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Separation initiated — Draft
 *       409:
 *         description: Separation already in progress
 *       422:
 *         description: Employee status does not allow separation
 */
router.post(
  "/:id/separation",
  authorize("Employee", action.SUBMIT),
  employeeController.initiateSeparation,
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
router.post(
  "/:id/separation/submit",
  authorize("Employee", action.SUBMIT),
  employeeController.submitSeparation,
);

/**
 * @swagger
 * /employees/{id}/separation/approve:
 *   post:
 *     summary: GM approves separation
 *     description: >
 *       Finalises the separation: sets Employee status to **exited**,
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
 *               relievingDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Separation approved — Employee exited
 *       422:
 *         description: Only separations pending approval can be approved
 */
router.post(
  "/:id/separation/approve",
  authorize("Employee", action.SUBMIT),
  employeeController.approveSeparation,
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
 *     responses:
 *       200:
 *         description: Separation rejected
 *       422:
 *         description: Only separations pending approval can be rejected
 */
router.post(
  "/:id/separation/reject",
  authorize("Employee", action.SUBMIT),
  employeeController.rejectSeparation,
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
 *       **Read-only** — write operations are performed by the Performance module.
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
 */
router.get(
  "/:id/promotions",
  authorize("Employee", action.READ),
  employeeController.getPromotionHistory,
);

// ═════════════════════════════════════════════════════════════════════════════
//  DASHBOARD & STATISTICS (static routes — must be before /:id)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /employees/stats:
 *   get:
 *     summary: Get employee dashboard statistics
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Employee statistics
 */
router.get('/stats',
  authorize('Employee', action.READ),
  employeeController.getEmployeeStats
);

/**
 * @swagger
 * /employees/birthdays:
 *   get:
 *     summary: Get upcoming birthdays this month
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Upcoming birthdays
 */
router.get('/birthdays',
  authorize('Employee', action.READ),
  employeeController.getUpcomingBirthdays
);

/**
 * @swagger
 * /employees/anniversaries:
 *   get:
 *     summary: Get work anniversaries this month
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Work anniversaries
 */
router.get('/anniversaries',
  authorize('Employee', action.READ),
  employeeController.getWorkAnniversaries
);

/**
 * @swagger
 * /employees/recently-joined:
 *   get:
 *     summary: Get recently joined employees (last 30 days)
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
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Recently joined employees
 */
router.get('/recently-joined',
  authorize('Employee', action.READ),
  employeeController.getRecentlyJoined
);

/**
 * @swagger
 * /employees/filter-options:
 *   get:
 *     summary: Get distinct values for filter dropdowns
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Filter options
 */
router.get('/filter-options',
  authorize('Employee', action.READ),
  employeeController.getFilterOptions
);


// ═════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE TIMELINE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /employees/{id}/timeline:
 *   get:
 *     summary: Get employee activity timeline
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
 *     responses:
 *       200:
 *         description: Employee timeline
 */
router.get('/:id/timeline',
  authorize('Employee', action.READ),
  employeeController.getEmployeeTimeline
);

// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = router;
