
const { log } = require("debug");
const moment = require('moment-timezone');

// Import all models
const EclaimApi = require('../models/raw/EclaimApi');
const ISRawData = require('../models/raw/ISRawData');
const PoliceEventApi = require('../models/raw/PoliceEventApi');
const PoliceVehicleApi = require('../models/raw/PoliceVehicleApi');
const EReportApi = require('../models/raw/EReportApi');
const HISApi = require('../models/raw/HISApi');

const EclaimMergeData = require('../models/EclaimMergeData');
const ISMergeData = require('../models/ISMergeData');
const PoliceEventMergeData = require('../models/PoliceEventMergeData');
const PoliceVehicleMergeData = require('../models/PoliceVehicleMergeData');
const EReportMergeData = require('../models/EReportMergeData');
const HisMergeData = require('../models/HisMergeData');

const AccidentHIS = require('../models/his/AccidentHIS');
const AdmissionHIS = require('../models/his/AdmissionHIS');
const DeathHIS = require('../models/his/DeathHIS');
const DiagnosisIpdHIS = require('../models/his/DiagnosisIpdHIS');
const DiagnosisOpdHIS = require('../models/his/DiagnosisOpdHIS');
const ProcedureIpdHIS = require('../models/his/ProcedureIpdHIS');
const ProcedureOpdHIS = require('../models/his/ProcedureOpdHIS');
const ServiceHIS = require('../models/his/ServiceHIS');

const EMSData = require('../models/ems/EMSData');
const EMSMergeData = require('../models/EMSMergeData');

const PrepareMerge = require('../models/PrepareMerge');
const Project = require('../models/Project');
const ProjectIntegrateFinal = require('../models/ProjectIntegrateFinal');
const { QueryTypes } = require('sequelize');
const IntegrateFinalFull = require('../models/IntegrateFinalFull');


const dbServer = require('../../config/connections/db_server');
const dbServerRaw = require('../../config/connections/db_server_raw');
const dbServerRawHIS = require('../../config/connections/db_server_raw_his');
const { Op } = require("sequelize");
const provinces = require('../utils/provinces');


const ProcessIntegrateController = require('./processIntegrateController');
const ProcessIntegrateEreportController = require('./processIntegrateEreportController');
const ProcessIntegrateHISController = require('./processIntegrateHISController');
const ProcessIntegrateEMSController = require('./processIntegrateEMSController');
const ProcessETLHISController = require('./processETLHISController');
const ProcessMapController = require('./processMapController');
const e = require("express");
require('dotenv').config();

class ProjectIntegrateController {


    static async startProject(preDate, startDate, endDate, subDate, provinceCode) {

        let project = await ProjectIntegrateController.getProject(preDate, startDate, endDate, subDate, provinceCode);

        console.log("Start Integrate Project", project.id, project.province_code);
        console.log("Pre Date:", preDate.format('DD/MM/YYYY'));
        console.log("Start date:", startDate.format('DD/MM/YYYY'));
        console.log("End Date:", endDate.format('DD/MM/YYYY'));
        console.log("Sub Date:", subDate.format('DD/MM/YYYY'));


        console.log(`Import Data For Project`, project.id);

        console.time('importDataForProject');
        await this.importDataForProject(preDate, subDate, project);
        console.timeEnd('importDataForProject');

        let processController = new ProcessIntegrateController(project.id, project.province_code);

        await processController.mergeRSIS()

    }

    static async importDataForProject(startDate, endDate, project) {

        await this.importISAPIData(startDate, endDate, project)
        await this.importEclaimAPIData(startDate, endDate, project)
        await this.importPoliceEventAPIData(startDate, endDate, project)
        await this.importPoliceVehicleAPIData(startDate, endDate, project)
    }

    static async getProject(preDate, startDate, endDate, subDate, provinceCode) {

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
            if (!project) {
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

        } catch (error) {
            console.error(error);
        } finally {
            return project;
        }
    }


    static async importISAPIData(startDate, endDate, project) {

        console.log(`Import IS DATA For project`, project.id);

        await ISMergeData.destroy({ truncate: true, cascade: false });

        let rawRecords = await ISRawData.findAll({
            where: {
                adate: {
                    [Op.gte]: moment(startDate).startOf('day').toDate(),  // >= startDate
                    [Op.lte]: moment(endDate).endOf('day').toDate() // Less than or equal to end of endDate
                },
                aplace: project.province_code
            },
        });

        console.log("IS Record", rawRecords.length);

        let newRecords = []; // array to hold new records

        let minnDate = new Date("2000-01-01");
        for (let oldRecord of rawRecords) {
            let recordPlain = oldRecord.get({ plain: true });
            let ddate = this.setDate0(recordPlain.date, minnDate);
            let dlt = this.setDate0(recordPlain.dlt, minnDate);
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
                dlt: dlt,
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

            if (this.checkName(newRecord['fname'], newRecord['lname'], true)) {
                newRecords.push(newRecord);
            }
        }
        // bulk create new records in ISMergeData
        if (newRecords.length > 0) {
            await ISMergeData.bulkCreate(newRecords);
        }
    }


