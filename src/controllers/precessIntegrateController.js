
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
const {cleanDatabase} = require("./projectIntegrateController");

require('dotenv').config();

class ProcessIntegrateController {


    constructor(project_id) {
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
    }

    async mergeRSIS() {

        try {
            // Assuming Sequelize for database operations
            await PrepareMerge.destroy({truncate: true});
            await ProjectIntegrateFinal.destroy({truncate: true});

            await this.prepareData();


        } catch (error) {
            console.error(error);
        }

    }

    async prepareData(){
        console.time('prepareMergeISData');
        this.prepareMergeISData().then(is_rows => {
            return this.checkDuplicateInSameTable(is_rows, ISMergeData).then(() => is_rows);
        }).then(is_rows => {
            return this.savePrepareData(is_rows);
        }).catch(error => {
            console.error(error);
        }).finally(() => {
            console.timeEnd('prepareMergeISData');
        });

        console.time('prepareMergeEclaimData');
        this.prepareEclaimData().then(rows => {
            return this.checkDuplicateInSameTable(rows, EclaimMergeData).then(() => rows);
        }).then(rows => {
            return this.savePrepareData(rows);
        }).catch(error => {
            console.error(error);
        }).finally(() => {
            console.timeEnd('prepareMergeEclaimData');
        });

        console.time('prepareMergePoliceData');
        this.preparePoliceData().then(rows => {
            return this.checkDuplicateInSameTable(rows, PoliceVehicleMergeData).then(() => rows);
        }).then(rows => {
            return this.savePrepareData(rows);
        }).catch(error => {
            console.error(error);
        }).finally(() => {
            console.timeEnd('prepareMergePoliceData');
        });
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
                let nameArr = row.fullname ? row.fullname.split(' ') : [];
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
                let check = this.checkMatch(row, search_r);

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

    checkMatch(row_1, row_2) {
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


    async  seperateName(name) {


        const prename = ['เด็กชาย','พล.ร.ท.','พล.ร.อ.','พล.ร.ต.','พล.อ.อ.','พล.อ.ต.','พล.อ.ท.','พล.ต.อ.','พล.ต.ต.','พล.ต.ท.','นางสาว','จ.ส.ท.','จ.ส.อ.','จ.ส.ต.','พ.จ.อ.','พ.จ.ต.','พ.จ.ท.','พ.อ.ท.','พ.อ.อ.','พ.อ.ต.','พ.ต.ท.','ร.ต.อ.','ร.ต.ต.','จ.ส.ต.','ส.ต.ท.','พ.ต.อ.','พ.ต.ต.','ร.ต.ท.','ส.ต.อ.','ส.ต.ต.','ม.ร.ว.','พล.อ.','พล.ต.','พล.ท.','น.ส.','ด.ญ.','หญิง','ด.ช.','พ.ท.','ร.อ.','ร.ต.','ส.อ.','ส.ต.','พ.อ.','พ.ต.','ร.ท.','ส.ท.','จ.ท.','จ.อ.','จ.ต.','น.ท.','ร.อ.','ร.ต.','จ.อ.','จ.ต.','น.อ.','น.ต.','ร.ท.','จ.ท.','ม.ล.','ด.ต.','แม่','Mrs','นส.','ดญ.','นาย','ดช.','พระ','นาง','พลฯ','Mr','Ms'];

        prename.forEach(pre => { name = name.replace(new RegExp(pre, 'g'), ''); });

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


    async savePrepareData(rows) {
        let rowNum = 1;
        let prepareMergesData = [];

        for (const row of rows) {
            if (row.is_duplicate !== 1) {

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

}

module.exports = ProcessIntegrateController;