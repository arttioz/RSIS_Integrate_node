
const moment = require('moment');

// Import all models
const EMSData = require('../models/ems/EMSData');

const PrepareMergeEMS = require('../models/PrepareMergeEMS');
const EMSMergeData = require('../models/EMSMergeData');
const ProjectIntegrateFinalEMS = require('../models/ProjectIntegrateFinalEMS');
const IntegrateFinalFull = require('../models/IntegrateFinalFull');
const IntegrateFinalFullEMS = require('../models/IntegrateFinalFullEMS');
const IntegrateFinalEMS = require('../models/IntegrateFinalEMS');

const { QueryTypes, Op } = require("sequelize");
const Project = require("../models/Project");
const ProjectIntegrateFinal = require("../models/ProjectIntegrateFinal");
const IntegrateFinal = require("../models/IntegrateFinal");
const LibAddressMoi = require('../models/LibAddress'); // Adjust the path to your models
const LibChangwat = require('../models/LibChangwat'); // Adjust the path to your models
const Province = require('../models/Province'); // Adjust the path to your models

const dbServer = require('../../config/connections/db_server');


require('dotenv').config();

class ProcessIntegrateEMSController {

    static STATUS_INTEGRATE_SUCCESSED = "บูรณาการสำเร็จ";

    constructor(startDate, endDate, provinceCode) {
        this.dateFrom = moment('2000-01-01 00:00:00', 'YYYY-MM-DD HH:mm:ss');

        this.ems_rows = [];
        this.rsis_rows = [];

        this.startDate = startDate
        this.endDate = endDate
        this.provinceCode = provinceCode;
        this.aprovince = "";

    }

    async checkDupEMS() {

        try {
            await PrepareMergeEMS.destroy({ truncate: true, cascade: false });
            await ProjectIntegrateFinalEMS.destroy({ truncate: true, cascade: false });
            await IntegrateFinalEMS.destroy({ truncate: true, cascade: false });



            let result = await LibChangwat.findOne({ where: { code: this.provinceCode } });
            this.aprovince = result.name;

            await this.prepareData();
            await this.mergeDataProcess();
            await this.writeMergeDataProcess()
            await this.updateProjectIntegrateFinalData();


        } catch (error) {
            console.error(error);
        }
    }


    async mergeRSIS() {

        try {
            await PrepareMergeEMS.destroy({ truncate: true, cascade: false });
            await ProjectIntegrateFinalEMS.destroy({ truncate: true, cascade: false });
            await IntegrateFinalEMS.destroy({ truncate: true, cascade: false });


            let result = await LibChangwat.findOne({ where: { code: this.provinceCode } });
            this.aprovince = result.name;
            console.log("mergeRSIS EMS");
            await this.prepareData();
            await this.mergeDataProcess();
            await this.writeMergeDataProcess()
            await this.updateProjectIntegrateFinalData();


        } catch (error) {
            console.error(error);
        }
    }

    async prepareData() {
        console.log('prepareMergeEMS');
        console.time('prepareMergeEMS');
        try {
            const rows = await this.prepareMergeEMSData();

            await this.checkDuplicateInSameTable(rows, EMSMergeData);
            this.ems_rows = rows.filter(row => !row.is_duplicate);
            await this.savePrepareData(this.ems_rows);


            this.rsis_rows = await this.prepareMergeRsisData();
            await this.savePrepareData(this.rsis_rows);

        } catch (error) {
            console.error(error);
        } finally {
            console.timeEnd('prepareMergeEMS');
        }
    }

    async prepareMergeEMSData() {

        console.log('prepareMergeEMSData');
        try {
            let rows = await EMSMergeData.findAll();

            rows = await Promise.all(rows.map(row => this.setDefaultColumn(row)));
            rows = await Promise.all(rows.map(row => this.makeEMSColumnForMerge(row)));

            console.log("Total Row EMS", rows.length);

            return rows;
        } catch (error) {
            console.error(error);
        }
    }


    async prepareMergeRsisData() {
        try {

            let rows = await IntegrateFinalFull.findAll({
                where: {
                    injury_date: {
                        [Op.gte]: this.startDate.toDate(),  // >= startDate
                        [Op.lte]: this.endDate.endOf('day').toDate() // Less than or equal to end of endDate
                    },
                    aprovince_code: this.provinceCode
                },
            });

            console.log("Rsis row: " + rows.length);

            rows = await Promise.all(rows.map(row => this.setDefaultColumn(row)));
            rows = await Promise.all(rows.map(row => this.makeRsisColumnForMerge(row)));

            return rows;
        } catch (error) {
            console.error(error);
        }
    }

    async checkDuplicateInSameTable(rows, Model) {

        // Check if the model has bulkWrite method
        if (typeof Model.update !== 'function') {
            throw new Error('model does not have a update method');
        }

        let mergeArray = {};
        let operations = [];
        let index = 1;
        for (let row of rows) {
            mergeArray[index] = row;
            index++;
        }

        let size = rows.length;
        for (let index = 1; index <= size; index++) {
            let row = mergeArray[index];
            let nextIndex = index + 1;

            for (let search_i = nextIndex; search_i <= size; search_i++) {
                let search_r = mergeArray[search_i];
                let check = await this.checkMatch(row, search_r);

                if (check.result > 0) {

                    search_r.match = row.data_id;
                    search_r.is_duplicate = 1;

                    operations.push({
                        match: row.data_id,
                        is_duplicate: 1,
                        ref: search_r.data_id,
                        table: search_r.table_name
                    })
                }
            }
        }

        console.log("Duplicate", operations.length);
        if (operations.length > 0) {

            const updatePromises = operations.map(operation =>
                Model.update(
                    { match: operation.match, is_duplicate: operation.is_duplicate },
                    { where: operation.table === 'is' ? { ref: operation.ref } : { id: operation.ref } }
                ).catch(error => console.error("Error in update operation: ", error))
            );

            try {
                await Promise.all(updatePromises);
            }
            catch (error) {
                console.error("Error in updating batch: ", error);
            }
        }
    }

    async checkMatch(row_1, row_2) {
        var matchResult = 0;
        var matchLog = 0;

        var aDateMatch = false;
        var aDateSameMatch = false;
        var IDMatch = false;
        var nameMatch = false;
        var bodyMatch = false;
        var vehicleMatch = false;
        var nameAndBodyMatch = false;

        if (row_1.is_cid_good == 1 && row_2.is_cid_good == 1) {
            if (row_1.is_confirm_thai) {
                if ((row_1.cid_num - row_2.cid_num) == 0) {
                    IDMatch = true;
                }
            } else {
                if (row_1.cid_num === row_2.cid_num) {
                    IDMatch = true;
                }
            }
        }

        if (row_1.vehicle_type === row_2.vehicle_type) {
            vehicleMatch = true;
        }

        if (row_1.name === row_2.name && row_1.name.length > 0) {
            if (row_1.lname === row_2.lname) {
                nameMatch = true;
            }
        }

        if (row_1.age === row_2.age) {
            if (row_1.gender === row_2.gender) {
                bodyMatch = true;
            }
        }

        if (nameMatch && bodyMatch) {
            nameAndBodyMatch = true;
        }

        var difDate = row_1.difdatefrom2000 - row_2.difdatefrom2000;
        if (Math.abs(difDate) <= 7) {
            aDateMatch = true;
        }

        if (Math.abs(difDate) <= 2) {
            aDateSameMatch = true;
        }

        var matchTxt = row_1.data_id + " (" + row_1.table_name + ") = " + row_2.data_id + " (" + row_2.table_name + "):";

        if (IDMatch && nameMatch && aDateMatch && vehicleMatch) {
            matchResult = 1;
            matchLog = matchTxt + ": 1 Protocol ID, NAME, DATE(7), VEHICLE";
        } else if (IDMatch && aDateMatch && vehicleMatch) {
            matchResult = 2;
            matchLog = matchTxt + ": 2 Protocol ID, DATE(7), VEHICLE";
        } else if (nameMatch && aDateMatch && vehicleMatch) {
            matchResult = 3;
            matchLog = matchTxt + ": 3 Protocol NAME, DATE(7), VEHICLE";
        } else if (IDMatch && aDateSameMatch) {
            matchResult = 4;
            matchLog = matchTxt + ": 4 Protocol ID, DATE(0)";
        } else if (nameMatch && aDateSameMatch) {
            matchResult = 5;
            matchLog = matchTxt + ": 5 Protocol NAME, DATE(0)";
        } else if (IDMatch && vehicleMatch) {
            matchResult = 6;
            matchLog = matchTxt + ": 6 Protocol ID, VEHICLE";
        } else if (nameMatch && vehicleMatch) {
            matchResult = 7;
            matchLog = matchTxt + ": 7 Protocol NAME, VEHICLE";
        }

        var matchArr = {};
        matchArr['result'] = matchResult;
        matchArr['log'] = matchLog;

        return matchArr;
    }

