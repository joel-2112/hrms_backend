require('dotenv').config();

const { sequelize, User, Role, UserRole } = require('../models');

async function seedAdmin() {
  await sequelize.authenticate();
  console.log('✅  Database connected');

  await sequelize.sync();

  // Create System Manager role
  const [role] = await Role.findOrCreate({
    where: { name: 'System Manager' },
    defaults: { isSystemRole: true, disabled: false },
  });
  console.log(`✅  Role: ${role.name}`);

  // Create admin user
  const [user, created] = await User.unscoped().findOrCreate({
    where: { email: 'admin@hrms.com' },
    defaults: {
      username:        'admin',
      firstName:       'System',
      middleName:      '',
      lastName:        'Admin',
      passwordHash:    'Admin@1234',   // hashed by beforeSave hook
      status:          'Active',
      isSystemManager: true,
      isSuperUser:     true,
    },
  });

  if (created) {
    console.log('✅  Admin user created');
  } else {
    console.log('ℹ️   Admin user already exists — skipping');
  }

  // Assign role to user
  await UserRole.findOrCreate({
    where: { userId: user.id, roleId: role.id },
  });
  console.log('✅  Role assigned to admin');

  console.log('\n--- Admin credentials ---');
  console.log('  Email:    admin@hrms.com');
  console.log('  Password: Admin@1234');
  console.log('-------------------------\n');

  await sequelize.close();
}

seedAdmin().catch((err) => {
  console.error('❌  Seed failed:', err.message);
  process.exit(1);
});
