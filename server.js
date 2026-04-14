
require('dotenv').config();

const app = require('./app');
const { sequelize }    = require('./models');

const PORT = process.env.PORT || 3000;

async function start() {
  await sequelize.authenticate();
  console.log('✅  Database connected');

  // 2. Sync models (alter: true is safe for dev — never use force: true in production)
  // await sequelize.sync({ alter: true });
  // console.log('✅  Models synced');

  // 3. Start listening
  app.listen(PORT, () => {
    console.log(`🚀  Server running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('❌  Failed to start server:', err);
  process.exit(1);
});