    static async importEclaimAPIData(startDate, endDate, project) {

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
        await EclaimMergeData.destroy({ truncate: true, cascade: false });

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

        console.log("Eclaim Record", rawRecords.length);

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
            if (this.checkName(newRecordData['name'], newRecordData['lname'], true)) {
                newRecordsData.push(newRecordData);
            }

        }

        // Bulk-create the new records
        if (newRecordsData.length > 0) {
            await EclaimMergeData.bulkCreate(newRecordsData);
        }

    }


    static async importPoliceEventAPIData(startDate, endDate, project) {
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
        await PoliceEventMergeData.destroy({ truncate: true, cascade: false });

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

        console.log("Police Event Record", rawEventRecords.length);

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


    static async importPoliceVehicleAPIData(startDate, endDate, project) {
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
                    duplicating: false,
                }
            ],
            where: {
                CaseDay: {
                    [Op.gte]: startDate,
                    [Op.lte]: moment(endDate).endOf('day').toDate() // Less than or equal to end of endDate
                }
            },
            // THIS ACTS AS THE DISTINCT
            group: ['PoliceVehicleApi.id']
        });


        console.log("Police Vehicle Record", rawVehicleRecords.length);

        const newVehicleRecords = [];
        const seen = new Set(); // tracks event_id|fullname

        // tiny normalizer to avoid false dupes from spacing/case
        const normName = (s) =>
            (s ?? '')
                .toString()
                .trim()
                .replace(/\s+/g, ' ')   // collapse multiple spaces
                .toLowerCase();

        for (const oldRecord of rawVehicleRecords) {
            const rec = {};
            for (const newColumn in columnMappingData) {
                const oldColumn = columnMappingData[newColumn];
                rec[newColumn] = oldRecord[oldColumn];
            }

            // normalize name for de-dup key
            rec.fullname = rec.fullname ?? '';
            const key = `${rec.event_id}|${normName(rec.fullname)}`;

            // only keep rows with a valid name and not yet seen for this event
            if (this.checkName(rec.fullname, "", false) && !seen.has(key)) {
                seen.add(key);
                rec.id = null;
                rec.project_id = project.id;
                newVehicleRecords.push(rec);
            }
        }

        // Bulk insert
        if (newVehicleRecords.length) {
            await PoliceVehicleMergeData.bulkCreate(newVehicleRecords);
        }
    }


    static async importEreportVehicleAPIData(startDate, endDate) {
        const modelAttributes = EReportApi.getAttributes();
        const columnMapping = {};

        Object.keys(modelAttributes).forEach(column => {
            columnMapping[column] = column;
        });
        await EReportMergeData.destroy({ truncate: true, cascade: false });
        // Fetch records that meets the date requirements
        let rawRecords = await EReportApi.findAll({
            where: {
                acc_date: {
                    [Op.gte]: startDate,
                    [Op.lte]: moment(endDate).endOf('day').toDate() // Less than or equal to end of endDate
                }
            }
        });

        console.log("E-report Record", rawRecords.length);

        // Prepare an array for the new records
        let newRecordsData = [];
        for (let oldRecord of rawRecords) {
            let newRecordData = {};
            for (let column in columnMapping) {
                newRecordData[column] = oldRecord[column];
            }
            // Populate additional fields for temp_ereport_clean
            newRecordData['prename'] = ''; // Default or compute as needed
            newRecordData['name'] = ''; // Default or compute as needed
            newRecordData['lname'] = ''; // Default or compute as needed
            newRecordData['adate'] = oldRecord['acc_date']; // Current date or another logic
            newRecordData['match'] = ''; // Default or logic to populate
            newRecordData['is_duplicate'] = 0; // Default or logic to check duplicates
            newRecordData['project_file_id'] = null; // Assuming there is a file_id in the project object
            newRecordData['project_id'] = null;
            newRecordData['created_at'] = new Date(); // Current time
            newRecordData['updated_at'] = new Date(); // Current time

            newRecordsData.push(newRecordData);
        }

        // Bulk-create the new records
        if (newRecordsData.length > 0) {
            await EReportMergeData.bulkCreate(newRecordsData);
        }
    }

    static async importHISData(startDate, endDate, provinceCode) {

        const columnMapping = {
            id: 'id',
            pid: 'PID',
            hospcode: 'HOSPCODE',
            date_serv: 'DATE_SERV',
            seq: 'SEQ',
            an: 'AN',
            diagcode: 'DIAGCODE',
            isdeath: 'ISDEATH',
            cdeath: 'CDEATH',
            price: 'Price',
            payprice: 'PAYPRICE',
            actualpay: 'ACTUALPAY',
            dateinhosp: 'DATEINHOSP',
            cid: 'CID',
            name: 'NAME',
            lname: 'LNAME',
            sex: 'sex',
            nation: 'NATION',
            birth: 'BIRTH',
            age: 'AGE',
            opd_code: 'OPD_CODE',
            ipd_code: 'IPD_CODE',
            allcode: 'ALLCODE',
            s0: 'S0',
            s1: 'S1',
            s2: 'S2',
            s3: 'S3',
            s4: 'S4',
            s5: 'S5',
            s6: 'S6',
            s7: 'S7',
            s8: 'S8',
            s9: 'S9',
            aeplace: 'AEPLACE',
            aetype: 'AETYPE',
            airway: 'AIRWAY',
            alcohol: 'ALCOHOL',
            splint: 'SPLINT',
            belt: 'BELT',
            helmet: 'HELMET',
            coma_eye: 'COMA_EYE',
            coma_movement: 'COMA_MOVEMENT',
            coma_speak: 'COMA_SPEAK',
            nacrotic_drug: 'NACROTIC_DRUG',
            stopbleed: 'STOPBLEED',
            traffic: 'TRAFFIC',
            typein_ae: 'TYPEIN_AE',
            urgency: 'URGENCY',
            vehicle: 'VEHICLE',
            province_code: 'province_id'
        };

        await dbServer.query(`TRUNCATE TABLE temp_his_query_clean;`);
        await HisMergeData.destroy({ truncate: true, cascade: false });
        console.log(startDate, endDate, provinceCode)
        try {

            // Fetch records that meet the date requirements
            let rawRecords = await HISApi.findAll({
                where: {
                    DATE_SERV: {
                        [Op.gte]: startDate,
                        [Op.lte]: endDate
                    },
                    province_id: provinceCode
                }
            });

            console.log("HIS Record", rawRecords.length);

            // Prepare an array for the new records
            let newRecordsData = [];
            for (let oldRecord of rawRecords) {
                let newRecordData = {};
                for (let newColumn in columnMapping) {
                    let oldColumn = columnMapping[newColumn];
                    newRecordData[newColumn] = oldRecord[oldColumn];
                }


                // Populate additional fields for temp_ereport_clean
                newRecordData['match'] = ''; // Default or logic to populate
                newRecordData['is_duplicate'] = 0; // Default or logic to check duplicates
                newRecordData['old_id'] = 0;
                newRecordData['project_file_id'] = null; // Assuming there is a file_id in the project object
                newRecordData['project_id'] = null;
                newRecordData['created_at'] = new Date(); // Current time
                newRecordData['updated_at'] = new Date(); // Current time

                newRecordsData.push(newRecordData);
            }

            // Bulk-create the new records
            if (newRecordsData.length > 0) {
                await HisMergeData.bulkCreate(newRecordsData);
            }

        } catch (e) {
            console.log(e);
        }
    }

    static async importEMSData(startDate, endDate, provinceCode) {

        const columnMapping = {
            id: 'id',
            incident_number: 'incident_number',
            notification_time: 'notification_time',
            center_code: 'center_code',
            district: 'district',
            sub_district: 'sub_district',
            latitude: 'latitude',
            longitude: 'longitude',
            scene_location: 'scene_location',
            severity_code: 'severity_code',
            incident_event: 'incident_event',
            patient_number: 'patient_number',
            ipd_event_number: 'ipd_event_number',
            id_card_number: 'id_card_number',
            patient_sequence: 'patient_sequence',
            patient_id: 'patient_id',
            title: 'title',
            first_name: 'first_name',
            last_name: 'last_name',
            gender: 'gender',
            age_years: 'age_years',
            age_months: 'age_months',
            patient_type: 'patient_type',
            nationality: 'nationality',
            passport_number: 'passport_number',
            treatment_right: 'treatment_right',
            other_insurance: 'other_insurance',
            country: 'country',
            vehicle_type: 'vehicle_type',
            vehicle_plate_category: 'vehicle_plate_category',
            vehicle_plate_number: 'vehicle_plate_number',
            vehicle_province: 'vehicle_province',
            delivery_province: 'delivery_province',
            hospital: 'hospital',
            hospital_type: 'hospital_type',
            delivery_time: 'delivery_time',
            triage_level: 'triage_level',
            operation_number: 'operation_number',
            operation_event_number: 'operation_event_number',
            command_time: 'command_time',
            unit_level: 'unit_level',
            time_unit_notified: 'time_unit_notified',
            time_left_base: 'time_left_base',
            lat_left_base: 'lat_left_base',
            long_left_base: 'long_left_base',
            time_arrived_scene: 'time_arrived_scene',
            time_left_scene: 'time_left_scene',
            lat_scene: 'lat_scene',
            long_scene: 'long_scene',
            time_arrived_hospital: 'time_arrived_hospital',
            lat_hospital: 'lat_hospital',
            long_hospital: 'long_hospital',
            time_arrived_base: 'time_arrived_base',
            lat_base: 'lat_base',
            long_base: 'long_base',
            idc_code_scene: 'idc_code_scene',
            operation_status: 'operation_status',
            operation_option: 'operation_option',
            vehicle_plate_cat_symptom_25: 'vehicle_plate_cat_symptom_25',
            vehicle_plate_num_symptom_25: 'vehicle_plate_num_symptom_25',
            vehicle_province_symptom_25: 'vehicle_province_symptom_25',
            vehicle_owner_symptom_25: 'vehicle_owner_symptom_25',
            system_status: 'system_status',
            recorder_name: 'recorder_name',
            patient_type_2: 'patient_type_2',
            consciousness: 'consciousness',
            breathing: 'breathing',
            wound: 'wound',
            deformity: 'deformity',
            organ: 'organ',
            airway: 'airway',
            stop_bleeding: 'stop_bleeding',
            splinting: 'splinting',
            fluids: 'fluids',
            fluids_detail: 'fluids_detail',
            cpr: 'cpr',
            medication: 'medication',
            initial_care_result: 'initial_care_result',
            wound_2: 'wound_2',
            deformity_2: 'deformity_2',
            blood_loss: 'blood_loss',
            organ_2: 'organ_2',
            medicine_method: 'medicine_method',
            medicine_detail: 'medicine_detail',
            obgyn: 'obgyn',
            obgyn_detail: 'obgyn_detail',
            pediatrics: 'pediatrics',
            pediatrics_detail: 'pediatrics_detail',
            surgery: 'surgery',
            surgery_detail: 'surgery_detail',
            others: 'others',
            diagnosis: 'diagnosis',
            airway_2: 'airway_2',
            stop_bleeding_2: 'stop_bleeding_2',
            splinting_2: 'splinting_2',
            fluids_2: 'fluids_2',
            admitted: 'admitted',
            treatment_result: 'treatment_result',
            vital_signs: 'vital_signs',
            neuro_signs: 'neuro_signs',
            pupils: 'pupils',
            o2_sat: 'o2_sat',
            dtx: 'dtx',
            createdAt: 'createdAt',
            updatedAt: 'updatedAt'
        };

        await dbServer.query(`TRUNCATE TABLE temp_ems_clean;`);
        await EMSMergeData.destroy({ truncate: true, cascade: false });
        console.log(startDate, endDate, provinceCode)
        try {
            let province_name = provinces[provinceCode];
            // Fetch records that meet the date requirements
            let rawRecords = await EMSData.findAll({
                where: {
                    notification_time: {
                        [Op.gte]: startDate,
                        [Op.lte]: endDate
                    },
                    province_code: province_name
                }
            });

            console.log("EMS Record", province_name, rawRecords.length);

            // Prepare an array for the new records
            let newRecordsData = [];
            for (let oldRecord of rawRecords) {


                let newRecordData = {};
                for (let newColumn in columnMapping) {
                    let oldColumn = columnMapping[newColumn];
                    newRecordData[newColumn] = oldRecord[oldColumn];
                }

                // Populate additional merge fields
                newRecordData['match'] = ''; // Default or logic to populate
                newRecordData['province_code'] = provinceCode; // Default or logic to populate
                newRecordData['province'] = province_name; // Default or logic to populate
                newRecordData['is_duplicate'] = 0; // Default or logic to check duplicates
                newRecordData['old_id'] = 0;
                newRecordData['project_id'] = null; // Set proper ID later if needed
                newRecordData['created_at'] = new Date(); // Current time
                newRecordData['updated_at'] = new Date(); // Current time

                newRecordsData.push(newRecordData);
            }

            // Bulk-create the new records
            if (newRecordsData.length > 0) {
                await EMSMergeData.bulkCreate(newRecordsData);
            }

        } catch (e) {
            console.log(e);
        }
    }

    /**
     * Validate first/last names.
     * - Non-empty after trim
     * - Must NOT contain the Thai substring "ไม่"
     * - If hasLastname === true, apply the same checks to lastname
     *
     * @param {string} name
     * @param {string} lastname
     * @param {boolean} hasLastname
     * @returns {boolean}
     */
    static checkName(name, lastname, hasLastname = false) {
        const clean = (v) => (v ?? '').toString().normalize('NFC').trim();
        const containsForbidden = (s) => /ไม่/u.test(s); // Thai "ไม่"

        const isValid = (s) => s.length > 0 && !containsForbidden(s);

        const n = clean(name);
        if (!isValid(n)) return false;

        if (hasLastname) {
            const ln = clean(lastname);
            if (!isValid(ln)) return false;
        }

        return true;
    }

    static setDate0(date, limitDate) {

        let recordDate = null;

        if (date) {
            let tempDate = new Date(date);

            // If ddate is a valid date and not before limit date,
            // then update recordDate
            if (tempDate.toString() !== 'Invalid Date' && tempDate >= limitDate) {
                recordDate = tempDate;
            }
        }
        return recordDate;
    }


    // check table and swap

    /**
     * Returns true if every month (except the latest month) has total >= threshold.
     * Range: from 2023-01-01 to today. Uses column `injury_Date`.
     */
    static async checkDataPass(threshold) {
        const sequelize = IntegrateFinalFull.sequelize;

        const sql = `
              SELECT
                DATE_FORMAT(\`injury_Date\`, '%Y-%m') AS ym,
                COUNT(*) AS total
              FROM \`integrate_final_full\`
              WHERE \`injury_Date\` IS NOT NULL
                AND \`injury_Date\` >= '2023-01-01'
                AND \`injury_Date\` <  (CURRENT_DATE + INTERVAL 1 DAY)
              GROUP BY ym
              ORDER BY ym
            `;

        const rows = await sequelize.query(sql, { type: QueryTypes.SELECT });

        // Convert query results into a map for quick lookup
        const dataMap = {};
        rows.forEach(r => {
            dataMap[r.ym] = Number(r.total);
        });

        // Build full month list from 2023-01 to current month
        const start = new Date("2023-01-01");
        const now = new Date();
        const currentYm = now.toISOString().slice(0, 7);

        const months = [];
        let d = new Date(start);
        while (d <= now) {
            const ym = d.toISOString().slice(0, 7); // YYYY-MM
            months.push(ym);
            d.setMonth(d.getMonth() + 1);
        }

        // Check all months except the current real month
        const failing = months
            .filter(ym => ym !== currentYm)
            .filter(ym => !dataMap[ym] || dataMap[ym] < Number(threshold));

        if (failing.length) {
            console.log(`[CHECK] Failing months (below ${threshold} or missing), excluding current ${currentYm}:`);
            failing.forEach(ym => {
                console.log(`  ${ym} -> ${dataMap[ym] || 0}`);
            });
            return false;
        }

        console.log(`[CHECK] All months since Jan 2023 (except current ${currentYm}) are >= ${threshold}.`);
        return true;
    }

    /**
     * Validate, then atomically swap:
     *   integrate_final_full  <->  integrate_final_full_process
     * Returns true if swapped; false otherwise.
     */
    static async checkAndSwapTable() {
        const LIVE = 'integrate_final_full';
        const STAGE = 'integrate_final_full_stage';
        const THRESHOLD = 70000; // hard-coded as requested

        try {
            const pass = await this.checkDataPass(THRESHOLD);
            if (!pass) {
                console.log('[SWAP] Aborted: validation failed.');
                return false;
            }

            const sequelize = IntegrateFinalFull.sequelize;

            // Ensure stage exists
            const stageExists = await sequelize.query(
                `SELECT COUNT(*) AS cnt
           FROM information_schema.TABLES
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = :t`,
                { replacements: { t: STAGE }, type: QueryTypes.SELECT, plain: true }
            );
            if (!Number(stageExists?.cnt)) {
                console.log(`[SWAP] ❌ Stage table '${STAGE}' not found. Aborting.`);
                return false;
            }

            // Atomic 3-way swap using RENAME TABLE
            const tmp = `${LIVE}_swap_${this.#ts()}`;
            const sql = `
        RENAME TABLE
          \`${LIVE}\`  TO \`${tmp}\`,
          \`${STAGE}\` TO \`${LIVE}\`,
          \`${tmp}\`   TO \`${STAGE}\`
      `;
            await sequelize.query(sql);
            console.log(`[SWAP] ✅ Swapped '${LIVE}' <-> '${STAGE}' successfully.`);
            return true;
        } catch (err) {
            console.log(`[SWAP] ❌ Error: ${err.message}`);
            return false;
        }
    }

    static #ts() {
        const d = new Date();
        const p = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    }



    static async checkHISConnection() {
        try {
            await dbServer.authenticate();
            console.log('Connection to all models has been established successfully.');

            await dbServerRaw.authenticate();
            console.log('Connection to all raw models has been established successfully.');

            await dbServerRawHIS.authenticate();
            console.log('Connection to all HIS models has been established successfully.');

            // An array of all the models
            const models = [
                AccidentHIS, AdmissionHIS, DeathHIS, DiagnosisIpdHIS, DiagnosisOpdHIS, ProcedureIpdHIS, ProcedureOpdHIS, ServiceHIS
            ];

            // 1. Create an object to store the results
            const results = {};

            for (const model of models) {
                // 2. Fetch first row from each model
                // We use { raw: true } to get clean JSON data without extra Sequelize wrapper stuff
                const row = await model.findOne({ raw: true });

                console.log(`Fetched sample from ${model.tableName}`);

                // 3. Save the row to our results object using the table name as the key
                results[model.tableName] = row;
            }

            // 4. Return the object containing one row from every table
            return {
                status: 'success',
                message: 'Connection to all models has been established successfully.',
                data: results
            };

        } catch (error) {
            console.error(`Unable to connect to the database:`, error);
            throw new Error(error.message);
        }
    }

}
module.exports = ProjectIntegrateController;

