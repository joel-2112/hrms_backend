'use strict';

/**
 * modules/role/services/roleService.js
 *
 * Single service for the entire Role module:
 *   Role CRUD + system-role protection
 *   RoleProfile CRUD + role assignment
 *   RolePermission upsert / batch / delete
 *   User ↔ Role assignment
 *   UserPermission (record-level)
 *   Effective permission resolution with in-process cache
 *   checkPermission() — the single entry point for rbacMiddleware
 *
 * ─────────────────────────────────────────────
 *  PERMISSION CACHE  (in-process, no Redis dep)
 * ─────────────────────────────────────────────
 *  getUserEffectivePermissions() is called on every protected request
 *  via rbacMiddleware → checkPermission(). Without caching this fires
 *  a multi-join DB query on every API call, which does not scale.
 *
 *  Strategy: module-level Map keyed by userId.
 *    • TTL: CACHE_TTL_MS (default 5 min). Stale entries are evicted on
 *      the next read, not on a background timer, keeping this zero-dep.
 *    • Invalidation: every write that changes a user's effective
 *      permissions calls invalidateUserCache(userId). Bulk writes
 *      (e.g. setRoleProfileRoles) call invalidateAllCache() because the
 *      set of affected users is unknown without an extra query.
 *    • If you later add Redis, swap the Map for a Redis client here —
 *      the rest of the file is unchanged.
 */

const { Op } = require('sequelize');
const {
  sequelize,
  Role,
  RoleProfile,
  RoleProfileRole,
  RolePermission,
  UserRole,
  UserPermission,
  User,
} = require('../../../models');
const { AppError } = require('../../../middlewares/errorMiddleware');
const { getPaginationOptions, buildMeta } = require('../../../utils/pagination');

// ─────────────────────────────────────────────
//  PERMISSION CACHE
// ─────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * @type {Map<string|number, { data: object, expiresAt: number }>}
 */
const permissionCache = new Map();

const getCached = (userId) => {
  const entry = permissionCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    permissionCache.delete(userId);
    return null;
  }
  return entry.data;
};

const setCache = (userId, data) => {
  permissionCache.set(userId, { data, expiresAt: Date.now() + CACHE_TTL_MS });
};

/**
 * Call after any write that changes a single user's effective permissions:
 *   assignRolesToUser, revokeRolesFromUser, assignRoleProfileToUser,
 *   removeRoleProfileFromUser, addUserPermission, deleteUserPermission,
 *   replaceUserPermissions.
 */
const invalidateUserCache = (userId) => {
  permissionCache.delete(userId);
};

/**
 * Call after any write that may affect multiple users' effective permissions:
 *   upsertRolePermission, deleteRolePermission, batchUpsertRolePermissions,
 *   setRoleProfileRoles, deleteRole, updateRole.
 */
const invalidateAllCache = () => {
  permissionCache.clear();
};

// ─────────────────────────────────────────────
//  ACTION → FIELD MAP
//  Single definition used by both checkPermission()
//  and rbacMiddleware so the two never drift apart.
// ─────────────────────────────────────────────

const ACTION_FIELD_MAP = {
  read:           'canRead',
  write:          'canWrite',
  create:         'canCreate',
  delete:         'canDelete',
  submit:         'canSubmit',
  cancel:         'canCancel',
  amend:          'canAmend',
  print:          'canPrint',
  email:          'canEmail',
  import:         'canImport',
  export:         'canExport',
  report:         'canReport',
  setPermissions: 'canSetPermissions',
};

// Exported so rbacMiddleware can use the same constant for action names
const ACTION = Object.fromEntries(Object.keys(ACTION_FIELD_MAP).map(k => [k.toUpperCase(), k]));
// ACTION.READ === 'read', ACTION.SET_PERMISSIONS === 'setPermissions', etc.

// ═════════════════════════════════════════════
//  ROLE CRUD
// ═════════════════════════════════════════════

/**
 * Create a new role.
 * Duplicate names are rejected at the service layer (DB unique constraint
 * would also catch it but we give a friendlier message here).
 */
