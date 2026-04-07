
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Identity ───────────────────────────────────────────────
    email: {
      type:      DataTypes.STRING(255),
      allowNull: false,
      unique:    true,
      validate:  { isEmail: true },
    },
    firstName: {
      type:      DataTypes.STRING(100),
      allowNull: false,
    },
    middleName: {
      type:      DataTypes.STRING(100),
      allowNull: false,
    },
    lastName: {
      type:      DataTypes.STRING(100),
      allowNull: false,
    },


    // ── Auth ───────────────────────────────────────────────────
    passwordHash: {
      type:      DataTypes.STRING(255),
      allowNull: false,
    },

    // ── Optional RoleProfile FK ────────────────────────────────
    // (declared here so Sequelize knows the column;
    //  the belongsTo association is wired in models/index.js)
    roleProfileId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → role_profiles.id — expands to all roles in that template',
    },

    // ── Status ─────────────────────────────────────────────────
    status: {
      type:         DataTypes.ENUM('Active', 'Inactive', 'Suspended'),
      allowNull:    false,
      defaultValue: 'Active',
    },
    lastLogin: {
      type:      DataTypes.DATE,
      allowNull: true,
    },

    // ── Locale ─────────────────────────────────────────────────
    language: {
      type:         DataTypes.STRING(10),
      allowNull:    false,
      defaultValue: 'en',
      comment:      'BCP-47 language tag e.g. "en", "fr", "sw"',
    },

    // ── Superuser shortcuts ────────────────────────────────────
    isSystemManager: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Shortcut flag — avoids a JOIN to check System Manager role',
    },
    isSuperUser: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Bypasses ALL permission checks when true',
    },
  }, {
    tableName: 'users',
    comment:   'Authenticated system user — the subject of all permission checks',

    // Never return the password hash in any query result
    defaultScope: {
      attributes: { exclude: ['passwordHash'] },
    },

    // Provide a named scope when you explicitly need the hash (login only)
    scopes: {
      withPassword: { attributes: { include: ['passwordHash'] } },
    },

    hooks: {
      // Hash the password before any create or update that touches it
      beforeSave: async (user) => {
        if (user.changed('passwordHash')) {
          user.passwordHash = await bcrypt.hash(user.passwordHash, SALT_ROUNDS);
        }
      },
    },
  });

  // ── Instance helpers ─────────────────────────────────────────
  User.prototype.verifyPassword = function (plainText) {
    return bcrypt.compare(plainText, this.passwordHash);
  };

  User.prototype.fullName = function () {
    return `${this.firstName} ${this.middleName} ${this.lastName}`;
  };
  return User;
};
