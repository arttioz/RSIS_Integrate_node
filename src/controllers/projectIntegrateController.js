
const {log} = require("debug");
const moment = require('moment');

// Import all models
const EclaimApi = require('../models/raw/EclaimApi');
const ISRawData = require('../models/raw/ISRawData');
const PoliceEventApi = require('../models/raw/PoliceEventApi');
const PoliceVehicleApi = require('../models/raw/PoliceVehicleApi');

const EclaimMergeData = require('../models/EclaimMergeData');
const ISMergeData = require('../models/ISMergeData');
const PoliceEventMergeData = require('../models/PoliceEventMergeData');
const PoliceVehicleMergeData = require('../models/PoliceVehicleMergeData');
const PrepareMerge = require('../models/PrepareMerge');
const Project = require('../models/Project');
const ProjectIntegrateFinal = require('../models/ProjectIntegrateFinal');

const dbServer = require('../../config/connections/db_server');
const dbServerRaw = require('../../config/connections/db_server_raw');

class ProjectIntegrateController {


}
module.exports = ProjectIntegrateController;


module.exports = {


    testDatabaseConnection: async function (req, res) {

        try {
            await dbServer.authenticate();
            console.log('Connection to all models has been established successfully.');

            await dbServerRaw.authenticate();
            console.log('Connection to all raw models has been established successfully.');

            // An array of all the models
            const models = [
                EclaimApi, ISRawData, PoliceEventApi, PoliceVehicleApi,
                EclaimMergeData, ISMergeData, PoliceEventMergeData,
                PoliceVehicleMergeData, PrepareMerge, Project, ProjectIntegrateFinal
            ];

            for (const model of models) {
                // Fetch first row from each model
                console.log(`Testing ${model.tableName}`,model);
                const row = await model.findOne();
                console.log(`First row from ${model.tableName}`);
            }

            return res.send('Connection to all models has been established successfully.');

        } catch (error) {
            console.error(`Unable to connect to the database:`, error);
            return res.status(500).send(`Unable to connect to the database`);
        }
    },


    startProject: async function (req, res) {

        res.json({"code":200, "message":"Job success"})
    },
    cleanDatabase: function (req, res) {

        res.json({"code":200, "message":"Job success"})
    }
}
