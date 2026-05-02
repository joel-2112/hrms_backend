"use strict";

const router = require("express").Router();
const roleController = require("../controllers/roleController");
const roleProfileController = require("../controllers/roleProfileController");
const userPermissionController = require("../controllers/userPermissionController");
const { authenticate } = require("../../../middlewares/authMiddleware");
const { authorize, action } = require("../../../middlewares/rbacMiddleware");

// All role routes require authentication
router.use(authenticate);

/**
 * @swagger
 * tags:
 *   - name: Roles
 *     description: Role management - CRUD operations for roles
 *   - name: RoleProfiles
 *     description: Role profiles - Group multiple roles into profiles
 *   - name: UserPermissions
 *     description: User permissions - Record-level access control
 *   - name: UserRoles
 *     description: User role assignments - Assigning/removing roles to/from users
 *   - name: RolePermissions
 *     description: Role permissions - Managing permissions assigned to roles
 *   - name: UserPermissions
 *     description: User permissions - Record-level access control
 */



// ══════════════════════════════════════════════
//  PERMISSION MANAGEMENT (frontend matrix)
// ══════════════════════════════════════════════

/**
 * @swagger
 * /roles/permissions/resources:
 *   get:
 *     summary: Get all distinct resource names
 *     description: Returns a flat array of resource names for the frontend suggestion dropdown
 *     tags: [RolePermissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Optional filter by resource name
 *     responses:
 *       200:
 *         description: Resource names fetched successfully
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
 *                     type: string
 *                   example: ["Employee", "LeaveApplication", "SalarySlip"]
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 */
router.get(
  '/permissions/resources',
  authorize('RolePermission', action.READ),
  roleController.getAllResourceNames
);
/**
 * @swagger
 * /roles/profiles:
 *   get:
 *     summary: Get all role profiles
 *     tags: [RoleProfiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
 *         description: Include disabled profiles
 *     responses:
 *       200:
 *         description: List of role profiles
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
 *                     profiles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           roles:
 *                             type: array
 *                           disabled:
 *                             type: boolean
 */
router.get(
  "/profiles",
  authorize("RoleProfile", action.READ),
  roleProfileController.getAllRoleProfiles,
);

/**
 * @swagger
 * /roles/permissions:
 *   get:
 *     summary: Get filtered permissions for the permission matrix table
 *     description: >
 *       Returns permission rows filtered by resource name and/or role.
 *       Both filters are optional. Used by the frontend permission management
 *       screen with two search fields (resource + role).
 *     tags: [RolePermissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: resourceName
 *         schema:
 *           type: string
 *         description: Filter by resource name (e.g. LeaveApplication)
 *       - in: query
 *         name: roleName
 *         schema:
 *           type: string
 *         description: Filter by role name — partial match (e.g. "HR")
 *       - in: query
 *         name: roleId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by exact role ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Filtered permissions fetched successfully
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
 *                       documentType:
 *                         type: string
 *                         example: "hr / LeaveApplication"
 *                       resourceName:
 *                         type: string
 *                       moduleName:
 *                         type: string
 *                       role:
 *                         type: string
 *                         example: "HR User"
 *                       roleId:
 *                         type: string
 *                         format: uuid
 *                       level:
 *                         type: integer
 *                       canRead:
 *                         type: boolean
 *                       canWrite:
 *                         type: boolean
 *                       canCreate:
 *                         type: boolean
 *                       canDelete:
 *                         type: boolean
 *                       canSubmit:
 *                         type: boolean
 *                       canCancel:
 *                         type: boolean
 *                       canAmend:
 *                         type: boolean
 *                       canPrint:
 *                         type: boolean
 *                       canEmail:
 *                         type: boolean
 *                       canReport:
 *                         type: boolean
 *                       canImport:
 *                         type: boolean
 *                       canExport:
 *                         type: boolean
 *                       canSetPermissions:
 *                         type: boolean
 *                       permissionId:
 *                         type: string
 *                         format: uuid
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
  '/permissions',
  authorize('RolePermission', action.READ),
  roleController.getFilteredPermissions
);

/**
 * @swagger
 * /roles/permissions/by-resource/{resourceName}:
 *   get:
 *     summary: Get all permission rules for a specific resource across all roles
 *     description: >
 *       Returns every role's permissions for one resource.
 *       Used to see "who has what access" to a given resource.
 *     tags: [RolePermissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceName
 *         required: true
 *         schema:
 *           type: string
 *         description: Resource name (e.g. LeaveApplication, Employee)
 *     responses:
 *       200:
 *         description: Permissions for the resource fetched successfully
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
 *                       resourceName:
 *                         type: string
 *                       role:
 *                         type: string
 *                       roleId:
 *                         type: string
 *                         format: uuid
 *                       level:
 *                         type: integer
 *                       canRead:
 *                         type: boolean
 *                       canWrite:
 *                         type: boolean
 *                       canCreate:
 *                         type: boolean
 *                       canDelete:
 *                         type: boolean
 *                       canSubmit:
 *                         type: boolean
 *                       canCancel:
 *                         type: boolean
 *                       canAmend:
 *                         type: boolean
 *                       canPrint:
 *                         type: boolean
 *                       canEmail:
 *                         type: boolean
 *                       canReport:
 *                         type: boolean
 *                       canImport:
 *                         type: boolean
 *                       canExport:
 *                         type: boolean
 *                       canSetPermissions:
 *                         type: boolean
 *                       permissionId:
 *                         type: string
 *                         format: uuid
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 */
router.get(
  '/permissions/by-resource/:resourceName',
  authorize('RolePermission', action.READ),
  roleController.getPermissionsByResource
);
// ══════════════════════════════════════════════
//  ROLE CRUD
// ══════════════════════════════════════════════

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Roles]
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
 *                 description: Role name
 *                 example: HR Manager
 *               description:
 *                 type: string
 *                 description: Role description
 *                 example: Manages all HR operations
 *     responses:
 *       201:
 *         description: Role created successfully
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
 *                   example: Role created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error
 *       409:
 *         description: Role already exists
 */
