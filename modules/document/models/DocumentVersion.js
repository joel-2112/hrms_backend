
module.exports = (sequelize, DataTypes) => {
  const DocumentVersion = sequelize.define('DocumentVersion', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FKs ─────────────────────────────────────────────
    // DocumentVersion.belongsTo(Document, { foreignKey: 'documentId', allowNull: false })
    // DocumentVersion.belongsTo(Employee, { as: 'replacedBy', foreignKey: 'replacedById' })
    documentId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → documents.id — the document this version belongs to',
    },
    replacedById: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → employees.id — who uploaded the replacement file',
    },

    // ── Version identity ───────────────────────────────────────
    versionNumber: {
      type:      DataTypes.INTEGER,
      allowNull: false,
      comment:   'Monotonically increasing — version 1 is the first upload, 2 the first replacement, etc.',
    },

    // ── Snapshot of the file at this version ───────────────────
    // We copy the file details from Document at the moment of replacement
    // so this record is self-contained even if the parent Document is later edited.
    fileName: {
      type:      DataTypes.STRING(255),
      allowNull: false,
    },
    filePath: {
      type:      DataTypes.STRING(512),
      allowNull: false,
      comment:   'Path of the archived file — never the same as the current Document.filePath',
    },
    mimeType: {
      type:      DataTypes.STRING(100),
      allowNull: true,
    },
    fileSizeKb: {
      type:      DataTypes.INTEGER,
      allowNull: true,
    },

    // ── Reason for replacement ─────────────────────────────────
    changeReason: {
      type:      DataTypes.TEXT,
      allowNull: true,
      comment:   'Why the file was replaced e.g. "Document expired — renewed copy uploaded"',
    },

    // ── Snapshot of status at the time of archival ─────────────
    statusAtArchival: {
      type:      DataTypes.ENUM('Pending', 'Verified', 'Rejected', 'Expired'),
      allowNull: true,
      comment:   'The verification status of the document at the moment this version was superseded',
    },
  }, {
    tableName: 'document_versions',
    comment:   'Immutable audit trail — one row per file replacement on a Document',
    indexes: [
      {
        unique: true,
        fields: ['document_id', 'version_number'],
        name:   'uq_document_versions_doc_version',
      },
      {
        fields: ['document_id'],
        name:   'idx_document_versions_document',
      },
    ],
  });

  DocumentVersion.associate = () => {};

  return DocumentVersion;
};
