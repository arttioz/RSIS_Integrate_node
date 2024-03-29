
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
const {Op} = require("sequelize");
const provinces = require('../utils/provinces');


const ProcessIntegrateController = require('./processIntegrateController');
require('dotenv').config();

class ProjectIntegrateController {


    static async startProject(preDate,startDate,endDate,subDate,provinceCode){

        let project = await ProjectIntegrateController.getProject(preDate,startDate,endDate,subDate,provinceCode);

        console.log("Start Integrate Project",project.id,project.province_code);
        console.log("Pre Date:",preDate.format('DD/MM/YYYY'));
        console.log("Start date:",startDate.format('DD/MM/YYYY'));
        console.log("End Date:",endDate.format('DD/MM/YYYY'));
        console.log("Sub Date:",subDate.format('DD/MM/YYYY'));


        console.log(`Import Data For Project`, project.id);

        console.time('importDataForProject');
        await this.importDataForProject(preDate, subDate, project);
        console.timeEnd('importDataForProject');

        let processController = new ProcessIntegrateController(project.id,project.province_code);

        await processController.mergeRSIS()

    }

    static async importDataForProject(startDate,endDate,project){

        await this.importISAPIData(startDate, endDate, project)
        await this.importEclaimAPIData(startDate, endDate, project)
        await this.importPoliceEventAPIData(startDate, endDate, project)
        await this.importPoliceVehicleAPIData(startDate, endDate, project)
    }

    static async getProject(preDate,startDate,endDate,subDate,provinceCode){

        let project = null;
        try {
            // Find one project that matches the criteria.
            project = await Project.findOne({
                where: {
                    start_date: startDate,
                    end_date: endDate,
                    province_code: provinceCode
                }
            });

            // If no project found, create a new one and save it to DB.
            if (!project){
                project = await Project.create({
                    name: "Auto Project",
                    province_code: provinceCode,
                    pre_date: preDate,
                    start_date: startDate,
                    end_date: endDate,
                    sub_date: subDate,
                    status: "รอข้อมูล",
                    is_run: 0
                });
            }

            // If project is running, log a message and return.
            if (project.is_run === 1) {
                console.log("Project is running");
                return; // This is similar to PHP's 'exit'.
            }

            // Update project's status and save to DB.
            project.is_run = 1;
            project.status = "ระบบกำลังประมวลผล";

            await project.save();

        } catch(error) {
            console.error(error);
        }finally {
            return  project;
        }
    }


    static async importISAPIData(startDate,endDate,project){

        console.log(`Import IS DATA For project`,project.id);

        await ISMergeData.destroy({ truncate : true, cascade: false });

        let rawRecords = await ISRawData.findAll({
            where: {
                adate: {
                    [Op.gte]: startDate,  // >= startDate
                    [Op.lte]: moment(endDate).endOf('day').toDate() // Less than or equal to end of endDate
                },
                aplace: project.province_code
            },
        });

        console.log("IS Record",rawRecords.length);

        let newRecords = []; // array to hold new records

        let minnDate = new Date("2000-01-01");
        for (let oldRecord of rawRecords) {
            let recordPlain = oldRecord.get({ plain: true });
            let ddate = this.setDate0(recordPlain.date, minnDate);
            let diser = this.setDate0(recordPlain.diser, minnDate);
            let timer = this.setDate0(recordPlain.timer, minnDate);
            let birth = this.setDate0(recordPlain.birth, minnDate);
            let rdate = this.setDate0(recordPlain.rdate, minnDate);
            let buytime = this.setDate0(recordPlain.buytime, minnDate);
            let edt = this.setDate0(recordPlain.edt, minnDate);
            let sentmoph = this.setDate0(recordPlain.sentmoph, minnDate);
            let dgis = this.setDate0(recordPlain.dgis, minnDate);
            let dupload = this.setDate0(recordPlain.dupload, minnDate);
            let newRecord = {
                // copy all properties from oldRecord
                ...oldRecord.get({ plain: true }),  // convert instance to plain object
                // set new properties
                ref: oldRecord.ref,
                project_id: project.id,
                ddate: ddate,
                diser: diser,
                timer: timer,
                birth: birth,
                rdate: rdate,
                buytime: buytime,
                edt: edt,
                sentmoph: sentmoph,
                dgis: dgis,
                dupload: dupload,
                // mysql and temp_is_clean already set with your Sequelize setup
            };

            newRecords.push(newRecord);
        }
        // bulk create new records in ISMergeData
        if(newRecords.length > 0){
            await ISMergeData.bulkCreate(newRecords);
        }
    }

