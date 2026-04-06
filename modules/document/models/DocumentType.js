
module.exports = (sequelize, DataTypes) => {
  const DocumentType = sequelize.define('DocumentType', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(100),
      allowNull: false,
      unique:    true,
      comment:   'e.g. "National ID", "Passport", "Academic Certificate", "Contract"',
    },
    description: {
      type:      DataTypes.TEXT,
      allowNull: true,
    },

    // ── Classification ─────────────────────────────────────────
    category: {
      type:      DataTypes.ENUM(
        'Identity',
        'Academic',
        'Employment',
        'Medical',
        'Legal',
        'Other'
      ),
      allowNull:    false,
      defaultValue: 'Other',
      comment:      'Broad grouping for filtering and reporting',
    },

    // ── Validation rules ───────────────────────────────────────
    isRequired: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Whether every employee must upload at least one document of this type',
    },
    hasExpiry: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
      comment:      'Whether documents of this type carry an expiry date (e.g. Passport)',
    },
    allowedExtensions: {
      type:      DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      comment:   'Permitted file extensions e.g. ["pdf","jpg","png"]; null = all allowed',
    },
    maxFileSizeKb: {
      type:      DataTypes.INTEGER,
      allowNull: true,
      comment:   'Upload size cap in kilobytes; null = no cap enforced',
    },

    // ── Behaviour flags ────────────────────────────────────────
    disabled: {
      type:         DataTypes.BOOLEAN,
      allowNull:    false,
      defaultValue: false,
    },
  }, {
    tableName: 'document_types',
    comment:   'Classifies uploaded documents — the lookup master for the document module',
  });

  DocumentType.associate = () => {};

  return DocumentType;
};