    async makeEMSColumnForMerge(row) {

        let difDate = moment(row.notification_time, "YYYY-MM-DD").diff(moment(this.dateFrom, "YYYY-MM-DD"), 'days');

        row.table_name = "ems";
        row.difdatefrom2000 = difDate;
        row.data_id = row.id;

        row.name = row.first_name || '';
        row.lname = row.last_name || '';
        row.cid = row.id_card_number || row.passport_number || '';
        row.gender = row.gender === 'ชาย' ? 1 : (row.gender === 'หญิง' ? 2 : null);

        row = await this.cleanNameData(row);

        row.nameSave = row.name;
        row.lnameSave = row.lname;

        row.age = parseInt(row.age_years) || null;
        row.nationality = row.nationality;
        row.is_death = (row.treatment_result && row.treatment_result.includes('เสียชีวิต')) || (row.initial_care_result && row.initial_care_result.includes('เสียชีวิต')) ? 1 : null;

        row.name_lenght = row.name ? row.name.length : 0;
        const pid = row.cid ? row.cid.replace(/\D/g, '') : '';
        const numericPID = /^\d+$/.test(pid);
        row.cid_num = numericPID ? parseInt(pid, 10) : 0;
        row.is_cid_good = (row.cid !== null && row.cid.length > 10 && row.cid_num !== 0);
        row.is_confirm_thai = /^\d+$/.test(row.cid);

        row.accdate = row.notification_time || row.createdAt;
        row.dob = null;

        row.vehicle_raw = row.vehicle_type;
        row.vehicle_type = this.getVehicleType(row);

        row.alcohol = null;

        row.aprovince = row.province_code;
        row.atumbol = row.sub_district;
        row.aaumpor = row.district;

        row.alat = row.latitude;
        row.along = row.longitude;

        return row;
    }


    async makeRsisColumnForMerge(row) {

        let difDate = moment(row.injury_date, "YYYY-MM-DD").diff(moment(this.dateFrom, "YYYY-MM-DD"), 'days');


        row.table_name = "rsis";
        row.difdatefrom2000 = difDate;
        row.data_id = row.id;


        row = await this.cleanNameData(row);

        row.nameSave = row.name;
        row.lnameSave = row.lname;


        if (row.sex === "ชาย") {
            row.gender = 1;
        } else {
            row.gender = 2;
        }

        row.name_lenght = row.name.length;
        const pid = row.cid.replace(/\D/g, '');
        const numericPID = /^\d+$/.test(pid);
        row.cid_num = numericPID ? parseInt(pid, 10) : 0;
        row.is_cid_good = (row.cid !== null && row.cid.length > 10 && row.cid_num !== 0);
        row.is_confirm_thai = /^\d+$/.test(row.cid);

        row.accdate = row.injury_date;

        row.vehicle_type = this.getVehicleType(row)

        return row;
    }

    async mergeDataProcess() {
        const prepareMerge = await PrepareMergeEMS.findAll();

        const size = prepareMerge.length;
        console.log("Size of all rows: ", size);

        let mergeArray = [];
        let matchRow = {};
        let matchedRowId = {}; // Remember what is matched

        prepareMerge.forEach((row, index) => {
            mergeArray[index] = { row: row, match: [] }; // Use zero-based indexing
        });


        const rsisBegin = (await PrepareMergeEMS.findOne({
            where: { table_name: 'rsis' },
            order: [['id', 'ASC']],
            attributes: ['id']
        }))?.id || -1;

        let bulkData = [];
        // Start Match
        for (let index = 1; index <= size; index++) {

            let row = mergeArray[index].row;
            let match = mergeArray[index].match; // Match array of Current Row
            let table = row.table_name;
            let next = index + 1;

            if (!matchedRowId.hasOwnProperty(row.id)) {
                matchRow[row.id] = [];
                matchRow[row.id].push(row);
            }

            if (table === "ems") {
                if (next < rsisBegin) next = rsisBegin;
            } else if (table === "rsis") {
                break;
            }


            for (let search_i = next; search_i < size; search_i++) {

                let search_r = mergeArray[search_i].row;
                let search_m = mergeArray[search_i].match;


                let check = await this.checkMatch(row, search_r); // Assuming checkMatch returns a Promise

                if (check.result > 0) {

                    match.push(search_r.id);
                    search_m.push(row.id);

                    await this.updateMatch(row, search_r, check.log);
                    await this.updateMatch(search_r, row, check.log);


                    if (!matchedRowId.hasOwnProperty(search_r.id)) {
                        // Keep Match ID for check
                        matchedRowId[search_r.id] = search_r.id;
                        if (!matchRow[row.id]) {
                            matchRow[row.id] = [];
                        }
                        matchRow[row.id].push(search_r);
                    }

                    // Collect bulk update data
                    let updateFields = {
                        id: search_r.id,
                        match_id: row.id
                    };

                    if (row.table_name === "ems") {
                        updateFields.in_ems = 1;
                        updateFields.ems_id = row.data_id;
                        updateFields.ems_log = check.log;
                    } else if (row.table_name === "rsis") {
                        updateFields.in_rsis = 1;
                        updateFields.rsis_id = row.data_id;
                        updateFields.rsis_log = check.log;
                    }

                    bulkData.push(updateFields);


                    updateFields = {
                        id: row.id,
                        match_id: search_r.id
                    };

                    if (search_r.table_name === "ems") {
                        updateFields.in_ems = 1;
                        updateFields.ems_id = search_r.data_id;
                        updateFields.ems_log = check.log;
                    } else if (search_r.table_name === "rsis") {
                        updateFields.in_rsis = 1;
                        updateFields.rsis_id = search_r.data_id;
                        updateFields.rsis_log = check.log;
                    }
                    bulkData.push(updateFields);

                }

                // Update Match to Search Row
                mergeArray[search_i].match = search_m;
            }

            // update All Match of the Row to mergeArray
            mergeArray[index].match = match;
        }

        let finalBulkData = [];
        for (let data of mergeArray.slice(1)) { // Skip the first index if starting from 1
            const matchIdStr = data.match.join(",");
            finalBulkData.push({
                id: data.row.id
                , match_id: matchIdStr
            })
        }

        await PrepareMergeEMS.bulkCreate(bulkData, {
            updateOnDuplicate: ["in_ems", "ems_id", "ems_log", "in_rsis", "rsis_id", "rsis_log", "match_id"]
        });

        // Use bulkCreate to update all rows at once
        await PrepareMergeEMS.bulkCreate(finalBulkData, {
            updateOnDuplicate: ["match_id"]
        });
    }

    async writeMergeDataProcess() {
        // Fetch and order the prepare_merge data
        const prepareMergeRows = await PrepareMergeEMS.findAll({
            order: [
                ['id', 'DESC'] // Keeps your ordering by id in ascending order
            ]
        });

        console.log(`Prepare Merge Size: ${prepareMergeRows.length}`);

        let index = 1;
        let mergeArray = {};
        let matchRow = {};
        let matchedRowId = new Map();
        let rowID = [];

        for (const row of prepareMergeRows) {
            rowID[index] = row.id;
            mergeArray[row.id] = { row, match: [] };
            index++;
        }

        // Start Match
        for (let i = 1; i <= prepareMergeRows.length; i++) {
            let row_id = rowID[i];
            let row = mergeArray[row_id].row;

            if (matchedRowId.has(row.id) === false) {
                matchRow[row.id] = [row];
            }

            let matchData = row.match_id;

            if (matchData && matchData.length > 0) {
                let matchArr = matchData.split(',');

                for (const row_Match of matchArr) {

                    let search_r = mergeArray[row_Match].row;

                    if (matchedRowId.has(search_r.id) === false) {

                        matchedRowId.set(search_r.id, true);
                        matchedRowId.set(row.id, true);

                        try {
                            matchRow[row.id].push(search_r);
                        } catch (error) {
                            console.log("Skip ID", row.id, row.table_name, row.name, row.cid, row.accdate)
                        }

                    }
                }
            }
        }

        // Assuming writeFinalIntegrate is adapted to Node.js and available in tems context
        await this.writeFinalIntegrate(matchRow);
    }