router.post("/", authorize("Role", action.CREATE), roleController.createRole);

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: includeDisabled
 *         schema:
 *           type: boolean
 *         description: Include disabled roles
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by role name
 *     responses:
 *       200:
 *         description: List of all roles
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
 *                   example: Roles fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           description:
 *                             type: string
 *                           disabled:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 */
router.get("/", authorize("Role", action.READ), roleController.getAllRoles);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Get a specific role by ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role details
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
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           resource:
 *                             type: string
 *                           action:
 *                             type: string
 *       404:
 *         description: Role not found
 */
router.get("/:id", authorize("Role", action.READ), roleController.getRole);

/**
 * @swagger
 * /roles/{id}:
 *   patch:
 *     summary: Update a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Senior HR Manager
 *               description:
 *                 type: string
 *                 example: Senior role with additional permissions
 *               disabled:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       404:
 *         description: Role not found
 */
router.patch(
  "/:id",
  authorize("Role", action.WRITE),
  roleController.updateRole,
);

/**
 * @swagger
 * /roles/{id}:
 *   delete:
 *     summary: Delete a role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     responses:
 *       204:
 *         description: Role deleted successfully
 *       404:
 *         description: Role not found
 *       409:
 *         description: Cannot delete - role is in use
 */
router.delete(
  "/:id",
  authorize("Role", action.DELETE),
  roleController.deleteRole,
);
// ══════════════════════════════════════════════
//  USER ROLE ASSIGNMENT ROUTES
// ══════════════════════════════════════════════

/**
 * @swagger
 * /roles/users/{userId}/roles:
 *   get:
 *     summary: Get all roles assigned to a user
 *     tags: [UserRoles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of user's roles
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
 *                   example: User roles fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                         example: HR Manager
 *                       isSystemRole:
 *                         type: boolean
 *                         example: false
 *                       disabled:
 *                         type: boolean
 *                         example: false
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
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.get(
  "/users/:userId/roles",
  authorize("UserRole", action.READ),
  roleController.getUserRoles,
);

/**
 * @swagger
 * /roles/users/with-roles:
 *   get:
 *     summary: Get all users with their assigned roles
 *     tags:
 *       - UserRoles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Users with roles fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - success
 *                 - message
 *                 - data
 *                 - meta
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Users with roles fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     required:
 *                       - id
 *                       - email
 *                       - roles
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "b3f9c3d2-1c2a-4a7e-9c8f-123456789abc"
 *                       email:
 *                         type: string
 *                         format: email
 *                         example: user@example.com
 *                       roles:
 *                         type: array
 *                         items:
 *                           type: object
 *                           required:
 *                             - id
 *                             - name
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                               example: "a12b34c5-d678-90ef-1234-56789abcdef0"
 *                             name:
 *                               type: string
 *                               example: HR Manager
 *                             isSystemRole:
 *                               type: boolean
 *                               example: false
 *                             disabled:
 *                               type: boolean
 *                               example: false
 *                 meta:
 *                   type: object
 *                   required:
 *                     - total
 *                     - page
 *                     - limit
 *                     - totalPages
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 20
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 *       404:
 *         description: No users found
 */
