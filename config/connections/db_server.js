require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE = process.env.DB_DATABASE + process.env.PROVINCE;
const dbServer = new Sequelize( DATABASE , process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false
});

module.exports = dbServer;
