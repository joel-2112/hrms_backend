'use strict';

/**
 * modules/recruitment/routes/recruitmentRoutes.js
 *
 * Base path (mounted in app.js):
 *   app.use('/api/recruitment', recruitmentRoutes);
 *
 * All routes require a valid JWT + role permission.
 */

const express = require('express');
const c = require('../controllers/recruitmentController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/rbacMiddleware');

const router = express.Router();

// ─────────────────────────────────────────────
//  ALL ROUTES REQUIRE AUTHENTICATION
// ─────────────────────────────────────────────
router.use(authenticate);

// ══════════════════════════════════════════════
//  STAFFING PLAN  —  /recruitment/staffing-plans
// ══════════════════════════════════════════════

router
  .route('/staffing-plans')
  .get(authorize('recruitment', 'StaffingPlan', 'canRead'), c.listStaffingPlans)
  .post(authorize('recruitment', 'StaffingPlan', 'canCreate'), c.createStaffingPlan);

router
  .route('/staffing-plans/:id')
  .get(authorize('recruitment', 'StaffingPlan', 'canRead'), c.getStaffingPlan)
  .put(authorize('recruitment', 'StaffingPlan', 'canWrite'), c.updateStaffingPlan);

router.put(
  '/staffing-plans/:id/submit',
  authorize('recruitment', 'StaffingPlan', 'canSubmit'),
  c.submitStaffingPlan
);

router.put(
  '/staffing-plans/:id/cancel',
  authorize('recruitment', 'StaffingPlan', 'canWrite'),
  c.cancelStaffingPlan
);

router.get(
  '/staffing-snapshot',
  authorize('recruitment', 'JobRequisition', 'canCreate'),
  c.getStaffingSnapshot
);

// ══════════════════════════════════════════════
//  JOB REQUISITION  —  /recruitment/job-requisitions
// ══════════════════════════════════════════════

router
  .route('/job-requisitions')
  .get(authorize('recruitment', 'JobRequisition', 'canRead'), c.listJobRequisitions)
  .post(authorize('recruitment', 'JobRequisition', 'canCreate'), c.createJobRequisition);

router
  .route('/job-requisitions/:id')
  .get(authorize('recruitment', 'JobRequisition', 'canRead'), c.getJobRequisition);

router.put(
  '/job-requisitions/:id/submit',
  authorize('recruitment', 'JobRequisition', 'canSubmit'),
  c.submitJobRequisition
);

router.put(
  '/job-requisitions/:id/approve-hr',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
  c.approveHRRequisition
);

router.put(
  '/job-requisitions/:id/reject-hr',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
  c.rejectHRRequisition
);

router.put(
  '/job-requisitions/:id/approve-gm',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
  c.approveGMRequisition
);

router.put(
  '/job-requisitions/:id/reject-gm',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
  c.rejectGMRequisition
);

router.put(
  '/job-requisitions/:id/cancel',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
  c.cancelJobRequisition
);

module.exports = router;