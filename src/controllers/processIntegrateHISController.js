
const moment = require('moment');

// Import all models
const HISMergeData = require('../models/HisMergeData');

const PrepareMergeHIS = require('../models/PrepareMergeHIS');
const ProjectIntegrateFinalHIS = require('../models/ProjectIntegrateFinalHIS');
const IntegrateFinalFull = require('../models/IntegrateFinalFull');
const IntegrateFinalFullHIS = require('../models/IntegrateFinalFullHIS');
const IntegrateFinalHIS = require('../models/IntegrateFinalHIS');

const {QueryTypes, Op} = require("sequelize");
const Project = require("../models/Project");
const ProjectIntegrateFinal = require("../models/ProjectIntegrateFinal");
const IntegrateFinal = require("../models/IntegrateFinal");
const LibAddressMoi = require('../models/LibAddress'); // Adjust the path to your models
const LibChangwat = require('../models/LibChangwat'); // Adjust the path to your models
const Province = require('../models/Province'); // Adjust the path to your models

const dbServer = require('../../config/connections/db_server');


require('dotenv').config();

class ProcessIntegrateHISController {

    static STATUS_INTEGRATE_SUCCESSED = "บูรณาการสำเร็จ";

     constructor(startDate, endDate, provinceCode) {
        this.dateFrom = moment('2000-01-01 00:00:00', 'YYYY-MM-DD HH:mm:ss');

        this.his_rows = [];
        this.rsis_rows = [];

        this.startDate = startDate
        this.endDate = endDate
        this.provinceCode = provinceCode;
        this.aprovince = "";

    }

    async mergeRSIS() {

        try {
            await PrepareMergeHIS.destroy({truncate: true, cascade: false});
            await ProjectIntegrateFinalHIS.destroy({truncate: true, cascade: false});
            await IntegrateFinalHIS.destroy({truncate: true, cascade: false});

            await dbServer.query(`TRUNCATE TABLE integrate_final_his;`);
            await dbServer.query(`TRUNCATE TABLE project_prepare_merge_his;`);
            await dbServer.query(`TRUNCATE TABLE project_integrate_final_his;`);

            let  result = await LibChangwat.findOne({where: {code: this.provinceCode}});
            this.aprovince = result.name;

            await this.prepareData();
            await this.mergeDataProcess();
            await this.writeMergeDataProcess()
            await this.updateProjectIntegrateFinalData();


        } catch (error) {
            console.error(error);
        }

    }

    async prepareData(){
        console.time('prepareMergeHIS');
        try {
            const rows = await this.prepareMergeHISData();
            await this.checkDuplicateInSameTable(rows, HISMergeData);
            this.his_rows = rows.filter(row => !row.is_duplicate);
            await this.savePrepareData( this.his_rows );


            this.rsis_rows = await this.prepareMergeRsisData();
            await this.savePrepareData( this.rsis_rows );

        } catch (error) {
            console.error(error);
        } finally {
            console.timeEnd('prepareMergeEreport');
        }
    }

    async prepareMergeHISData() {
        try {
            let rows = await HISMergeData.findAll();
            console.log("HIS row: " + rows.length);

            rows = await Promise.all(rows.map(row => this.setDefaultColumn(row)));
            rows = await Promise.all(rows.map(row => this.makeHISColumnForMerge(row)));

            return rows;
        } catch(error) {
            console.error(error);
        }
    }