module.exports = {

    autoProjectProvince: async function (req, res) {


        let startDate = moment(process.env.PROJECT_FIRST_DATE);
        let preRangDate = parseInt(process.env.PROJECT_PRE_DATE);
        let rangeDate = parseInt(process.env.PROJECT_RANGE_DATE) - 1;
        let subRangeDate = parseInt(process.env.PROJECT_SUB_DATE);

        const endDateLimit = moment('2024-04-16', "YYYY-MM-DD");

        while (startDate.isBefore(endDateLimit)) {

            let preDate = startDate.clone().subtract(preRangDate, 'days');
            let endDate = startDate.clone().add(rangeDate, 'days');
            let subDate = endDate.clone().add(subRangeDate, 'days');


            await ProjectIntegrateController.startProject(preDate, startDate, endDate, subDate, process.env.PROVINCE);

            startDate = startDate.add(rangeDate, 'days');
        }

        res.json({ "code": 200, "message": "Job success" })
    },

    autoProjectCustomDate: async function (req, res) {

        let startDateInput = req.query.startDate;
        let endDateInput = req.query.endDate;
        let checkStart = moment(startDateInput, 'YYYY-MM-DD', true).isValid();
        let checkEnd = moment(endDateInput, 'YYYY-MM-DD', true).isValid();

        if (!checkStart || !checkEnd) {
            res.json({ "code": 400, "message": "Error Date format" })
        }

        const startDate = moment(startDateInput);
        const endDateLimit = moment(endDateInput);


        let preRangDate = parseInt(process.env.PROJECT_PRE_DATE);
        let rangeDate = parseInt(process.env.PROJECT_RANGE_DATE) - 1;
        let subRangeDate = parseInt(process.env.PROJECT_SUB_DATE);

        for (let province_code = 10; province_code <= 96; province_code++) {

            let run_startDate = startDate.clone();

            while (run_startDate.isBefore(endDateLimit)) {

                let preDate = run_startDate.clone().subtract(preRangDate, 'days');
                let endDate = run_startDate.clone().add(rangeDate, 'days');
                let subDate = endDate.clone().add(subRangeDate, 'days');


                if (provinces.hasOwnProperty(province_code)) {

                    const startTime = new Date(); // Start timing
                    await ProjectIntegrateController.startProject(preDate, run_startDate, endDate, subDate, province_code);

                    const endTime = new Date(); // End timing
                    const totalTime = endTime - startTime; // Calculate total time in milliseconds
                    console.log(`Total time: ${totalTime} ms`);
                }

                run_startDate = run_startDate.add(rangeDate + 1, 'days');
            }
        }

        await ProjectIntegrateController.checkAndSwapTable();

        res.json({ "code": 200, "message": "Job success" })
    },


    autoProjectCustomProvince: async function (req, res) {
        try {
            let startDateInput = req.query.startDate;
            let endDateInput = req.query.endDate;
            let province_code = req.query.provinceCode;
            let checkStart = moment(startDateInput, 'YYYY-MM-DD', true).isValid();
            let checkEnd = moment(endDateInput, 'YYYY-MM-DD', true).isValid();

            if (!checkStart || !checkEnd) {
                res.json({
                    "code": 400,
                    "message": "Error Date format startDateInput:" + startDateInput + " endDateInput:" + endDateInput
                })
            }

            const startDate = moment(startDateInput);
            const endDateLimit = moment(endDateInput);


            let preRangDate = parseInt(process.env.PROJECT_PRE_DATE);
            let rangeDate = parseInt(process.env.PROJECT_RANGE_DATE) - 1;
            let subRangeDate = parseInt(process.env.PROJECT_SUB_DATE);

            let run_startDate = startDate.clone();

            while (run_startDate.isBefore(endDateLimit)) {

                let preDate = run_startDate.clone().subtract(preRangDate, 'days');
                let endDate = run_startDate.clone().add(rangeDate, 'days');
                let subDate = endDate.clone().add(subRangeDate, 'days');


                if (provinces.hasOwnProperty(province_code)) {

                    const startTime = new Date(); // Start timing
                    await ProjectIntegrateController.startProject(preDate, run_startDate, endDate, subDate, province_code);

                    const endTime = new Date(); // End timing
                    const totalTime = endTime - startTime; // Calculate total time in milliseconds
                    console.log(`Total time: ${totalTime} ms`);
                }

                run_startDate = run_startDate.add(rangeDate + 1, 'days');
            }

            res.json({ "code": 200, "message": "Job success" })
        } catch (error) {
            console.error('An error occurred:', error);
            return res.status(500).json({ "code": 500, "message": "Internal server error", "error": error.message });
        }
    },


    autoProjectHISProvince: async function (req, res) {
        let startDateInput = "";
        let endDateInput = "";
        let province_code = "";
        let checkStart = ""
        let checkEnd = "";

        try {
            startDateInput = req.query.startdate || req.query.startDate;
            endDateInput = req.query.enddate || req.query.endDate;
            province_code = req.query.provinceCode;
            checkStart = moment(startDateInput, 'YYYY-MM-DD', true).isValid();
            checkEnd = moment(endDateInput, 'YYYY-MM-DD', true).isValid();

            if (!checkStart || !checkEnd) {
                res.json({ "code": 400, "message": "autoProjectHISProvince Error Date format startDateInput:" + startDateInput + " endDateInput:" + endDateInput })
            }
        } catch (error) {
            console.error(error);
        }

        const startDate = moment.tz(startDateInput, 'Asia/Bangkok').startOf('day');
        const endDateLimit = moment.tz(endDateInput, 'Asia/Bangkok').endOf('day');

        console.log(startDate, endDateLimit)


        let preRangDate = parseInt(process.env.PROJECT_PRE_DATE);
        let rangeDate = parseInt(process.env.PROJECT_RANGE_DATE) - 1;
        let subRangeDate = parseInt(process.env.PROJECT_SUB_DATE);

        let run_startDate = startDate.clone();

        while (run_startDate.isBefore(endDateLimit)) {

            let preDate = run_startDate.clone().subtract(preRangDate, 'days');
            let endDate = run_startDate.clone().add(rangeDate, 'days');
            let subDate = endDate.clone().add(subRangeDate, 'days');

            if (endDate.isAfter(endDateLimit)) {
                endDate = endDateLimit.clone();
            }


            if (provinces.hasOwnProperty(province_code)) {

                const startTime = new Date(); // Start timing
                console.log(startDate, endDate, province_code)

                await ProjectIntegrateController.importHISData(run_startDate, endDate, province_code)
                let processController = new ProcessIntegrateHISController(run_startDate, endDate, province_code);
                await processController.mergeRSIS()

                const endTime = new Date(); // End timing
                const totalTime = endTime - startTime; // Calculate total time in milliseconds
                console.log(`Total time: ${totalTime} ms`);
            }

            run_startDate = run_startDate.add(rangeDate + 1, 'days');
        }

        res.json({ "code": 200, "message": "Job success" })
    },

    autoProjectEMSProvince: async function (req, res) {
        let startDateInput = req.query.startDate;
        let endDateInput = req.query.endDate;
        let province_code = req.query.provinceCode;
        let checkStart = moment(startDateInput, 'YYYY-MM-DD', true).isValid();
        let checkEnd = moment(endDateInput, 'YYYY-MM-DD', true).isValid();

        if (!checkStart || !checkEnd) {
            res.json({ "code": 400, "message": "Error Date format" })
        }

        const startDate = moment(startDateInput);
        const endDateLimit = moment(endDateInput);

        let preRangDate = parseInt(process.env.PROJECT_PRE_DATE);
        let rangeDate = parseInt(process.env.PROJECT_RANGE_DATE) - 1;
        let subRangeDate = parseInt(process.env.PROJECT_SUB_DATE);

        let run_startDate = startDate.clone();

        // for (let province_code = 11; province_code <= 11; province_code++) {
        province_code = 50;

        while (run_startDate.isBefore(endDateLimit)) {

            console.log("Rundate", run_startDate)
            console.log("endDateLimit", endDateLimit)
            console.log("rangeDate", rangeDate)
            console.log("preRangDate", preRangDate)
            console.log("subRangeDate", subRangeDate)

            let preDate = run_startDate.clone().subtract(preRangDate, 'days');
            let endDate = run_startDate.clone().add(rangeDate, 'days');
            let subDate = endDate.clone().add(subRangeDate, 'days');


            if (provinces.hasOwnProperty(province_code)) {

                const startTime = new Date(); // Start timing

                const endTime = new Date(); // End timing
                const totalTime = endTime - startTime; // Calculate total time in milliseconds


                await ProjectIntegrateController.importEMSData(run_startDate, endDate, province_code)
                let processController = new ProcessIntegrateEMSController(run_startDate, endDate, province_code);
                await processController.mergeRSIS()

                console.log(`Total time: ${totalTime} ms`);
            }

            run_startDate = run_startDate.add(rangeDate + 1, 'days');
            console.log("NEXT Rundate", run_startDate)
            console.log("IS CON", run_startDate.isBefore(endDateLimit))
        }

        console.log("END WHILE")
        // }


        // let processController = new ProcessIntegrateEMSController(startDate, endDate, province_code);
        // await processController.mergeRSIS()

        res.json({ "code": 200, "message": "Job success" + startDate + " " + endDateLimit + " " + province_code })
    },


    autoProjectCheckDupHIS: async function (req, res) {
        let startDateInput = "";
        let endDateInput = "";
        let province_code = "";
        let checkStart = ""
        let checkEnd = "";

        try {
            startDateInput = req.query.startdate || req.query.startDate;
            endDateInput = req.query.enddate || req.query.endDate;
            province_code = req.query.provinceCode;
            checkStart = moment(startDateInput, 'YYYY-MM-DD', true).isValid();
            checkEnd = moment(endDateInput, 'YYYY-MM-DD', true).isValid();

            if (!checkStart || !checkEnd) {
                res.json({ "code": 400, "message": "autoProjectHISProvince Error Date format startDateInput:" + startDateInput + " endDateInput:" + endDateInput })
            }
        } catch (error) {
            console.error(error);
        }

        const startDate = moment.tz(startDateInput, 'Asia/Bangkok').startOf('day');
        const endDateLimit = moment.tz(endDateInput, 'Asia/Bangkok').endOf('day');

        console.log(startDate, endDateLimit)


        let preRangDate = parseInt(process.env.PROJECT_PRE_DATE);
        let rangeDate = parseInt(process.env.PROJECT_RANGE_DATE) - 1;
        let subRangeDate = parseInt(process.env.PROJECT_SUB_DATE);

        let run_startDate = startDate.clone();

        while (run_startDate.isBefore(endDateLimit)) {

            let preDate = run_startDate.clone().subtract(preRangDate, 'days');
            let endDate = run_startDate.clone().add(rangeDate, 'days');
            let subDate = endDate.clone().add(subRangeDate, 'days');

            if (endDate.isAfter(endDateLimit)) {
                endDate = endDateLimit.clone();
            }


            if (provinces.hasOwnProperty(province_code)) {

                const startTime = new Date(); // Start timing
                console.log(startDate, endDate, province_code)

                await ProjectIntegrateController.importHISData(run_startDate, endDate, province_code)
                let processController = new ProcessIntegrateHISController(run_startDate, endDate, province_code);
                await processController.mergeRSIS()

                const endTime = new Date(); // End timing
                const totalTime = endTime - startTime; // Calculate total time in milliseconds
                console.log(`Total time: ${totalTime} ms`);
            }

            run_startDate = run_startDate.add(rangeDate + 1, 'days');
        }

        res.json({ "code": 200, "message": "Job success" })
    },

    autoCompareWithEreportCustomDate: async function (req, res) {
        const startDate = moment("2024-04-11");
        const endDate = moment("2024-04-17");
        await ProjectIntegrateController.importEreportVehicleAPIData(startDate, endDate)
        let processController = new ProcessIntegrateEreportController(startDate, endDate);

        await processController.mergeRSIS()

        res.json({ "code": 200, "message": "Job success" })
    },

    autoRiskMapCustomDate: async function (req, res) {
        let startDateInput = req.query.startDate;
        let endDateInput = req.query.endDate;
        let checkStart = moment(startDateInput, 'YYYY-MM-DD', true).isValid();
        let checkEnd = moment(endDateInput, 'YYYY-MM-DD', true).isValid();

        if (!checkStart || !checkEnd) {
            res.json({ "code": 400, "message": "Error Date format" })
        }

        const startDate = moment(startDateInput);
        const endDate = moment(endDateInput);

        console.log(startDate, endDate)

        let processController = new ProcessMapController(startDate, endDate);

        let result = await processController.performClustering()

        res.json({ "code": 200, "message": result })
    },



    autoProject: async function (req, res) {


        let startDate = moment(process.env.PROJECT_FIRST_DATE);
        let preRangDate = parseInt(process.env.PROJECT_PRE_DATE);
        let rangeDate = parseInt(process.env.PROJECT_RANGE_DATE) - 1;
        let subRangeDate = parseInt(process.env.PROJECT_SUB_DATE);

        const endDateLimit = moment().subtract(1, 'days');

        for (let province_code = 10; province_code <= 96; province_code++) {

            let run_startDate = startDate.clone();

            while (run_startDate.isBefore(endDateLimit)) {

                let preDate = run_startDate.clone().subtract(preRangDate, 'days');
                let endDate = run_startDate.clone().add(rangeDate, 'days');
                let subDate = endDate.clone().add(subRangeDate, 'days');


                if (provinces.hasOwnProperty(province_code)) {

                    const startTime = new Date(); // Start timing
                    await ProjectIntegrateController.startProject(preDate, run_startDate, endDate, subDate, province_code);

                    const endTime = new Date(); // End timing
                    const totalTime = endTime - startTime; // Calculate total time in milliseconds
                    console.log(`Total time: ${totalTime} ms`);
                }

                run_startDate = run_startDate.add(rangeDate + 1, 'days');
            }

        }

        res.json({ "code": 200, "message": "Job success" })
    },


    autoProjectHISETL: async function (req, res) {

        try {
            // Define start and end dates
            const startDate = '2025-01-01';
            const endDate = '2025-01-31';

            // Call runETL from ProcessETLHISController
            let result = await ProcessETLHISController.runETL(startDate, endDate);

            res.json({ "code": 200, "message": result })
        } catch (error) {
            console.error(error);
            res.json({ "code": 500, "message": error.message })
        }
    },


    startProject: async function (req, res) {

        res.json({ "code": 200, "message": "Job success" })
    },
    cleanDatabase: function (req, res) {

        res.json({ "code": 200, "message": "Job success" })
    },


    testHISDatabaseConnection: async function (req, res) {
        try {
            const result = await ProjectIntegrateController.checkHISConnection();
            return res.send(result);
        } catch (error) {
            return res.status(500).send(error.message);
        }
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
                console.log(`Testing ${model.tableName}`, model);
                const row = await model.findOne();
                console.log(`First row from ${model.tableName}`);
            }

            return res.send('Connection to all models has been established successfully.');

        } catch (error) {
            console.error(`Unable to connect to the database:`, error);
            return res.status(500).send(`Unable to connect to the database`);
        }
    },


    testEMSData: async function (req, res) {
        try {
            const result = await EMSData.findOne();
            return res.send(result);
        } catch (error) {
            return res.status(500).send(error.message);
        }
    }
}
