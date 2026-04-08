'use strict';

const router = require('express').Router();
const roleController = require('../controllers/roleController');
const roleProfileController = require('../controllers/roleProfileController');
const userPermissionController = require('../controllers/userPermissionController');
const { authenticate } = require('../../../middlewares/authMiddleware');
const { authorize, action } = require('../../../middlewares/rbacMiddleware');

// All role routes require authentication
router.use(authenticate);

// ══════════════════════════════════════════════
//  ROLE CRUD
// ══════════════════════════════════════════════

router.post('/', 
  authorize('Role', action.CREATE), 
  roleController.createRole
);

router.get('/', 
  // authorize('Role', action.READ), 
  roleController.getAllRoles
);

router.get('/:id', 
  authorize('Role', action.READ), 
  roleController.getRole
);

router.patch('/:id', 
  authorize('Role', action.WRITE), 
  roleController.updateRole
);

router.delete('/:id', 
  authorize('Role', action.DELETE), 
  roleController.deleteRole
);

// ══════════════════════════════════════════════
//  ROLE PERMISSIONS
// ══════════════════════════════════════════════

router.get('/:id/permissions', 
  authorize('Role', action.READ), 
  roleController.getRolePermissions
);

router.put('/:id/permissions', 
  authorize('Role', action.SET_PERMISSIONS), 
  roleController.upsertPermission
);

router.delete('/:id/permissions/:permissionId', 
  authorize('Role', action.SET_PERMISSIONS), 
  roleController.deletePermission
);

// ══════════════════════════════════════════════
//  ROLE PROFILE ROUTES
// ══════════════════════════════════════════════

router.post('/profiles', 
  authorize('RoleProfile', action.CREATE), 
  roleProfileController.createRoleProfile
);

router.get('/profiles', 
  authorize('RoleProfile', action.READ), 
  roleProfileController.getAllRoleProfiles
);

router.get('/profiles/:id', 
  authorize('RoleProfile', action.READ), 
  roleProfileController.getRoleProfile
);

router.patch('/profiles/:id', 
  authorize('RoleProfile', action.WRITE), 
  roleProfileController.updateRoleProfile
);

router.delete('/profiles/:id', 
  authorize('RoleProfile', action.DELETE), 
  roleProfileController.deleteRoleProfile
);

router.put('/profiles/:id/roles', 
  authorize('RoleProfile', action.WRITE), 
  roleProfileController.setProfileRoles
);

// ══════════════════════════════════════════════
//  USER PERMISSION ROUTES (Record-level)
// ══════════════════════════════════════════════

router.get('/users/:userId/permissions', 
  authorize('UserPermission', action.READ), 
  userPermissionController.getUserPermissions
);

router.post('/users/:userId/permissions', 
  authorize('UserPermission', action.SET_PERMISSIONS), 
  userPermissionController.addUserPermission
);

router.put('/users/:userId/permissions', 
  authorize('UserPermission', action.SET_PERMISSIONS), 
  userPermissionController.replaceUserPermissions
);

router.delete('/users/:userId/permissions/:permissionId', 
  authorize('UserPermission', action.SET_PERMISSIONS), 
  userPermissionController.deleteUserPermission
);

router.get('/users/:userId/effective-permissions', 
  authorize('UserPermission', action.READ), 
  userPermissionController.getUserEffectivePermissions
);

module.exports = router;