    async writeFinalIntegrate(matchRow) {

        const ems_Arr = await this.rowsToArrayKey(this.ems_rows);
        const rsis_Arr = await this.rowsToArrayKey(this.rsis_rows);

        const size = Object.keys(matchRow).length;;
        console.log(`writeFinalIntegrate Size: ${size}`);

        let bulkData = [];
        const matchRowsArray = Object.values(matchRow);

        for (const mainRows of matchRowsArray) {
            let integrateRowData = {
                project_id: 0, // Assuming this.project_id is available in tems context
            };

            for (const row of mainRows) {
                const id = row.data_id;
                let dataRow;

                switch (row.table_name) {
                    case "ems":
                        dataRow = ems_Arr[id];
                        integrateRowData.ems_id = dataRow.data_id;
                        break;
                    case "rsis":
                        dataRow = rsis_Arr[id];
                        integrateRowData.rsis_id = dataRow.data_id;
                        break;
                }
                integrateRowData.aprovince = this.aprovince;

                this.assignValue(integrateRowData, dataRow, "name", "nameSave");
                this.assignValue(integrateRowData, dataRow, "lname", "lnameSave");
                this.assignValue(integrateRowData, dataRow, "cid");
                this.assignValue(integrateRowData, dataRow, "gender");
                this.assignValue(integrateRowData, dataRow, "nationality");
                this.assignValue(integrateRowData, dataRow, "dob");
                this.assignValue(integrateRowData, dataRow, "age");
                this.assignValue(integrateRowData, dataRow, "hdate");
                this.assignValue(integrateRowData, dataRow, "is_death");
                this.assignValue(integrateRowData, dataRow, "occupation");
                this.assignValue(integrateRowData, dataRow, "alcohol");
                this.assignValue(integrateRowData, dataRow, "belt_risk");
                this.assignValue(integrateRowData, dataRow, "helmet_risk");
                this.assignValue(integrateRowData, dataRow, "roaduser");
                this.assignValue(integrateRowData, dataRow, "vehicle_1");
                this.assignValue(integrateRowData, dataRow, "vehicle_plate_1");
                this.assignValue(integrateRowData, dataRow, "accdate");
                this.assignValue(integrateRowData, dataRow, "atumbol");
                this.assignValue(integrateRowData, dataRow, "aaumpor");
                this.assignValue(integrateRowData, dataRow, "aprovince");
                this.assignValue(integrateRowData, dataRow, "vehicle_2");
                this.assignValue(integrateRowData, dataRow, "hospcode");
                this.assignValue(integrateRowData, dataRow, "alat");
                this.assignValue(integrateRowData, dataRow, "along");
                this.assignValue(integrateRowData, dataRow, "admit");

            }
            bulkData.push(integrateRowData);
        }


        // Use bulkCreate to insert all data at once
        try {
            await ProjectIntegrateFinalEMS.bulkCreate(bulkData);
            console.log('Bulk insert successful');
        } catch (error) {
            console.error('Error during bulk insert:', error);
        }
    }

    async updateProjectIntegrateFinalData() {


        await this.mergeDataToIntegrateFinal();
        await this.updateRSISDataToFinalTable()
        await this.updateEMSDataToFinalTable();

        await this.updateIsDeadData();
        await this.updateVehicleData();
        // await this.updateRoadUserData();
        await this.updateInjuryDateData();
        await this.updateIsAdmitData();

        // await this.updateHelmetRiskData();
        // await this.updateBeltRiskData();
        // await this.updateAlcoholRiskData();

        await this.updateGPSData();

        await this.mergeFinalDataToFinalTable();
    }

    async mergeFinalDataToFinalTable() {
        await this.deleteOldData();

        try {
            // Fetch all data from IntegrateFinal
            const data = await IntegrateFinalEMS.findAll();
            const bulkData = data.map(entry => {
                const { id, ...rest } = entry.get({ plain: true });
                return rest;
            });

            // Bulk create in IntegrateFinalFull with the fetched data
            await IntegrateFinalFullEMS.bulkCreate(bulkData);
            console.log('Data create to Integrate Final Full successfully.');
        } catch (error) {
            console.error('Error copying data:', error);
        }
    }

    async deleteOldData() {

        const startDate = this.startDate; // Assuming 'start_date' is the field name
        const endDate = this.endDate; // Assuming 'end_date' is the field name
        const province_code = this.provinceCode; // Assuming 'end_date' is the field name

        await IntegrateFinalFullEMS.destroy({
            where: {
                accdate: {
                    [Op.gte]: startDate, // Greater than or equal to startDate
                    [Op.lte]: endDate    // Less than endDate
                },
                aprovince_code: province_code
            }
        });

        console.log('Delete Old record in Integrate Final Full EMS successfully');
    }

    async mergeDataToIntegrateFinal() {

        const projectIntegrateRows = await ProjectIntegrateFinalEMS.findAll();

        // Step 2: Prepare data for bulk insert
        const dataForInsert = projectIntegrateRows.map(row => ({
            name: row.name,
            lname: row.lname,
            cid: row.cid,
            gender: row.gender,
            nationality: row.nationality,
            dob: row.dob,
            age: row.age,
            is_death: row.is_death,
            occupation: row.occupation,
            hdate: row.hdate,
            alcohol: row.alcohol,
            belt_risk: row.belt_risk,
            helmet_risk: row.helmet_risk,
            roaduser: row.roaduser,
            vehicle_1: row.vehicle_1,
            vehicle_plate_1: row.vehicle_plate_1,
            accdate: row.accdate,
            atumbol: row.atumbol,
            aaumpor: row.aaumpor,
            aprovince: row.aprovince,
            aprovince_code: this.provinceCode,
            vehicle_2: row.vehicle_2,
            police_event_id: row.police_event_id,
            hospcode: row.hospcode,
            // eclaim_id: row.eclaim_id,
            // eclaim_protocal: row.eclaim_protocal,
            // is_id: row.is_id,
            // is_protocal: row.is_protocal,
            ems_id: row.ems_id,
            ems_protocal: row.ems_protocal,
            // police_id: row.police_id,
            // police_protocal: row.police_protocal,
            rsis_id: row.rsis_id,
            rsis_protocal: row.rsis_protocal,
            alat: row.alat,
            along: row.along,
            created_at: row.created_at, // Sequelize handles createdAt automatically, consider removing if not needed
            updated_at: row.updated_at, // Same for updatedAt
            acc_province_id: row.acc_province_id,
            url_video: row.url_video,
            uuid: row.id, // Ensure tems mapping is correct for your logic
            project_id: 0
        }));

        // Step 3: Perform bulk insert
        await IntegrateFinalEMS.bulkCreate(dataForInsert);

        console.log(`Merge Data To IntegrateFinalFullEMS successfully.`);
    }

