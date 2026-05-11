
module.exports = (sequelize, DataTypes) => {
  const Department = sequelize.define('Department', {
    id: {
      type:         DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey:   true,
    },

    // ── Parent FKs ─────────────────────────────────────────────
    companyId: {
      type:      DataTypes.UUID,
      allowNull: false,
      comment:   'FK → companies.id — every department belongs to exactly one company',
    },
    parentDepartmentId: {
      type:      DataTypes.UUID,
      allowNull: true,
      comment:   'FK → departments.id (self-ref) — null means this is a root department',
    },

    // ── Core identity ──────────────────────────────────────────
    name: {
      type:      DataTypes.STRING(255),
      allowNull: false,
    },
  }, {
    tableName: 'departments',
    comment:   'Org unit — self-referencing tree (root dept has null parentDepartmentId)',
    indexes: [
      {
        unique: true,
        fields: ['company_id', 'name'],
        name:   'uq_departments_company_name',
        comment: 'Department names must be unique within a company',
      },
      {
        fields: ['parent_department_id'],
        name:   'idx_departments_parent',
      },
    ],
  });
  return Department;
};