router.get(
  "/users/with-roles",
  authorize("UserRole", action.READ),
  roleController.getUsersWithRoles
);

/**
 * @swagger
 * /roles/users/{userId}/roles:
 *   post:
 *     summary: Assign one or more roles to a user
 *     tags: [UserRoles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleIds]
 *             properties:
 *               roleIds:
 *                 type: array
 *                 description: Array of role IDs to assign to the user
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]
 *     responses:
 *       200:
 *         description: Roles assigned successfully
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
 *                   example: Roles assigned successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       isSystemRole:
 *                         type: boolean
 *                       disabled:
 *                         type: boolean
 *       400:
 *         description: Invalid request - roleIds must be a non-empty array
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 *       404:
 *         description: User or role not found
 *       409:
 *         description: Role already assigned to user
 */
router.post(
  "/users/:userId/roles",
  authorize("UserRole", action.SET_PERMISSIONS),
  roleController.assignRolesToUser,
);

/**
 * @swagger
 * /roles/users/{userId}/roles:
 *   put:
 *     summary: Replace all roles for a user
 *     tags: [UserRoles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleIds]
 *             properties:
 *               roleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Complete list of role IDs for the user
 *     responses:
 *       200:
 *         description: Roles updated successfully
 *       404:
 *         description: User or role not found
 */
router.put(
  "/users/:userId/roles",
  authorize("UserRole", action.SET_PERMISSIONS),
  roleController.setUserRoles,
);

/**
 * @swagger
 * /roles/users/{userId}/roles/{roleId}:
 *   delete:
 *     summary: Remove a specific role from a user
 *     tags: [UserRoles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *       - in: path
 *         name: roleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID to remove
 *     responses:
 *       204:
 *         description: Role removed successfully
 *       400:
 *         description: Invalid request - cannot remove last role
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Access denied
 *       404:
 *         description: User or role assignment not found
 */
router.delete(
  "/users/:userId/roles/:roleId",
  authorize("UserRole", action.SET_PERMISSIONS),
  roleController.revokeRoleFromUser,
);

// ══════════════════════════════════════════════
//  ROLE PERMISSIONS
// ══════════════════════════════════════════════
/**
 * @swagger
 * /roles/{id}/permissions:
 *   get:
 *     summary: Get all permissions for a role
 *     tags: [RolePermissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     responses:
 *       200:
 *         description: List of role permissions
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
 *                       roleId:
 *                         type: string
 *                         format: uuid
 *                       moduleName:
 *                         type: string
 *                       resourceName:
 *                         type: string
 *                       permLevel:
 *                         type: integer
 *                       canRead:
 *                         type: boolean
 *                       canWrite:
 *                         type: boolean
 *                       canCreate:
 *                         type: boolean
 *                       canDelete:
 *                         type: boolean
 *                       canSubmit:
 *                         type: boolean
 *                       canCancel:
 *                         type: boolean
 *                       canAmend:
 *                         type: boolean
 *                       canPrint:
 *                         type: boolean
 *                       canEmail:
 *                         type: boolean
 *                       canImport:
 *                         type: boolean
 *                       canExport:
 *                         type: boolean
 *                       canReport:
 *                         type: boolean
 *                       canSetPermissions:
 *                         type: boolean
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
  "/:id/permissions",
  authorize("Role", action.READ),
  roleController.getRolePermissions,
);

/**
 * @swagger
 * /roles/{id}/permissions:
 *   put:
 *     summary: Set/update permissions for a role
 *     tags: [RolePermissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [moduleName, resourceName]
 *             properties:
 *               moduleName:
 *                 type: string
 *                 description: Module the resource belongs to
 *                 example: "hr"
 *               resourceName:
 *                 type: string
 *                 description: Entity name
 *                 example: "Employee"
 *               permLevel:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 9
 *                 default: 0
 *                 description: Field group level (0 = all fields)
 *               canRead:
 *                 type: boolean
 *                 default: false
 *               canWrite:
 *                 type: boolean
 *                 default: false
 *               canCreate:
 *                 type: boolean
 *                 default: false
 *               canDelete:
 *                 type: boolean
 *                 default: false
 *               canSubmit:
 *                 type: boolean
 *                 default: false
 *                 description: Approve/submit documents
 *               canCancel:
 *                 type: boolean
 *                 default: false
 *               canAmend:
 *                 type: boolean
 *                 default: false
 *               canPrint:
 *                 type: boolean
 *                 default: false
 *               canEmail:
 *                 type: boolean
 *                 default: false
 *               canImport:
 *                 type: boolean
 *                 default: false
 *               canExport:
 *                 type: boolean
 *                 default: false
 *               canReport:
 *                 type: boolean
 *                 default: false
 *               canSetPermissions:
 *                 type: boolean
 *                 default: false
 *                 description: Can grant permissions to other users
 *     responses:
 *       200:
 *         description: Permission saved successfully
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     roleId:
 *                       type: string
 *                       format: uuid
 *                     moduleName:
 *                       type: string
 *                     resourceName:
 *                       type: string
 *                     permLevel:
 *                       type: integer
 *                     canRead:
 *                       type: boolean
 *                     canWrite:
 *                       type: boolean
 *                     canCreate:
 *                       type: boolean
 *                     canDelete:
 *                       type: boolean
 *                     canSubmit:
 *                       type: boolean
 *                     canCancel:
 *                       type: boolean
 *                     canAmend:
 *                       type: boolean
 *                     canPrint:
 *                       type: boolean
 *                     canEmail:
 *                       type: boolean
 *                     canImport:
 *                       type: boolean
 *                     canExport:
 *                       type: boolean
 *                     canReport:
 *                       type: boolean
 *                     canSetPermissions:
 *                       type: boolean
 *       400:
 *         description: Invalid permission data
 *       404:
 *         description: Role not found
 */