const createRole = async ({ name, isSystemRole = false }) => {
  const trimmed = name?.trim();
  if (!trimmed) throw new AppError('Role name is required', 422);

  const exists = await Role.findOne({ where: { name: trimmed } });
  if (exists) throw new AppError(`Role "${trimmed}" already exists`, 409);

  return Role.create({ name: trimmed, isSystemRole, disabled: false });
};

/**
 * List roles with optional disabled filter and pagination.
 */
const getAllRoles = async ({ includeDisabled = false, page = 1, limit = 20 } = {}) => {
  const where = includeDisabled ? {} : { disabled: false };
  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await Role.findAndCountAll({
    where,
    limit: lim,
    offset,
    order: [['name', 'ASC']],
  });

  return { data: rows, meta: buildMeta(count, page, lim) };
};

/**
 * Fetch a single role with its permission rules eagerly loaded.
 */
const getRoleById = async (id) => {
  const role = await Role.findByPk(id, {
    include: [{
      model:      RolePermission,
      as:         'RolePermissions',
      order:      [['moduleName', 'ASC'], ['resourceName', 'ASC'], ['permLevel', 'ASC']],
    }],
  });
  if (!role) throw new AppError('Role not found', 404);
  return role;
};

/**
 * Update a role's name and/or disabled flag.
 * System roles cannot be renamed or disabled.
 */
const updateRole = async (id, { name, disabled }) => {
  const role = await Role.findByPk(id);
  if (!role) throw new AppError('Role not found', 404);

  if (role.isSystemRole) {
    if (name !== undefined && name.trim() !== role.name) {
      throw new AppError('System roles cannot be renamed', 403);
    }
    if (disabled === true) {
      throw new AppError('System roles cannot be disabled', 403);
    }
  }

  const updates = {};
  if (name      !== undefined) updates.name     = name.trim();
  if (disabled  !== undefined) updates.disabled = disabled;

  const updated = await role.update(updates);

  // Name change or disable affects all users that carry this role
  invalidateAllCache();

  return updated;
};

/**
 * Soft-delete a role (Sequelize paranoid).
 * Blocked if the role is a system role, is assigned to any user,
 * or is referenced by any role profile.
 */
const deleteRole = async (id) => {
  const role = await Role.findByPk(id);
  if (!role) throw new AppError('Role not found', 404);
  if (role.isSystemRole) throw new AppError('System roles cannot be deleted', 403);

  const [userCount, profileCount] = await Promise.all([
    UserRole.count({ where: { roleId: id } }),
    RoleProfileRole.count({ where: { roleId: id } }),
  ]);

  if (userCount > 0) {
    throw new AppError(
      `Cannot delete — ${userCount} user(s) still assigned to this role`, 409,
    );
  }
  if (profileCount > 0) {
    throw new AppError(
      `Cannot delete — role is used in ${profileCount} role profile(s)`, 409,
    );
  }

  await role.destroy();
  invalidateAllCache();  

};

// ═════════════════════════════════════════════
//  ROLE PROFILE CRUD
// ═════════════════════════════════════════════

/**
 * Create a role profile and optionally seed it with role IDs in one shot.
 */
const createRoleProfile = async ({ name, roleIds = [] }) => {
  const trimmed = name?.trim();
  if (!trimmed) throw new AppError('Profile name is required', 422);

  const exists = await RoleProfile.findOne({ where: { name: trimmed } });
  if (exists) throw new AppError(`RoleProfile "${trimmed}" already exists`, 409);

  const profile = await RoleProfile.create({ name: trimmed, disabled: false });

  if (roleIds.length) {
    await _applyProfileRoles(profile.id, roleIds);
  }

  return getRoleProfileById(profile.id);
};

/**
 * List role profiles with their associated roles eagerly loaded.
 */
const getAllRoleProfiles = async ({ includeDisabled = false, page = 1, limit = 20 } = {}) => {
  const where = includeDisabled ? {} : { disabled: false };
  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await RoleProfile.findAndCountAll({
    where,
    include: [{
      model:   Role,
      as:      'roles',
      through: { attributes: [] },
      where:   { disabled: false },
      required: false,
    }],
    distinct: true, // required for accurate count with include + limit
    limit: lim,
    offset,
    order: [['name', 'ASC']],
  });

  return { data: rows, meta: buildMeta(count, page, lim) };
};