    async updateRSISDataToFinalTable() {

        const query = `UPDATE integrate_final_ems AS finalEMS
                        LEFT JOIN integrate_final_full AS ff ON ff.id = finalEMS.rsis_id 
                        SET finalEMS.NAME = ff.NAME,
                        finalEMS.lname = ff.lname,
                        finalEMS.cid = ff.cid,
                        finalEMS.admit = ff.admit,
                        finalEMS.gender = ff.gender,
                        finalEMS.nationality = ff.nationality,
                        finalEMS.dob = ff.dob,
                        finalEMS.age = ff.age,
                        finalEMS.injury_date = ff.injury_date,
                        finalEMS.is_death = ff.is_death,
                        finalEMS.occupation = ff.occupation,
                        finalEMS.hdate = ff.hdate,
                        finalEMS.alcohol = ff.alcohol,
                        finalEMS.belt_risk = ff.belt_risk,
                        finalEMS.helmet_risk = ff.helmet_risk,
                        finalEMS.roaduser = ff.roaduser,
                        finalEMS.vehicle_1_type = ff.vehicle_1_type,
                        finalEMS.vehicle_1 = ff.vehicle_1,
                        finalEMS.vehicle_plate_1 = ff.vehicle_plate_1,
                        finalEMS.accdate = ff.accdate,
                        finalEMS.atumbol = ff.atumbol,
                        finalEMS.aaumpor = ff.aaumpor,
                        finalEMS.aaumpor_code = ff.aaumpor_code,
                        finalEMS.aprovince = ff.aprovince,
                        finalEMS.aprovince_code = ff.aprovince_code,
                        finalEMS.area_code = ff.area_code,
                        finalEMS.vehicle_2 = ff.vehicle_2,
                        finalEMS.police_event_id = ff.police_event_id,
                        finalEMS.hospcode = ff.hospcode,
                        finalEMS.eclaim_id = ff.eclaim_id,
                        finalEMS.eclaim_protocal = ff.eclaim_protocal,
                        finalEMS.is_id = ff.is_id,
                        finalEMS.is_protocal = ff.is_protocal,
                        finalEMS.his_id = ff.his_id,
                        finalEMS.his_protocal = ff.his_protocal,
                        finalEMS.police_id = ff.police_id,
                        finalEMS.police_protocal = ff.police_protocal,
                        finalEMS.alat = ff.alat,
                        finalEMS.along = ff.along,
                        finalEMS.acc_province_id = ff.acc_province_id,
                        finalEMS.his_pid = ff.his_pid,
                        finalEMS.his_hospcode = ff.his_hospcode,
                        finalEMS.his_date_serv = ff.his_date_serv,
                        finalEMS.his_seq = ff.his_seq,
                        finalEMS.his_an = ff.his_an,
                        finalEMS.his_diagcode = ff.his_diagcode,
                        finalEMS.his_isdeath = ff.his_isdeath,
                        finalEMS.his_cdeath = ff.his_cdeath,
                        finalEMS.his_price = ff.his_price,
                        finalEMS.his_payprice = ff.his_payprice,
                        finalEMS.his_actualpay = ff.his_actualpay,
                        finalEMS.his_dateinhosp = ff.his_dateinhosp,
                        finalEMS.his_cid = ff.his_cid,
                        finalEMS.his_name = ff.his_name,
                        finalEMS.his_lname = ff.his_lname,
                        finalEMS.his_sex = ff.his_sex,
                        finalEMS.his_nation = ff.his_nation,
                        finalEMS.his_birth = ff.his_birth,
                        finalEMS.his_age = ff.his_age,
                        finalEMS.his_opd_code = ff.his_opd_code,
                        finalEMS.his_ipd_code = ff.his_ipd_code,
                        finalEMS.his_allcode = ff.his_allcode,
                        finalEMS.his_s0 = ff.his_s0,
                        finalEMS.his_s1 = ff.his_s1,
                        finalEMS.his_s2 = ff.his_s2,
                        finalEMS.his_s3 = ff.his_s3,
                        finalEMS.his_s4 = ff.his_s4,
                        finalEMS.his_s5 = ff.his_s5,
                        finalEMS.his_s6 = ff.his_s6,
                        finalEMS.his_s7 = ff.his_s7,
                        finalEMS.his_s8 = ff.his_s8,
                        finalEMS.his_s9 = ff.his_s9,
                        finalEMS.his_aeplace = ff.his_aeplace,
                        finalEMS.his_aetype = ff.his_aetype,
                        finalEMS.his_airway = ff.his_airway,
                        finalEMS.his_alcohol = ff.his_alcohol,
                        finalEMS.his_splint = ff.his_splint,
                        finalEMS.his_belt = ff.his_belt,
                        finalEMS.his_helmet = ff.his_helmet,
                        finalEMS.his_coma_eye = ff.his_coma_eye,
                        finalEMS.his_coma_movement = ff.his_coma_movement,
                        finalEMS.his_coma_speak = ff.his_coma_speak,
                        finalEMS.his_nacrotic_drug = ff.his_nacrotic_drug,
                        finalEMS.his_stopbleed = ff.his_stopbleed,
                        finalEMS.his_traffic = ff.his_traffic,
                        finalEMS.his_typein_ae = ff.his_typein_ae,
                        finalEMS.his_urgency = ff.his_urgency,
                        finalEMS.his_vehicle = ff.his_vehicle,
                        finalEMS.his_old_id = ff.his_old_id,
                        finalEMS.his_project_id = ff.his_project_id,
                        finalEMS.his_project_file_id = ff.his_project_file_id,
                        finalEMS.is_ref = ff.is_ref,
                        finalEMS.is_hosp = ff.is_hosp,
                        finalEMS.is_prov = ff.is_prov,
                        finalEMS.is_hn = ff.is_hn,
                        finalEMS.is_an = ff.is_an,
                        finalEMS.is_titlecode = ff.is_titlecode,
                        finalEMS.is_prename = ff.is_prename,
                        finalEMS.is_name = ff.is_name,
                        finalEMS.is_fname = ff.is_fname,
                        finalEMS.is_lname = ff.is_lname,
                        finalEMS.is_pid = ff.is_pid,
                        finalEMS.is_home = ff.is_home,
                        finalEMS.is_address = ff.is_address,
                        finalEMS.is_tumbon = ff.is_tumbon,
                        finalEMS.is_ampur = ff.is_ampur,
                        finalEMS.is_changwat = ff.is_changwat,
                        finalEMS.is_tel = ff.is_tel,
                        finalEMS.is_sex = ff.is_sex,
                        finalEMS.is_birth = ff.is_birth,
                        finalEMS.is_day = ff.is_day,
                        finalEMS.is_month = ff.is_month,
                        finalEMS.is_age = ff.is_age,
                        finalEMS.is_occu = ff.is_occu,
                        finalEMS.is_occu_t = ff.is_occu_t,
                        finalEMS.is_nationality = ff.is_nationality,
                        finalEMS.is_adate = ff.is_adate,
                        finalEMS.is_atime = ff.is_atime,
                        finalEMS.is_hdate = ff.is_hdate,
                        finalEMS.is_htime = ff.is_htime,
                        finalEMS.is_aplace = ff.is_aplace,
                        finalEMS.is_aampur = ff.is_aampur,
                        finalEMS.is_atumbon = ff.is_atumbon,
                        finalEMS.is_mooban = ff.is_mooban,
                        finalEMS.is_road_type = ff.is_road_type,
                        finalEMS.is_apoint = ff.is_apoint,
                        finalEMS.is_apointname = ff.is_apointname,
                        finalEMS.is_injby = ff.is_injby,
                        finalEMS.is_injoccu = ff.is_injoccu,
                        finalEMS.is_cause = ff.is_cause,
                        finalEMS.is_cause_t = ff.is_cause_t,
                        finalEMS.is_injp = ff.is_injp,
                        finalEMS.is_injt = ff.is_injt,
                        finalEMS.is_vehicle1 = ff.is_vehicle1,
                        finalEMS.is_vehicle1_license = ff.is_vehicle1_license,
                        finalEMS.is_vehicle2 = ff.is_vehicle2,
                        finalEMS.is_vehicle2_license = ff.is_vehicle2_license,
                        finalEMS.is_injt_t = ff.is_injt_t,
                        finalEMS.is_injfrom = ff.is_injfrom,
                        finalEMS.is_injfrom_t = ff.is_injfrom_t,
                        finalEMS.is_icdcause = ff.is_icdcause,
                        finalEMS.is_activity = ff.is_activity,
                        finalEMS.is_product = ff.is_product,
                        finalEMS.is_alclevel = ff.is_alclevel,
                        finalEMS.is_risk1 = ff.is_risk1,
                        finalEMS.is_risk2 = ff.is_risk2,
                        finalEMS.is_risk3 = ff.is_risk3,
                        finalEMS.is_risk4 = ff.is_risk4,
                        finalEMS.is_risk5 = ff.is_risk5,
                        finalEMS.is_risk9 = ff.is_risk9,
                        finalEMS.is_risk9_text = ff.is_risk9_text,
                        finalEMS.is_pmi = ff.is_pmi,
                        finalEMS.is_atohosp = ff.is_atohosp,
                        finalEMS.is_ems = ff.is_ems,
                        finalEMS.is_atohosp_t = ff.is_atohosp_t,
                        finalEMS.is_htohosp = ff.is_htohosp,
                        finalEMS.is_hprov = ff.is_hprov,
                        finalEMS.is_amb = ff.is_amb,
                        finalEMS.is_refer = ff.is_refer,
                        finalEMS.is_airway = ff.is_airway,
                        finalEMS.is_airway_t = ff.is_airway_t,
                        finalEMS.is_blood = ff.is_blood,
                        finalEMS.is_blood_t = ff.is_blood_t,
                        finalEMS.is_splintc = ff.is_splintc,
                        finalEMS.is_splntc_t = ff.is_splntc_t,
                        finalEMS.is_splint = ff.is_splint,
                        finalEMS.is_splint_t = ff.is_splint_t,
                        finalEMS.is_iv = ff.is_iv,
                        finalEMS.is_iv_t = ff.is_iv_t,
                        finalEMS.is_hxcc = ff.is_hxcc,
                        finalEMS.is_hxcc_hr = ff.is_hxcc_hr,
                        finalEMS.is_hxcc_min = ff.is_hxcc_min,
                        finalEMS.is_bp1 = ff.is_bp1,
                        finalEMS.is_bp2 = ff.is_bp2,
                        finalEMS.is_bp = ff.is_bp,
                        finalEMS.is_pr = ff.is_pr,
                        finalEMS.is_rr = ff.is_rr,
                        finalEMS.is_e = ff.is_e,
                        finalEMS.is_v = ff.is_v,
                        finalEMS.is_m = ff.is_m,
                        finalEMS.is_coma = ff.is_coma,
                        finalEMS.is_tinj = ff.is_tinj,
                        finalEMS.is_diser = ff.is_diser,
                        finalEMS.is_timer = ff.is_timer,
                        finalEMS.is_er = ff.is_er,
                        finalEMS.is_er_t = ff.is_er_t,
                        finalEMS.is_staer = ff.is_staer,
                        finalEMS.is_ward = ff.is_ward,
                        finalEMS.is_staward = ff.is_staward,
                        finalEMS.is_diag1 = ff.is_diag1,
                        finalEMS.is_br1 = ff.is_br1,
                        finalEMS.is_ais1 = ff.is_ais1,
                        finalEMS.is_diag2 = ff.is_diag2,
                        finalEMS.is_br2 = ff.is_br2,
                        finalEMS.is_ais2 = ff.is_ais2,
                        finalEMS.is_diag3 = ff.is_diag3,
                        finalEMS.is_br3 = ff.is_br3,
                        finalEMS.is_ais3 = ff.is_ais3,
                        finalEMS.is_diag4 = ff.is_diag4,
                        finalEMS.is_br4 = ff.is_br4,
                        finalEMS.is_ais4 = ff.is_ais4,
                        finalEMS.is_diag5 = ff.is_diag5,
                        finalEMS.is_br5 = ff.is_br5,
                        finalEMS.is_ais5 = ff.is_ais5,
                        finalEMS.is_diag6 = ff.is_diag6,
                        finalEMS.is_br6 = ff.is_br6,
                        finalEMS.is_ais6 = ff.is_ais6,
                        finalEMS.is_rdate = ff.is_rdate,
                        finalEMS.is_rts = ff.is_rts,
                        finalEMS.is_iss = ff.is_iss,
                        finalEMS.is_ps = ff.is_ps,
                        finalEMS.is_ps_thai = ff.is_ps_thai,
                        finalEMS.is_pttype = ff.is_pttype,
                        finalEMS.is_pttype2 = ff.is_pttype2,
                        finalEMS.is_pttype3 = ff.is_pttype3,
                        finalEMS.is_acc_id = ff.is_acc_id,
                        finalEMS.is_lblind = ff.is_lblind,
                        finalEMS.is_blind1 = ff.is_blind1,
                        finalEMS.is_blind2 = ff.is_blind2,
                        finalEMS.is_blind3 = ff.is_blind3,
                        finalEMS.is_blind4 = ff.is_blind4,
                        finalEMS.is_lcost = ff.is_lcost,
                        finalEMS.is_ddate = ff.is_ddate,
                        finalEMS.is_recorder = ff.is_recorder,
                        finalEMS.is_recorderipd = ff.is_recorderipd,
                        finalEMS.is_referhosp = ff.is_referhosp,
                        finalEMS.is_referprov = ff.is_referprov,
                        finalEMS.is_dlt = ff.is_dlt,
                        finalEMS.is_edt = ff.is_edt,
                        finalEMS.is_vn = ff.is_vn,
                        finalEMS.is_lat = ff.is_lat,
                        finalEMS.is_lng = ff.is_lng,
                        finalEMS.is_incident_id = ff.is_incident_id,
                        finalEMS.is_mass_casualty = ff.is_mass_casualty,
                        finalEMS.is_items = ff.is_items,
                        finalEMS.is_alcohol_check = ff.is_alcohol_check,
                        finalEMS.is_alcohol_level = ff.is_alcohol_level,
                        finalEMS.is_alcohol_check2 = ff.is_alcohol_check2,
                        finalEMS.is_alcohol_level2 = ff.is_alcohol_level2,
                        finalEMS.is_alcohol_prove = ff.is_alcohol_prove,
                        finalEMS.is_alcohol_prove_name = ff.is_alcohol_prove_name,
                        finalEMS.is_car_safe = ff.is_car_safe,
                        finalEMS.is_license_card = ff.is_license_card,
                        finalEMS.is_speed_drive = ff.is_speed_drive,
                        finalEMS.is_roadsafety = ff.is_roadsafety,
                        finalEMS.is_refer_result = ff.is_refer_result,
                        finalEMS.is_yearly = ff.is_yearly,
                        finalEMS.is_kwd = ff.is_kwd,
                        finalEMS.is_sentmoph = ff.is_sentmoph,
                        finalEMS.is_version = ff.is_version,
                        finalEMS.is_detail = ff.is_detail,
                        finalEMS.is_remark = ff.is_remark,
                        finalEMS.is_his = ff.is_his,
                        finalEMS.is_dgis = ff.is_dgis,
                        finalEMS.is_dupload = ff.is_dupload,
                        finalEMS.is_seq = ff.is_seq,
                        finalEMS.is_pher_id = ff.is_pher_id,
                        finalEMS.is_inp_src = ff.is_inp_src,
                        finalEMS.is_inp_id = ff.is_inp_id,
                        finalEMS.is_edit_id = ff.is_edit_id,
                        finalEMS.is_ip = ff.is_ip,
                        finalEMS.is_lastupdate = ff.is_lastupdate,
                        finalEMS.police_vehicle_event_id = ff.police_vehicle_event_id,
                        finalEMS.police_vehicle_vehicle_index = ff.police_vehicle_vehicle_index,
                        finalEMS.police_vehicle_vehicle = ff.police_vehicle_vehicle,
                        finalEMS.police_vehicle_vehicle_plate = ff.police_vehicle_vehicle_plate,
                        finalEMS.police_vehicle_vehicle_province = ff.police_vehicle_vehicle_province,
                        finalEMS.police_vehicle_fullname = ff.police_vehicle_fullname,
                        finalEMS.police_vehicle_cid = ff.police_vehicle_cid,
                        finalEMS.police_vehicle_age = ff.police_vehicle_age,
                        finalEMS.police_vehicle_sex = ff.police_vehicle_sex,
                        finalEMS.police_vehicle_nation = ff.police_vehicle_nation,
                        finalEMS.police_vehicle_occupation = ff.police_vehicle_occupation,
                        finalEMS.police_vehicle_roaduser = ff.police_vehicle_roaduser,
                        finalEMS.police_vehicle_vehicle_ride_index = ff.police_vehicle_vehicle_ride_index,
                        finalEMS.police_vehicle_injury = ff.police_vehicle_injury,
                        finalEMS.police_vehicle_alcohol = ff.police_vehicle_alcohol,
                        finalEMS.police_vehicle_injury_factor = ff.police_vehicle_injury_factor,
                        finalEMS.police_vehicle_belt = ff.police_vehicle_belt,
                        finalEMS.police_vehicle_helmet = ff.police_vehicle_helmet,
                        finalEMS.police_vehicle_vehicle_type = ff.police_vehicle_vehicle_type,
                        finalEMS.police_vehicle_driving_licence = ff.police_vehicle_driving_licence,
                        finalEMS.police_vehicle_driving_licence_type = ff.police_vehicle_driving_licence_type,
                        finalEMS.police_vehicle_driving_licence_province = ff.police_vehicle_driving_licence_province,
                        finalEMS.police_vehicle_prename = ff.police_vehicle_prename,
                        finalEMS.police_vehicle_name = ff.police_vehicle_name,
                        finalEMS.police_vehicle_lname = ff.police_vehicle_lname,
                        finalEMS.police_vehicle_adate = ff.police_vehicle_adate,
                        finalEMS.police_vehicle_project_id = ff.police_vehicle_project_id,
                        finalEMS.police_vehicle_project_file_id = ff.police_vehicle_project_file_id,
                        finalEMS.police_events_event_id = ff.police_events_event_id,
                        finalEMS.police_events_adate = ff.police_events_adate,
                        finalEMS.police_events_atime = ff.police_events_atime,
                        finalEMS.police_events_borchor = ff.police_events_borchor,
                        finalEMS.police_events_borkor = ff.police_events_borkor,
                        finalEMS.police_events_sornor = ff.police_events_sornor,
                        finalEMS.police_events_light = ff.police_events_light,
                        finalEMS.police_events_aroad = ff.police_events_aroad,
                        finalEMS.police_events_atumbol = ff.police_events_atumbol,
                        finalEMS.police_events_aaumpor = ff.police_events_aaumpor,
                        finalEMS.police_events_aprovince = ff.police_events_aprovince,
                        finalEMS.police_events_aroad_type = ff.police_events_aroad_type,
                        finalEMS.police_events_alane = ff.police_events_alane,
                        finalEMS.police_events_aroad_character = ff.police_events_aroad_character,
                        finalEMS.police_events_aroad_factor = ff.police_events_aroad_factor,
                        finalEMS.police_events_aroadfit_factor = ff.police_events_aroadfit_factor,
                        finalEMS.police_events_aenv_factor = ff.police_events_aenv_factor,
                        finalEMS.police_events_abehavior_factor = ff.police_events_abehavior_factor,
                        finalEMS.police_events_abehavior_other_factor = ff.police_events_abehavior_other_factor,
                        finalEMS.police_events_avehicle_factor = ff.police_events_avehicle_factor,
                        finalEMS.police_events_aconformation = ff.police_events_aconformation,
                        finalEMS.police_events_vehicle_1 = ff.police_events_vehicle_1,
                        finalEMS.police_events_vehicle_plate_1 = ff.police_events_vehicle_plate_1,
                        finalEMS.police_events_vehicle_province_1 = ff.police_events_vehicle_province_1,
                        finalEMS.police_events_vehicle_2 = ff.police_events_vehicle_2,
                        finalEMS.police_events_vehicle_plate_2 = ff.police_events_vehicle_plate_2,
                        finalEMS.police_events_vehicle_province_2 = ff.police_events_vehicle_province_2,
                        finalEMS.police_events_vehicle_3 = ff.police_events_vehicle_3,
                        finalEMS.police_events_vehicle_plate_3 = ff.police_events_vehicle_plate_3,
                        finalEMS.police_events_vehicle_province_3 = ff.police_events_vehicle_province_3,
                        finalEMS.police_events_vehicle_4 = ff.police_events_vehicle_4,
                        finalEMS.police_events_vehicle_plate_4 = ff.police_events_vehicle_plate_4,
                        finalEMS.police_events_vehicle_province_4 = ff.police_events_vehicle_province_4,
                        finalEMS.police_events_id = ff.police_events_id,
                        finalEMS.police_events_project_file_id = ff.police_events_project_file_id,
                        finalEMS.police_events_project_id = ff.police_events_project_id,
                        finalEMS.eclaim_cid = ff.eclaim_cid,
                        finalEMS.eclaim_vehicle_plate_province = ff.eclaim_vehicle_plate_province,
                        finalEMS.eclaim_vehicle_plate = ff.eclaim_vehicle_plate,
                        finalEMS.eclaim_vehicle_type = ff.eclaim_vehicle_type,
                        finalEMS.eclaim_prename = ff.eclaim_prename,
                        finalEMS.eclaim_name = ff.eclaim_name,
                        finalEMS.eclaim_lname = ff.eclaim_lname,
                        finalEMS.eclaim_gender = ff.eclaim_gender,
                        finalEMS.eclaim_nation = ff.eclaim_nation,
                        finalEMS.eclaim_birthdate = ff.eclaim_birthdate,
                        finalEMS.eclaim_age = ff.eclaim_age,
                        finalEMS.eclaim_adate = ff.eclaim_adate,
                        finalEMS.eclaim_atime = ff.eclaim_atime,
                        finalEMS.eclaim_atumbol = ff.eclaim_atumbol,
                        finalEMS.eclaim_aaumpor = ff.eclaim_aaumpor,
                        finalEMS.eclaim_aprovince = ff.eclaim_aprovince,
                        finalEMS.eclaim_alat = ff.eclaim_alat,
                        finalEMS.eclaim_along = ff.eclaim_along,
                        finalEMS.eclaim_crash_desc = ff.eclaim_crash_desc,
                        finalEMS.eclaim_occupation = ff.eclaim_occupation,
                        finalEMS.eclaim_address_aumpor = ff.eclaim_address_aumpor,
                        finalEMS.eclaim_address_province = ff.eclaim_address_province,
                        finalEMS.eclaim_hospcode = ff.eclaim_hospcode,
                        finalEMS.eclaim_injury_status = ff.eclaim_injury_status,
                        finalEMS.eclaim_ride_status = ff.eclaim_ride_status,
                        finalEMS.eclaim_cost = ff.eclaim_cost,
                        finalEMS.eclaim_updated_at = ff.eclaim_updated_at,
                        finalEMS.eclaim_adatetime = ff.eclaim_adatetime,
                        finalEMS.eclaim_created_at = ff.eclaim_created_at,
                        finalEMS.eclaim_project_id = ff.eclaim_project_id,
                        finalEMS.eclaim_project_file_id = ff.eclaim_project_file_id,
                        finalEMS.url_video = ff.url_video,
                        finalEMS.uuid = ff.uuid,
                        finalEMS.rsis_id = ff.id
                        WHERE
                            finalEMS.rsis_id IS NOT NULL`;

        try {
            await dbServer.query(query, {
                type: QueryTypes.UPDATE
            });

            console.log('Update successful');
        } catch (error) {
            console.error('Error updating IntegrateFinalFullEMS:', error);
        }
    }