router.put(
  "/:id/permissions",
  authorize("Role", action.SET_PERMISSIONS),
  roleController.upsertPermission,
);

/**
 * @swagger
 * /roles/{id}/permissions/{permissionId}:
 *   delete:
 *     summary: Remove a specific permission from a role
 *     tags: [RolePermissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role ID
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Permission ID
 *     responses:
 *       204:
 *         description: Permission removed successfully
 *       404:
 *         description: Role or permission not found
 */
router.delete(
  "/:id/permissions/:permissionId",
  authorize("Role", action.SET_PERMISSIONS),
  roleController.deletePermission,
);



// ══════════════════════════════════════════════
//  ROLE PROFILE ROUTES
// ══════════════════════════════════════════════

/**
 * @swagger
 * /roles/profiles:
 *   post:
 *     summary: Create a new role profile
 *     tags: [RoleProfiles]
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
 *                 example: Senior Management
 *               description:
 *                 type: string
 *                 example: Profile for senior management roles
 *               roleIds:
 *                 type: array
 *                 description: Array of role IDs to include in this profile
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["550e8400-e29b-41d4-a716-446655440000"]
 *     responses:
 *       201:
 *         description: Role profile created successfully
 *       409:
 *         description: Profile name already exists
 */
router.post(
  "/profiles",
  authorize("RoleProfile", action.CREAwTE),
  roleProfileController.createRoleProfile,
);



/**
 * @swagger
 * /roles/profiles/{id}:
 *   get:
 *     summary: Get a specific role profile by ID
 *     tags: [RoleProfiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role profile ID
 *     responses:
 *       200:
 *         description: Role profile details
 *       404:
 *         description: Role profile not found
 */
router.get(
  "/profiles/:id",
  authorize("RoleProfile", action.READ),
  roleProfileController.getRoleProfile,
);

/**
 * @swagger
 * /roles/profiles/{id}:
 *   patch:
 *     summary: Update a role profile
 *     tags: [RoleProfiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role profile ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Executive Management
 *               description:
 *                 type: string
 *               disabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Role profile updated successfully
 *       404:
 *         description: Role profile not found
 */
router.patch(
  "/profiles/:id",
  authorize("RoleProfile", action.WRITE),
  roleProfileController.updateRoleProfile,
);

/**
 * @swagger
 * /roles/profiles/{id}:
 *   delete:
 *     summary: Delete a role profile
 *     tags: [RoleProfiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role profile ID
 *     responses:
 *       204:
 *         description: Role profile deleted successfully
 *       404:
 *         description: Role profile not found
 *       409:
 *         description: Cannot delete - profile is assigned to users
 */
router.delete(
  "/profiles/:id",
  authorize("RoleProfile", action.DELETE),
  roleProfileController.deleteRoleProfile,
);

/**
 * @swagger
 * /roles/profiles/{id}/roles:
 *   put:
 *     summary: Set roles for a profile (bulk assign)
 *     tags: [RoleProfiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Role profile ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleIds]
 *             properties:
 *               roleIds:
 *                 type: array
 *                 description: Array of role IDs to assign to this profile
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]
 *     responses:
 *       200:
 *         description: Roles assigned successfully
 *       404:
 *         description: Role profile not found
 */
