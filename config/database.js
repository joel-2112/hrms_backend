const { Sequelize } = require('sequelize');


const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    parseInt(process.env.DB_PORT) || 5435,
    dialect: 'postgres',

    logging: process.env.NODE_ENV === 'development' ? console.log : false,

    pool: {
      max:     10,
      min:     2,
      acquire: 30000,   
      idle:    10000,   
    },

    define: {
      underscored:     true,
      freezeTableName: false,  
      timestamps:      true,   
      paranoid:        true,   
    },
  },
);

module.exports = { sequelize };