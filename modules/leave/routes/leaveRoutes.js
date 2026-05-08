'use strict';

/**
 * modules/leave/routes/leaveRoutes.js
 *
 * Leave module routes — Leave Types, Periods, Policies, Assignments,
 * Allocations, Holidays, Block Lists, Compensatory Requests,
 * Applications, Ledger, Encashments, and Compliance utilities.
 *
 * All routes require authentication.
 */

const router = require('express').Router();
const leaveController = require('../controllers/leaveController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize, action } = require('../../../middlewares/rbacMiddleware');

// All routes require authentication
router.use(authenticate);






/**
 * @swagger
 * tags:
 *   - name: LeaveTypes
 *     description: Leave type management — define leave categories and rules
 *   - name: LeavePeriods
 *     description: Leave period management — financial/leave year boundaries
 *   - name: LeavePolicies
 *     description: Leave policy management — entitlement templates
 *   - name: LeavePolicyAssignments
 *     description: Policy assignment — assign policies to employees
 *   - name: LeaveAllocations
 *     description: Leave allocations — granted days per employee per leave type
 *   - name: HolidayLists
 *     description: Holiday list management — company holiday calendars
 *   - name: LeaveBlockLists
 *     description: Leave block lists — dates where leave is restricted
 *   - name: CompensatoryRequests
 *     description: Compensatory leave — claim comp-off for working on holidays
 *   - name: LeaveApplications
 *     description: Leave applications — employee leave requests
 *   - name: LeaveLedger
 *     description: Leave ledger — immutable balance audit trail
 *   - name: LeaveEncashments
 *     description: Leave encashment — convert unused leave to payout
 *   - name: LeaveCompliance
 *     description: Compliance utilities — date checks, balance validation, expiry
 */
// ═════════════════════════════════════════════════════════════════════════════
//  EMPLOYEE SELF-SERVICE — MY LEAVE
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/my-leave/summary:
 *   get:
 *     summary: Get current employee's leave summary (balances, allocations, pending apps)
 *     tags: [LeaveApplications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Employee leave summary fetched successfully
 */
router.get('/my-leave/summary',
  authenticate,
  leaveController.getMyLeaveSummary
);

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
 *         description: Employee applications fetched successfully
 */
router.get('/my-leave/applications',
  authenticate,
  leaveController.getMyLeaveApplications
);

/**
 * @swagger
 * /leaves/my-leave/calendar:
 *   get:
 *     summary: Get current employee's leave calendar (upcoming + history)
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
 *         description: Employee leave calendar fetched successfully
 */
router.get('/my-leave/calendar',
  authenticate,
  leaveController.getMyLeaveCalendar
);

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
 *         description: Period year (e.g., "2026")
 *     responses:
 *       200:
 *         description: Dashboard stats fetched successfully
 */
router.get('/dashboard/stats',
  authorize('LeaveApplication', action.READ),
  leaveController.getDashboardStats
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
 *         description: Dashboard balances fetched successfully
 */
router.get('/dashboard/balances',
  authorize('LeaveAllocation', action.READ),
  leaveController.getDashboardBalances
);

/**
 * @swagger
 * /leaves/dashboard/pending-approvals:
 *   get:
 *     summary: Get pending leave approvals for dashboard
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
 *         description: Pending approvals fetched successfully
 */
router.get('/dashboard/pending-approvals',
  authorize('LeaveApplication', action.READ),
  leaveController.getDashboardPendingApprovals
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
 *         description: On-leave employees fetched successfully
 */
router.get('/dashboard/on-leave-this-week',
  authorize('LeaveApplication', action.READ),
  leaveController.getOnLeaveThisWeek
);

/**
 * @swagger
 * /leaves/dashboard/by-type:
 *   get:
 *     summary: Get leave distribution by type for dashboard
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
 *         description: Leave by type fetched successfully
 */
router.get('/dashboard/by-type',
  authorize('LeaveApplication', action.READ),
  leaveController.getDashboardLeaveByType
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
 *         description: Next holiday fetched successfully
 */
router.get('/dashboard/next-holiday',
  authorize('HolidayList', action.READ),
  leaveController.getNextHoliday
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
 *         description: Dashboard data exported successfully
 */
router.get('/dashboard/export',
  authorize('LeaveApplication', action.READ),
  leaveController.exportDashboard
);

// ═════════════════════════════════════════════════════════════════════════════
//  MY LEDGER — Authenticated Employee
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/my-ledger:
 *   get:
 *     summary: Get leave ledger for the authenticated employee
 *     tags: [LeaveLedger]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: leaveTypeId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by leave type
 *       - in: query
 *         name: voucherType
 *         schema:
 *           type: string
 *           enum: [LeaveAllocation, LeaveApplication, LeaveEncashment, CompensatoryLeaveRequest]
 *         description: Filter by voucher type
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
 *         description: My ledger fetched successfully
 */
router.get('/my-ledger',
  authenticate,
  leaveController.getMyLedger
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
 *                 example: Annual Leave
 *               description:
 *                 type: string
 *               maxDaysAllowed:
 *                 type: number
 *                 default: 0
 *               maxCarryForwardedDays:
 *                 type: number
 *                 default: 0
 *               maxContinuousDaysAllowed:
 *                 type: integer
 *               isLeaveWithoutPay:
 *                 type: boolean
 *                 default: false
 *               isOptionalLeave:
 *                 type: boolean
 *                 default: false
 *               isCompensatory:
 *                 type: boolean
 *                 default: false
 *               isEncashable:
 *                 type: boolean
 *                 default: false
 *               allowNegativeBalance:
 *                 type: boolean
 *                 default: false
 *               includeHolidays:
 *                 type: boolean
 *                 default: false
 *               includeWeekends:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       201:
 *         description: Leave type created successfully
 *       409:
 *         description: Leave type already exists
 *   get:
 *     summary: List all leave types
 *     tags: [LeaveTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Leave types fetched successfully
 */
router.route('/leave-types')
  .post(authorize('LeaveType', action.CREATE), leaveController.createLeaveType)
  .get(authorize('LeaveType', [action.READ, action.READ_SELF]), leaveController.getLeaveTypes);

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
 *         description: Leave type fetched successfully
 *       404:
 *         description: Leave type not found
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
 *         description: Leave type updated successfully
 *       404:
 *         description: Leave type not found
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
 *         description: Leave type disabled successfully
 *       404:
 *         description: Leave type not found
 */
router.route('/leave-types/:id')
  .get(authorize('LeaveType', action.READ), leaveController.getLeaveTypeById)
  .patch(authorize('LeaveType', action.WRITE), leaveController.updateLeaveType)
  .delete(authorize('LeaveType', action.DELETE), leaveController.deleteLeaveType);


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
 *                 example: "2026 (Jan-Dec)"
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
 *                 default: true
 *     responses:
 *       201:
 *         description: Leave period created successfully
 *       409:
 *         description: Leave period already exists
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
 *         description: Leave periods fetched successfully
 */
router.route('/leave-periods')
  .post(authorize('LeavePeriod', action.CREATE), leaveController.createLeavePeriod)
  .get(authorize('LeavePeriod', action.READ), leaveController.getLeavePeriods);

/**
 * @swagger
 * /leaves/leave-periods/active:
 *   get:
 *     summary: Get the active leave period for a company
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
 *         description: Active leave period fetched successfully
 *       404:
 *         description: No active leave period found
 */
router.get('/leave-periods/active',
  authorize('LeavePeriod', action.READ),
  leaveController.getActiveLeavePeriod
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
 *         description: Leave period fetched successfully
 *       404:
 *         description: Leave period not found
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
 *         description: Leave period updated successfully
 *       404:
 *         description: Leave period not found
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
 *       404:
 *         description: Leave period not found
 *       409:
 *         description: Cannot delete — allocations exist
 */
router.route('/leave-periods/:id')
  .get(authorize('LeavePeriod', action.READ), leaveController.getLeavePeriodById)
  .patch(authorize('LeavePeriod', action.WRITE), leaveController.updateLeavePeriod)
  .delete(authorize('LeavePeriod', action.DELETE), leaveController.deleteLeavePeriod);


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE POLICIES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/leave-policies:
 *   post:
 *     summary: Create a new leave policy
 *     tags: [LeavePolicies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, leaveTypes]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Standard Full-Time Policy
 *               leaveTypes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     leaveTypeId:
 *                       type: string
 *                       format: uuid
 *                     annualAllocation:
 *                       type: number
 *                 example:
 *                   - leaveTypeId: "uuid-1"
 *                     annualAllocation: 21
 *                   - leaveTypeId: "uuid-2"
 *                     annualAllocation: 14
 *     responses:
 *       201:
 *         description: Leave policy created successfully
 *       409:
 *         description: Leave policy already exists
 *   get:
 *     summary: List all leave policies
 *     tags: [LeavePolicies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Leave policies fetched successfully
 */
router.route('/leave-policies')
  .post(authorize('LeavePolicy', action.CREATE), leaveController.createLeavePolicy)
  .get(authorize('LeavePolicy', action.READ), leaveController.getLeavePolicies);

/**
 * @swagger
 * /leaves/leave-policies/{id}:
 *   get:
 *     summary: Get a leave policy by ID
 *     tags: [LeavePolicies]
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
 *         description: Leave policy fetched successfully
 *       404:
 *         description: Leave policy not found
 *   patch:
 *     summary: Update a leave policy
 *     tags: [LeavePolicies]
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
 *         description: Leave policy updated successfully
 *       404:
 *         description: Leave policy not found
 *   delete:
 *     summary: Disable a leave policy
 *     tags: [LeavePolicies]
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
 *         description: Leave policy disabled successfully
 *       404:
 *         description: Leave policy not found
 */
router.route('/leave-policies/:id')
  .get(authorize('LeavePolicy', action.READ), leaveController.getLeavePolicyById)
  .patch(authorize('LeavePolicy', action.WRITE), leaveController.updateLeavePolicy)
  .delete(authorize('LeavePolicy', action.DELETE), leaveController.deleteLeavePolicy);


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE POLICY ASSIGNMENTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/policy-assignments:
 *   post:
 *     summary: Assign a leave policy to an employee
 *     tags: [LeavePolicyAssignments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employeeId, leavePolicyId, leavePeriodId, effectiveFrom]
 *             properties:
 *               employeeId:
 *                 type: string
 *                 format: uuid
 *               leavePolicyId:
 *                 type: string
 *                 format: uuid
 *               leavePeriodId:
 *                 type: string
 *                 format: uuid
 *               effectiveFrom:
 *                 type: string
 *                 format: date
 *               effectiveTo:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Leave policy assigned successfully
 *       409:
 *         description: Employee already has a policy for this period
 *   get:
 *     summary: List policy assignments
 *     tags: [LeavePolicyAssignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: leavePeriodId
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
 *         description: Policy assignments fetched successfully
 */
router.route('/policy-assignments')
  .post(authorize('LeavePolicyAssignment', action.CREATE), leaveController.createLeavePolicyAssignment)
  .get(authorize('LeavePolicyAssignment', action.READ), leaveController.getLeavePolicyAssignments);

/**
 * @swagger
 * /leaves/policy-assignments/{id}:
 *   get:
 *     summary: Get a policy assignment by ID
 *     tags: [LeavePolicyAssignments]
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
 *         description: Policy assignment fetched successfully
 *       404:
 *         description: Policy assignment not found
 */
router.get('/policy-assignments/:id',
  authorize('LeavePolicyAssignment', action.READ),
  leaveController.getLeavePolicyAssignmentById
);

/**
 * @swagger
 * /leaves/policy-assignments/{id}/generate-allocations:
 *   post:
 *     summary: Generate LeaveAllocation rows from a policy assignment
 *     tags: [LeavePolicyAssignments]
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
 *       201:
 *         description: Allocations generated successfully
 *       404:
 *         description: Policy assignment not found
 *       422:
 *         description: Allocations already generated
 */
router.post('/policy-assignments/:id/generate-allocations',
  authorize('LeavePolicyAssignment', action.SUBMIT),
  leaveController.generateAllocations
);

/**
 * @swagger
 * /leaves/policy-assignments/{id}/cancel:
 *   post:
 *     summary: Cancel a policy assignment
 *     tags: [LeavePolicyAssignments]
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
 *         description: Policy assignment cancelled successfully
 *       404:
 *         description: Policy assignment not found
 */
router.post('/policy-assignments/:id/cancel',
  authorize('LeavePolicyAssignment', action.SUBMIT),
  leaveController.cancelLeavePolicyAssignment
);


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE ALLOCATIONS (read-only)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/allocations:
 *   get:
 *     summary: List leave allocations
 *     tags: [LeaveAllocations]
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
 *         name: leavePeriodId
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
 *         description: Leave allocations fetched successfully
 */
router.get('/allocations',
  authorize('LeaveAllocation', [action.READ, action.READ_SELF]),
  leaveController.getLeaveAllocations
);

/**
 * @swagger
 * /leaves/allocations/{id}:
 *   get:
 *     summary: Get a leave allocation by ID
 *     tags: [LeaveAllocations]
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
 *         description: Leave allocation fetched successfully
 *       404:
 *         description: Leave allocation not found
 */
router.get('/allocations/:id',
  authorize('LeaveAllocation', action.READ),
  leaveController.getLeaveAllocationById
);

/**
 * @swagger
 * /leaves/balances/{employeeId}:
 *   get:
 *     summary: Get all leave balances for an employee
 *     tags: [LeaveAllocations]
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
 *         description: Leave balances fetched successfully
 */
router.get('/balances/:employeeId',
  authorize('LeaveAllocation',[ action.READ, action.READ_SELF ]),
  leaveController.getLeaveBalances
);

/**
 * @swagger
 * /leaves/balances/{employeeId}/{leaveTypeId}:
 *   get:
 *     summary: Get leave balance for one employee + one leave type
 *     tags: [LeaveAllocations]
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
 *         description: Leave balance fetched successfully
 */
router.get('/balances/:employeeId/:leaveTypeId',
  authorize('LeaveAllocation', [ action.READ, action.READ_SELF]),
  leaveController.getLeaveBalance
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
 *                 example: "Ethiopia Public Holidays 2026"
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
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                     description:
 *                       type: string
 *                 example:
 *                   - date: "2026-01-07"
 *                     description: "Ethiopian Christmas"
 *                   - date: "2026-01-19"
 *                     description: "Timket"
 *     responses:
 *       201:
 *         description: Holiday list created successfully
 *       409:
 *         description: Holiday list already exists
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
 *         description: Holiday lists fetched successfully
 */
router.route('/holiday-lists')
  .post(authorize('HolidayList', action.CREATE), leaveController.createHolidayList)
  .get(authorize('HolidayList', [action.READ, action.READ_SELF]), leaveController.getHolidayLists);

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
 *         description: Holiday list fetched successfully
 *       404:
 *         description: Holiday list not found
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
 *         description: Holiday list updated successfully
 *       404:
 *         description: Holiday list not found
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
 *         description: Holiday list disabled successfully
 *       404:
 *         description: Holiday list not found
 */
router.route('/holiday-lists/:id')
  .get(authorize('HolidayList', action.READ), leaveController.getHolidayListById)
  .patch(authorize('HolidayList', action.WRITE), leaveController.updateHolidayList)
  .delete(authorize('HolidayList', action.DELETE), leaveController.deleteHolidayList);


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
 *                 example: "Year-End Freeze 2026"
 *               companyId:
 *                 type: string
 *                 format: uuid
 *               blockDates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     date:
 *                       type: string
 *                       format: date
 *                     reason:
 *                       type: string
 *               appliesToAllDepartments:
 *                 type: boolean
 *                 default: true
 *               allowedDepartments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       201:
 *         description: Leave block list created successfully
 *       409:
 *         description: Block list already exists
 *   get:
 *     summary: List leave block lists for a company
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
 *         description: Leave block lists fetched successfully
 */
router.route('/block-lists')
  .post(authorize('LeaveBlockList', action.CREATE), leaveController.createLeaveBlockList)
  .get(authorize('LeaveBlockList', action.READ), leaveController.getLeaveBlockLists);

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
 *         description: Leave block list fetched successfully
 *       404:
 *         description: Leave block list not found
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
 *         description: Leave block list updated successfully
 *       404:
 *         description: Leave block list not found
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
 *         description: Leave block list disabled successfully
 *       404:
 *         description: Leave block list not found
 */
router.route('/block-lists/:id')
  .get(authorize('LeaveBlockList', action.READ), leaveController.getLeaveBlockListById)
  .patch(authorize('LeaveBlockList', action.WRITE), leaveController.updateLeaveBlockList)
  .delete(authorize('LeaveBlockList', action.DELETE), leaveController.deleteLeaveBlockList);


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
 *                 description: Must be a compensatory leave type
 *               workDate:
 *                 type: string
 *                 format: date
 *                 description: The holiday/weekend the employee worked
 *               reason:
 *                 type: string
 *     responses:
 *       201:
 *         description: Compensatory leave request created
 *       422:
 *         description: Leave type is not compensatory
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
 *           enum: [Draft, Approved, Rejected, Cancelled]
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
 *         description: Compensatory requests fetched successfully
 */
router.route('/compensatory-requests')
  .post(authorize('CompensatoryLeaveRequest', action.CREATE), leaveController.createCompensatoryRequest)
  .get(authorize('CompensatoryLeaveRequest', action.READ), leaveController.getCompensatoryRequests);

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
 *         description: Compensatory request fetched successfully
 *       404:
 *         description: Compensatory request not found
 */
router.get('/compensatory-requests/:id',
  authorize('CompensatoryLeaveRequest', action.READ),
  leaveController.getCompensatoryRequestById
);

/**
 * @swagger
 * /leaves/compensatory-requests/{id}/submit:
 *   post:
 *     summary: Submit compensatory request for approval
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
 *       422:
 *         description: Only Draft requests can be submitted
 */
router.post('/compensatory-requests/:id/submit',
  authorize('CompensatoryLeaveRequest', action.SUBMIT),
  leaveController.submitCompensatoryRequest
);

/**
 * @swagger
 * /leaves/compensatory-requests/{id}/approve:
 *   post:
 *     summary: Approve compensatory request
 *     description: Creates a LeaveAllocation and credits the ledger
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
 *         description: Compensatory request approved — allocation created
 *       422:
 *         description: Cannot approve — invalid status
 */
router.post('/compensatory-requests/:id/approve',
  authorize('CompensatoryLeaveRequest', action.SUBMIT),
  leaveController.approveCompensatoryRequest
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
router.post('/compensatory-requests/:id/reject',
  authorize('CompensatoryLeaveRequest', action.SUBMIT),
  leaveController.rejectCompensatoryRequest
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
router.post('/compensatory-requests/:id/cancel',
  authorize('CompensatoryLeaveRequest', action.CANCEL),
  leaveController.cancelCompensatoryRequest
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
 *                 default: false
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
 *       422:
 *         description: Insufficient balance or invalid dates
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
 *           enum: [Draft, Open, Approved, Rejected, Cancelled]
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
 *         description: Leave applications fetched successfully
 */
router.route('/applications')
  .post(authenticate, authorize('LeaveApplication', action.CREATE), leaveController.createLeaveApplication)
  .get(authenticate, authorize('LeaveApplication', action.READ), leaveController.getLeaveApplications);

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
 *         description: Leave application fetched successfully
 *       404:
 *         description: Leave application not found
 */
router.get('/applications/:id',
  authorize('LeaveApplication', action.READ),
  leaveController.getLeaveApplicationById
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
 *       422:
 *         description: Only Draft applications can be submitted
 */
router.post('/applications/:id/submit',
  authorize('LeaveApplication', action.SUBMIT),
  leaveController.submitLeaveApplication
);

/**
 * @swagger
 * /leaves/applications/{id}/approve:
 *   post:
 *     summary: Approve leave application
 *     description: Debits the leave ledger and updates balance
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
 *         description: Leave application approved — Balance updated
 *       422:
 *         description: Only Open applications can be approved, or insufficient balance
 */
router.post('/applications/:id/approve',
  authenticate,
  authorize('LeaveApplication', action.WRITE),
  leaveController.approveLeaveApplication
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
 *       422:
 *         description: Only Open applications can be rejected
 */
router.post('/applications/:id/reject',
  authorize('LeaveApplication', action.WRITE),
  leaveController.rejectLeaveApplication
);

/**
 * @swagger
 * /leaves/applications/{id}/cancel:
 *   post:
 *     summary: Cancel leave application
 *     description: If already approved, reverses the debit from the ledger
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
router.post('/applications/:id/cancel',
  authorize('LeaveApplication', action.CANCEL),
  leaveController.cancelLeaveApplication
);


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE LEDGER (read-only)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/ledger/{employeeId}/{leaveTypeId}:
 *   get:
 *     summary: Get full leave ledger for an employee per leave type
 *     tags: [LeaveLedger]
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
 *       - in: query
 *         name: voucherType
 *         schema:
 *           type: string
 *           enum: [LeaveAllocation, LeaveApplication, LeaveEncashment, CompensatoryLeaveRequest]
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
 *         description: Leave ledger fetched successfully
 */
router.get('/ledger/:employeeId/:leaveTypeId',
  authorize('LeaveLedgerEntry', action.READ),
  leaveController.getLeaveLedger
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
 *         description: Ledger entry fetched successfully
 *       404:
 *         description: Ledger entry not found
 */
router.get('/ledger-entries/:id',
  authorize('LeaveLedgerEntry', action.READ),
  leaveController.getLeaveLedgerEntryById
);


// ═════════════════════════════════════════════════════════════════════════════
//  LEAVE ENCASHMENTS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * @swagger
 * /leaves/encashments:
 *   post:
 *     summary: Create a leave encashment request
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
 *                 description: Must be an encashable leave type
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
 *       422:
 *         description: Leave type not encashable or insufficient balance
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
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Leave encashments fetched successfully
 */
router.route('/encashments')
  .post(authorize('LeaveEncashment', action.CREATE), leaveController.createLeaveEncashment)
  .get(authorize('LeaveEncashment', action.READ), leaveController.getLeaveEncashments);

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
 *         description: Leave encashment fetched successfully
 *       404:
 *         description: Leave encashment not found
 */
router.get('/encashments/:id',
  authorize('LeaveEncashment', action.READ),
  leaveController.getLeaveEncashmentById
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
 *       422:
 *         description: Only Draft encashments can be submitted
 */
router.post('/encashments/:id/submit',
  authorize('LeaveEncashment', action.SUBMIT),
  leaveController.submitLeaveEncashment
);

/**
 * @swagger
 * /leaves/encashments/{id}/approve:
 *   post:
 *     summary: Approve encashment
 *     description: Debits the leave ledger
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
 *         description: Leave encashment approved — Balance updated
 *       422:
 *         description: Only submitted encashments can be approved
 */
router.post('/encashments/:id/approve',
  authorize('LeaveEncashment', action.SUBMIT),
  leaveController.approveLeaveEncashment
);

/**
 * @swagger
 * /leaves/encashments/{id}/reject:
 *   post:
 *     summary: Reject encashment
 *     description: Returns encashment to Draft status
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
 *       422:
 *         description: Only submitted encashments can be rejected
 */
router.post('/encashments/:id/reject',
  authorize('LeaveEncashment', action.SUBMIT),
  leaveController.rejectLeaveEncashment
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
router.post('/encashments/:id/cancel',
  authorize('LeaveEncashment', action.CANCEL),
  leaveController.cancelLeaveEncashment
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
router.get('/compliance/check-date',
  authorize('LeaveApplication', action.READ),
  leaveController.checkDate
);

/**
 * @swagger
 * /leaves/compliance/validate-balance:
 *   get:
 *     summary: Validate leave balance before application
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
router.get('/compliance/validate-balance',
  authorize('LeaveApplication', action.READ),
  leaveController.validateLeaveBalance
);

/**
 * @swagger
 * /leaves/compliance/calculate-days:
 *   get:
 *     summary: Calculate working days between two dates
 *     description: Excludes holidays and/or weekends based on parameters
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
 *           default: false
 *       - in: query
 *         name: includeWeekends
 *         schema:
 *           type: boolean
 *           default: false
 *       - in: query
 *         name: holidayListId
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Working days calculated
 */
router.get('/compliance/calculate-days',
  authorize('LeaveApplication', action.READ),
  leaveController.calculateWorkingDays
);

/**
 * @swagger
 * /leaves/compliance/expire-overdue:
 *   post:
 *     summary: Bulk expire overdue ledger entries
 *     description: Marks all ledger entries past their toDate as expired — intended for cron jobs
 *     tags: [LeaveCompliance]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Overdue ledger entries marked as expired
 */
router.post('/compliance/expire-overdue',
  authorize('LeaveLedgerEntry', action.SUBMIT),
  leaveController.expireOverdueLedgerEntries
);


// ═════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════════════════════════════════════

module.exports = router;