/**
 * Fetch a single role profile with its associated roles.
 */
const getRoleProfileById = async (id) => {
  const profile = await RoleProfile.findByPk(id, {
    include: [{
      model:    Role,
      as:       'roles',
      through:  { attributes: [] },
      where:    { disabled: false },
      required: false,
    }],
  });
  if (!profile) throw new AppError('RoleProfile not found', 404);
  return profile;
};

/**
 * Update a role profile's name and/or disabled flag.
 */
const updateRoleProfile = async (id, { name, disabled }) => {
  const profile = await RoleProfile.findByPk(id);
  if (!profile) throw new AppError('RoleProfile not found', 404);

  const updates = {};
  if (name     !== undefined) updates.name     = name.trim();
  if (disabled !== undefined) updates.disabled = disabled;

  const updated = await profile.update(updates);

  // Disabling a profile affects all users assigned to it
  if (disabled !== undefined) invalidateAllCache();

  return updated;
};

/**
 * Delete a role profile.
 * Blocked if any user is still assigned to it.
 */
const deleteRoleProfile = async (id) => {
  const profile = await RoleProfile.findByPk(id);
  if (!profile) throw new AppError('RoleProfile not found', 404);

  const userCount = await User.count({ where: { roleProfileId: id } });
  if (userCount > 0) {
    throw new AppError(
      `Cannot delete — ${userCount} user(s) still assigned to this profile`, 409,
    );
  }

  await profile.destroy();
};

/**
 * Replace the full set of roles on a profile atomically.
 * All role IDs must be valid and not disabled.
 *
 * Internal helper — called by createRoleProfile and setRoleProfileRoles.
 */
const _applyProfileRoles = async (profileId, roleIds, transaction = null) => {
  // Validate every supplied ID exists and is active
  const roles = await Role.findAll({
    where: { id: { [Op.in]: roleIds }, disabled: false },
  });

  if (roles.length !== roleIds.length) {
    const foundIds = roles.map(r => r.id);
    const bad = roleIds.filter(id => !foundIds.includes(id));
    throw new AppError(
      `Role ID(s) not found or disabled: ${bad.join(', ')}`, 422,
    );
  }

  const t = transaction ?? await sequelize.transaction();
  const managed = !transaction;

  try {
    await RoleProfileRole.destroy({ where: { roleProfileId: profileId }, transaction: t });
    if (roleIds.length) {
      await RoleProfileRole.bulkCreate(
        roleIds.map(roleId => ({ roleProfileId: profileId, roleId })),
        { transaction: t },
      );
    }
    if (managed) await t.commit();
  } catch (err) {
    if (managed) await t.rollback();
    throw err;
  }
};

/**
 * Public API for replacing the role set on a profile.
 * Invalidates the entire cache because any user who carries
 * this profile now has different effective permissions.
 */
const setRoleProfileRoles = async (profileId, roleIds) => {
  const profile = await RoleProfile.findByPk(profileId);
  if (!profile) throw new AppError('RoleProfile not found', 404);

  await _applyProfileRoles(profileId, roleIds);
  invalidateAllCache();

  return getRoleProfileById(profileId);
};

// ═════════════════════════════════════════════
//  ROLE PERMISSIONS
// ═════════════════════════════════════════════

/**
 * Upsert a single permission rule for a role.
 * The unique key is (roleId, moduleName, resourceName, permLevel).
 */
const upsertRolePermission = async (roleId, {
  moduleName,
  resourceName,
  permLevel = 0,
  canRead           = false,
  canWrite          = false,
  canCreate         = false,
  canDelete         = false,
  canSubmit         = false,
  canCancel         = false,
  canAmend          = false,
  canPrint          = false,
  canEmail          = false,
  canImport         = false,
  canExport         = false,
  canReport         = false,
  canSetPermissions = false,
}) => {
  if (!moduleName || !resourceName) {
    throw new AppError('moduleName and resourceName are required', 422);
  }

  const role = await Role.findByPk(roleId);
  if (!role) throw new AppError('Role not found', 404);

  const [permission] = await RolePermission.upsert({
    roleId,
    moduleName,
    resourceName,
    permLevel,
    canRead,
    canWrite,
    canCreate,
    canDelete,
    canSubmit,
    canCancel,
    canAmend,
    canPrint,
    canEmail,
    canImport,
    canExport,
    canReport,
    canSetPermissions,
  });

  invalidateAllCache();
  return permission;
};