    ///////////////////////////////////////////////////

    getVehicleType(row) {
        let vehicle_type = 99;

        const walkNum = 0;
        const bicycleNum = 1;
        const motorcycleNum = 2;
        const tricycleNum = 3;
        const carNum = 4;
        const truckNum = 5;
        const bigTruckNum = 6;
        const busNum = 7;

        const walkTxt = "เดิน";
        const bicycleTxt = "จักรยาน";
        const motorcycleTxt = "จักรยานยนต์";
        const tricycleTxt = "สามล้อ";
        const carTxt = "รถยนต์";
        const vanTxt = "รถตู้";
        const truckTxt = "รถกระบะ";
        const bigTruckTxt = "รถบรรทุก";
        const veryBigTruckTxt = "รถพ่วง";
        const busTxt = "รถบัส";
        const omniBusTxt = "รถโดยสาร";

        if (row.table_name === "ems") {
            let code = (row.vehicle_raw || '').toUpperCase();

            if (code.includes(walkTxt)) vehicle_type = walkNum;
            else if (code.includes(motorcycleTxt)) vehicle_type = motorcycleNum;
            else if (code.includes(bicycleTxt)) vehicle_type = bicycleNum;
            else if (code.includes(tricycleTxt)) vehicle_type = tricycleNum;
            else if (code.includes(carTxt)) vehicle_type = carNum;
            else if (code.includes(vanTxt)) vehicle_type = truckNum;
            else if (code.includes(truckTxt)) vehicle_type = truckNum;
            else if (code.includes(bigTruckTxt)) vehicle_type = bigTruckNum;
            else if (code.includes(veryBigTruckTxt)) vehicle_type = bigTruckNum;
            else if (code.includes(busTxt)) vehicle_type = busNum;
            else if (code.includes(omniBusTxt)) vehicle_type = busNum;
        }

        if (row.table_name === "rsis") {
            let code = row.vehicle_1;

            if (code === null || code.includes(walkTxt)) vehicle_type = walkNum;
            else if (code.includes(motorcycleTxt)) vehicle_type = motorcycleNum;
            else if (code.includes(bicycleTxt)) vehicle_type = bicycleNum;
            else if (code.includes(tricycleTxt)) vehicle_type = tricycleNum;
            else if (code.includes(carTxt)) vehicle_type = carNum;
            else if (code.includes(vanTxt)) vehicle_type = truckNum;
            else if (code.includes(truckTxt)) vehicle_type = truckNum;
            else if (code.includes(bigTruckTxt)) vehicle_type = bigTruckNum;
            else if (code.includes(veryBigTruckTxt)) vehicle_type = bigTruckNum;
            else if (code.includes(busTxt)) vehicle_type = busNum;
            else if (code.includes(omniBusTxt)) vehicle_type = busNum;
        }

        return vehicle_type;
    }

