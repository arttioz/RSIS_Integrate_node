
const {log} = require("debug");
const moment = require('moment');

// Import all models
const EclaimMergeData = require('../models/EclaimMergeData');
const ISMergeData = require('../models/ISMergeData');
const PoliceEventMergeData = require('../models/PoliceEventMergeData');
const PoliceVehicleMergeData = require('../models/PoliceVehicleMergeData');
const PrepareMerge = require('../models/PrepareMerge');
const Project = require('../models/Project');
const ProjectIntegrateFinal = require('../models/ProjectIntegrateFinal');
const IntegrateFinal = require('../models/IntegrateFinal');
const IntegrateFinalFull = require('../models/IntegrateFinalFull');

const dbServer = require('../../config/connections/db_server');
const {QueryTypes, Op} = require("sequelize");

const provinces = require('../utils/provinces');

require('dotenv').config();

class ProcessIntegrateController {

    static STATUS_CREATED = "รอการอัพโหลดข้อให้ครบถ้วน";
    static STATUS_UPLOADED = "อัพโหลดแล้ว พร้อมบูรณาการ";
    static STATUS_INTEGRATE_SUCCESSED = "บูรณาการสำเร็จ";
    static STATUS_INTEGRATE_FAILED = "บูรณาการไม่สำเร็จ กรุณาตรวจสอบ Log";
    static STATUS_INTEGRATE_MERGE_SUCCESSED = "ข้อมูลบูรณาการได้รวมกับฐานหลักแล้ว";

    constructor(project_id,project_code) {
        this.dateFrom = moment('2000-01-01 00:00:00', 'YYYY-MM-DD HH:mm:ss');

        const walkNum = 0;
        const bicycleNum = 1;
        const motorcycleNum = 2;
        const tricycleNum = 3;
        const carNum = 4;
        const truckNum = 5;
        const bigTruckNum = 6;
        const busNum = 7;

        this.vehicleTxt = [];
        this.vehicleTxt[walkNum] = "เดินเท้า";
        this.vehicleTxt[bicycleNum] = "จักรยาน";
        this.vehicleTxt[motorcycleNum] = "รถจักรยานยนต์";
        this.vehicleTxt[tricycleNum] = "ยานยนต์สามล้อ";
        this.vehicleTxt[carNum] = "รถยนต์";
        this.vehicleTxt[truckNum] = "รถบรรทุกเล็กหรือรถตู้";
        this.vehicleTxt[bigTruckNum] = "รถบรรทุกหนัก";
        this.vehicleTxt[busNum] = "รถโดยสาร";

        this.project_id = project_id;

        this.province_code = project_code

        this.is_rows = [];
        this.eclaim_rows = [];
        this.police_rows = [];
    }

    async mergeRSIS() {

        try {
            await PrepareMerge.destroy({truncate: true});
            await ProjectIntegrateFinal.destroy({truncate: true});
            await IntegrateFinal.destroy({truncate: true});

            await this.prepareData();
            await this.mergeDataProcess();
            await this.writeMergeDataProcess()
            await this.updateProjectIntegrateFinalData();


        } catch (error) {
            console.error(error);
        }

    }

    async prepareData(){
        console.time('prepareMergeISData');
        try {
            const isRows = await this.prepareMergeISData();
            await this.checkDuplicateInSameTable(isRows, ISMergeData);
            this.is_rows = isRows.filter(row => !row.is_duplicate);
            await this.savePrepareData( this.is_rows );
        } catch (error) {
            console.error(error);
        } finally {
            console.timeEnd('prepareMergeISData');
        }

        console.time('prepareMergeEclaimData');
        try {
            const eclaimRows = await this.prepareEclaimData();
            await this.checkDuplicateInSameTable(eclaimRows, EclaimMergeData);
            this.eclaim_rows = eclaimRows.filter(row => !row.is_duplicate);
            await this.savePrepareData(this.eclaim_rows);
        } catch (error) {
            console.error(error);
        } finally {
            console.timeEnd('prepareMergeEclaimData');
        }

        console.time('prepareMergePoliceData');
        try {
            const policeRows = await this.preparePoliceData();
            await this.checkDuplicateInSameTable(policeRows, PoliceVehicleMergeData);
            this.police_rows = policeRows.filter(row => !row.is_duplicate);
            await this.savePrepareData(this.police_rows);
        } catch (error) {
            console.error(error);
        } finally {
            console.timeEnd('prepareMergePoliceData');
        }
    }

    async prepareMergeISData() {
        try {
            let rows = await ISMergeData.findAll({ where: { project_id: this.project_id }});
            console.log("IS row: " + rows.length);

            rows = await Promise.all(rows.map(row => this.setDefaultColumn(row)));
            rows = await Promise.all(rows.map(row => this.makeISColumnForMerge(row)));

            return rows;
        } catch(error) {
            console.error(error);
        }
    }

    async prepareEclaimData(projectId) {


        try {
            await this.deleteEclaimDuplicateRecord();

            let rows = await EclaimMergeData.findAll({ where: { project_id: this.project_id }});
            console.log(`Eclaim row: ${rows.length}`);

            // Assuming setDefaultColumn and makeEclaimColumnForMerge are async functions
            rows = await Promise.all(rows.map(row => this.setDefaultColumn(row)));
            rows = await Promise.all(rows.map(row => this.makeEclaimColumnForMerge(row)));

            return rows;
        } catch(error) {
            console.error(error);
        }
    }

     async deleteEclaimDuplicateRecord(){

         const deleteQuery = `
             DELETE t1
        FROM temp_eclaim_clean t1
        JOIN (
            SELECT cid, temp_eclaim_clean.name, adate, MIN(id) AS min_id
            FROM temp_eclaim_clean
            WHERE cid IS NOT NULL
            GROUP BY cid, adate, temp_eclaim_clean.name
            HAVING COUNT(*) > 1
        ) t2 ON t1.cid = t2.cid AND t1.adate = t2.adate and t1.name = t2.name
        WHERE t1.id > t2.min_id;
         `;


        try {
            const result = await dbServer.query(deleteQuery);
            console.log(`Delete Duplicate Eclaim rows deleted.`, result[0].affectedRows);

        } catch (error) {
            console.error('Error', error);
        }finally {
            await dbServer.query("SET SESSION sql_mode=''");
        }

    }

    async preparePoliceData(projectId) {
        try {
            let rows = await PoliceVehicleMergeData.findAll({
                where: { project_id: this.project_id },
                include: [{ model: PoliceEventMergeData, as: "policeEvent", required: false }],
            });
            let map = new Map();
            rows.forEach(row => {
                if (!map.has(row.id)) {
                    map.set(row.id, row);
                }
            });
            rows = Array.from(map.values());
            console.log(`Police row: ${rows.length}`);

            for (let row of rows) {
                let nameArr =  await this.separateName(row.fullname) ;
                if (nameArr.length > 0) {
                    row.name = nameArr[0];
                    if (nameArr.length >= 2) {
                        row.lname = nameArr[1];
                    }
                }
                row = await this.cleanNameData(row);
                row = await this.makePoliceColumnForMerge(row);
            }
            return rows;
        } catch (error) {
            console.error(error);
        }
    }