/**
 * Batch-upsert multiple permission rules for a role in a single transaction.
 * Uses bulkCreate with updateOnDuplicate to avoid N round-trips.
 */
const batchUpsertRolePermissions = async (roleId, permissions) => {
  if (!Array.isArray(permissions) || permissions.length === 0) {
    throw new AppError('permissions must be a non-empty array', 422);
  }

  const role = await Role.findByPk(roleId);
  if (!role) throw new AppError('Role not found', 404);

  // Validate each entry has required fields before touching the DB
  const invalid = permissions.filter(p => !p.moduleName || !p.resourceName);
  if (invalid.length) {
    throw new AppError('Every permission entry must have moduleName and resourceName', 422);
  }

  const rows = permissions.map(p => ({
    roleId,
    moduleName:        p.moduleName,
    resourceName:      p.resourceName,
    permLevel:         p.permLevel         ?? 0,
    canRead:           p.canRead           ?? false,
    canWrite:          p.canWrite          ?? false,
    canCreate:         p.canCreate         ?? false,
    canDelete:         p.canDelete         ?? false,
    canSubmit:         p.canSubmit         ?? false,
    canCancel:         p.canCancel         ?? false,
    canAmend:          p.canAmend          ?? false,
    canPrint:          p.canPrint          ?? false,
    canEmail:          p.canEmail          ?? false,
    canImport:         p.canImport         ?? false,
    canExport:         p.canExport         ?? false,
    canReport:         p.canReport         ?? false,
    canSetPermissions: p.canSetPermissions ?? false,
  }));

  const updateableFields = [
    'canRead', 'canWrite', 'canCreate', 'canDelete',
    'canSubmit', 'canCancel', 'canAmend',
    'canPrint', 'canEmail', 'canImport', 'canExport', 'canReport',
    'canSetPermissions',
  ];

  await RolePermission.bulkCreate(rows, { updateOnDuplicate: updateableFields });

  invalidateAllCache();
  return getRolePermissions(roleId);
};

/**
 * Paginated list of permission rules for a specific role.
 */
const getRolePermissions = async (roleId, { page = 1, limit = 20 } = {}) => {
  const role = await Role.findByPk(roleId);
  if (!role) throw new AppError('Role not found', 404);

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await RolePermission.findAndCountAll({
    where: { roleId },
    limit: lim,
    offset,
    order: [['moduleName', 'ASC'], ['resourceName', 'ASC'], ['permLevel', 'ASC']],
  });

  return { data: rows, meta: buildMeta(count, page, lim) };
};

/**
 * Delete a single permission rule by its own PK.
 */
const deleteRolePermission = async (permissionId) => {
  const perm = await RolePermission.findByPk(permissionId);
  if (!perm) throw new AppError('Permission rule not found', 404);
  await perm.destroy();
  invalidateAllCache();
};

// ═════════════════════════════════════════════
//  USER ↔ ROLE ASSIGNMENT
// ═════════════════════════════════════════════

/**
 * Grant one or more roles to a user.
 * Duplicate grants are silently ignored (ignoreDuplicates).
 */
const assignRolesToUser = async (userId, roleIds) => {
  if (!Array.isArray(roleIds) || roleIds.length === 0) {
    throw new AppError('roleIds must be a non-empty array', 422);
  }

  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  const roles = await Role.findAll({ where: { id: { [Op.in]: roleIds }, disabled: false } });
  if (roles.length !== roleIds.length) {
    const foundIds = roles.map(r => r.id);
    const bad = roleIds.filter(id => !foundIds.includes(id));
    throw new AppError(`Role ID(s) not found or disabled: ${bad.join(', ')}`, 422);
  }

  await UserRole.bulkCreate(
    roleIds.map(roleId => ({ userId, roleId })),
    { ignoreDuplicates: true },
  );

  invalidateUserCache(userId);
  return getUserRoles(userId);
};

