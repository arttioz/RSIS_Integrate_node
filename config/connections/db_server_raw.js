require('dotenv').config();
const { Sequelize } = require('sequelize');

const dbServer = new Sequelize(process.env.DB_RAW_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
});

module.exports = dbServer;
