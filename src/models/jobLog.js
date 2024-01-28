const Sequelize = require('sequelize');

const database = process.env.DB_DATABASE
const database_host
    = process.env.DB_HOST
const database_username = process.env.DB_USER
const database_password = process.env.DB_PASSWORD


class ApiLogModel {


    sequelize = null;
    constructor() {
        this.sequelize = new Sequelize(database, database_username, database_password, {
            host: database_host,
            dialect: 'mysql'
        });

        this.ApiLog = this.sequelize.define('api_log', {
            organize: {
                type: Sequelize.STRING
            },
            url: {
                type: Sequelize.STRING
            },
            status: {
                type: Sequelize.STRING
            },
            data: {
                type: Sequelize.STRING
            },
            log: {
                type: Sequelize.TEXT
            },
            created_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            },
            updated_at: {
                type: Sequelize.DATE,
                defaultValue: Sequelize.NOW
            }
        }, {
            timestamps: false,
            tableName: 'api_logs'
        });

        // Sync model with the database
        this.sequelize.sync();
    }

    async logApiData(organize, url, data, status, logMessage) {
        try {
            await this.ApiLog.create({
                organize,
                url,
                data,
                status,
                log: logMessage
            });
            console.log('Log entry added successfully');
        } catch (error) {
            console.error('Error adding log entry:', error);
        }
    }

    static async addLog(organize,url, data, status, message) {
        let apiLogger = new ApiLogModel();
        await apiLogger.logApiData(organize, url, JSON.stringify(data), status, message);
    }
}

module.exports = ApiLogModel;