router.put(
  "/profiles/:id/roles",
  authorize("RoleProfile", action.WRITE),
  roleProfileController.setProfileRoles,
);

// ══════════════════════════════════════════════
//  USER PERMISSION ROUTES (Record-level)
// ══════════════════════════════════════════════

/**
 * @swagger
 * /roles/users/{userId}/permissions:
 *   get:
 *     summary: Get all explicit permissions for a user
 *     tags: [UserPermissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of user permissions
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
 *                     userId:
 *                       type: string
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           resource:
 *                             type: string
 *                           resourceId:
 *                             type: string
 *                           action:
 *                             type: string
 *                           effect:
 *                             type: string
 */
router.get(
  "/users/:userId/permissions",
  authorize("UserPermission", action.READ),
  userPermissionController.getUserPermissions,
);

/**
 * @swagger
 * /roles/users/with-permissions:
 *   get:
 *     summary: Get all user permissions with user details
 *     tags: [UserPermissions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user permissions with user details
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
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           email:
 *                             type: string
 *                       permissions:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             resource:
 *                               type: string
 *                             resourceId:
 *                               type: string
 *                             action:
 *                               type: string
*                             effect:
*                               type: string
 */
router.get(
  "/users/with-permissions",
  authorize("UserPermission", action.READ),
  userPermissionController.getAllUserPermissionsWithUser,
);

/**
 * @swagger
 * /roles/users/{userId}/permissions:
 *   post:
 *     summary: Add a new permission for a user
 *     tags: [UserPermissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resource, action]
 *             properties:
 *               resource:
 *                 type: string
 *                 description: Resource type (e.g., Employee, Document)
 *                 example: Employee
 *               resourceId:
 *                 type: string
 *                 description: Specific resource ID (null for all resources of this type)
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               action:
 *                 type: string
 *                 enum: [create, read, write, delete, manage]
 *                 example: read
 *               effect:
 *                 type: string
 *                 enum: [allow, deny]
 *                 default: allow
 *                 example: allow
 *     responses:
 *       201:
 *         description: Permission added successfully
 *       400:
 *         description: Invalid permission data
 */
router.post(
  "/users/:userId/permissions",
  authorize("UserPermission", action.SET_PERMISSIONS),
  userPermissionController.addUserPermission,
);

/**
 * @swagger
 * /roles/users/{userId}/permissions:
 *   put:
 *     summary: Replace all permissions for a user (full replace)
 *     tags: [UserPermissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permissions]
 *             properties:
 *               permissions:
 *                 type: array
 *                 description: Complete list of permissions for the user
 *                 items:
 *                   type: object
 *                   properties:
 *                     resource:
 *                       type: string
 *                     resourceId:
 *                       type: string
 *                     action:
 *                       type: string
 *                     effect:
 *                       type: string
 *                 example: [
 *                   { resource: "Employee", resourceId: null, action: "read", effect: "allow" },
 *                   { resource: "Document", resourceId: "550e8400...", action: "write", effect: "allow" }
 *                 ]
 *     responses:
 *       200:
 *         description: Permissions replaced successfully
 */
router.put(
  "/users/:userId/permissions",
  authorize("UserPermission", action.SET_PERMISSIONS),
  userPermissionController.replaceUserPermissions,
);

/**
 * @swagger
 * /roles/users/{userId}/permissions/{permissionId}:
 *   delete:
 *     summary: Remove a specific permission from a user
 *     tags: [UserPermissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *       - in: path
 *         name: permissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Permission ID
 *     responses:
 *       204:
 *         description: Permission removed successfully
 *       404:
 *         description: Permission not found
 */
router.delete(
  "/users/:userId/permissions/:permissionId",
  authorize("UserPermission", action.SET_PERMISSIONS),
  userPermissionController.deleteUserPermission,
);

/**
 * @swagger
 * /roles/users/{userId}/effective-permissions:
 *   get:
 *     summary: Get effective permissions for a user (role-based + explicit)
 *     tags: [UserPermissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID
 *     responses:
 *       200:
 *         description: Computed effective permissions
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
 *                     userId:
 *                       type: string
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: object
 *                     effectivePermissions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           resource:
 *                             type: string
 *                           resourceId:
 *                             type: string
 *                           actions:
 *                             type: array
 *                             items:
 *                               type: string
 *                           effect:
 *                             type: string
 */
router.get(
  "/users/:userId/effective-permissions",
  // authorize("UserPermission", action.READ),
  userPermissionController.getUserEffectivePermissions,
);

module.exports = router;
