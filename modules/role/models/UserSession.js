// modules/role/models/UserSession.js
module.exports = (sequelize, DataTypes) => {
  const UserSession = sequelize.define('UserSession', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'FK → users.id',
    },
    sessionToken: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Unique session identifier for validation',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IPv4 or IPv6 address',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Browser/device user agent string',
    },
    deviceFingerprint: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'SHA256 hash of IP + UserAgent for device tracking',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    lastActivityAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    terminatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    terminatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'Admin user ID who terminated this session',
    },
  }, {
    tableName: 'user_sessions',
    indexes: [
      { fields: ['user_id', 'is_active'] },
      { fields: ['session_token'], unique: true },
      { fields: ['expires_at'] },
      { fields: ['device_fingerprint'] },
    ],
  });
  return UserSession;
};