/**
 * Revoke specific roles from a user.
 */
const revokeRolesFromUser = async (userId, roleIds) => {
  if (!Array.isArray(roleIds) || roleIds.length === 0) {
    throw new AppError('roleIds must be a non-empty array', 422);
  }

  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  await UserRole.destroy({ where: { userId, roleId: { [Op.in]: roleIds } } });

  invalidateUserCache(userId);
  return getUserRoles(userId);
};

/**
 * List all active roles assigned to a user (paginated).
 */
const getUserRoles = async (userId, { page = 1, limit = 20 } = {}) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await Role.findAndCountAll({
    include: [{
      model:      UserRole,
      where:      { userId },
      attributes: [],
    }],
    where:  { disabled: false },
    limit:  lim,
    offset,
    order:  [['name', 'ASC']],
  });

  return { data: rows, meta: buildMeta(count, page, lim) };
};

/**
 * Assign a role profile to a user.
 * Also grants all active roles within that profile as direct UserRole rows
 * so permission lookups don't need to traverse the profile join.
 */
const assignRoleProfileToUser = async (userId, roleProfileId) => {
  const [user, profile] = await Promise.all([
    User.findByPk(userId),
    RoleProfile.findByPk(roleProfileId),
  ]);

  if (!user)    throw new AppError('User not found', 404);
  if (!profile) throw new AppError('RoleProfile not found', 404);
  if (profile.disabled) throw new AppError('RoleProfile is disabled', 422);

  const profileRoles = await RoleProfileRole.findAll({
    where:      { roleProfileId },
    attributes: ['roleId'],
  });

  await sequelize.transaction(async (t) => {
    await user.update({ roleProfileId }, { transaction: t });

    if (profileRoles.length) {
      const roleIds = profileRoles.map(pr => pr.roleId);
      await UserRole.bulkCreate(
        roleIds.map(roleId => ({ userId, roleId })),
        { ignoreDuplicates: true, transaction: t },
      );
    }
  });

  invalidateUserCache(userId);
  return getUserWithRolesAndProfile(userId);
};

/**
 * Remove a role profile from a user (sets roleProfileId → null).
 * Does NOT automatically revoke the individual UserRole rows —
 * those must be managed separately to avoid accidentally removing
 * roles the user may also hold independently.
 */
const removeRoleProfileFromUser = async (userId) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);
  await user.update({ roleProfileId: null });
  invalidateUserCache(userId);
  return getUserWithRolesAndProfile(userId);
};

/**
 * Fetch a user with roles and profile attached. Never exposes passwordHash.
 */
const getUserWithRolesAndProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['passwordHash'] },
    include: [
      {
        model:    Role,
        as:       'roles',
        through:  { attributes: [] },
        where:    { disabled: false },
        required: false,
      },
      {
        model:      RoleProfile,
        attributes: ['id', 'name', 'disabled'],
        required:   false,
      },
    ],
  });

  if (!user) throw new AppError('User not found', 404);
  return user;
};

// ═════════════════════════════════════════════
//  USER PERMISSIONS  (record-level restrictions)
// ═════════════════════════════════════════════

/**
 * Add a single record-level permission for a user.
 * Duplicate (userId + allowDocType + allowValue) is rejected.
 */
const addUserPermission = async (userId, { allowDocType, allowValue, applyToAllDocTypes = false }) => {
  if (!allowDocType) throw new AppError('allowDocType is required', 422);

  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  const exists = await UserPermission.findOne({ where: { userId, allowDocType, allowValue } });
  if (exists) throw new AppError('This permission rule already exists for the user', 409);

  const permission = await UserPermission.create({ userId, allowDocType, allowValue, applyToAllDocTypes });

  invalidateUserCache(userId);
  return permission;
};

/**
 * Paginated list of record-level permissions for a user.
 */