    static async importEclaimAPIData(startDate,endDate,project){

        const columnMapping = {
            cid: 'IdCard',
            vehicle_plate_province: 'CarProv',
            vehicle_type: 'CarType',
            prename: 'Prefix',
            name: 'Fname',
            lname: 'Lname',
            gender: 'Sex',
            nation: 'Nationality',
            birthdate: 'BirthDate',
            age: 'Age',
            adate: 'AccDate',
            atumbol: 'AccSubDistict',
            aaumpor: 'AccDistict',
            aprovince: 'AccProvince',
            alat: 'Latitude',
            along: 'Longitude',
            crash_desc: 'BrokenStatus',
            occupation: 'Career',
            address_aumpor: 'DistictAddress',
            address_province: 'ProvinceAddress',
            hospcode: 'HospitalId',
            injury_status: 'Broken',
            ride_status: 'VictimType',
            cost: 'AmountOf'
        };

        // Erase the EclaimMergeData table
        await EclaimMergeData.destroy({ truncate : true, cascade: false });

        let province_name = provinces[project.province_code];
        // Fetch records that meets the date requirements
        let rawRecords = await EclaimApi.findAll({
            where: {
                AccDate: {
                    [Op.gte]: startDate,
                    [Op.lte]: moment(endDate).endOf('day').toDate() // Less than or equal to end of endDate
                },
                AccProvince: province_name
            }
        });

        console.log("Eclaim Record",rawRecords.length);

        // Prepare an array for the new records
        let newRecordsData = [];

        // Loop through each record, transforming it
        for (let oldRecord of rawRecords) {
            // Transform each record according to the columnMapping
            let newRecordData = {};
            for (let newColumn in columnMapping) {
                let oldColumn = columnMapping[newColumn];
                newRecordData[newColumn] = oldRecord[oldColumn];
            }
            newRecordData['project_id'] = project.id;

            // Add the new record data to the array
            newRecordsData.push(newRecordData);
        }

        // Bulk-create the new records
        if (newRecordsData.length > 0) {
            await EclaimMergeData.bulkCreate(newRecordsData);
        }

    }


    static async importPoliceEventAPIData(startDate,endDate,project){
        const columnMappingEvent = {
            event_id: 'AccidentNumber',
            adate: 'CaseDay',
            atime: 'CaseTime',
            borchor: 'CaseOffice',
            borkor: 'CaseSubOffice',
            sornor: 'CaseStation',
            light: 'FactorLight',
            alat: 'CaseLatitude',
            along: 'CaseLongitude',
            aroad: 'CaseRoad',
            atumbol: 'CaseSubdistrict',
            aaumpor: 'CaseDistrict',
            aprovince: 'CaseProvince',
            aroad_type: 'FactorRoadType',
            alane: 'FactorLane',
            alane_sub: 'FactorLane_Sub',
            aroad_character: 'CaseRoadDetails',
            aroad_character_other: 'CaseRoadDetailsOther',
            aroad_factor: 'CaseRoadCondition',
            aroadfit_factor: 'CaseRoadConditionOther',
            aenv_factor: 'CaseRoadEnvironment',
            aenv_factor_other: 'CaseRoadEnvironmentOther',
            abehavior_factor: 'CaseBehaviorDriver',
            abehavior_other_factor: 'CaseBehaviorDriverOther',
            avehicle_factor: 'CaseEquipmentDefective',
            avehicle_factor_other: 'CaseEquipmentDefectiveOther',
            aperson_factor: 'CaseBehaviorPersonal',
            aperson_factor_other: 'CaseBehaviorPersonalOther',
            aconformation: 'VehiclesType',
            case_parties: 'CaseParties'
        };

        let province_name = provinces[project.province_code];

        // Truncate the PoliceMergeEvent table
        await PoliceEventMergeData.destroy({ truncate : true, cascade: false });

        // Fetch events records that meets the date requirements
        let rawEventRecords = await PoliceEventApi.findAll({
            where: {
                CaseDay: {
                    [Op.gte]: startDate,
                    [Op.lte]: moment(endDate).endOf('day').toDate() // Less than or equal to end of endDate
                },
                CaseProvince: province_name
            }
        });

        console.log("Police Event Record",rawEventRecords.length);

        // Loop through each record, transforming and saving it
        let newEventRecordsData = rawEventRecords.map(oldRecord => {
            let newRecordData = {};
            for (let newColumn in columnMappingEvent) {
                let oldColumn = columnMappingEvent[newColumn];
                newRecordData[newColumn] = oldRecord[oldColumn];
            }
            newRecordData['project_id'] = project.id;

            // Add the new record data to the array
            return newRecordData;
        });

        // Bulk insert the new records to the table
        await PoliceEventMergeData.bulkCreate(newEventRecordsData);
    }


