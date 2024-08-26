require('dotenv').config();
const { Sequelize } = require('sequelize');

const DATABASE = process.env.DB_DATABASE;

const dbServer = new Sequelize(DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
        connectTimeout: 1000,  // ms
        dateStrings: true,  // disables casting to JS date type
        typeCast: true,  // configure how to cast/convert values
        supportBigNumbers: true,
        bigNumberStrings: false,
        multipleStatements: true,
    },
    // timezone: '+07:00', // ensures timestamp columns are read/written as expected
    pool: {
        afterCreate: (conn, done) => {
            conn.query("SET SESSION sql_mode='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER'", err => {
                done(err, conn);
            });
        }
    }
});

module.exports = dbServer;