const getUserPermissions = async (userId, { page = 1, limit = 20 } = {}) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  const { limit: lim, offset } = getPaginationOptions({ page, limit });

  const { count, rows } = await UserPermission.findAndCountAll({
    where:  { userId },
    limit:  lim,
    offset,
    order:  [['allowDocType', 'ASC'], ['allowValue', 'ASC']],
  });

  return { data: rows, meta: buildMeta(count, page, lim) };
};

/**
 * Delete a single record-level permission by its own PK.
 */
const deleteUserPermission = async (permissionId) => {
  const perm = await UserPermission.findByPk(permissionId);
  if (!perm) throw new AppError('UserPermission not found', 404);
  const { userId } = perm;
  await perm.destroy();
  invalidateUserCache(userId);
};

/**
 * Atomically replace ALL record-level permissions for a user.
 * Useful for a "save all" UI — wipe and re-insert in one transaction.
 */
const replaceUserPermissions = async (userId, permissionList) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  if (!Array.isArray(permissionList)) {
    throw new AppError('permissions must be an array', 422);
  }

  await sequelize.transaction(async (t) => {
    await UserPermission.destroy({ where: { userId }, transaction: t });

    if (permissionList.length) {
      const invalid = permissionList.filter(p => !p.allowDocType);
      if (invalid.length) throw new AppError('Every permission entry must have allowDocType', 422);

      await UserPermission.bulkCreate(
        permissionList.map(p => ({
          userId,
          allowDocType:       p.allowDocType,
          allowValue:         p.allowValue ?? null,
          applyToAllDocTypes: p.applyToAllDocTypes ?? false,
        })),
        { transaction: t },
      );
    }
  });

  invalidateUserCache(userId);
  return getUserPermissions(userId);
};

// ═════════════════════════════════════════════
//  EFFECTIVE PERMISSION RESOLUTION
// ═════════════════════════════════════════════

/**
 * getUserEffectivePermissions(userId)
 *
 * Resolves the complete, merged set of permissions for a user by:
 *   1. Returning from cache if the entry is still fresh.
 *   2. Short-circuiting for superusers (all permissions granted).
 *   3. Loading all active roles the user holds, with their permission rules.
 *   4. Merging rules with OR logic across roles — the most permissive
 *      combination wins (matches Frappe's behavior).
 *   5. Attaching the user's record-level UserPermission rows separately.
 *   6. Storing the result in cache before returning.
 *
 * Shape of the returned object:
 * {
 *   isSuperUser:      boolean,
 *   isSystemManager:  boolean,
 *   permissions:      MergedRolePermission[],  // merged across all roles
 *   userPermissions:  UserPermission[],         // record-level restrictions
 * }
 */
const getUserEffectivePermissions = async (userId) => {
  // ── 1. Cache hit ───────────────────────────────────────────────────
  const cached = getCached(userId);
  if (cached) return cached;

  // ── 2. Load user ───────────────────────────────────────────────────
  const user = await User.findByPk(userId, {
    attributes: { exclude: ['passwordHash'] },
    include: [
      {
        model:    Role,
        as:       'roles',               // ← lowercase 'roles' — matches association in index.js
        through:  { attributes: [] },
        where:    { disabled: false },
        required: false,
        include: [{
          model:    RolePermission,
          as:       'rolePermissions',   // must match association alias
          required: false,
        }],
      },
    ],
  });

  if (!user) throw new AppError('User not found', 404);

  // ── 3. Superuser short-circuit ─────────────────────────────────────
  if (user.isSuperUser) {
    const result = {
      isSuperUser:     true,
      isSystemManager: true,
      permissions:     [],
      userPermissions: [],
    };
    setCache(userId, result);
    return result;
  }

  // ── 4. Merge role permissions with OR logic ─────────────────────────
  // Key: `${moduleName}:${resourceName}:${permLevel}`
  // For each key we keep one merged object and OR every boolean field.
  const permMap = new Map();

  const boolFields = [
    'canRead', 'canWrite', 'canCreate', 'canDelete',
    'canSubmit', 'canCancel', 'canAmend',
    'canPrint', 'canEmail', 'canImport', 'canExport', 'canReport',
    'canSetPermissions',
  ];

  (user.roles || []).forEach(role => {
    (role.RolePermissions || []).forEach(perm => {
      const key = `${perm.moduleName}:${perm.resourceName}:${perm.permLevel}`;

      if (!permMap.has(key)) {
        // First time we see this resource at this level — seed with a plain object
        permMap.set(key, {
          moduleName:   perm.moduleName,
          resourceName: perm.resourceName,
          permLevel:    perm.permLevel,
          ...Object.fromEntries(boolFields.map(f => [f, perm[f] ?? false])),
        });
      } else {
        const existing = permMap.get(key);
        boolFields.forEach(f => {
          existing[f] = existing[f] || (perm[f] ?? false);
        });
      }
    });
  });

  // ── 5. Load record-level UserPermissions ───────────────────────────
  const userPermissions = await UserPermission.findAll({
    where: { userId },
    order: [['allowDocType', 'ASC'], ['allowValue', 'ASC']],
  });

  // ── 6. Build result, cache, and return ─────────────────────────────
  const result = {
    isSuperUser:     false,
    isSystemManager: user.isSystemManager ?? false,
    permissions:     Array.from(permMap.values()),
    userPermissions,
  };

  setCache(userId, result);
  return result;
};

