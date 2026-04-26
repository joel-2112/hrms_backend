'use strict';

const express = require('express');
const recruitmentController = require('../controllers/recruitmentController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize } = require('../../../middlewares/rbacMiddleware');
console.log('Controller functions:', Object.keys(recruitmentController));
const router = express.Router();

// Helper to validate that a handler is a function
const validateHandler = (handler, name) => {
  if (typeof handler !== 'function') {
    throw new Error(`Handler "${name}" is not a function. Received ${typeof handler}`);
  }
  return handler;
};

router.use(authenticate);

// ==================== STAFFING PLANS ====================
router
  .route('/staffing-plans')
  .get(
    authorize('recruitment', 'StaffingPlan', 'canRead'),
    validateHandler(recruitmentController.listStaffingPlans, 'listStaffingPlans')
  )
  .post(
    authorize('recruitment', 'StaffingPlan', 'canCreate'),
    validateHandler(recruitmentController.createStaffingPlan, 'createStaffingPlan')
  );

router
  .route('/staffing-plans/:id')
  .get(
    authorize('recruitment', 'StaffingPlan', 'canRead'),
    validateHandler(recruitmentController.getStaffingPlan, 'getStaffingPlan')
  )
  .put(
    authorize('recruitment', 'StaffingPlan', 'canWrite'),
    validateHandler(recruitmentController.updateStaffingPlan, 'updateStaffingPlan')
  );

router.put(
  '/staffing-plans/:id/submit',
  authorize('recruitment', 'StaffingPlan', 'canSubmit'),
  validateHandler(recruitmentController.submitStaffingPlan, 'submitStaffingPlan')
);

router.put(
  '/staffing-plans/:id/cancel',
  authorize('recruitment', 'StaffingPlan', 'canWrite'),
  validateHandler(recruitmentController.cancelStaffingPlan, 'cancelStaffingPlan')  // ← was undefined
);

router.get(
  '/staffing-snapshot',
  authorize('recruitment', 'JobRequisition', 'canCreate'),
  validateHandler(recruitmentController.getStaffingSnapshot, 'getStaffingSnapshot')
);

// ==================== JOB REQUISITIONS ====================
router
  .route('/job-requisitions')
  .get(
    authorize('recruitment', 'JobRequisition', 'canRead'),
    validateHandler(recruitmentController.listJobRequisitions, 'listJobRequisitions')
  )
  .post(
    authorize('recruitment', 'JobRequisition', 'canCreate'),
    validateHandler(recruitmentController.createJobRequisition, 'createJobRequisition')
  );

router
  .route('/job-requisitions/:id')
  .get(
    authorize('recruitment', 'JobRequisition', 'canRead'),
    validateHandler(recruitmentController.getJobRequisition, 'getJobRequisition')
  );

router.put(
  '/job-requisitions/:id/submit',
  authorize('recruitment', 'JobRequisition', 'canSubmit'),
  validateHandler(recruitmentController.submitJobRequisition, 'submitJobRequisition')
);

router.put(
  '/job-requisitions/:id/approve-hr',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
  validateHandler(recruitmentController.approveHRRequisition, 'approveHRRequisition')
);

router.put(
  '/job-requisitions/:id/reject-hr',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
  validateHandler(recruitmentController.rejectHRRequisition, 'rejectHRRequisition')
);

router.put(
  '/job-requisitions/:id/approve-gm',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
  validateHandler(recruitmentController.approveGMRequisition, 'approveGMRequisition')
);

router.put(
  '/job-requisitions/:id/reject-gm',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
  validateHandler(recruitmentController.rejectGMRequisition, 'rejectGMRequisition')
);

router.put(
  '/job-requisitions/:id/cancel',
  authorize('recruitment', 'JobRequisition', 'canWrite'),
  validateHandler(recruitmentController.cancelJobRequisition, 'cancelJobRequisition')
);

module.exports = router;