    async setDefaultColumn(row) {
        if (row.name === undefined) row.name = null;
        if (row.lname === undefined) row.lname = null;
        if (row.cid === undefined) row.cid = null;
        if (row.gender === undefined) row.gender = null;
        if (row.admit === undefined) row.admit = null;
        if (row.nationality === undefined) row.nationality = null;
        if (row.dob === undefined) row.dob = null;
        if (row.age === undefined) row.age = null;
        if (row.is_death === undefined) row.is_death = null;
        if (row.occupation === undefined) row.occupation = null;
        if (row.alcohol === undefined) row.alcohol = null;
        if (row.belt_risk === undefined) row.belt_risk = null;
        if (row.helmet_risk === undefined) row.helmet_risk = null;
        if (row.roaduser === undefined) row.roaduser = null;
        if (row.vehicle_1 === undefined) row.vehicle_1 = null;
        if (row.vehicle_plate_1 === undefined) row.vehicle_plate_1 = null;
        if (row.adatetime === undefined) row.adatetime = null;
        if (row.atumbol === undefined) row.atumbol = null;
        if (row.aaumpor === undefined) row.aaumpor = null;
        if (row.aprovince === undefined) row.aprovince = null;
        if (row.vehicle_2 === undefined) row.vehicle_2 = null;
        if (row.police_event_id === undefined) row.police_event_id = null;
        if (row.hospcode === undefined) row.hospcode = null;
        if (row.alat === undefined) row.alat = null;
        if (row.along === undefined) row.along = null;
        if (row.hdate === undefined) row.hdate = null;
        if (row.name_lenght === undefined) row.name_lenght = null;

        return row;
    }