    async checkDuplicateInSameTable(rows,  Model) {

        // Check if the model has bulkWrite method
        if (typeof Model.update !== 'function') {
            throw new Error('model does not have a update method');
        }


        let mergeArray = {};
        let operations = [];
        let index = 1;
        for(let row of rows) {
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

                    search_r.match  = row.data_id;
                    search_r.is_duplicate  = 1;

                    operations.push({
                        match: row.data_id,
                        is_duplicate: 1,
                        ref: search_r.data_id,
                        table:search_r.table_name
                    })
                }
            }
        }

        console.log("Duplicate",operations.length);
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
            catch(error) {
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
                if (row_1.cid_num - row_2.cid_num === 0) {
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

        if (Math.abs(difDate) <= 1) {
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

    async makeISColumnForMerge(row) {


        let difDate = moment(row.adate, "YYYY-MM-DD").diff(moment(this.dateFrom, "YYYY-MM-DD"), 'days');

        row.table_name = "is";
        row.difdatefrom2000 = difDate;
        row.data_id = row.ref;


        // row.name = row.name;
        row.lname = row.fname;
        row.cid = row.pid;

        row = await this.cleanNameData(row);

        row.nameSave = row.name;
        row.lnameSave = row.fname;
        // row.age = row.age;
        row.gender = row.sex;
        // row.nationality = row.nationality;
        row.occupation = row.occu_t;
        row.dob = row.birth;

        if (row.dead == 1 || row.acc13 == 2 || row.acc13 == 3 || row.acc13 == 4 ||
            row.acc13 == 5 || row.acc13 == 6 || row.acc13 == 7 || row.acc13 == 10) {
            row.is_death = 1;
        }

        row.name_lenght = row.name ? row.name.length : 0;

        const pid = row.cid.replace(/\D/g, '');
        const numericPID = /^\d+$/.test(pid);
        row.cid_num = numericPID ? parseInt(pid, 10) : 0;
        row.is_cid_good = (row.cid != null && row.cid.length > 10 && row.cid_num != 0);

        row.is_confirm_thai = /^\d+$/.test(row.pid);

        row.accdate = row.adate;
        // row.hdate = row.hdate;
        row.hospdate = row.hdate;
        row.hospcode = row.hosp;

        row.vehicle_type = this.getVehicleType(row);
        if (this.vehicleTxt.hasOwnProperty(row.vehicle_type)) {
            row.vehicle_1 = this.vehicleTxt[row.vehicle_type];
        }

        return row;
    }

    async makeEclaimColumnForMerge(row) {
        row.table_name = "eclaim";

        let difDate = moment(row.adate).diff(moment(this.dateFrom), 'days');
        row.difdatefrom2000 = difDate;

        row = await this.cleanNameData(row);

        row.data_id = row.id;
        row.nameSave = row.name;
        row.lnameSave = row.lname;

        // row.name = row.name;
        // row.lname = row.lname;
        row.nationality = row.nation;
        // row.age = row.age;
        row.dob = row.birthdate;
        // row.occupation = row.occupation;

        if (row.sex === "ชาย") {
            row.gender = 1;
        } else {
            row.gender = 2;
        }


        row.name_lenght = row.name.length;
        const pid = row.cid.replace(/\D/g, '');
        const numericPID = /^\d+$/.test(pid);
        row.cid_num = numericPID ? parseInt(pid, 10) : 0;
        row.is_cid_good = (row.cid != null && row.cid.length > 10 && row.cid_num != 0);

        // the "ctype_digit" function checks if all characters in a string are numeric.
        // In JavaScript, we can use the regex ^\d+$ instead:
        row.is_confirm_thai = /^\d+$/.test(row.cid);

        row.accdate = row.adate;

        row.vehicle_plate_1 = row.vehicle_plate;
        row.vehicle_1 = row.vehicle_type;

        row.vehicle_type = await this.getVehicleType(row);
        if (this.vehicleTxt.hasOwnProperty(row.vehicle_type)) {
            row.vehicle_1 = this.vehicleTxt[row.vehicle_type];
        }

        // row.atumbol = row.atumbol;
        // row.aaumpor = row.aaumpor;
        // row.aprovince = row.aprovince;
        // row.alat = row.alat;
        // row.along = row.along;

        row.hospdate = null;
        // row.hospcode = row.hospcode;

        return row;
    }

    async makePoliceColumnForMerge(row) {
        row.table_name = "police";

        let difDate = moment(row.adate).diff(moment(this.dateFrom), 'days');
        row.difdatefrom2000 = difDate;

        row.data_id = row.id;
        row = await this.cleanNameData(row);

        row.nameSave = row.name;
        row.lnameSave = row.lname;

        row.age = row.age;

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

        row.police_event_id = row.event_id;
        row.belt_risk = row.belt;
        row.helmet_risk = row.helmet;
        row.vehicle_plate_1 = row.vehicle_plate;
        row.vehicle_1 = row.vehicle;
        row.accdate = row.adate;
        // row.alcohol = row.alcohol;
        // row.roaduser = row.roaduser;

        let event = row.policeEvent;
        if(event){
            row.alat = event.alat;
            row.along = event.along;
            row.atumbol = event.atumbol;
            row.aaumpor = event.aaumpor;
            row.aprovince = event.aprovince;
            row.vehicle_2 = event.vehicle_2;
        }

        row.vehicle_type = await this.getVehicleType(row);
        if (this.vehicleTxt.hasOwnProperty(row.vehicle_type)) {
            row.vehicle_1 = this.vehicleTxt[row.vehicle_type];
        }

        return row;
    }

    async mergeDataProcess() {
        const prepareMerge = await PrepareMerge.findAll({
            order: dbServer.literal(`
            CASE
            WHEN table_name = 'is' THEN 1
            WHEN table_name = 'eclaim' THEN 2
            WHEN table_name = 'police' THEN 3
            ELSE 4
            END
            `)
        });

        const size = prepareMerge.length;
        console.log("Size: ", size);

        let isBegin = -1;
        let eclaimBegin = -1;
        let policeBegin = -1;
        let mergeArray = [];
        let matchRow = {};
        let matchedRowId = {}; // Remember what is matched


        prepareMerge.forEach((row, index) => {
            mergeArray[row.id] = { row: row, match: [] }; // Use zero-based indexing

            if (row.table_name === "is" && isBegin === -1) {
                isBegin = row.id;
            } else if (row.table_name === "eclaim" && eclaimBegin === -1) {
                eclaimBegin = row.id;
            } else if (row.table_name === "police" && policeBegin === -1) {
                policeBegin = row.id;
            }
        });

        // Start Match
        for(let index = 1; index <= size; index++) {

            let row = mergeArray[index].row;
            let match = mergeArray[index].match; // Match array of Current Row
            let table = row.table_name;
            let next = index + 1;

            if (!matchedRowId.hasOwnProperty(row.id)) {
                matchRow[row.id] = [];
                matchRow[row.id].push(row);
            }

            if (table === "is") {
                if (next < eclaimBegin) next = eclaimBegin;
            } else if (table === "eclaim") {
                if (next < policeBegin) next = policeBegin;
            }else if (table === "police") {
                if (next < size) next = size;
            }

            for(let search_i = next; search_i <= size; search_i++){
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
                }

                // Update Match to Search Row
                mergeArray[search_i].match = search_m;
            }

            // update All Match of the Row to mergeArray
            mergeArray[index].match = match;
        }

        let bulkData = [];
        for (let data of mergeArray.slice(1)) { // Skip the first index if starting from 1
            const matchIdStr = data.match.join(",");
            bulkData.push({ id: data.row.id, match_id: matchIdStr })
        }

        // Use bulkCreate to update all rows at once
        await PrepareMerge.bulkCreate(bulkData, {
            updateOnDuplicate: ["match_id"]
        });
    }

    async  writeMergeDataProcess() {
        // Fetch and order the prepare_merge data
        const prepareMergeRows = await PrepareMerge.findAll({
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

                        try{
                            matchRow[row.id].push(search_r);
                        }catch (error){
                            console.log("Skip ID",row.id,row.table_name,row.name,row.cid,row.accdate)
                        }

                    }
                }
            }
        }

        // Assuming writeFinalIntegrate is adapted to Node.js and available in this context
        await this.writeFinalIntegrate(matchRow);
    }

    async  writeFinalIntegrate(matchRow) {

        const isArr =  await this.rowsToArrayKey(this.is_rows);
        const policeArr = await this.rowsToArrayKey(this.police_rows);
        const eclaimArr = await this.rowsToArrayKey(this.eclaim_rows);

        const size =  Object.keys(matchRow).length;;
        console.log(`writeFinalIntegrate Size: ${size}`);
        console.log(`Project ID: ${this.project_id}`);

        let bulkData = [];
        const matchRowsArray = Object.values(matchRow);

        for (const mainRows of matchRowsArray) {
            let integrateRowData = {
                project_id: this.project_id, // Assuming this.project_id is available in this context
            };

            for (const row of mainRows) {
                const id = row.data_id;
                let dataRow;

                switch (row.table_name) {
                    case "is":
                        dataRow = isArr[id];
                        integrateRowData.is_id = dataRow.data_id;
                        break;
                    case "police":
                        dataRow = policeArr[id];
                        integrateRowData.police_id = dataRow.data_id;
                        integrateRowData.police_event_id = dataRow.event_id;
                        break;
                    case "eclaim":
                        dataRow = eclaimArr[id];
                        integrateRowData.eclaim_id = dataRow.data_id;
                        break;
                }

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

            }
            bulkData.push(integrateRowData);
        }


        // Use bulkCreate to insert all data at once
        try {
            await ProjectIntegrateFinal.bulkCreate(bulkData);
            console.log('Bulk insert successful');
        } catch (error) {
            console.error('Error during bulk insert:', error);
        }
    }

    async updateProjectIntegrateFinalData(){
        await this.updateProjectSummary();

        await this.mergeDataToIntegrateFinal();
        await this.updateProjectDataToFinalTable();

        await this.updateRoadUserData()
        await this.updateATumbolData()
        await this.updateAAumporData()
        await this.updateAProvinceData()
        await this.updateInjuryDateData()
        await this.updateIsDeadData()
        await this.updateOccupationData()
        await this.updateVehicleData()
        await this.updateHelmetRiskData()
        await this.updateBeltRiskData()
        await this.updateAlcoholRiskData()
        await this.updateIsAdmitData()


        await this.mergeFinalDataToFinalTable();
    }


    async mergeDataToIntegrateFinal(){

        const project = await Project.findOne({
            where: { id: this.project_id }
        });
        if (!project) {
            console.log('Project not found');
            return;
        }

        const startDate = project.start_date; // Assuming 'start_date' is the field name
        const endDate = project.end_date; // Assuming 'end_date' is the field name

        const projectIntegrateRows = await ProjectIntegrateFinal.findAll({
            where: {
                project_id: this.project_id,
                accdate: {
                    [Op.gte]: startDate, // Greater than or equal to startDate
                    [Op.lte]: moment(endDate).endOf('day').toDate() // Less than or equal to end of endDate
                }
            }
        });

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
            aprovince_code: this.province_code,
            vehicle_2: row.vehicle_2,
            police_event_id: row.police_event_id,
            hospcode: row.hospcode,
            eclaim_id: row.eclaim_id,
            eclaim_protocal: row.eclaim_protocal,
            is_id: row.is_id,
            is_protocal: row.is_protocal,
            his_id: row.his_id,
            his_protocal: row.his_protocal,
            police_id: row.police_id,
            police_protocal: row.police_protocal,
            alat: row.alat,
            along: row.along,
            created_at: row.created_at, // Sequelize handles createdAt automatically, consider removing if not needed
            updated_at: row.updated_at, // Same for updatedAt
            acc_province_id: row.acc_province_id,
            url_video: row.url_video,
            uuid: row.id, // Ensure this mapping is correct for your logic
            project_id: row.project_id
        }));

        // Step 3: Perform bulk insert
        await IntegrateFinal.bulkCreate(dataForInsert);

        console.log(`Merge Data To IntegrateFinal for project: ${this.project_id} successfully.`);
    }

    async mergeFinalDataToFinalTable(){
        await this.deleteOldProjectData();

        try {
            // Fetch all data from IntegrateFinal
            const data = await IntegrateFinal.findAll();
            const bulkData = data.map(entry => {
                const { id, ...rest } = entry.get({ plain: true });
                return rest;
            });

            // Bulk create in IntegrateFinalFull with the fetched data
            await IntegrateFinalFull.bulkCreate(bulkData);
            console.log('Data create to Integrate Final Full successfully.');
        } catch (error) {
            console.error('Error copying data:', error);
        }
    }

    async deleteOldProjectData(){
        await IntegrateFinalFull.destroy({
            where: {
                project_id: this.project_id
            }
        });

        const project = await Project.findOne({
            where: { id: this.project_id }
        });
        if (!project) {
            console.log('Project not found');
            return;
        }

        const startDate = project.start_date; // Assuming 'start_date' is the field name
        const endDate = project.end_date; // Assuming 'end_date' is the field name
        const province_code = this.province_code; // Assuming 'end_date' is the field name

        await IntegrateFinalFull.destroy({
            where: {
                injury_date: {
                    [Op.gte]: startDate, // Greater than or equal to startDate
                    [Op.lt]: endDate    // Less than endDate
                },
                aprovince_code: province_code
            }
        });

        console.log('Delete Old record in Integrate Final Full successfully');
    }

    ////////////////////////////////////////
    /*
    Helper Function
     */

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

        if (row.table_name === "is") {
            const codeW = parseInt(row.injp, 10);
            const code = parseInt(row.injt, 10);

            if (codeW === 1) vehicle_type = walkNum;
            else if (code === 1) vehicle_type = bicycleNum;
            else if (code === 2) vehicle_type = motorcycleNum;
            else if (code === 3) vehicle_type = tricycleNum;
            else if (code === 4) vehicle_type = carNum;
            else if (code === 5) vehicle_type = truckNum;
            else if (code === 6) vehicle_type = bigTruckNum;
            else if (code === 7) vehicle_type = bigTruckNum;
            else if (code === 8) vehicle_type = busNum;
            else if (code === 9) vehicle_type = busNum;
            else if (code === 10) vehicle_type = carNum;
            else if (code === 18) vehicle_type = truckNum;
        }

        if (row.table_name === "eclaim" || row.table_name === "police") {
            let code;

            if (row.table_name === "eclaim"){
                code = row.vehicle_type;
            }
            else{
                code = row.vehicle;
            }


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


    async  separateName(name) {


        const prename = ['เด็กชาย','พล.ร.ท.','พล.ร.อ.','พล.ร.ต.','พล.อ.อ.','พล.อ.ต.','พล.อ.ท.','พล.ต.อ.','พล.ต.ต.','พล.ต.ท.','นางสาว','จ.ส.ท.','จ.ส.อ.','จ.ส.ต.','พ.จ.อ.','พ.จ.ต.','พ.จ.ท.','พ.อ.ท.','พ.อ.อ.','พ.อ.ต.','พ.ต.ท.','ร.ต.อ.','ร.ต.ต.','จ.ส.ต.','ส.ต.ท.','พ.ต.อ.','พ.ต.ต.','ร.ต.ท.','ส.ต.อ.','ส.ต.ต.','ม.ร.ว.','พล.อ.','พล.ต.','พล.ท.','น.ส.','ด.ญ.','หญิง','ด.ช.','พ.ท.','ร.อ.','ร.ต.','ส.อ.','ส.ต.','พ.อ.','พ.ต.','ร.ท.','ส.ท.','จ.ท.','จ.อ.','จ.ต.','น.ท.','ร.อ.','ร.ต.','จ.อ.','จ.ต.','น.อ.','น.ต.','ร.ท.','จ.ท.','ม.ล.','ด.ต.','แม่','Mrs','นส.','ดญ.','นาย','ดช.','พระ','นาง','พลฯ','Mr','Ms'];

        for (const pre of prename) {
            if (name.includes(pre)) { // Check if the name contains the prefix
                name = name.replace(new RegExp(pre), ''); // Replace the first occurrence
                break; // Exit the loop after the first replacement
            }
        }

        // Trim spaces before and after the string
        name =  name.trim();

        // Replace multiple spaces with a single space
        name =  name.replace(/\s+/g, ' ');

        // Split the name into an array of names
        let splitName =  name.split(' ');


        return splitName;
    }

    async cleanNameData(row) {
        // CID Fname Lname Remove Special word - Spacbar
        row.cid = row.cid ? row.cid.replace(/[^a-zA-Z0-9-]/g, '').replace(/\s+/g, '')  : '';
        row.name = row.name ? row.name.replace(/\s+/g, '')  : '';
        row.lname = row.lname ? row.lname.replace(/\s+/g, '') : '';

        /* Remove first vowel */
        let begin_wrong = ['ิ', 'ฺ.', '์', 'ื', '่', '๋', '้', '็', 'ั', 'ี', '๊', 'ุ', 'ู', 'ํ','.'];

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

        for(let key in replacements) {
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
        if (row_1.table_name === "is") {
            row_2.in_is = 1;
            row_2.is_id = row_1.data_id;
            row_2.is_log = log;

        } else if (row_1.table_name === "police") {
            row_2.in_police = 1;
            row_2.police_id = row_1.data_id;
            row_2.police_log = log;
        }
        else if (row_1.table_name === "eclaim") {
            row_2.in_eclaim = 1;
            row_2.eclaim_id = row_1.data_id;
            row_2.eclaim_log = log;
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
                if (is_error){
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
                    project_id: this.project_id,
                    row_num: rowNum
                };
                prepareMergesData.push(rowToInsert);
                rowNum++;
            }
        }

        try {
            await PrepareMerge.bulkCreate(prepareMergesData);
        } catch (exception) {
            console.error(prepareMergesData, exception);
        }
    }

    //////////////////////////////
    /*
    Update Data In Project Integrate Final
     */


    async updateProjectDataToFinalTable() {

        await dbServer.query("SET SESSION sql_mode='NO_ZERO_DATE'");


        try {
            const query = this.getUpdateQuery();
            const result = await dbServer.query(query, {
                replacements: { projectId: this.project_id },
            });

        } catch (error) {
            console.error('Error', error);
        }finally {
            await dbServer.query("SET SESSION sql_mode=''");
        }
    }





    async updateRemoveDuplicateData() {

        const query1 = `
            DELETE t1
            FROM project_integrate_final t1
            JOIN (
                SELECT cid, hdate, MIN(created_at) AS min_created_at
                FROM project_integrate_final
                WHERE cid IS NOT NULL
                GROUP BY cid, hdate
                HAVING COUNT(*) > 1
            ) t2 ON t1.cid = t2.cid AND t1.hdate = t2.hdate
            WHERE t1.created_at > t2.min_created_at;
        `;

        const query2 = `
            DELETE t1
            FROM project_integrate_final t1
            JOIN (
                SELECT cid, accdate, MIN(created_at) AS min_created_at
                FROM project_integrate_final
                WHERE cid IS NOT NULL
                GROUP BY cid, accdate
                HAVING COUNT(*) > 1
            ) t2 ON t1.cid = t2.cid AND t1.accdate = t2.accdate
            WHERE t1.created_at > t2.min_created_at;
        `;

        try {
            await dbServer.query(query1, {type: QueryTypes.DELETE});
            await dbServer.query(query2, {type: QueryTypes.DELETE});
        } catch(error) {
            console.error('Error', error);
        }
    }


    async updateRoadUserData() {
        try {
            // Update for HIS
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้ขับขี่' WHERE (his_traffic = '1' ) AND project_id = :projectId", this.project_id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้โดยสาร' WHERE (his_traffic = '2' ) AND project_id = :projectId", this.project_id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'คนเดินเท้า' WHERE (his_traffic = '3' ) AND project_id = :projectId", this.project_id);

            // Update for Non V1- V2
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้ขับขี่' WHERE (MID(his_diagcode, 4, 1) = '0' OR MID(his_diagcode, 4, 1) = '5') AND project_id = :projectId", this.project_id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้โดยสาร' WHERE (MID(his_diagcode, 4, 1) = '1' OR MID(his_diagcode, 4, 1) = '6') AND project_id = :projectId", this.project_id);

            // Update for V1- V2
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้ขับขี่' WHERE (LEFT(his_diagcode, 2) = 'V1' OR LEFT(his_diagcode, 2) = 'V2') AND (MID(his_diagcode, 4, 1) = '0' OR MID(his_diagcode, 4, 1) = '4') AND project_id = :projectId", this.project_id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้โดยสาร' WHERE (LEFT(his_diagcode, 2) = 'V1' OR LEFT(his_diagcode, 2) = 'V2') AND (MID(his_diagcode, 4, 1) = '1' or MID(his_diagcode, 4, 1) = '5') AND project_id = :projectId", this.project_id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'คนเดินเท้า' WHERE (LEFT(his_diagcode, 2) = 'V0') AND project_id = :projectId", this.project_id);

            // Update for IS
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'คนเดินเท้า' WHERE (is_injp = '1') AND project_id = :projectId", this.project_id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้ขับขี่' WHERE (is_injp = '2') AND project_id = :projectId", this.project_id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้โดยสาร' WHERE (is_injp = '3') AND project_id = :projectId", this.project_id);

            // Update for Eclaim
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้ขับขี่' WHERE (eclaim_ride_status = 'ผู้ขับขี่รถคู่กรณี' OR eclaim_ride_status = 'ผู้ขับขี่รถประกัน') AND project_id = :projectId", this.project_id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้โดยสาร' WHERE (eclaim_ride_status = 'ผู้โดยสารรถคู่กรณี' OR eclaim_ride_status = 'ผู้โดยสารรถประกัน') AND project_id = :projectId", this.project_id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'คนเดินเท้า' WHERE (eclaim_ride_status = 'บุคคลภายนอก') AND project_id = :projectId", this.project_id);

            // Update for Police
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้ขับขี่' WHERE (police_vehicle_roaduser = 'ผู้ขับขี่') AND project_id = :projectId", this.project_id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้โดยสาร' WHERE (police_vehicle_roaduser = 'ผู้โดยสาร') AND project_id = :projectId", this.project_id);
        }
        catch (error) {
            console.error('Error', error);
        }
    }


    async  updateATumbolData() {
        try {
            const query = `
                  UPDATE integrate_final
                  LEFT JOIN lib_address_moi ON
                    CONCAT(integrate_final.is_aplace, integrate_final.is_aampur, integrate_final.is_atumbon) = lib_address_moi.ta_id
                  SET
                    atumbol = lib_address_moi.tambon_t,
                    aaumpor = lib_address_moi.amphoe_t,
                    aprovince = lib_address_moi.changwat_t
                  WHERE
                    is_atumbon IS NOT NULL
                    AND (atumbol IS NULL OR atumbol = '')
                    AND project_id = :projectId;
                `;

            await dbServer.query(query, {
                replacements: { projectId: this.project_id },
                type: QueryTypes.UPDATE
            });

            console.log("ATumbol data updated successfully.");
        } catch (error) {
            console.error("Error updating ATumbol data:", error);
        }
    }

    async updateAAumporData() {

        const query = `
            UPDATE integrate_final
            LEFT JOIN lib_address_moi on
                CONCAT(integrate_final.is_aplace, integrate_final.is_aampur)  = lib_address_moi.am_id
                set
                    aaumpor = lib_address_moi.amphoe_t,
                    aprovince = lib_address_moi.changwat_t
            where
                is_aampur is not null
              and ( aaumpor is null or aaumpor = '')
                AND project_id = :projectId;
        `;

        try {
            await dbServer.query(query, {
                replacements: { projectId: this.project_id },
                type: QueryTypes.UPDATE
            });

            console.log("Update AAumpor Data successfully.");
        } catch (error) {
            console.error('Error', error);
        }
    }

    async updateAProvinceData(){
        const query = `
            UPDATE integrate_final
            LEFT JOIN lib_address_moi on
                integrate_final.is_aplace  = lib_address_moi.ch_id
                set
                    aprovince = lib_address_moi.changwat_t
            where
                is_aplace is not null
              and ( aprovince is null or aprovince = '')
                AND project_id = :projectId;
        `;

        try {
            await dbServer.query(query, {
                replacements: { projectId: this.project_id },
                type: QueryTypes.UPDATE
            });

            console.log("Update AProvince Data successfully.");
        } catch (error) {
            console.error('Error', error);
        }
    }

    async updateInjuryDateData() {
        try {
            // Update injury_date from eclaim_adate
            await this.executeUpdate("UPDATE integrate_final SET injury_date = eclaim_adate WHERE injury_date IS NULL AND eclaim_adate IS NOT NULL AND project_id = :projectId", this.project_id);

            // Update injury_date from police_events_adate
            await this.executeUpdate("UPDATE integrate_final SET injury_date = police_events_adate WHERE injury_date IS NULL AND police_events_adate IS NOT NULL AND project_id = :projectId", this.project_id);

            // Update injury_date from is_hdate
            await this.executeUpdate("UPDATE integrate_final SET injury_date = is_hdate WHERE injury_date IS NULL AND is_hdate IS NOT NULL AND project_id = :projectId", this.project_id);

            // Update injury_date from his_date_serv
            await this.executeUpdate("UPDATE integrate_final SET injury_date = his_date_serv WHERE injury_date IS NULL AND his_date_serv IS NOT NULL AND project_id = :projectId", this.project_id);

            console.log("Update Injury Data successfully.");
        } catch(error) {
            console.error('Error', error);
        }
    }


    async updateIsAdmitData() {
        try {
            const query = `
                UPDATE integrate_final
                SET admit = 1
                WHERE admit IS NULL
                  AND (
                    (is_staer REGEXP '^-?[0-9]+$' AND CAST(is_staer AS UNSIGNED) IN (1, 3, 6, 7))
                        OR
                    (is_staward REGEXP '^-?[0-9]+$' AND CAST(is_staward AS UNSIGNED) IN (1,2,3,4,5,6))
                        OR
                    (is_refer_result REGEXP '^-?[0-9]+$' AND CAST(is_refer_result AS UNSIGNED) IN (4,5))
                        OR
                    is_pmi = 1
                        OR
                    eclaim_injury_status like '%ปานกลาง%'
                        OR
                    eclaim_injury_status like '%สาหัส%'
                        OR
                    eclaim_injury_status like '%สาหัส%'
                        OR
                    eclaim_injury_status like '%สูญเสีย%'
                        OR
                    police_vehicle_injury like '%นอนรักษา%'
                    ) AND project_id = :projectId;
                `;

            await this.executeUpdate(query, this.project_id);

            console.log("Update Is Admit successfully.");
        } catch(error) {
            console.error('Error', error);
        }
    }



    async updateIsDeadData() {
        try {

            const query = `
                UPDATE integrate_final
                SET is_death = 1
                WHERE
                    is_death IS NULL
                  AND (
                    (is_staer REGEXP '^-?[0-9]+$' AND CAST(is_staer AS UNSIGNED) IN (1, 6))
                        OR
                    (is_staward REGEXP '^-?[0-9]+$' AND CAST(is_staward AS UNSIGNED) IN (5))
                        or
                    (is_refer_result REGEXP '^-?[0-9]+$' AND CAST(is_refer_result AS UNSIGNED) IN (4,5))
                        or
                    is_pmi = 1
                        OR
                    eclaim_injury_status like '%เสียชีวิต%'
                        OR
                    police_vehicle_injury like '%เสียชีวิต%'
                    ) AND project_id = :projectId;
                `;

            await this.executeUpdate(query, this.project_id);

            console.log("Update Is Dead successfully.");
        } catch(error) {
            console.error('Error', error);
        }
    }
    async updateOccupationData() {
        // Update occupation based on is_occu
        await dbServer.query(`
        UPDATE integrate_final
        SET occupation = is_occu
        WHERE is_occu IS NOT NULL AND project_id = :projectId
    `, { replacements: { projectId: this.project_id } });

        // Mapping occupation codes to descriptions
        const occupationsMapping = [
            { code: '00', description: 'ไม่มีอาชีพ' },
            { code: '01', description: 'ข้าราชการ' },
            { code: '02', description: 'ข้าราชการตำรวจ ทหาร' },
            { code: '03', description: 'พนักงานรัฐวิสาหกิจ' },
            { code: '04', description: 'พนักงานบริษัท' },
            { code: '05', description: 'ผู้ใช้แรงงาน' },
            { code: '06', description: 'ค้าขาย' },
            { code: '07', description: 'เกษตรกรรม' },
            { code: '08', description: 'นักเรียน/นักศึกษา' },
            { code: '09', description: 'นักบวช' },
            { code: '10', description: 'ทนายความ' },
            { code: '11', description: 'ศิลปิน นักแสดง' },
            { code: '12', description: 'ประมง' },
            { code: '13', description: 'พนักงานขับรถอิสระ' },
            { code: '14', description: 'ช่างฝีมืออิสระ' },
            { code: '15', description: 'แม่บ้าน (ไม่มีรายได้)' },
            { code: '16', description: 'นักโทษ' },
            { code: '17', description: 'ในปกครอง' },
            { code: '18', description: 'พ่อบ้านไม่มีรายได้' },
            { code: '19', description: 'แม่บ้านมีรายได้' },
            { code: '20', description: 'Rider' },
        ];

        // Update occupation based on the mapping
        for (let { code, description } of occupationsMapping) {
            await dbServer.query(`
            UPDATE integrate_final
            SET occupation = :description
            WHERE occupation = :code AND project_id = :projectId
        `, { replacements: { description, code, projectId:this.project_id } });
        }

        // Update occupation based on is_occu_t for specific conditions
        await dbServer.query(`
        UPDATE integrate_final
        SET occupation = is_occu_t
        WHERE (occupation = '99' OR occupation = 'N' OR occupation = '-' OR occupation = '') 
        AND is_occu_t IS NOT NULL AND project_id = :projectId
    `, { replacements: { projectId:this.project_id  } });

        // Update occupation based on police_vehicle_occupation for specific conditions
        await dbServer.query(`
        UPDATE integrate_final
        SET occupation = police_vehicle_occupation
        WHERE (occupation IS NULL OR occupation = '99' OR occupation = '-' OR occupation = 'N' OR occupation = '') 
        AND police_vehicle_occupation IS NOT NULL AND project_id = :projectId
    `, { replacements: { projectId:this.project_id  } });

        // Update occupation based on eclaim_occupation for specific conditions
        await dbServer.query(`
        UPDATE integrate_final
        SET occupation = eclaim_occupation
        WHERE (occupation IS NULL OR occupation = '99' OR occupation = '-' OR occupation = 'N' OR occupation = '') 
        AND eclaim_occupation IS NOT NULL AND project_id = :projectId
    `, { replacements: { projectId:this.project_id  } });

        // Set occupation to NULL for specific conditions
        await dbServer.query(`
        UPDATE integrate_final
        SET occupation = NULL
        WHERE (occupation = '99' OR occupation = '-' OR occupation = 'N' OR occupation = '') 
        AND project_id = :projectId
    `, { replacements: { projectId:this.project_id  } });

        console.log("Update Occupation Data successfully.");
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
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = null WHERE LEFT(his_diagcode, 2) = 'V0' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = '${bycicle}' WHERE LEFT(his_diagcode, 2) = 'V1' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = '${motorcycle}' WHERE LEFT(his_diagcode, 2) = 'V2' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = '${tricycle}' WHERE LEFT(his_diagcode, 2) = 'V3' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = '${car}' WHERE LEFT(his_diagcode, 2) = 'V4' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = '${truck}' WHERE LEFT(his_diagcode, 2) = 'V5' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = '${bigTruck}' WHERE LEFT(his_diagcode, 2) = 'V6' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = '${bus}' WHERE LEFT(his_diagcode, 2) = 'V7' AND project_id = ${this.project_id};`);

        } catch (error) {
            console.error('Error', error);
        }

        try{
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = '${bycicle}'     WHERE eclaim_vehicle_type LIKE '%${bycicleTxt}%' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = '${motorcycle}'  WHERE eclaim_vehicle_type LIKE '%${motorcycleTxt}%' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = '${tricycle}'    WHERE eclaim_vehicle_type LIKE '%${tricycleTxt}%' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = '${car}'         WHERE eclaim_vehicle_type LIKE '%${carTxt}%' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = '${truck}'       WHERE (eclaim_vehicle_type LIKE '%${vanTxt}%' OR eclaim_vehicle_type LIKE '%${truckTxt}%') AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = '${bigTruck}'    WHERE (eclaim_vehicle_type LIKE '%${bigTruckTxt}%' OR eclaim_vehicle_type LIKE '%${veryBigTruckTxt}%') AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = '${bus}'         WHERE (eclaim_vehicle_type LIKE '%${busTxt}%' OR eclaim_vehicle_type LIKE '%${omniBusTxt}%') AND project_id = ${this.project_id};`);

            await dbServer.query(`UPDATE integrate_final SET vehicle_1 = NULL             WHERE (vehicle_1 = 'คนเดินเท้า' OR vehicle_1 = 'เดินเท้า') AND project_id = ${this.project_id};`);

        } catch (error) {
            console.error('Error', error);
        }


        console.log("Update Vehicle Data successfully.");
    }

    async updateHelmetRiskData() {
        try {
            await dbServer.query(`UPDATE integrate_final SET helmet_risk = NULL          WHERE vehicle_1 != 'รถจักรยานยนต์' AND project_id = ${this.project_id};`);

            //HIS
            await dbServer.query(`UPDATE integrate_final SET helmet_risk = 'สวม'         WHERE his_helmet = '1' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET helmet_risk = 'ไม่สวม'       WHERE his_helmet = '2' AND project_id = ${this.project_id};`);
            // IS
            await dbServer.query(`UPDATE integrate_final SET helmet_risk = 'สวม'         WHERE is_risk4 = '1' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET helmet_risk = 'ไม่สวม'       WHERE is_risk4 = '0' AND project_id = ${this.project_id};`);
            // POLICE
            await dbServer.query(`UPDATE integrate_final SET helmet_risk = 'สวม'         WHERE police_vehicle_injury_factor = 'ใช้อุปกรณ์นิรภัย'  AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET helmet_risk = 'ไม่สวม'       WHERE police_vehicle_injury_factor = 'ไม่ใช้อุปกรณ์นิรภัย'  AND project_id = ${this.project_id};`);

            await dbServer.query(`UPDATE integrate_final SET helmet_risk = 'ไม่ทราบ'      WHERE ( helmet_risk = 'N' OR helmet_risk = '9') AND project_id = ${this.project_id};`);

            console.log("Update Helmet Data successfully.");

        } catch (error) {
            console.error('Error', error);
        }


    }
    async updateBeltRiskData() {
        try {
            await dbServer.query(`UPDATE integrate_final SET belt_risk = NULL WHERE (vehicle_1 = 'รถจักรยานยนต์' OR vehicle_1 = 'คนเดินเท้า') AND project_id = ${this.project_id};`);
            //HIS
            await dbServer.query(`UPDATE integrate_final SET belt_risk = 'คาด' WHERE his_belt = '1' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET belt_risk = 'ไม่คาด' WHERE his_belt = '2' AND project_id = ${this.project_id};`);
            // IS
            await dbServer.query(`UPDATE integrate_final SET belt_risk = 'คาด' WHERE is_risk3 = '1' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET belt_risk = 'ไม่คาด' WHERE is_risk3 = '0' AND project_id = ${this.project_id};`);
            // POLICE
            await dbServer.query(`UPDATE integrate_final SET belt_risk = 'คาด' WHERE police_vehicle_injury_factor = 'ใช้อุปกรณ์นิรภัย' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET belt_risk = 'ไม่คาด' WHERE police_vehicle_injury_factor = 'ไม่ใช้อุปกรณ์นิรภัย' AND project_id = ${this.project_id};`);

            await dbServer.query(`UPDATE integrate_final SET belt_risk = 'ไม่ทราบ' WHERE (belt_risk = 'N' OR belt_risk = '9') AND project_id = ${this.project_id};`);

            console.log("Update Belt Data successfully.");

        } catch (error) {
            console.error('Error', error);
        }
    }


    async updateAlcoholRiskData() {
        try {
            //HIS
            await dbServer.query(`UPDATE integrate_final SET alcohol = 'ดื่ม' WHERE his_alcohol = '1' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET alcohol = 'ไม่ดื่ม' WHERE his_alcohol = '2' AND project_id = ${this.project_id};`);

            // IS
            await dbServer.query(`UPDATE integrate_final SET alcohol = 'ดื่ม' WHERE is_risk1 = '1' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET alcohol = 'ไม่ดื่ม' WHERE is_risk1 = '0' AND project_id = ${this.project_id};`);

            // POLICE
            await dbServer.query(`UPDATE integrate_final SET alcohol = 'ดื่ม' WHERE police_vehicle_alcohol = 'ดื่ม' AND project_id = ${this.project_id};`);
            await dbServer.query(`UPDATE integrate_final SET alcohol = 'ไม่ดื่ม' WHERE police_vehicle_alcohol = 'ไม่ดื่ม' AND project_id = ${this.project_id};`);

            await dbServer.query(`UPDATE integrate_final SET alcohol = 'ไม่ทราบ' WHERE (alcohol IS NULL OR alcohol = 'N' OR alcohol = '9') AND project_id = ${this.project_id};`);

            console.log("Update Alcohol Data successfully.");

        } catch (error) {
            console.error('Error', error);
        }
    }


    async executeUpdate(query, projectId) {
        return dbServer.query(query, {
            replacements: { projectId: projectId },
            type: QueryTypes.UPDATE
        });
    }

    async updateProjectSummary(projectId) {
        // Define or obtain your SQL query string
        const sqlQuery = this.getUpdateIntegrateSummaryQuery(); // Adjust this function to generate your SQL query

        try {
            // Execute the custom SQL query to fetch summary data
            const results = await dbServer.query(sqlQuery, {
                type: QueryTypes.SELECT,
                replacements: { projectId : this.project_id }, // Assuming your query uses named parameters
            });


            if (results && results.length > 0) {
                const summary = results[0];
                summary.status = ProcessIntegrateController.STATUS_INTEGRATE_SUCCESSED;

                // Use the summary data to update the Project model
                await Project.update(summary, {
                    where: { id: this.project_id },
                });

                console.log(`Project summary updated successfully for project ${this.project_id} successfully.`);
            } else {
                console.log('No summary data found for project ID:', projectId);
            }
        } catch (error) {
            console.error('Error updating project summary:', error);
        }
    }


    getUpdateIntegrateSummaryQuery() {
        return `
            SELECT count(*)                                                                                           as total_row,
                   SUM(case when is_id > 0 then 1 else 0 end)                                                         as IS_total,
                   SUM(case when his_id > 0 then 1 else 0 end)                                                        as HIS_total,
                   SUM(case when eclaim_id > 0 then 1 else 0 end)                                                     as E_total,
                   SUM(case when police_id > 0 then 1 else 0 end)                                                     as P_total,
                   SUM(case when is_id > 0 and his_id is null then 1 else 0 end)                                      as IS_NO_HIS_total,
                   SUM(case when is_id is null and his_id > 0 then 1 else 0 end)                                      as HIS_NO_IS_total,
                   SUM(case when is_id > 0 and his_id > 0 then 1 else 0 end)                                          as HIS_IS_total,
                   SUM(case when (is_id > 0 or his_id > 0) then 1 else 0 end)                                         as H_total,
                   SUM(case
                           when (is_id > 0 or his_id > 0) and eclaim_id is null and police_id is NULL then 1
                           else 0 end)                                                                                as H_NO_E_P_total,
                   SUM(case
                           when (is_id > 0 or his_id > 0) and eclaim_id > 0 and police_id is NULL then 1
                           else 0 end)                                                                                as H_E_NO_P_total,
                   SUM(case
                           when (is_id > 0 or his_id > 0) and eclaim_id is NULL and police_id > 0 then 1
                           else 0 end)                                                                                as H_P_NO_E_total,
                   SUM(case
                           when (is_id > 0 or his_id > 0) and eclaim_id > 0 and police_id > 0 then 1
                           else 0 end)                                                                                as H_E_P_total,
                   SUM(case
                           when (is_id is NULL and his_id is NULL) and eclaim_id > 0 and police_id is NULL then 1
                           else 0 end)                                                                                as E_NO_H_P_total,
                   SUM(case
                           when (is_id is NULL and his_id is NULL) and eclaim_id > 0 and police_id > 0 then 1
                           else 0 end)                                                                                as E_P_NO_H_total,
                   SUM(case
                           when (is_id is NULL and his_id is NULL) and eclaim_id is NULL and police_id > 0 then 1
                           else 0 end)                                                                                as P_NO_H_E_total
            FROM project_integrate_final
            WHERE project_id = :projectId;
        `
    }
    getUpdateQuery() {
        return `
            UPDATE integrate_final AS final
                LEFT JOIN temp_his_query_clean AS h ON h.id = final.his_id
                LEFT JOIN temp_is_clean AS i ON i.ref = final.is_id
                LEFT JOIN temp_eclaim_clean AS e ON e.id = final.eclaim_id
                LEFT JOIN temp_police_vehicle_clean AS p ON p.id = final.police_id
                LEFT JOIN temp_police_events_clean AS pe ON pe.event_id = final.police_event_id
                SET
                    final.his_pid = h.pid,
                    final.his_hospcode = h.hospcode,
                    final.his_date_serv = h.date_serv,
                    final.his_seq = h.seq,
                    final.his_an = h.an,
                    final.his_diagcode = h.diagcode,
                    final.his_isdeath = h.isdeath,
                    final.his_cdeath = h.cdeath,
                    final.his_price = h.price,
                    final.his_payprice = h.payprice,
                    final.his_actualpay = h.actualpay,
                    final.his_dateinhosp = h.dateinhosp,
                    final.his_cid = h.cid,
                    final.his_name = h.name,
                    final.his_lname = h.lname,
                    final.his_sex = h.sex,
                    final.his_nation = h.nation,
                    final.his_birth = h.birth,
                    final.his_opd_code = h.opd_code,
                    final.his_ipd_code = h.ipd_code,
                    final.his_allcode = h.allcode,
                    final.his_s0 = h.s0,
                    final.his_s1 = h.s1,
                    final.his_s2 = h.s2,
                    final.his_s3 = h.s3,
                    final.his_s4 = h.s4,
                    final.his_s5 = h.s5,
                    final.his_s6 = h.s6,
                    final.his_s7 = h.s7,
                    final.his_s8 = h.s8,
                    final.his_s9 = h.s9,
                    final.his_aeplace = h.aeplace,
                    final.his_aetype = h.aetype,
                    final.his_airway = h.airway,
                    final.his_alcohol = h.alcohol,
                    final.his_splint = h.splint,
                    final.his_belt = h.belt,
                    final.his_helmet = h.helmet,
                    final.his_coma_eye = h.coma_eye,
                    final.his_coma_movement = h.coma_movement,
                    final.his_coma_speak = h.coma_speak,
                    final.his_nacrotic_drug = h.nacrotic_drug,
                    final.his_stopbleed = h.stopbleed,
                    final.his_traffic = h.traffic,
                    final.his_typein_ae = h.typein_ae,
                    final.his_urgency = h.urgency,
                    final.his_vehicle = h.vehicle,
                    final.his_old_id = h.old_id,
                    final.his_project_id = h.project_id,
                    final.his_project_file_id = h.project_file_id,

                    final.is_ref = i.ref,
                    final.is_hosp = i.hosp,
                    final.is_prov = i.prov,
                    final.is_hn = i.hn,
                    final.is_an = i.an,
                    final.is_titlecode = i.titlecode,
                    final.is_prename = i.prename,
                    final.is_name = i.name,
                    final.is_fname = i.fname,
                    final.is_lname = i.lname,
                    final.is_pid = i.pid,
                    final.is_home = i.home,
                    final.is_address = i.address,
                    final.is_tumbon = i.tumbon,
                    final.is_ampur = i.ampur,
                    final.is_changwat = i.changwat,
                    final.is_tel = i.tel,
                    final.is_sex = i.sex,
                    final.is_birth = i.birth,
                    final.is_day = i.day,
                    final.is_month = i.month,
                    final.is_age = i.age,
                    final.is_occu = i.occu,
                    final.is_occu_t = i.occu_t,
                    final.is_nationality = i.nationality,
                    final.is_adate = i.adate,
                    final.is_atime = i.atime,
                    final.is_hdate = i.hdate,
                    final.is_htime = i.htime,
                    final.is_aplace = i.aplace,
                    final.is_aampur = i.aampur,
                    final.is_atumbon = i.atumbon,
                    final.is_mooban = i.mooban,
                    final.is_road_type = i.road_type,
                    final.is_apoint = i.apoint,
                    final.is_apointname = i.apointname,
                    final.is_injby = i.injby,
                    final.is_injoccu = i.injoccu,
                    final.is_cause = i.cause,
                    final.is_cause_t = i.cause_t,
                    final.is_injp = i.injp,
                    final.is_injt = i.injt,
                    final.is_vehicle1 = i.vehicle1,
                    final.is_vehicle1_license = i.vehicle1_license,
                    final.is_vehicle2 = i.vehicle2,
                    final.is_vehicle2_license = i.vehicle2_license,
                    final.is_injt_t = i.injt_t,
                    final.is_injfrom = i.injfrom,
                    final.is_injfrom_t = i.injfrom_t,
                    final.is_icdcause = i.icdcause,
                    final.is_activity = i.activity,
                    final.is_product = i.product,
                    final.is_alclevel = i.alclevel,
                    final.is_risk1 = i.risk1,
                    final.is_risk2 = i.risk2,
                    final.is_risk3 = i.risk3,
                    final.is_risk4 = i.risk4,
                    final.is_risk5 = i.risk5,
                    final.is_risk9 = i.risk9,
                    final.is_risk9_text = i.risk9_text,
                    final.is_pmi = i.pmi,
                    final.is_atohosp = i.atohosp,
                    final.is_ems = i.ems,
                    final.is_atohosp_t = i.atohosp_t,
                    final.is_htohosp = i.htohosp,
                    final.is_hprov = i.hprov,
                    final.is_amb = i.amb,
                    final.is_refer = i.refer,
                    final.is_airway = i.airway,
                    final.is_airway_t = i.airway_t,
                    final.is_blood = i.blood,
                    final.is_blood_t = i.blood_t,
                    final.is_splintc = i.splintc,
                    final.is_splntc_t = i.splntc_t,
                    final.is_splint = i.splint,
                    final.is_splint_t = i.splint_t,
                    final.is_iv = i.iv,
                    final.is_iv_t = i.iv_t,
                    final.is_hxcc = i.hxcc,
                    final.is_hxcc_hr = i.hxcc_hr,
                    final.is_hxcc_min = i.hxcc_min,
                    final.is_bp1 = i.bp1,
                    final.is_bp2 = i.bp2,
                    final.is_bp = i.bp,
                    final.is_pr = i.pr,
                    final.is_rr = i.rr,
                    final.is_e = i.e,
                    final.is_v = i.v,
                    final.is_m = i.m,
                    final.is_coma = i.coma,
                    final.is_tinj = i.tinj,
                    final.is_diser = i.diser,
                    final.is_timer = i.timer,
                    final.is_er = i.er,
                    final.is_er_t = i.er_t,
                    final.is_staer = i.staer,
                    final.is_ward = i.ward,
                    final.is_staward = i.staward,
                    final.is_diag1 = i.diag1,
                    final.is_br1 = i.br1,
                    final.is_ais1 = i.ais1,
                    final.is_diag2 = i.diag2,
                    final.is_br2 = i.br2,
                    final.is_ais2 = i.ais2,
                    final.is_diag3 = i.diag3,
                    final.is_br3 = i.br3,
                    final.is_ais3 = i.ais3,
                    final.is_diag4 = i.diag4,
                    final.is_br4 = i.br4,
                    final.is_ais4 = i.ais4,
                    final.is_diag5 = i.diag5,
                    final.is_br5 = i.br5,
                    final.is_ais5 = i.ais5,
                    final.is_diag6 = i.diag6,
                    final.is_br6 = i.br6,
                    final.is_ais6 = i.ais6,
                    final.is_rdate = i.rdate,
                    final.is_rts = i.rts,
                    final.is_iss = i.iss,
                    final.is_ps = i.ps,
                    final.is_ps_thai = i.ps_thai,
                    final.is_pttype = i.pttype,
                    final.is_pttype2 = i.pttype2,
                    final.is_pttype3 = i.pttype3,
                    final.is_acc_id = i.acc_id,
                    final.is_lblind = i.lblind,
                    final.is_blind1 = i.blind1,
                    final.is_blind2 = i.blind2,
                    final.is_blind3 = i.blind3,
                    final.is_blind4 = i.blind4,
                    final.is_lcost = i.lcost,
                    final.is_ddate = i.ddate,
                    final.is_recorder = i.recorder,
                    final.is_recorderipd = i.recorderipd,
                    final.is_referhosp = i.referhosp,
                    final.is_referprov = i.referprov,


                    final.is_dlt = i.dlt,
                    final.is_edt = i.edt,
                    final.is_vn = i.vn,
                    final.is_lat = i.lat,
                    final.is_lng = i.lng,

                    final.is_incident_id = i.incident_id,
                    final.is_mass_casualty = i.mass_casualty,
                    final.is_items = i.items,
                    final.is_alcohol_check = i.alcohol_check,
                    final.is_alcohol_level = i.alcohol_level,
                    final.is_alcohol_check2 = i.alcohol_check2,
                    final.is_alcohol_level2 = i.alcohol_level2,
                    final.is_alcohol_prove = i.alcohol_prove,
                    final.is_alcohol_prove_name = i.alcohol_prove_name,
                    final.is_car_safe = i.car_safe,
                    final.is_license_card = i.license_card,
                    final.is_speed_drive = i.speed_drive,
                    final.is_roadsafety = i.roadsafety,
                    final.is_refer_result = i.refer_result,
                    final.is_yearly = i.yearly,
                    final.is_kwd = i.kwd,
                    final.is_sentmoph = i.sentmoph,
                    final.is_version = i.version,
                    final.is_detail = i.detail,
                    final.is_remark = i.remark,
                    final.is_his = i.his,
                    final.is_dgis = i.dgis,
                    final.is_dupload = i.dupload,
                    final.is_seq = i.seq,
                    final.is_pher_id = i.pher_id,
                    final.is_inp_src = i.inp_src,
                    final.is_inp_id = i.inp_id,
                    final.is_edit_id = i.edit_id,
                    final.is_ip = i.ip,
                    final.is_lastupdate = i.lastupdate,

                    final.police_vehicle_event_id = p.event_id,
                    final.police_vehicle_vehicle_index = p.vehicle_index,
                    final.police_vehicle_vehicle = p.vehicle,
                    final.police_vehicle_vehicle_plate = p.vehicle_plate,
                    final.police_vehicle_vehicle_province = p.vehicle_province,
                    final.police_vehicle_fullname = p.fullname,
                    final.police_vehicle_cid = p.cid,
                    final.police_vehicle_age = p.age,
                    final.police_vehicle_sex = p.sex,
                    final.police_vehicle_nation = p.nation,
                    final.police_vehicle_occupation = p.occupation,
                    final.police_vehicle_roaduser = p.roaduser,
                    final.police_vehicle_vehicle_ride_index = p.vehicle_ride_index,
                    final.police_vehicle_injury = p.injury,
                    final.police_vehicle_alcohol = p.alcohol,
                    final.police_vehicle_injury_factor = p.injury_factor,
                    final.police_vehicle_belt = p.belt,
                    final.police_vehicle_helmet = p.helmet,
                    final.police_vehicle_vehicle_type = p.vehicle_type,
                    final.police_vehicle_driving_licence = p.driving_licence,
                    final.police_vehicle_driving_licence_type = p.driving_licence_type,
                    final.police_vehicle_driving_licence_province = p.driving_licence_province,
                    final.police_vehicle_prename = p.prename,
                    final.police_vehicle_name = p.name,
                    final.police_vehicle_lname = p.lname,
                    final.police_vehicle_adate = p.adate,

                    final.police_vehicle_project_id = p.project_id,
                    final.police_vehicle_project_file_id = p.project_file_id,

                    final.police_events_event_id = pe.event_id,
                    final.police_events_adate = pe.adate,
                    final.police_events_atime = pe.atime,
                    final.police_events_borchor = pe.borchor,
                    final.police_events_borkor = pe.borkor,
                    final.police_events_sornor = pe.sornor,
                    final.police_events_light = pe.light,
                    final.police_events_aroad = pe.aroad,
                    final.police_events_atumbol = pe.atumbol,
                    final.police_events_aaumpor = pe.aaumpor,
                    final.police_events_aprovince = pe.aprovince,
                    final.police_events_aroad_type = pe.aroad_type,
                    final.police_events_alane = pe.alane,
                    final.police_events_aroad_character = pe.aroad_character,
                    final.police_events_aroad_factor = pe.aroad_factor,
                    final.police_events_aroadfit_factor = pe.aroadfit_factor,
                    final.police_events_aenv_factor = pe.aenv_factor,
                    final.police_events_abehavior_factor = pe.abehavior_factor,
                    final.police_events_abehavior_other_factor = pe.abehavior_other_factor,
                    final.police_events_avehicle_factor = pe.avehicle_factor,
                    final.police_events_aconformation = pe.aconformation,
                    final.police_events_vehicle_1 = pe.vehicle_1,
                    final.police_events_vehicle_plate_1 = pe.vehicle_plate_1,
                    final.police_events_vehicle_province_1 = pe.vehicle_province_1,
                    final.police_events_vehicle_2 = pe.vehicle_2,
                    final.police_events_vehicle_plate_2 = pe.vehicle_plate_2,
                    final.police_events_vehicle_province_2 = pe.vehicle_province_2,
                    final.police_events_vehicle_3 = pe.vehicle_3,
                    final.police_events_vehicle_plate_3 = pe.vehicle_plate_3,
                    final.police_events_vehicle_province_3 = pe.vehicle_province_3,
                    final.police_events_vehicle_4 = pe.vehicle_4,
                    final.police_events_vehicle_plate_4 = pe.vehicle_plate_4,
                    final.police_events_vehicle_province_4 = pe.vehicle_province_4,
                    final.police_events_id = pe.id,
                    final.police_events_project_file_id = pe.project_file_id,
                    final.police_events_project_id = pe.project_id,

                    final.eclaim_cid = e.cid,
                    final.eclaim_vehicle_plate_province=e.vehicle_plate_province,
                    final.eclaim_vehicle_plate=e.vehicle_plate,
                    final.eclaim_vehicle_type=e.vehicle_type,
                    final.eclaim_prename=e.prename,
                    final.eclaim_name=e.name,
                    final.eclaim_lname=e.lname,
                    final.eclaim_gender=e.gender,
                    final.eclaim_nation=e.nation,
                    final.eclaim_birthdate=e.birthdate,
                    final.eclaim_age=e.age,
                    final.eclaim_adate=e.adate,
                    final.eclaim_atime=e.atime,
                    final.eclaim_atumbol=e.atumbol,
                    final.eclaim_aaumpor=e.aaumpor,
                    final.eclaim_aprovince=e.aprovince,
                    final.eclaim_alat=e.alat,
                    final.eclaim_along=e.along,
                    final.eclaim_crash_desc=e.crash_desc,
                    final.eclaim_occupation=e.occupation,
                    final.eclaim_address_aumpor=e.address_aumpor,
                    final.eclaim_address_province=e.address_province,
                    final.eclaim_hospcode=e.hospcode,
                    final.eclaim_injury_status=e.injury_status,
                    final.eclaim_ride_status=e.ride_status,
                    final.eclaim_cost=e.cost,
                    final.eclaim_updated_at=e.updated_at,
                    final.eclaim_adatetime=e.adatetime,
                    final.eclaim_created_at=e.created_at
            WHERE final.project_id = :projectId`;
    }

}

module.exports = ProcessIntegrateController;