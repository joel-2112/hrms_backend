"use strict";

/**
 * modules/leave/routes/leaveRoutes.js
 */

const router = require("express").Router();
const leaveController = require("../controllers/leaveController");
const { authenticate } = require("../../../middlewares/authMiddleware");
const { authorize, action } = require("../../../middlewares/rbacMiddleware");

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: LeaveTypes
 *     description: Leave type management
 *   - name: LeavePeriods
 *     description: Leave period management
 *   - name: HolidayLists
 *     description: Holiday list management
 *   - name: LeaveBlockLists
 *     description: Leave block list management
 *   - name: CompensatoryRequests
 *     description: Compensatory leave requests
 *   - name: LeaveApplications
 *     description: Leave applications
 *   - name: LeaveLedger
 *     description: Leave ledger entries
 *   - name: LeaveEncashments
 *     description: Leave encashment requests
 *   - name: LeaveCompliance
 *     description: Compliance utilities
 *   - name: LeaveDashboard
 *     description: Leave dashboard
 */

// ═════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE SELF-SERVICE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/my-leave/summary:
 *   get:
 *     summary: Get current employee's leave summary
 *     tags: [LeaveApplications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: My leave summary fetched
 */
router.get("/my-leave/summary", leaveController.getMyLeaveSummary);

/**
 * @swagger
 * /leaves/my-leave/applications:
 *   get:
 *     summary: Get current employee's leave applications
 *     tags: [LeaveApplications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
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
 *         description: My leave applications fetched
 */
router.get("/my-leave/applications", leaveController.getMyLeaveApplications);

/**
 * @swagger
 * /leaves/my-leave/calendar:
 *   get:
 *     summary: Get current employee's leave calendar
 *     tags: [LeaveApplications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: My leave calendar fetched
 */
router.get("/my-leave/calendar", leaveController.getMyLeaveCalendar);

/**
 * @swagger
 * /leaves/my-ledger:
 *   get:
 *     summary: Get leave ledger for authenticated employee
 *     tags: [LeaveLedger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: leaveTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: voucherType
 *         schema:
 *           type: string
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
 *         description: My ledger fetched
 */
router.get("/my-ledger", leaveController.getMyLedger);

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE DASHBOARD
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/dashboard/stats:
 *   get:
 *     summary: Get leave dashboard statistics
 *     tags: [LeaveDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dashboard stats fetched
 */
router.get(
  "/dashboard/stats",
  authorize("LeaveApplication", action.READ),
  leaveController.getDashboardStats,
);

/**
 * @swagger
 * /leaves/dashboard/balances:
 *   get:
 *     summary: Get company-wide leave balance snapshot
 *     tags: [LeaveDashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard balances fetched
 */
router.get("/dashboard/balances", leaveController.getDashboardBalances);

/**
 * @swagger
 * /leaves/dashboard/pending-approvals:
 *   get:
 *     summary: Get pending leave approvals
 *     tags: [LeaveDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 4
 *     responses:
 *       200:
 *         description: Pending approvals fetched
 */
router.get(
  "/dashboard/pending-approvals",
  authorize("LeaveApplication", action.READ),
  leaveController.getDashboardPendingApprovals,
);

/**
 * @swagger
 * /leaves/dashboard/on-leave-this-week:
 *   get:
 *     summary: Get employees on leave this week
 *     tags: [LeaveDashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: On-leave employees fetched
 */
router.get(
  "/dashboard/on-leave-this-week",
  authorize("LeaveApplication", action.READ),
  leaveController.getOnLeaveThisWeek,
);

/**
 * @swagger
 * /leaves/dashboard/by-type:
 *   get:
 *     summary: Get leave distribution by type
 *     tags: [LeaveDashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Leave by type fetched
 */
router.get(
  "/dashboard/by-type",
  authorize("LeaveApplication", action.READ),
  leaveController.getDashboardLeaveByType,
);

/**
 * @swagger
 * /leaves/dashboard/next-holiday:
 *   get:
 *     summary: Get next upcoming public holiday
 *     tags: [LeaveDashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Next holiday fetched
 */
router.get(
  "/dashboard/next-holiday",
  authorize("HolidayList", action.READ),
  leaveController.getNextHoliday,
);

/**
 * @swagger
 * /leaves/dashboard/export:
 *   get:
 *     summary: Export leave dashboard data
 *     tags: [LeaveDashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data exported
 */
router.get(
  "/dashboard/export",
  authorize("LeaveApplication", action.READ),
  leaveController.exportDashboard,
);

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE TYPES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/leave-types:
 *   post:
 *     summary: Create a new leave type
 *     tags: [LeaveTypes]
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
 *               eligibilityMonths:
 *                 type: integer
 *               baseAllocation:
 *                 type: number
 *               annualIncrementDays:
 *                 type: number
 *               incrementCap:
 *                 type: number
 *               allocationRules:
 *                 type: array
 *                 items:
 *                   type: object
 *               maxDaysPerYear:
 *                 type: number
 *               maxCarryForwardYears:
 *                 type: integer
 *               maxContinuousDaysAllowed:
 *                 type: integer
 *               isEncashable:
 *                 type: boolean
 *               includeHolidays:
 *                 type: boolean
 *               includeWeekends:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Leave type created
 *   get:
 *     summary: List all leave types
 *     tags: [LeaveTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeInactive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Leave types fetched
 */
router
  .route("/leave-types")
  .post(authorize("LeaveType", action.CREATE), leaveController.createLeaveType)
  .get(
    authorize("LeaveType", [action.READ, action.READ_SELF]),
    leaveController.getLeaveTypes,
  );

/**
 * @swagger
 * /leaves/leave-types/{id}:
 *   get:
 *     summary: Get a leave type by ID
 *     tags: [LeaveTypes]
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
 *         description: Leave type fetched
 *   patch:
 *     summary: Update a leave type
 *     tags: [LeaveTypes]
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
 *     responses:
 *       200:
 *         description: Leave type updated
 *   delete:
 *     summary: Disable a leave type
 *     tags: [LeaveTypes]
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
 *         description: Leave type disabled
 */
router
  .route("/leave-types/:id")
  .get(authorize("LeaveType", action.READ), leaveController.getLeaveTypeById)
  .patch(authorize("LeaveType", action.WRITE), leaveController.updateLeaveType)
  .delete(
    authorize("LeaveType", action.DELETE),
    leaveController.deleteLeaveType,
  );

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE PERIODS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/leave-periods:
 *   post:
 *     summary: Create a new leave period
 *     tags: [LeavePeriods]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, companyId, startDate, endDate]
 *             properties:
 *               name:
 *                 type: string
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Leave period created
 *   get:
 *     summary: List leave periods
 *     tags: [LeavePeriods]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Leave periods fetched
 */
router
  .route("/leave-periods")
  .post(
    authorize("LeavePeriod", action.CREATE),
    leaveController.createLeavePeriod,
  )
  .get(authorize("LeavePeriod", action.READ), leaveController.getLeavePeriods);

/**
 * @swagger
 * /leaves/leave-periods/active:
 *   get:
 *     summary: Get the active leave period
 *     tags: [LeavePeriods]
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
 *         description: Active leave period fetched
 */
router.get(
  "/leave-periods/active",
  authorize("LeavePeriod", action.READ),
  leaveController.getActiveLeavePeriod,
);

/**
 * @swagger
 * /leaves/leave-periods/{id}:
 *   get:
 *     summary: Get a leave period by ID
 *     tags: [LeavePeriods]
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
 *         description: Leave period fetched
 *   patch:
 *     summary: Update a leave period
 *     tags: [LeavePeriods]
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
 *     responses:
 *       200:
 *         description: Leave period updated
 *   delete:
 *     summary: Delete a leave period
 *     tags: [LeavePeriods]
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
 *         description: Leave period deleted
 */
router
  .route("/leave-periods/:id")
  .get(
    authorize("LeavePeriod", action.READ),
    leaveController.getLeavePeriodById,
  )
  .patch(
    authorize("LeavePeriod", action.WRITE),
    leaveController.updateLeavePeriod,
  )
  .delete(
    authorize("LeavePeriod", action.DELETE),
    leaveController.deleteLeavePeriod,
  );

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE BALANCES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/balances/{employeeId}:
 *   get:
 *     summary: Get all leave balances for an employee
 *     tags: [LeaveApplications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Leave balances fetched
 */
router.get(
  "/balances/:employeeId",
  authorize("LeaveAllocation", [action.READ, action.READ_SELF]),
  leaveController.getLeaveBalances,
);

/**
 * @swagger
 * /leaves/balances/{employeeId}/{leaveTypeId}:
 *   get:
 *     summary: Get leave balance for one employee and leave type
 *     tags: [LeaveApplications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: leaveTypeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Leave balance fetched
 */
router.get(
  "/balances/:employeeId/:leaveTypeId",
  authorize("LeaveAllocation", [action.READ, action.READ_SELF]),
  leaveController.getLeaveBalance,
);

// ═════════════════════════════════════════════════════════════════════════════
//  HOLIDAY LISTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/holiday-lists:
 *   post:
 *     summary: Create a new holiday list
 *     tags: [HolidayLists]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, fromDate, toDate]
 *             properties:
 *               name:
 *                 type: string
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               fromDate:
 *                 type: string
 *                 format: date
 *               toDate:
 *                 type: string
 *                 format: date
 *               holidays:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Holiday list created
 *   get:
 *     summary: List holiday lists
 *     tags: [HolidayLists]
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
 *         description: Holiday lists fetched
 */
router
  .route("/holiday-lists")
  .post(
    authorize("HolidayList", action.CREATE),
    leaveController.createHolidayList,
  )
  .get(
    authorize("HolidayList", [action.READ, action.READ_SELF]),
    leaveController.getHolidayLists,
  );

/**
 * @swagger
 * /leaves/holiday-lists/{id}:
 *   get:
 *     summary: Get a holiday list by ID
 *     tags: [HolidayLists]
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
 *         description: Holiday list fetched
 *   patch:
 *     summary: Update a holiday list
 *     tags: [HolidayLists]
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
 *     responses:
 *       200:
 *         description: Holiday list updated
 *   delete:
 *     summary: Disable a holiday list
 *     tags: [HolidayLists]
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
 *         description: Holiday list disabled
 */
router
  .route("/holiday-lists/:id")
  .get(
    authorize("HolidayList", action.READ),
    leaveController.getHolidayListById,
  )
  .patch(
    authorize("HolidayList", action.WRITE),
    leaveController.updateHolidayList,
  )
  .delete(
    authorize("HolidayList", action.DELETE),
    leaveController.deleteHolidayList,
  );

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE BLOCK LISTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/block-lists:
 *   post:
 *     summary: Create a new leave block list
 *     tags: [LeaveBlockLists]
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
 *               blockDates:
 *                 type: array
 *                 items:
 *                   type: object
 *               appliesToAllDepartments:
 *                 type: boolean
 *               allowedDepartments:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Block list created
 *   get:
 *     summary: List leave block lists
 *     tags: [LeaveBlockLists]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Block lists fetched
 */
router
  .route("/block-lists")
  .post(
    authorize("LeaveBlockList", action.CREATE),
    leaveController.createLeaveBlockList,
  )
  .get(
    authorize("LeaveBlockList", action.READ),
    leaveController.getLeaveBlockLists,
  );

/**
 * @swagger
 * /leaves/block-lists/{id}:
 *   get:
 *     summary: Get a leave block list by ID
 *     tags: [LeaveBlockLists]
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
 *         description: Block list fetched
 *   patch:
 *     summary: Update a leave block list
 *     tags: [LeaveBlockLists]
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
 *     responses:
 *       200:
 *         description: Block list updated
 *   delete:
 *     summary: Disable a leave block list
 *     tags: [LeaveBlockLists]
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
 *         description: Block list disabled
 */
router
  .route("/block-lists/:id")
  .get(
    authorize("LeaveBlockList", action.READ),
    leaveController.getLeaveBlockListById,
  )
  .patch(
    authorize("LeaveBlockList", action.WRITE),
    leaveController.updateLeaveBlockList,
  )
  .delete(
    authorize("LeaveBlockList", action.DELETE),
    leaveController.deleteLeaveBlockList,
  );

// ═════════════════════════════════════════════════════════════════════════════
//  COMPENSATORY LEAVE REQUESTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/compensatory-requests:
 *   post:
 *     summary: Create a compensatory leave request
 *     tags: [CompensatoryRequests]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [leaveTypeId, workDate]
 *             properties:
 *               leaveTypeId:
 *                 type: string
 *                 format: uuid
 *               workDate:
 *                 type: string
 *                 format: date
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Compensatory request created
 *   get:
 *     summary: List compensatory leave requests
 *     tags: [CompensatoryRequests]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
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
 *         description: Compensatory requests fetched
 */
router
  .route("/compensatory-requests")
  .post(
    authorize("CompensatoryLeaveRequest", action.CREATE),
    leaveController.createCompensatoryRequest,
  )
  .get(
    authorize("CompensatoryLeaveRequest", action.READ),
    leaveController.getCompensatoryRequests,
  );

/**
 * @swagger
 * /leaves/compensatory-requests/{id}:
 *   get:
 *     summary: Get a compensatory request by ID
 *     tags: [CompensatoryRequests]
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
 *         description: Compensatory request fetched
 */
router.get(
  "/compensatory-requests/:id",
  authorize("CompensatoryLeaveRequest", action.READ),
  leaveController.getCompensatoryRequestById,
);

/**
 * @swagger
 * /leaves/compensatory-requests/{id}/submit:
 *   post:
 *     summary: Submit compensatory request
 *     tags: [CompensatoryRequests]
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
 *         description: Compensatory request submitted
 */
router.post(
  "/compensatory-requests/:id/submit",
  authorize("CompensatoryLeaveRequest", action.SUBMIT),
  leaveController.submitCompensatoryRequest,
);

/**
 * @swagger
 * /leaves/compensatory-requests/{id}/approve:
 *   post:
 *     summary: Approve compensatory request
 *     tags: [CompensatoryRequests]
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
 *         description: Compensatory request approved
 */
router.post(
  "/compensatory-requests/:id/approve",
  authorize("CompensatoryLeaveRequest", action.SUBMIT),
  leaveController.approveCompensatoryRequest,
);

/**
 * @swagger
 * /leaves/compensatory-requests/{id}/reject:
 *   post:
 *     summary: Reject compensatory request
 *     tags: [CompensatoryRequests]
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
 *             required: [rejectionReason]
 *             properties:
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Compensatory request rejected
 */
router.post(
  "/compensatory-requests/:id/reject",
  authorize("CompensatoryLeaveRequest", action.SUBMIT),
  leaveController.rejectCompensatoryRequest,
);

/**
 * @swagger
 * /leaves/compensatory-requests/{id}/cancel:
 *   post:
 *     summary: Cancel compensatory request
 *     tags: [CompensatoryRequests]
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
 *         description: Compensatory request cancelled
 */
router.post(
  "/compensatory-requests/:id/cancel",
  authorize("CompensatoryLeaveRequest", action.CANCEL),
  leaveController.cancelCompensatoryRequest,
);

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE APPLICATIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/applications:
 *   post:
 *     summary: Create a leave application
 *     tags: [LeaveApplications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, leaveTypeId, fromDate, toDate]
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               leaveTypeId:
 *                 type: string
 *                 format: uuid
 *               fromDate:
 *                 type: string
 *                 format: date
 *               toDate:
 *                 type: string
 *                 format: date
 *               isHalfDay:
 *                 type: boolean
 *               halfDayDate:
 *                 type: string
 *                 format: date
 *               reason:
 *                 type: string
 *               followUpDate:
 *                 type: string
 *                 format: date
 *               holidayListId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Leave application created
 *   get:
 *     summary: List leave applications
 *     tags: [LeaveApplications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: leaveTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
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
 *         description: Leave applications fetched
 */
router
  .route("/applications")
  .post(
    authorize("LeaveApplication", action.CREATE),
    leaveController.createLeaveApplication,
  )
  .get(
    authorize("LeaveApplication", action.READ),
    leaveController.getLeaveApplications,
  );

/**
 * @swagger
 * /leaves/applications/{id}:
 *   get:
 *     summary: Get a leave application by ID
 *     tags: [LeaveApplications]
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
 *         description: Leave application fetched
 */
router.get(
  "/applications/:id",
  authorize("LeaveApplication", [action.READ, action.READ_SELF]),
  leaveController.getLeaveApplicationById,
);

/**
 * @swagger
 * /leaves/applications/{id}/submit:
 *   post:
 *     summary: Submit leave application for approval
 *     tags: [LeaveApplications]
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
 *         description: Leave application submitted
 */
router.post(
  "/applications/:id/submit",
  authorize("LeaveApplication", action.SUBMIT),
  leaveController.submitLeaveApplication,
);

/**
 * @swagger
 * /leaves/applications/{id}/approve:
 *   post:
 *     summary: Approve leave application
 *     tags: [LeaveApplications]
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
 *         description: Leave application approved
 */
router.post(
  "/applications/:id/approve",
  authorize("LeaveApplication", action.WRITE),
  leaveController.approveLeaveApplication,
);

/**
 * @swagger
 * /leaves/applications/{id}/reject:
 *   post:
 *     summary: Reject leave application
 *     tags: [LeaveApplications]
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
 *             required: [rejectionReason]
 *             properties:
 *               rejectionReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Leave application rejected
 */
router.post(
  "/applications/:id/reject",
  authorize("LeaveApplication", action.WRITE),
  leaveController.rejectLeaveApplication,
);

/**
 * @swagger
 * /leaves/applications/{id}/cancel:
 *   post:
 *     summary: Cancel leave application
 *     tags: [LeaveApplications]
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
 *         description: Leave application cancelled
 */
router.post(
  "/applications/:id/cancel",
  authorize("LeaveApplication", action.CANCEL),
  leaveController.cancelLeaveApplication,
);

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE LEDGER
// ═════════════════════════════════════════════════════════════════════════════
/**
 * @swagger
 * /leaves/ledgers:
 *   get:
 *     summary: Get all ledger entries
 *     tags: [LeaveLedger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: leaveTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: voucherType
 *         schema:
 *           type: string
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
 *         description: Ledger entries fetched successfully
 */
router.get("/ledgers", authorize("LeaveLedgerEntry", action.READ), leaveController.getAllLedgerEntries);
/**
 * @swagger
 * /leaves/ledger/{employeeId}/{leaveTypeId}:
 *   get:
 *     summary: Get leave ledger for an employee
 *     tags: [LeaveLedger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string *           format: uuid
 *       - in: path
 *         name: leaveTypeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: voucherType
 *         schema:
 *           type: string
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
 *         description: Leave ledger fetched
 */
router.get(
  "/ledger/:employeeId/:leaveTypeId",
  authorize("LeaveLedgerEntry", action.READ),
  leaveController.getLeaveLedger,
);

/**
 * @swagger
 * /leaves/ledger-entries/{id}:
 *   get:
 *     summary: Get a single ledger entry by ID
 *     tags: [LeaveLedger]
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
 *         description: Ledger entry fetched
 */
router.get(
  "/ledger-entries/:id",
  authorize("LeaveLedgerEntry", action.READ),
  leaveController.getLeaveLedgerEntryById,
);

// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE ENCASHMENTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/encashments:
 *   post:
 *     summary: Create a leave encashment
 *     tags: [LeaveEncashments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, leaveTypeId, leavePeriodId, leavesToEncash]
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               leaveTypeId:
 *                 type: string
 *                 format: uuid
 *               leavePeriodId:
 *                 type: string
 *                 format: uuid
 *               leavesToEncash:
 *                 type: number
 *               encashmentAmount:
 *                 type: number
 *               encashmentDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Leave encashment created
 *   get:
 *     summary: List leave encashments
 *     tags: [LeaveEncashments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Leave encashments fetched
 */
router
  .route("/encashments")
  .post(
    authorize("LeaveEncashment", action.CREATE),
    leaveController.createLeaveEncashment,
  )
  .get(
    authorize("LeaveEncashment", action.READ),
    leaveController.getLeaveEncashments,
  );

/**
 * @swagger
 * /leaves/encashments/{id}:
 *   get:
 *     summary: Get a leave encashment by ID
 *     tags: [LeaveEncashments]
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
 *         description: Leave encashment fetched
 */
router.get(
  "/encashments/:id",
  authorize("LeaveEncashment", action.READ),
  leaveController.getLeaveEncashmentById,
);

/**
 * @swagger
 * /leaves/encashments/{id}/submit:
 *   post:
 *     summary: Submit encashment for approval
 *     tags: [LeaveEncashments]
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
 *         description: Leave encashment submitted
 */
router.post(
  "/encashments/:id/submit",
  authorize("LeaveEncashment", action.SUBMIT),
  leaveController.submitLeaveEncashment,
);

/**
 * @swagger
 * /leaves/encashments/{id}/approve:
 *   post:
 *     summary: Approve encashment
 *     tags: [LeaveEncashments]
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
 *         description: Leave encashment approved
 */
router.post(
  "/encashments/:id/approve",
  authorize("LeaveEncashment", action.SUBMIT),
  leaveController.approveLeaveEncashment,
);

/**
 * @swagger
 * /leaves/encashments/{id}/reject:
 *   post:
 *     summary: Reject encashment
 *     tags: [LeaveEncashments]
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
 *         description: Leave encashment rejected
 */
router.post(
  "/encashments/:id/reject",
  authorize("LeaveEncashment", action.SUBMIT),
  leaveController.rejectLeaveEncashment,
);

/**
 * @swagger
 * /leaves/encashments/{id}/cancel:
 *   post:
 *     summary: Cancel encashment
 *     tags: [LeaveEncashments]
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
 *         description: Leave encashment cancelled
 */
router.post(
  "/encashments/:id/cancel",
  authorize("LeaveEncashment", action.CANCEL),
  leaveController.cancelLeaveEncashment,
);

// ═════════════════════════════════════════════════════════════════════════════
//  COMPLIANCE & UTILITIES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/compliance/check-date:
 *   get:
 *     summary: Check if a date is blocked or a holiday
 *     tags: [LeaveCompliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: departmentId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Date check completed
 */
router.get(
  "/compliance/check-date",
  authorize("LeaveApplication", action.READ),
  leaveController.checkDate,
);

/**
 * @swagger
 * /leaves/compliance/validate-balance:
 *   get:
 *     summary: Validate leave balance
 *     tags: [LeaveCompliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: leaveTypeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: requestedDays
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Balance validation result
 */
router.get(
  "/compliance/validate-balance",
  authorize("LeaveApplication", action.READ),
  leaveController.validateLeaveBalance,
);

/**
 * @swagger
 * /leaves/compliance/calculate-days:
 *   get:
 *     summary: Calculate working days between two dates
 *     tags: [LeaveCompliance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: fromDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: toDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: includeHolidays
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: includeWeekends
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: holidayListId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Working days calculated
 */
router.get(
  "/compliance/calculate-days",
  authorize("LeaveApplication", action.READ),
  leaveController.calculateWorkingDays,
);

/**
 * @swagger
 * /leaves/compliance/expire-overdue:
 *   post:
 *     summary: Bulk expire overdue ledger entries
 *     tags: [LeaveCompliance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue ledger entries expired
 */
router.post(
  "/compliance/expire-overdue",
  authorize("LeaveLedgerEntry", action.SUBMIT),
  leaveController.expireOverdueLedgerEntries,
);

// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = router;