// ═════════════════════════════════════════════
//  PERMISSION CHECKING — entry point for rbacMiddleware
// ═════════════════════════════════════════════

/**
 * checkPermission(userId, resourceName, action, moduleName, permLevel)
 *
 * Returns true if the user is allowed to perform `action` on `resourceName`.
 *
 * @param {string|number} userId
 * @param {string}        resourceName  - e.g. 'Employee', 'SalarySlip'
 * @param {string}        action        - one of ACTION_FIELD_MAP keys, e.g. 'read', 'create'
 * @param {string}        [moduleName]  - defaults to 'default' for backward compat
 * @param {number}        [permLevel]   - defaults to 0
 *
 * Throws AppError(403) if denied so rbacMiddleware can just await and not
 * check the return value — though returning the boolean is also supported
 * for service-layer guards.
 */
const checkPermission = async (userId, resourceName, action, moduleName = 'default', permLevel = 0) => {
  const field = ACTION_FIELD_MAP[action];
  if (!field) throw new AppError(`Unknown action "${action}"`, 400);

  const effective = await getUserEffectivePermissions(userId);

  // Superusers bypass all checks
  if (effective.isSuperUser) return true;

  // System managers can read anything — restricted only on write/delete operations
  if (effective.isSystemManager && action === 'read') return true;

  // Find the most permissive rule that covers this resource at or below the requested level
  const matchingRule = effective.permissions.find(p =>
    p.resourceName === resourceName &&
    p.moduleName   === moduleName   &&
    p.permLevel    <= permLevel,
  );

  if (!matchingRule) return false;
  return matchingRule[field] === true;
};

// ═════════════════════════════════════════════
//  EXPORTS
// ═════════════════════════════════════════════

module.exports = {
  // Constants
  ACTION,               // use in rbacMiddleware: ACTION.READ, ACTION.CREATE, etc.
  ACTION_FIELD_MAP,     // use in rbacMiddleware if it needs to validate action strings

  // Cache management (exported for testing and manual invalidation)
  invalidateUserCache,
  invalidateAllCache,

  // Role
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,

  // RoleProfile
  createRoleProfile,
  getAllRoleProfiles,
  getRoleProfileById,
  updateRoleProfile,
  deleteRoleProfile,
  setRoleProfileRoles,

  // RolePermission
  upsertRolePermission,
  batchUpsertRolePermissions,
  getRolePermissions,
  deleteRolePermission,

  // User ↔ Role
  assignRolesToUser,
  revokeRolesFromUser,
  getUserRoles,
  assignRoleProfileToUser,
  removeRoleProfileFromUser,
  getUserWithRolesAndProfile,

  // UserPermission
  addUserPermission,
  getUserPermissions,
  deleteUserPermission,
  replaceUserPermissions,

  // Permission resolution
  getUserEffectivePermissions,
  checkPermission,
};