    static async importPoliceVehicleAPIData(startDate,endDate,project){
        const columnMappingData = {
            id: 'id',
            event_id: 'AccidentNumber',
            vehicle_index: 'VehiclesSequence',
            vehicle: 'VehiclesType',
            vehicle_plate: 'Vehicleslicense',
            vehicle_province: 'VehicleslicenseProvince',
            vehicle_use: 'PersonaCarType',
            fullname: 'PersonaName',
            cid: 'PersonalIDcardNo',
            age: 'PersonaAge',
            sex: 'PersonaSex',
            nation: 'PersonaNationality',
            occupation: 'PersonaOccupation',
            roaduser: 'PersonaCasualtyPerson',
            injury: 'PersonaAccidentDetail',
            alcohol: 'PersonaAlcoho',
            injury_factor: 'PersonaFactorsInjuryAndDeath',
            belt: 'PersonaFactorsInjuryAndDeathType',
            helmet: 'PersonaFactorsInjuryAndDeathType',
            vehicle_type: 'VehiclesType',
            driving_id: 'PersonalDrivingLicenseNo',
            driving_licence: 'PersonalDrivingLicense',
            driving_licence_type: 'PersonalDrivingLicenseType',
            driving_licence_province: 'PersonalDrivingLicenseProvinceName',
            adate: 'CaseDay',
            atime: 'CaseTime'
        };

        // Truncate the PoliceMergeData table
        await PoliceVehicleMergeData.destroy({ truncate: true, cascade: false });


        let province_name = provinces[project.province_code];

        // Fetch vehicle records that meet the date requirements
        const rawVehicleRecords = await PoliceVehicleApi.findAll({
            attributes: { all: true },
            include: [
                {
                    model: PoliceEventApi,
                    as: 'police_event_records',
                    attributes: [],
                    where: {
                        CaseProvince: province_name
                    },
                    required: true,
                }
            ],
            where: {
                CaseDay: {
                    [Op.gte]: startDate,
                    [Op.lte]: moment(endDate).endOf('day').toDate() // Less than or equal to end of endDate
                }
            }
        });

        console.log("Police Vehicle Record",rawVehicleRecords.length);

        // Prepare an array for the new vehicle records
        let newVehicleRecords = [];

        // Loop through each record, transforming it
        for (let oldRecord of rawVehicleRecords) {
            let newRecordData = {};
            for (let newColumn in columnMappingData) {
                const oldColumn = columnMappingData[newColumn];
                newRecordData[newColumn] = oldRecord[oldColumn];
            }
            // Add the projectId
            newRecordData['id'] = null;
            newRecordData['project_id'] = project.id;
            // Add the new record data to the array
            newVehicleRecords.push(newRecordData);
        }

        // Bulk insert the new records to the table
        if (newVehicleRecords.length > 0) {
            await PoliceVehicleMergeData.bulkCreate(newVehicleRecords);
        }

    }

    static setDate0(date,limitDate){

        let recordDate = null;

        if(date){
            let tempDate = new Date(date);

            // If ddate is a valid date and not before limit date,
            // then update recordDate
            if (tempDate.toString() !== 'Invalid Date' && tempDate >= limitDate) {
                recordDate = tempDate;
            }
        }
        return recordDate;
    }

}
module.exports = ProjectIntegrateController;


module.exports = {

    autoProjectProvince: async function (req, res) {


        let startDate = moment(process.env.PROJECT_FIRST_DATE);
        let preRangDate =  parseInt(process.env.PROJECT_PRE_DATE);
        let rangeDate = parseInt(process.env.PROJECT_RANGE_DATE) - 1;
        let subRangeDate = parseInt(process.env.PROJECT_SUB_DATE);

        const endDateLimit = moment('2023-12-15', "YYYY-MM-DD");

        while (startDate.isBefore(endDateLimit)) {

            let preDate = startDate.clone().subtract(preRangDate,'days');
            let endDate = startDate.clone().add(rangeDate,'days');
            let subDate = endDate.clone().add(subRangeDate,'days');


            await ProjectIntegrateController.startProject(preDate, startDate, endDate, subDate,process.env.PROVINCE);

            startDate = startDate.add(rangeDate, 'days');
        }

        res.json({"code":200, "message":"Job success"})
    },



    autoProject: async function (req, res) {


        let startDate = moment(process.env.PROJECT_FIRST_DATE);
        let preRangDate =  parseInt(process.env.PROJECT_PRE_DATE);
        let rangeDate = parseInt(process.env.PROJECT_RANGE_DATE) - 1;
        let subRangeDate = parseInt(process.env.PROJECT_SUB_DATE);

        const endDateLimit = moment().subtract(1, 'days');

        for (let province_code = 10; province_code <= 96; province_code++){

            let run_startDate = startDate.clone();

            while (run_startDate.isBefore(endDateLimit)) {

                let preDate = run_startDate.clone().subtract(preRangDate,'days');
                let endDate = run_startDate.clone().add(rangeDate,'days');
                let subDate = endDate.clone().add(subRangeDate,'days');


                if (provinces.hasOwnProperty(province_code)){

                    const startTime = new Date(); // Start timing
                    await ProjectIntegrateController.startProject(preDate, run_startDate, endDate, subDate,province_code);

                    const endTime = new Date(); // End timing
                    const totalTime = endTime - startTime; // Calculate total time in milliseconds
                    console.log(`Total time: ${totalTime} ms`);
                }

                run_startDate = run_startDate.add(rangeDate + 1, 'days');
            }

        }

        res.json({"code":200, "message":"Job success"})
    },


    startProject: async function (req, res) {

        res.json({"code":200, "message":"Job success"})
    },
    cleanDatabase: function (req, res) {

        res.json({"code":200, "message":"Job success"})
    },

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
}