    async prepareMergeRsisData() {
        try {

            let rows = await IntegrateFinalFull.findAll({
                where: {
                    injury_date: {
                        [Op.gte]: this.startDate.toDate() ,  // >= startDate
                        [Op.lte]: this.endDate.endOf('day').toDate() // Less than or equal to end of endDate
                    },
                    aprovince_code: this.provinceCode
                },
            });

            console.log("Rsis row: " + rows.length);

            rows = await Promise.all(rows.map(row => this.setDefaultColumn(row)));
            rows = await Promise.all(rows.map(row => this.makeRsisColumnForMerge(row)));

            return rows;
        } catch(error) {
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
                if ( (row_1.cid_num - row_2.cid_num) == 0) {
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

    async makeHISColumnForMerge(row) {

        //TODO fix this code for HIS

        let difDate = moment(row.date_serv, "YYYY-MM-DD").diff(moment(this.dateFrom, "YYYY-MM-DD"), 'days');

        row.table_name = "his";
        row.difdatefrom2000 = difDate;
        row.data_id = row.id;

        row = await this.cleanNameData(row);

        row.nameSave = row.name;
        row.lnameSave = row.lname;

        // row.age = row.age;
        row.gender = row.sex;
        row.nationality = row.nation;
        row.is_death = row.isdeath;


        row.name_lenght = row.name.length;
        const pid = row.cid.replace(/\D/g, '');
        const numericPID = /^\d+$/.test(pid);
        row.cid_num = numericPID ? parseInt(pid, 10) : 0;
        row.is_cid_good = (row.cid !== null && row.cid.length > 10 && row.cid_num !== 0);
        row.is_confirm_thai = /^\d+$/.test(row.cid);

        row.accdate = row.date_serv;

        if(row.status_person == "เสียชีวิต"){
            row.is_death = 1
        }

        row.dob = row.birth;
        row.vehicle_type = this.getVehicleType(row);

        if(row.alcohol == 1){
            row.alcohol = 'ดื่ม'
        }else if(row.alcohol == 2){
            row.alcohol = 'ไม่ดื่ม'
        }else if(row.alcohol == 9){
            row.alcohol = 'ไม่ทราบ'
        }

        row.aprovince = row.province_code;

        // row.atumbol = row.subdistrict;
        // row.aaumpor = row.district;

        // row.alat = row.latitude;
        // row.along = row.longitude;


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
        const prepareMerge = await PrepareMergeHIS.findAll();

        const size = prepareMerge.length;
        console.log("Size of all rows: ", size);

        let mergeArray = [];
        let matchRow = {};
        let matchedRowId = {}; // Remember what is matched

        prepareMerge.forEach((row, index) => {
            mergeArray[index] = { row: row, match: [] }; // Use zero-based indexing
        });


        const rsisBegin = (await PrepareMergeHIS.findOne({
            where: { table_name: 'rsis' },
            order: [['id', 'ASC']],
            attributes: ['id']
        }))?.id || -1;


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

            if (table === "his") {
                if (next < rsisBegin) next = rsisBegin;
            } else if (table === "rsis") {
                break;
            }


            for(let search_i = next; search_i < size; search_i++){

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
            bulkData.push({ id: data.row.id
                , match_id: matchIdStr
            })
        }

        // Use bulkCreate to update all rows at once
        await PrepareMergeHIS.bulkCreate(bulkData, {
            updateOnDuplicate: ["match_id"]
        });
    }

    async  writeMergeDataProcess() {
        // Fetch and order the prepare_merge data
        const prepareMergeRows = await PrepareMergeHIS.findAll({
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

        const his_Arr =  await this.rowsToArrayKey(this.his_rows);
        const rsis_Arr = await this.rowsToArrayKey(this.rsis_rows);
        const size =  Object.keys(matchRow).length;;
        console.log(`writeFinalIntegrate Size: ${size}`);

        let bulkData = [];
        const matchRowsArray = Object.values(matchRow);

        for (const mainRows of matchRowsArray) {
            let integrateRowData = {
                project_id: 0, // Assuming this.project_id is available in this context
            };

            for (const row of mainRows) {
                const id = row.data_id;
                let dataRow;

                switch (row.table_name) {
                    case "his":
                        dataRow = his_Arr[id];
                        integrateRowData.his_id = dataRow.data_id;
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
            await ProjectIntegrateFinalHIS.bulkCreate(bulkData);
            console.log('Bulk insert successful');
        } catch (error) {
            console.error('Error during bulk insert:', error);
        }
    }

    async updateProjectIntegrateFinalData(){


        await this.mergeDataToIntegrateFinal();
        await this.updateRSISDataToFinalTable()
        await this.updateHISDataToFinalTable();

        await this.updateIsDeadData();
        await this.updateVehicleData();
        await this.updateRoadUserData();
        await this.updateInjuryDateData();
        await this.updateIsAdmitData();

        await this.updateHelmetRiskData();
        await this.updateBeltRiskData();
        await this.updateAlcoholRiskData();

        await this.mergeFinalDataToFinalTable();
    }

    async mergeFinalDataToFinalTable(){
        await this.deleteOldData();

        try {
            // Fetch all data from IntegrateFinal
            const data = await IntegrateFinalHIS.findAll();
            const bulkData = data.map(entry => {
                const { id, ...rest } = entry.get({ plain: true });
                return rest;
            });

            // Bulk create in IntegrateFinalFull with the fetched data
            await IntegrateFinalFullHIS.bulkCreate(bulkData);
            console.log('Data create to Integrate Final Full successfully.');
        } catch (error) {
            console.error('Error copying data:', error);
        }
    }

    async deleteOldData(){

        const startDate = this.startDate; // Assuming 'start_date' is the field name
        const endDate = this.endDate; // Assuming 'end_date' is the field name
        const province_code = this.provinceCode; // Assuming 'end_date' is the field name

        await IntegrateFinalFullHIS.destroy({
            where: {
                accdate: {
                    [Op.gte]: startDate, // Greater than or equal to startDate
                    [Op.lte]: endDate    // Less than endDate
                },
                aprovince_code: province_code
            }
        });

        console.log('Delete Old record in Integrate Final Full HIS successfully');
    }

    async mergeDataToIntegrateFinal(){

        const projectIntegrateRows = await ProjectIntegrateFinalHIS.findAll();

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
            his_id: row.his_id,
            his_protocal: row.his_protocal,
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
            uuid: row.id, // Ensure this mapping is correct for your logic
            project_id: 0
        }));

        // Step 3: Perform bulk insert
        await IntegrateFinalHIS.bulkCreate(dataForInsert);

        console.log(`Merge Data To IntegrateFinalFullHIS successfully.`);
    }

    async updateRSISDataToFinalTable() {
        // List of columns to update
        const columnsToUpdate = Object.keys(IntegrateFinalFull.getAttributes()).filter(column => column !== 'id' && !column.startsWith('his_'));


        // Dynamically generate the SET clause
        const setClause = columnsToUpdate.map(column => `finalHIS.${column} = ff.${column}`).join(', ');

        const query = `UPDATE integrate_final_his AS finalHIS
                              LEFT JOIN integrate_final_full AS ff ON ff.id = finalHIS.rsis_id
                           SET ${setClause}
                       WHERE finalHIS.rsis_id IS NOT NULL`;

        try {
            await dbServer.query(query, {
                type: QueryTypes.UPDATE
            });

            console.log('Update successful');
        } catch (error) {
            console.error('Error updating IntegrateFinalFullHIS:', error);
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

        if (row.table_name === "his") {
            let code = row.diagcode.toUpperCase();

            if (code.includes("V0")) vehicle_type = walkNum;
            else if (code.includes("V1")) vehicle_type = bicycleNum;
            else if (code.includes("V2")) vehicle_type = motorcycleNum;
            else if (code.includes("V3")) vehicle_type = tricycleNum;
            else if (code.includes("V4")) vehicle_type = carNum;
            else if (code.includes("V5")) vehicle_type = truckNum;
            else if (code.includes("V6")) vehicle_type = bigTruckNum;
            else if (code.includes("V7")) vehicle_type = busNum;
        }

        if (row.table_name === "rsis" ) {
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

    async  separateName(name) {

        name = name.toLowerCase();
        const prename = ['เด็กหญิง','เด็กชาย','พล.ร.ท.','พล.ร.อ.','พล.ร.ต.','พล.อ.อ.','พล.อ.ต.','พล.อ.ท.','พล.ต.อ.','พล.ต.ต.','พล.ต.ท.','นางสาว','จ.ส.ท.','จ.ส.อ.','จ.ส.ต.','พ.จ.อ.','พ.จ.ต.','พ.จ.ท.','พ.อ.ท.','พ.อ.อ.','พ.อ.ต.','พ.ต.ท.','ร.ต.อ.','ร.ต.ต.','จ.ส.ต.','ส.ต.ท.','พ.ต.อ.','พ.ต.ต.','ร.ต.ท.','ส.ต.อ.','ส.ต.ต.','ม.ร.ว.','พล.อ.','พล.ต.','พล.ท.','น.ส.','ด.ญ.','หญิง','ด.ช.','พ.ท.','ร.อ.','ร.ต.','ส.อ.','ส.ต.','พ.อ.','พ.ต.','ร.ท.','ส.ท.','จ.ท.','จ.อ.','จ.ต.','น.ท.','ร.อ.','ร.ต.','จ.อ.','จ.ต.','น.อ.','น.ต.','ร.ท.','จ.ท.','ม.ล.','ด.ต.','แม่','Mrs','นส.','ดญ.','นาย','ดช.','พระ','นาง','พลฯ','mr.','ms.','mr','ms'];

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
        if (row_1.table_name === "his") {
            row_2.in_his = 1;
            row_2.his_id = row_1.data_id;
            row_2.his_protocal = log;

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
                    admin: row.admin,
                    project_id: 0,
                    row_num: rowNum
                };
                prepareMergesData.push(rowToInsert);
                rowNum++;
            }
        }

        try {
            await PrepareMergeHIS.bulkCreate(prepareMergesData);
        } catch (exception) {
            console.error(prepareMergesData, exception);
        }
    }


    async updateIsDeadData() {
        try {
            await dbServer.query(`UPDATE integrate_final_his   SET is_death = 1  WHERE his_isdeath = '1' `);

            console.log("Update IS Death Data successfully.");

        } catch (error) {
            console.error('Error', error);
        }
    }
    async updateHISDataToFinalTable() {

        await dbServer.query("SET SESSION sql_mode='NO_ZERO_DATE'");


        try {
            const query = this.getUpdateQuery();
            const result = await dbServer.query(query);

        } catch (error) {
            console.error('Error', error);
        }finally {
            await dbServer.query("SET SESSION sql_mode=''");
        }
    }
    async updateHelmetRiskData() {
        try {
            await dbServer.query(`UPDATE integrate_final_his SET helmet_risk = NULL   WHERE vehicle_1 != 'รถจักรยานยนต์'`);

            //HIS
            await dbServer.query(`UPDATE integrate_final_his SET helmet_risk = 'สวม'         WHERE his_helmet = '1' AND helmet_risk is null;`);
            await dbServer.query(`UPDATE integrate_final_his SET helmet_risk = 'ไม่สวม'       WHERE his_helmet = '2' AND helmet_risk is null;`);

            console.log("Update Helmet Data successfully.");

        } catch (error) {
            console.error('Error', error);
        }
    }



    async updateBeltRiskData() {
        try {
            await dbServer.query(`UPDATE integrate_final_his SET belt_risk = NULL WHERE (vehicle_1 = 'รถจักรยานยนต์' OR vehicle_1 = 'คนเดินเท้า')`);
            //HIS
            await dbServer.query(`UPDATE integrate_final_his SET belt_risk = 'คาด' WHERE his_belt = '1' AND belt_risk is null;`);
            await dbServer.query(`UPDATE integrate_final_his SET belt_risk = 'ไม่คาด' WHERE his_belt = '2' AND belt_risk is null;`);

            console.log("Update Belt Data successfully.");

        } catch (error) {
            console.error('Error', error);
        }
    }

    async updateAlcoholRiskData() {
        try {
            //HIS
            await dbServer.query(`UPDATE integrate_final_his SET alcohol = 'ดื่ม' WHERE his_alcohol = '1' and alcohol is null;`);
            await dbServer.query(`UPDATE integrate_final_his SET alcohol = 'ไม่ดื่ม' WHERE his_alcohol = '2' and alcohol is null ;`);
            await dbServer.query(`UPDATE integrate_final_his SET alcohol = 'ไม่ทราบ' WHERE (alcohol IS NULL OR alcohol = 'N' OR alcohol = '9');`);

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
            await dbServer.query(`UPDATE integrate_final_his SET vehicle_1 = null WHERE LEFT(his_diagcode, 2) = 'V0' AND vehicle_1 is not null;`);
            await dbServer.query(`UPDATE integrate_final_his SET vehicle_1 = '${bycicle}' WHERE LEFT(his_diagcode, 2) = 'V1' AND vehicle_1 is null;`);
            await dbServer.query(`UPDATE integrate_final_his SET vehicle_1 = '${motorcycle}' WHERE LEFT(his_diagcode, 2) = 'V2' AND vehicle_1 is null;`);
            await dbServer.query(`UPDATE integrate_final_his SET vehicle_1 = '${tricycle}' WHERE LEFT(his_diagcode, 2) = 'V3' AND vehicle_1 is null`);
            await dbServer.query(`UPDATE integrate_final_his SET vehicle_1 = '${car}' WHERE LEFT(his_diagcode, 2) = 'V4' AND vehicle_1 is null`);
            await dbServer.query(`UPDATE integrate_final_his SET vehicle_1 = '${truck}' WHERE LEFT(his_diagcode, 2) = 'V5' AND vehicle_1 is null`);
            await dbServer.query(`UPDATE integrate_final_his SET vehicle_1 = '${bigTruck}' WHERE LEFT(his_diagcode, 2) = 'V6' AND vehicle_1 is null`);
            await dbServer.query(`UPDATE integrate_final_his SET vehicle_1 = '${bus}' WHERE LEFT(his_diagcode, 2) = 'V7' AND vehicle_1 is null`);

        } catch (error) {
            console.error('Error', error);
        }

        console.log("Update Vehicle Data successfully.");
    }

    async updateRoadUserData() {
        try {
            // Update for HIS
            await dbServer.query(`UPDATE integrate_final_his SET roaduser = 'ผู้ขับขี่' WHERE (his_traffic = '1' ) AND roaduser is null;`);
            await dbServer.query(`UPDATE integrate_final_his SET roaduser = 'ผู้โดยสาร' WHERE (his_traffic = '2' ) AND roaduser is null;`);
            await dbServer.query(`UPDATE integrate_final_his SET roaduser = 'คนเดินเท้า' WHERE (his_traffic = '3' ) AND roaduser is null;`);

            // Update for Non V1- V2
            await dbServer.query(`UPDATE integrate_final_his SET roaduser = 'ผู้ขับขี่' WHERE (MID(his_diagcode, 4, 1) = '0' OR MID(his_diagcode, 4, 1) = '5')  AND roaduser is null;`);
            await dbServer.query(`UPDATE integrate_final_his SET roaduser = 'ผู้โดยสาร' WHERE (MID(his_diagcode, 4, 1) = '1' OR MID(his_diagcode, 4, 1) = '6')   AND roaduser is null;`);

            // Update for V1- V2
            await dbServer.query(`UPDATE integrate_final_his SET roaduser = 'ผู้ขับขี่' WHERE (LEFT(his_diagcode, 2) = 'V1' OR LEFT(his_diagcode, 2) = 'V2') AND (MID(his_diagcode, 4, 1) = '0' OR MID(his_diagcode, 4, 1) = '4')  AND roaduser is null;`);
            await dbServer.query(`UPDATE integrate_final_his SET roaduser = 'ผู้โดยสาร' WHERE (LEFT(his_diagcode, 2) = 'V1' OR LEFT(his_diagcode, 2) = 'V2') AND (MID(his_diagcode, 4, 1) = '1' or MID(his_diagcode, 4, 1) = '5')  AND roaduser is null;`);
            await dbServer.query(`UPDATE integrate_final_his SET roaduser = 'คนเดินเท้า' WHERE (LEFT(his_diagcode, 2) = 'V0')  AND roaduser is null;`);

        }
        catch (error) {
            console.error('Error', error);
        }
    }

    async updateInjuryDateData() {
        try {
            // Update injury_date from his_date_serv
            await dbServer.query("UPDATE integrate_final_his SET injury_date = his_date_serv WHERE injury_date IS NULL AND his_date_serv IS NOT NULL;");
            await dbServer.query("UPDATE integrate_final_his SET hdate = his_date_serv WHERE hdate IS NULL AND his_date_serv IS NOT NULL;");

            console.log("Update Injury Data successfully.");
        } catch(error) {
            console.error('Error', error);
        }
    }

    async updateIsAdmitData() {
        try {
            await dbServer.query("UPDATE integrate_final_his SET admit = 1 WHERE his_ipd_code IS NOT NULL;");

            console.log("Update Is Admit successfully.");
        } catch(error) {
            console.error('Error', error);
        }
    }

    getUpdateQuery() {
        return `
            UPDATE integrate_final_his AS final
                LEFT JOIN temp_his_query_clean AS h ON h.id = final.his_id
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
                    final.his_vehicle = h.vehicle;`
    }


}

module.exports = ProcessIntegrateHISController;