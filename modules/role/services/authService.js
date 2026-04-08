'use strict';

/**
 * modules/role/services/authService.js
 *
 * Handles all authentication operations:
 *   register   — create a User + optional role assignment
 *   login      — verify credentials, issue JWT
 *   getMe      — fetch the authenticated user's full profile
 *   changePassword — verify old password, set new hash
 */

const { User, Role, UserRole, RoleProfile } = require('../../../models');
const { AppError }      = require('../../../middlewares/errorMiddleware');
const { generateToken } = require('../../../middlewares/authMiddleware');

// ─────────────────────────────────────────────
//  REGISTER
// ─────────────────────────────────────────────
const register = async ({ firstName, middleName, lastName, email, password, roleIds = [] }) => {
  if (!email || !password) throw new AppError('Email and password are required', 422);
  if (password.length < 8)  throw new AppError('Password must be at least 8 characters', 422);

  const existing = await User.unscoped().findOne({ where: { email: email.toLowerCase().trim() } });
  if (existing) throw new AppError('A user with this email already exists', 409);

  // passwordHash field triggers the bcrypt beforeSave hook in User.js
  const user = await User.create({
    firstName:    firstName.trim(),
    middleName:   middleName?.trim() || null,
    lastName:     lastName.trim(),
    email:        email.toLowerCase().trim(),
    passwordHash: password,   // hook hashes this before INSERT
    status:       'Active',
  });

  // Assign any initial roles
  if (roleIds.length) {
    const roles = await Role.findAll({ where: { id: roleIds, disabled: false } });
    if (roles.length !== roleIds.length) {
      throw new AppError('One or more role IDs are invalid or disabled', 422);
    }
    await UserRole.bulkCreate(
      roles.map(r => ({ userId: user.id, roleId: r.id })),
      { ignoreDuplicates: true },
    );
  }

  // Return without passwordHash (defaultScope excludes it)
  return User.findByPk(user.id);
};

// ─────────────────────────────────────────────
//  LOGIN
// ─────────────────────────────────────────────
const login = async ({ email, password }) => {
  if (!email || !password) throw new AppError('Email and password are required', 422);

  // Use withPassword scope to get the hash for verification
  const user = await User.scope('withPassword').findOne({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) throw new AppError('Invalid email or password', 401);
  if (user.status !== 'Active') {
    throw new AppError(`Account is ${user.status.toLowerCase()} — contact HR`, 403);
  }

  const valid = await user.verifyPassword(password);
  if (!valid) throw new AppError('Invalid email or password', 401);

  // Update last login timestamp (fire-and-forget — don't await)
  user.update({ lastLogin: new Date() }).catch(() => {});

  // Build JWT payload — keep it minimal, no sensitive data
  const tokenPayload = {
    id:              user.id,
    email:           user.email,
    isSystemManager: user.isSystemManager,
    isSuperUser:     user.isSuperUser,
    roleProfileId:   user.roleProfileId || null,
  };

  const token = generateToken(tokenPayload);

  // Return the clean user object (no hash) alongside the token
  const safeUser = await User.findByPk(user.id);

  return { token, user: safeUser };
};

// ─────────────────────────────────────────────
//  GET ME
// ─────────────────────────────────────────────
const getMe = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [
      {
        model:   Role,
        as:      'roles',
        through: { attributes: [] },
        attributes: ['id', 'name', 'isSystemRole'],
      },
      {
        model:      RoleProfile,
        as:         'RoleProfile',
        attributes: ['id', 'name'],
      },
    ],
  });

  if (!user) throw new AppError('User not found', 404);
  return user;
};

// ─────────────────────────────────────────────
//  CHANGE PASSWORD
// ─────────────────────────────────────────────
const changePassword = async (userId, { currentPassword, newPassword }) => {
  if (!currentPassword || !newPassword) {
    throw new AppError('currentPassword and newPassword are required', 422);
  }
  if (newPassword.length < 8) {
    throw new AppError('New password must be at least 8 characters', 422);
  }
  if (currentPassword === newPassword) {
    throw new AppError('New password must differ from current password', 422);
  }

  const user = await User.scope('withPassword').findByPk(userId);
  if (!user) throw new AppError('User not found', 404);

  const valid = await user.verifyPassword(currentPassword);
  if (!valid) throw new AppError('Current password is incorrect', 401);

  // Triggers the beforeSave bcrypt hook
  await user.update({ passwordHash: newPassword });
};

module.exports = { register, login, getMe, changePassword };