    async separateName(name) {

        name = name.toLowerCase();
        const prename = ['เด็กหญิง', 'เด็กชาย', 'พล.ร.ท.', 'พล.ร.อ.', 'พล.ร.ต.', 'พล.อ.อ.', 'พล.อ.ต.', 'พล.อ.ท.', 'พล.ต.อ.', 'พล.ต.ต.', 'พล.ต.ท.', 'นางสาว', 'จ.ส.ท.', 'จ.ส.อ.', 'จ.ส.ต.', 'พ.จ.อ.', 'พ.จ.ต.', 'พ.จ.ท.', 'พ.อ.ท.', 'พ.อ.อ.', 'พ.อ.ต.', 'พ.ต.ท.', 'ร.ต.อ.', 'ร.ต.ต.', 'จ.ส.ต.', 'ส.ต.ท.', 'พ.ต.อ.', 'พ.ต.ต.', 'ร.ต.ท.', 'ส.ต.อ.', 'ส.ต.ต.', 'ม.ร.ว.', 'พล.อ.', 'พล.ต.', 'พล.ท.', 'น.ส.', 'ด.ญ.', 'หญิง', 'ด.ช.', 'พ.ท.', 'ร.อ.', 'ร.ต.', 'ส.อ.', 'ส.ต.', 'พ.อ.', 'พ.ต.', 'ร.ท.', 'ส.ท.', 'จ.ท.', 'จ.อ.', 'จ.ต.', 'น.ท.', 'ร.อ.', 'ร.ต.', 'จ.อ.', 'จ.ต.', 'น.อ.', 'น.ต.', 'ร.ท.', 'จ.ท.', 'ม.ล.', 'ด.ต.', 'แม่', 'Mrs', 'นส.', 'ดญ.', 'นาย', 'ดช.', 'พระ', 'นาง', 'พลฯ', 'mr.', 'ms.', 'mr', 'ms'];

        for (const pre of prename) {
            if (name.includes(pre)) { // Check if the name contains the prefix
                name = name.replace(new RegExp(pre), ''); // Replace the first occurrence
                break; // Exit the loop after the first replacement
            }
        }

        // Trim spaces before and after the string
        name = name.trim();

        // Replace multiple spaces with a single space
        name = name.replace(/\s+/g, ' ');

        // Split the name into an array of names
        let splitName = name.split(' ');


        return splitName;
    }

    async cleanNameData(row) {
        // CID Fname Lname Remove Special word - Spacbar
        row.cid = row.cid ? row.cid.replace(/[^a-zA-Z0-9-]/g, '').replace(/\s+/g, '') : '';
        row.name = row.name ? row.name.replace(/\s+/g, '') : '';
        row.lname = row.lname ? row.lname.replace(/\s+/g, '') : '';

        /* Remove first vowel */
        let begin_wrong = ['ิ', 'ฺ.', '์', 'ื', '่', '๋', '้', '็', 'ั', 'ี', '๊', 'ุ', 'ู', 'ํ', '.'];

        // If the first character of name is a vowel
        while (begin_wrong.includes(row.name.charAt(0))) {
            row.name = row.name.slice(1);
        }

        // If the first character of lname is a vowel
        while (begin_wrong.includes(row.lname.charAt(0))) {
            row.lname = row.lname.slice(1);
        }

        row.name = this.replaceName(row.name);
        row.lname = this.replaceName(row.lname);

        return row;
    }

    replaceName(name) {
        const replacements = {
            "ร": "ล",
            "ณ": "น",
            "ศ": "ส",
            "ษ": "ส",
            "ฌ": "ช",
            "ญ": "ย",
            "ฆ": "ค",
            "์": "",
            "ู": "ุ",
            "ี": "ิ",
            "ื": "ิ"
        };

        for (let key in replacements) {
            let re = new RegExp(key, "g");
            name = name.replace(re, replacements[key]);
        }

        return name;
    }

    assignValue(finalData, dataRow, colName, dataColName = "") {
        dataColName = dataColName || colName; // Default to colName if dataColName is empty

        const currValue = finalData[colName];
        if ((currValue === null || currValue === undefined) && dataRow[dataColName] != null) {
            finalData[colName] = dataRow[dataColName];
        }
    }


    async updateMatch(row_1, row_2, log) {
        if (row_1.table_name === "ems") {
            row_2.in_ems = 1;
            row_2.ems_id = row_1.data_id;
            row_2.ems_protocal = log;

        } else if (row_1.table_name === "rsis") {
            row_2.in_rsis = 1;
            row_2.rsis_id = row_1.data_id;
            row_2.rsis_protocal = log;
        }
    }

    async rowsToArrayKey(rows) {
        const arr = {};
        for (const row of rows) {
            arr[row.data_id] = row;
        }
        return arr;
    }

    async savePrepareData(rows) {

        let rowNum = 1;
        let prepareMergesData = [];

        for (const row of rows) {
            if (!row.is_duplicate) {

                const keysToCheck = [
                    'data_id',
                    'name',
                    'lname',
                    'age',
                    'gender',
                    'difdatefrom2000',
                    'name_lenght',
                    'is_cid_good',
                    'cid',
                    'cid_num',
                    'is_confirm_thai',
                    'vehicle_type',
                    'table_name',
                    'accdate',
                    'hospdate',
                    'hospcode',
                    'project_id',
                    'row_num'
                ];
                let is_error = 0;
                for (let key of keysToCheck) {
                    let value = row[key];
                    if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) {
                        console.log(`${key} is NaN or Infinity`);
                        is_error = 1;
                    }
                }
                if (is_error) {
                    console.log(row['cid']);
                    console.log(row.cid);
                    console.log(row.name);
                    let key = 'name'
                    console.log(row[key]);
                    throw new Error(`${row} is NaN`);
                }


                const rowToInsert = {
                    data_id: row.data_id,
                    name: row.name,
                    lname: row.lname,
                    age: row.age,
                    gender: row.gender,
                    difdatefrom2000: row.difdatefrom2000,
                    name_lenght: row.name_lenght,
                    is_cid_good: row.is_cid_good,
                    cid: row.cid,
                    cid_num: row.cid_num,
                    is_confirm_thai: row.is_confirm_thai,
                    vehicle_type: row.vehicle_type,
                    table_name: row.table_name,
                    accdate: row.accdate,
                    hospdate: row.hospdate,
                    hospcode: row.hospcode,
                    admin: row.admin,
                    project_id: 0,
                    row_num: rowNum
                };
                prepareMergesData.push(rowToInsert);
                rowNum++;
            }
        }

