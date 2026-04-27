module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define(
    "Document",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      // ── Parent FKs ─────────────────────────────────────────────
      // Document.belongsTo(DocumentType, { foreignKey: 'documentTypeId', allowNull: false })
      // Document.belongsTo(Employee, { as: 'uploadedBy', foreignKey: 'uploadedById' })
      documentTypeId: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: "FK → document_types.id",
      },
      uploadedById: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: "FK → employees.id — the employee who uploaded this document",
      },

      // ── Document identity ──────────────────────────────────────
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Human-readable document name e.g. "John Doe — National ID"',
      },
      documentNumber: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment:
          "Official document reference number e.g. ID number, passport number",
      },

      // ── File storage ───────────────────────────────────────────
      fileName: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: "Original file name as uploaded",
      },
      filePath: {
        type: DataTypes.STRING(512),
        allowNull: false,
        comment:
          'Server-side path relative to uploads/ root e.g. "documents/uuid.pdf"',
      },
      mimeType: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment:
          'MIME type detected at upload e.g. "application/pdf", "image/jpeg"',
      },
      fileSizeKb: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      // ── Validity window ────────────────────────────────────────
      issueDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      expiryDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: "Populated only when documentType.hasExpiry is true",
      },

      // ── Workflow status ────────────────────────────────────────
      status: {
        type: DataTypes.ENUM("Pending", "Verified", "Rejected", "Expired"),
        allowNull: false,
        defaultValue: "Pending",
      },
      verifiedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      rejectionReason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // ── Owner identification (no FK — universal attachment) ────
      voucherType: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Owner module — e.g. "Employee", "Separation", "Contract"',
      },
      voucherNo: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Owner record identifier — e.g. "EMP-2026-0042"',
      },

      // ── Misc ───────────────────────────────────────────────────
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isConfidential: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: "Confidential documents are hidden from self-service view",
      },
    },
    {
      tableName: "documents",
      comment:
        "An uploaded file attached to an employee — the live / current version",
      indexes: [
        { fields: ["document_type_id"], name: "idx_documents_type" },
        { fields: ["uploaded_by_id"], name: "idx_documents_uploader" },
        { fields: ["status"], name: "idx_documents_status" },
        { fields: ["expiry_date"], name: "idx_documents_expiry" },
        { fields: ["voucher_type", "voucher_no"], name: "idx_documents_owner" },
      ],
    },
  );

  Document.associate = () => {};

  return Document;
};