        try {
            await PrepareMergeEMS.bulkCreate(prepareMergesData);
        } catch (exception) {
            console.error(prepareMergesData, exception);
        }
    }


    async updateIsDeadData() {
        try {
            await dbServer.query(`UPDATE integrate_final_ems SET is_death = 1 WHERE ems_treatment_result LIKE '%เสียชีวิต%' OR ems_initial_care_result LIKE '%เสียชีวิต%';`);

            console.log("Update IS Death Data successfully.");

        } catch (error) {
            console.error('Error', error);
        }
    }
    async updateEMSDataToFinalTable() {

        await dbServer.query("SET SESSION sql_mode='NO_ZERO_DATE'");


        try {
            const query = this.getUpdateQuery();
            const result = await dbServer.query(query);

        } catch (error) {
            console.error('Error', error);
        } finally {
            await dbServer.query("SET SESSION sql_mode=''");
        }
    }
    async updateHelmetRiskData() {
        try {
            await dbServer.query(`UPDATE integrate_final_ems SET helmet_risk = NULL WHERE vehicle_1 != 'รถจักรยานยนต์'`);

            console.log("Update Helmet Data successfully.");

        } catch (error) {
            console.error('Error', error);
        }
    }



    async updateBeltRiskData() {
        try {
            await dbServer.query(`UPDATE integrate_final_ems SET belt_risk = NULL WHERE (vehicle_1 = 'รถจักรยานยนต์' OR vehicle_1 = 'คนเดินเท้า')`);

            console.log("Update Belt Data successfully.");

        } catch (error) {
            console.error('Error', error);
        }
    }

    async updateGPSData() {
        try {
            const query = `
                UPDATE integrate_final_ems
                SET alat = ems_longitude,
                    along =  ems_latitude
                WHERE  ems_longitude > 18
                  AND   ems_latitude > 0
                `;

            await dbServer.query(query);

            console.log("Update EMS GPS successfully.");
        } catch (error) {
            console.error('Error', error);
        }
    }

    async updateAlcoholRiskData() {
        try {
            //EMS
            await dbServer.query(`UPDATE integrate_final_ems SET alcohol = 'ดื่ม' WHERE ems_alcohol = '1' and alcohol is null;`);
            await dbServer.query(`UPDATE integrate_final_ems SET alcohol = 'ไม่ดื่ม' WHERE ems_alcohol = '2' and alcohol is null ;`);
            await dbServer.query(`UPDATE integrate_final_ems SET alcohol = 'ไม่ทราบ' WHERE (alcohol IS NULL OR alcohol = 'N' OR alcohol = '9');`);

            console.log("Update Alcohol Data successfully.");

        } catch (error) {
            console.error('Error', error);
        }
    }

    async updateVehicleData() {

        const walkTxt = "เดินเท้า";
        const bycicleTxt = "จักรยาน";
        const motorcycleTxt = "รถจักรยานยนต์";
        const tricycleTxt = "สามล้อ";
        const carTxt = "รถยนต์"; // ปิกอั๊พ รถแท็กซี่
        const vanTxt = "รถตู้"; // รถตู้ทั่วไป รถตู้โดยสารประจำทาง รถตู้สาธารณะอื่นๆ
        const truckTxt = "รถกระบะ"; // รถตู้ทั่วไป รถตู้โดยสารประจำทาง รถตู้สาธารณะอื่นๆ
        const bigTruckTxt = "รถบรรทุก"; //รถพ่วง รถบรรทุกหนัก
        const veryBigTruckTxt = "รถพ่วง"; //รถพ่วง รถบรรทุกหนัก
        const busTxt = "รถบัส"; //โดยสาร
        const omniBusTxt = "รถโดยสาร"; //โดยสาร
        const schoolBusTxt = "รถรับส่งนักเรียน"; // รถรับส่งนักเรียน

        const walk = "เดินเท้า";
        const bycicle = "จักรยาน";
        const motorcycle = "รถจักรยานยนต์";
        const tricycle = "ยานยนต์สามล้อ";
        const car = "รถยนต์";
        const truck = "รถบรรทุกเล็กหรือรถตู้";
        const bigTruck = "รถบรรทุกหนัก";
        const bus = "รถโดยสาร";


        try {
            await dbServer.query(`UPDATE integrate_final_ems SET vehicle_1 = '${walkTxt}' WHERE ems_vehicle_type LIKE '%เดินเท้า%' AND vehicle_1 is null;`);
            await dbServer.query(`UPDATE integrate_final_ems SET vehicle_1 = '${bycicle}' WHERE ems_vehicle_type LIKE '%จักรยาน%' AND ems_vehicle_type NOT LIKE '%จักรยานยนต์%' AND vehicle_1 is null;`);
            await dbServer.query(`UPDATE integrate_final_ems SET vehicle_1 = '${motorcycle}' WHERE ems_vehicle_type LIKE '%จักรยานยนต์%' AND vehicle_1 is null;`);
            await dbServer.query(`UPDATE integrate_final_ems SET vehicle_1 = '${tricycle}' WHERE ems_vehicle_type LIKE '%สามล้อ%' AND vehicle_1 is null`);
            await dbServer.query(`UPDATE integrate_final_ems SET vehicle_1 = '${car}' WHERE ems_vehicle_type LIKE '%รถยนต์%' AND vehicle_1 is null`);
            await dbServer.query(`UPDATE integrate_final_ems SET vehicle_1 = '${truck}' WHERE (ems_vehicle_type LIKE '%กระบะ%' OR ems_vehicle_type LIKE '%ตู้%') AND vehicle_1 is null`);
            await dbServer.query(`UPDATE integrate_final_ems SET vehicle_1 = '${bigTruck}' WHERE ems_vehicle_type LIKE '%บรรทุก%' AND vehicle_1 is null`);
            await dbServer.query(`UPDATE integrate_final_ems SET vehicle_1 = '${bus}' WHERE ems_vehicle_type LIKE '%บัส%' AND vehicle_1 is null`);

        } catch (error) {
            console.error('Error', error);
        }

        console.log("Update Vehicle Data successfully.");
    }

    async updateRoadUserData() {
        try {
            // Update for EMS
            await dbServer.query(`UPDATE integrate_final_ems SET roaduser = 'ผู้ขับขี่' WHERE ems_patient_type LIKE '%ขับ%' AND roaduser is null;`);
            await dbServer.query(`UPDATE integrate_final_ems SET roaduser = 'ผู้โดยสาร' WHERE ems_patient_type LIKE '%โดยสาร%' AND roaduser is null;`);
            await dbServer.query(`UPDATE integrate_final_ems SET roaduser = 'คนเดินเท้า' WHERE ems_patient_type LIKE '%เดินเท้า%' AND roaduser is null;`);
        }
        catch (error) {
            console.error('Error', error);
        }
    }

    async updateInjuryDateData() {
        try {
            // Update injury_date from ems_notification_time
            await dbServer.query("UPDATE integrate_final_ems SET injury_date = accdate WHERE accdate IS NOT NULL;");
            await dbServer.query("UPDATE integrate_final_ems SET injury_date = ems_notification_time WHERE ems_notification_time IS NOT NULL;");

            // await dbServer.query("UPDATE integrate_final_ems SET hdate = ems_notification_time WHERE hdate IS NULL AND ems_notification_time IS NOT NULL;");

            console.log("Update Injury Data successfully.");
        } catch (error) {
            console.error('Error', error);
        }
    }

    async updateIsAdmitData() {
        try {
            await dbServer.query("UPDATE integrate_final_ems SET admit = 1 WHERE ems_admitted = 'Yes';");

            console.log("Update Is Admit successfully.");
        } catch (error) {
            console.error('Error', error);
        }
    }

    getUpdateQuery() {
        const columns = [
            'incident_number', 'notification_time', 'province_code', 'center_code', 'district', 'sub_district',
            'latitude', 'longitude', 'scene_location', 'severity_code', 'incident_event', 'patient_number',
            'ipd_event_number', 'id_card_number', 'patient_sequence', 'patient_id', 'title', 'first_name',
            'last_name', 'gender', 'age_years', 'age_months', 'patient_type', 'nationality', 'passport_number',
            'treatment_right', 'other_insurance', 'country', 'vehicle_type', 'vehicle_plate_category',
            'vehicle_plate_number', 'vehicle_province', 'delivery_province', 'hospital', 'hospital_type',
            'delivery_time', 'triage_level', 'operation_number', 'operation_event_number', 'command_time',
            'unit_level', 'time_unit_notified', 'time_left_base', 'lat_left_base', 'long_left_base',
            'time_arrived_scene', 'time_left_scene', 'lat_scene', 'long_scene', 'time_arrived_hospital',
            'lat_hospital', 'long_hospital', 'time_arrived_base', 'lat_base', 'long_base', 'idc_code_scene',
            'operation_status', 'operation_option', 'vehicle_plate_cat_symptom_25', 'vehicle_plate_num_symptom_25',
            'vehicle_province_symptom_25', 'vehicle_owner_symptom_25', 'system_status', 'recorder_name',
            'patient_type_2', 'consciousness', 'breathing', 'wound', 'deformity', 'organ', 'airway',
            'stop_bleeding', 'splinting', 'fluids', 'fluids_detail', 'cpr', 'medication', 'initial_care_result',
            'wound_2', 'deformity_2', 'blood_loss', 'organ_2', 'medicine_method', 'medicine_detail', 'obgyn',
            'obgyn_detail', 'pediatrics', 'pediatrics_detail', 'surgery', 'surgery_detail', 'others',
            'diagnosis', 'airway_2', 'stop_bleeding_2', 'splinting_2', 'fluids_2', 'admitted', 'treatment_result',
            'vital_signs', 'neuro_signs', 'pupils', 'o2_sat', 'dtx'
        ];

        const setStatements = columns.map(col => `final.ems_${col} = ems.${col}`).join(',\n                    ');

        return `
            UPDATE integrate_final_ems AS final
                LEFT JOIN temp_ems_clean AS ems ON ems.id = final.ems_id
                SET
                    ${setStatements};`;
    }


}

module.exports = ProcessIntegrateEMSController;