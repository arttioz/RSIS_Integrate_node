const moment = require('moment');
const { Op } = require("sequelize");

// Import HIS Models
const AccidentHIS = require('../models/his/AccidentHIS');
const AdmissionHIS = require('../models/his/AdmissionHIS');
const DeathHIS = require('../models/his/DeathHIS');
const DiagnosisIpdHIS = require('../models/his/DiagnosisIpdHIS');
const DiagnosisOpdHIS = require('../models/his/DiagnosisOpdHIS');
const ProcedureIpdHIS = require('../models/his/ProcedureIpdHIS');
const ProcedureOpdHIS = require('../models/his/ProcedureOpdHIS');
const ServiceHIS = require('../models/his/ServiceHIS');
const PersonHIS = require('../models/his/PersonHIS');
const HCDRecords = require('../models/his/HCDRecords');

const dbServerRawHIS = require('../../config/connections/db_server_raw_his');

class ProcessETLHISController {

    /**
     * Run ETL process for HIS data between start and end dates.
     * @param {string|Date} startDate 
     * @param {string|Date} endDate 
     */
    static async runETL(startDate, endDate) {
        console.log(`[ProcessETLHISController] Starting ETL from ${startDate} to ${endDate}`);

        try {
            // Verify connection
            await dbServerRawHIS.authenticate();
            console.log('Connection to HIS DB established.');

            // Example: Fetch data from Raw source and upsert into HIS models
            const result = await this.selectJoinServiceOPD(startDate, endDate);

            // await this.selectAccident(startDate, endDate);
            await this.selectAccident(startDate, endDate);

            // Update Admission and IPD Data
            await this.selectAdmissionAndIPD(startDate, endDate);

            // Update Person Data (Last Step)
            // Update Person Data (Last Step)
            await this.updatePersonData();

            // Join Death Data
            await this.joinDeath();

            // Final Updates (ALLCODE, AGE, S0-S9)
            await this.updateRowFinal();



            return {
                status: 'success',
                message: 'ETL Process Initiated',
                parameters: { startDate, endDate }
            };

        } catch (error) {
            console.error("[ProcessETLHISController] ETL Error:", error);
            throw error;
        }
    }


    static async selectJoinServiceOPD(startDate, endDate) {
        try {
            await HCDRecords.destroy({ truncate: true, cascade: false });
            console.log("Truncated HCDRecords table.");

            // Define Associations
            ServiceHIS.hasMany(DiagnosisOpdHIS, {
                sourceKey: 'seq',
                foreignKey: 'seq',
                as: 'opd_diagnoses'
            });

            // --- CONFIGURATION FOR BATCHING ---
            const BATCH_SIZE = 2000;
            let offset = 0;
            let processedCount = 0;
            let hasMoreData = true;

            while (hasMoreData) {
                const services = await ServiceHIS.findAll({
                    where: {
                        date_serv: {
                            [Op.between]: [startDate, endDate]
                        }
                    },
                    include: [
                        {
                            model: DiagnosisOpdHIS,
                            as: 'opd_diagnoses',
                            required: true,
                            on: {
                                pid: { [Op.col]: 'ServiceHIS.pid' },
                                hospcode: { [Op.col]: 'ServiceHIS.hospcode' },
                                seq: { [Op.col]: 'ServiceHIS.seq' }
                            }
                        }
                    ],
                    limit: BATCH_SIZE,
                    offset: offset,
                    subQuery: false
                });

                if (services.length === 0) {
                    hasMoreData = false;
                    break;
                }

                console.log(`[Batch Processing] Processing OPD rows ${offset} to ${offset + services.length}...`);

                const hcdRecordsToInsert = [];

                for (const service of services) {
                    const diagCodes = new Set();
                    let mainDiag = null;

                    // Iterate diagnosiis to find main V code and collect all codes
                    if (service.opd_diagnoses) {
                        for (const diag of service.opd_diagnoses) {
                            if (diag.diagcode) diagCodes.add(diag.diagcode);

                            if (diag.principle_diag && diag.principle_diag.toUpperCase().startsWith('V')) {
                                mainDiag = diag.principle_diag;
                            } else if (!mainDiag && diag.diagcode && diag.diagcode.toUpperCase().startsWith('V')) {
                                mainDiag = diag.diagcode;
                            }
                        }
                    }

                    if (!mainDiag) continue;

                    hcdRecordsToInsert.push({
                        PID: service.pid,
                        HOSPCODE: service.hospcode,
                        DATE_SERV: service.date_serv,
                        SEQ: service.seq,
                        DIAGCODE: mainDiag,
                        OPD_CODE: Array.from(diagCodes).join(', '),

                        // Service Data Mapping
                        service_typein: service.typein,
                        service_referinhosp: service.referinhosp,
                        service_causein: service.causein,
                        service_chiefcomp: service.chiefcomp,
                        service_servplace: service.servplace,
                        service_btemp: service.btemp,
                        service_sbp: service.sbp,
                        service_dbp: service.dbp,
                        service_pr: service.pr,
                        service_rr: service.rr,
                        service_typeout: service.typeout,
                        service_referouthosp: service.referouthosp,
                        service_causeout: service.causeout,
                        service_cost: service.cost,
                        service_price: service.price,
                        service_payprice: service.payprice,
                        service_actualpay: service.actualpay,

                        created_at: new Date(),
                        updated_at: new Date()
                    });
                }

                if (hcdRecordsToInsert.length > 0) {
                    await HCDRecords.bulkCreate(hcdRecordsToInsert);
                    processedCount += hcdRecordsToInsert.length;
                }

                offset += BATCH_SIZE;

                if (global.gc) {
                    global.gc();
                }
            }

            console.log(`[ProcessETLHISController] OPD Service Processed: Inserted ${processedCount} records.`);

            return {
                message: `Processed OPD Service records into ${processedCount} unique visits inside HCDRecords.`
            };

        } catch (error) {
            console.error("[ProcessETLHISController] selectJoinOPDPerson Error:", error);
            return { message: error.message };
        }
    }

    static async selectAdmissionAndIPD(startDate, endDate) {
        try {
            console.log("[ProcessETLHISController] Updating/Inserting Admission and IPD Data in HCDRecords...");

            // Define associations inside the method (or move to model definition globally)
            AdmissionHIS.hasMany(DiagnosisIpdHIS, {
                sourceKey: 'an',
                foreignKey: 'an',
                as: 'ipd_diagnoses'
            });

            // --- CONFIGURATION FOR BATCHING ---
            const BATCH_SIZE = 2000; // Process 2,000 rows at a time
            let offset = 0;
            let updatedCount = 0;
            let insertedCount = 0;
            let hasMoreData = true;

            while (hasMoreData) {
                // 1. Fetch a "Page" of data instead of ALL data
                const admissions = await AdmissionHIS.findAll({
                    where: {
                        datetime_admit: {
                            [Op.between]: [startDate, endDate]
                        }
                    },
                    include: [
                        {
                            model: DiagnosisIpdHIS,
                            as: 'ipd_diagnoses',
                            required: true,
                            on: {
                                an: { [Op.col]: 'AdmissionHIS.an' },
                                hospcode: { [Op.col]: 'AdmissionHIS.hospcode' }
                            }
                        }
                    ],
                    // LIMIT and OFFSET are the key to saving RAM
                    limit: BATCH_SIZE,
                    offset: offset,
                    // Optimization: Do not make unique checks in SQL (faster fetch) if duplicates aren't expected in fetch
                    subQuery: false
                });

                if (admissions.length === 0) {
                    hasMoreData = false;
                    break;
                }

                console.log(`[Batch Processing] Processing rows ${offset} to ${offset + admissions.length}...`);

                // 2. Process this batch
                for (const admission of admissions) {
                    const diagCodes = new Set();
                    let mainDiag = null;

                    for (const diag of admission.ipd_diagnoses) {
                        if (diag.diagcode) diagCodes.add(diag.diagcode);

                        if (diag.principle_diag && diag.principle_diag.toUpperCase().startsWith('V')) {
                            mainDiag = diag.principle_diag;
                        } else if (!mainDiag && diag.diagcode && diag.diagcode.toUpperCase().startsWith('V')) {
                            mainDiag = diag.diagcode;
                        }
                    }

                    if (!mainDiag) continue;

                    const ipdCodeString = Array.from(diagCodes).join(', ');

                    // Check if HCDRecord exists
                    const existingRecord = await HCDRecords.findOne({
                        where: {
                            HOSPCODE: admission.hospcode,
                            PID: admission.pid,
                            SEQ: admission.seq
                        }
                    });

                    if (existingRecord) {
                        await existingRecord.update({
                            AN: admission.an,
                            IPD_CODE: ipdCodeString,
                            admission_datetime_admit: admission.datetime_admit,
                            admission_wardadmit: admission.wardadmit,
                            admission_instype: admission.instype,
                            admission_typein: admission.typein,
                            admission_referinhosp: admission.referinhosp,
                            admission_causein: admission.causein,
                            admission_admitweight: admission.admitweight,
                            admission_admitheight: admission.admitheight,
                            admission_datetime_disch: admission.datetime_disch,
                            admission_warddisch: admission.warddisch,
                            admission_dischstatus: admission.dischstatus,
                            admission_dischtype: admission.dischtype,
                            admission_referouthosp: admission.referouthosp,
                            admission_causeout: admission.causeout,
                            admission_cost: admission.cost,
                            admission_price: admission.price,
                            admission_payprice: admission.payprice,
                            admission_actualpay: admission.actualpay,
                            admission_provider: admission.provider,
                            admission_d_update: admission.d_update,
                            admission_drg: admission.drg,
                            admission_rw: admission.rw,
                            admission_adjrw: admission.adjrw,
                            admission_error: admission.error,
                            admission_warning: admission.warning,
                            admission_actlos: admission.actlos,
                            updated_at: new Date()
                        });
                        updatedCount++;
                    } else {
                        await HCDRecords.create({
                            PID: admission.pid,
                            HOSPCODE: admission.hospcode,
                            DATE_SERV: moment(admission.datetime_admit).toDate(),
                            SEQ: admission.seq,
                            AN: admission.an,
                            DIAGCODE: mainDiag,
                            IPD_CODE: ipdCodeString,
                            admission_datetime_admit: admission.datetime_admit,
                            admission_wardadmit: admission.wardadmit,
                            admission_instype: admission.instype,
                            admission_typein: admission.typein,
                            admission_referinhosp: admission.referinhosp,
                            admission_causein: admission.causein,
                            admission_admitweight: admission.admitweight,
                            admission_admitheight: admission.admitheight,
                            admission_datetime_disch: admission.datetime_disch,
                            admission_warddisch: admission.warddisch,
                            admission_dischstatus: admission.dischstatus,
                            admission_dischtype: admission.dischtype,
                            admission_referouthosp: admission.referouthosp,
                            admission_causeout: admission.causeout,
                            admission_cost: admission.cost,
                            admission_price: admission.price,
                            admission_payprice: admission.payprice,
                            admission_actualpay: admission.actualpay,
                            admission_provider: admission.provider,
                            admission_d_update: admission.d_update,
                            admission_drg: admission.drg,
                            admission_rw: admission.rw,
                            admission_adjrw: admission.adjrw,
                            admission_error: admission.error,
                            admission_warning: admission.warning,
                            admission_actlos: admission.actlos,
                            created_at: new Date(),
                            updated_at: new Date()
                        });
                        insertedCount++;
                    }
                } // End of For Loop

                // 3. Move to next page
                offset += BATCH_SIZE;

                // Optional: Force Garbage Collection if you enabled it with node --expose-gc
                if (global.gc) {
                    global.gc();
                }
            } // End of While Loop

            console.log(`[ProcessETLHISController] Admission/IPD Processed: Updated ${updatedCount}, Inserted ${insertedCount}.`);

        } catch (error) {
            console.error("[ProcessETLHISController] selectAdmissionAndIPD Error:", error);
            throw error;
        }
    }

    static async selectAccident(startDate, endDate) {
        try {
            console.log("[ProcessETLHISController] Updating/Inserting Accident Data in HCDRecords...");

            // --- CONFIGURATION FOR BATCHING ---
            const BATCH_SIZE = 2000;
            let offset = 0;
            let updatedCount = 0;
            let insertedCount = 0;
            let hasMoreData = true;

            while (hasMoreData) {
                const accidents = await AccidentHIS.findAll({
                    where: {
                        [Op.or]: [
                            {
                                datetime_serv: { [Op.between]: [startDate, endDate] }
                            },
                            {
                                datetime_ae: { [Op.between]: [startDate, endDate] }
                            }
                        ]
                    },
                    limit: BATCH_SIZE,
                    offset: offset,
                    subQuery: false
                });

                if (accidents.length === 0) {
                    hasMoreData = false;
                    break;
                }

                console.log(`[Batch Processing] Processing Accident rows ${offset} to ${offset + accidents.length}...`);

                for (const accident of accidents) {
                    const existingRecord = await HCDRecords.findOne({
                        where: {
                            HOSPCODE: accident.hospcode,
                            PID: accident.pid,
                            SEQ: accident.seq
                        }
                    });

                    const accidentData = {
                        AEPLACE: accident.aeplace,
                        AETYPE: accident.aetype,
                        AIRWAY: accident.airway,
                        ALCOHOL: accident.alcohol,
                        SPLINT: accident.splint,
                        BELT: accident.belt,
                        HELMET: accident.helmet,
                        COMA_EYE: accident.coma_eye,
                        COMA_MOVEMENT: accident.coma_movement,
                        COMA_SPEAK: accident.coma_speak,
                        NACROTIC_DRUG: accident.nacrotic_drug,
                        STOPBLEED: accident.stopbleed,
                        TRAFFIC: accident.traffic,
                        TYPEIN_AE: accident.typein_ae,
                        URGENCY: accident.urgency,
                        VEHICLE: accident.vehicle,
                        updated_at: new Date()
                    };

                    if (existingRecord) {
                        await existingRecord.update(accidentData);
                        updatedCount++;
                    } else {
                        await HCDRecords.create({
                            HOSPCODE: accident.hospcode,
                            PID: accident.pid,
                            SEQ: accident.seq,
                            DATE_SERV: accident.datetime_serv ? moment(accident.datetime_serv).toDate() : null,
                            ...accidentData,
                            created_at: new Date()
                        });
                        insertedCount++;
                    }
                }

                offset += BATCH_SIZE;

                if (global.gc) {
                    global.gc();
                }
            }

            console.log(`[ProcessETLHISController] Accident Data Processed: Updated ${updatedCount}, Inserted ${insertedCount}.`);

        } catch (error) {
            console.error("[ProcessETLHISController] selectAccident Error:", error);
            throw error;
        }
    }

    static async updatePersonData() {
        try {
            console.log("[ProcessETLHISController] Updating Person Data in HCDRecords...");

            const query = `
                UPDATE hdc_records t1
                JOIN person t2 ON t1.HOSPCODE = t2.hospcode AND t1.PID = t2.pid
                SET 
                    t1.CID = t2.cid,
                    t1.NAME = t2.name,
                    t1.LNAME = t2.lname,
                    t1.SEX = t2.sex,
                    t1.BIRTH = t2.birth,
                    t1.NATION = t2.nation
            `;

            await dbServerRawHIS.query(query, {
                type: dbServerRawHIS.QueryTypes.UPDATE
            });

            console.log("[ProcessETLHISController] Person Data Updated Successfully.");

        } catch (error) {
            console.error("[ProcessETLHISController] updatePersonData Error:", error);
            throw error;
        }
    }

    static async joinDeath() {
        try {
            console.log("[ProcessETLHISController] Joining Death Data...");

            const query = `
                UPDATE hdc_records t1
                JOIN death t2 ON t1.HOSPCODE = t2.hospcode AND t1.PID = t2.pid
                SET 
                    t1.ddeath = t2.ddeath,
                    t1.ISDEATH = 1,
                    t1.CDEATH = CONCAT_WS(',', t2.cdeath, t2.cdeath_a, t2.cdeath_b, t2.cdeath_c, t2.cdeath_d)
            `;

            await dbServerRawHIS.query(query, {
                type: dbServerRawHIS.QueryTypes.UPDATE
            });

            console.log("[ProcessETLHISController] Death Data Joined Successfully.");

        } catch (error) {
            console.error("[ProcessETLHISController] joinDeath Error:", error);
            throw error;
        }
    }

    static async updateRowFinal() {
        try {
            console.log("[ProcessETLHISController] Updating Final Row Data (ALLCODE, AGE, S-Flags)...");

            // 1. Update ALLCODE
            await dbServerRawHIS.query(`
                UPDATE hdc_records
                SET ALLCODE = CONCAT_WS(', ', NULLIF(OPD_CODE, ''), NULLIF(IPD_CODE, ''))
            `, { type: dbServerRawHIS.QueryTypes.UPDATE });

            // 2. Update AGE
            await dbServerRawHIS.query(`
                UPDATE hdc_records
                SET AGE = TIMESTAMPDIFF(YEAR, BIRTH, DATE_SERV)
                WHERE BIRTH IS NOT NULL AND DATE_SERV IS NOT NULL
            `, { type: dbServerRawHIS.QueryTypes.UPDATE });

            // 3. Update S0-S9 Flags
            await dbServerRawHIS.query(`
                UPDATE hdc_records
                SET 
                    S0 = CASE WHEN ALLCODE LIKE '%S0%' THEN 1 ELSE 0 END,
                    S1 = CASE WHEN ALLCODE LIKE '%S1%' THEN 1 ELSE 0 END,
                    S2 = CASE WHEN ALLCODE LIKE '%S2%' THEN 1 ELSE 0 END,
                    S3 = CASE WHEN ALLCODE LIKE '%S3%' THEN 1 ELSE 0 END,
                    S4 = CASE WHEN ALLCODE LIKE '%S4%' THEN 1 ELSE 0 END,
                    S5 = CASE WHEN ALLCODE LIKE '%S5%' THEN 1 ELSE 0 END,
                    S6 = CASE WHEN ALLCODE LIKE '%S6%' THEN 1 ELSE 0 END,
                    S7 = CASE WHEN ALLCODE LIKE '%S7%' THEN 1 ELSE 0 END,
                    S8 = CASE WHEN ALLCODE LIKE '%S8%' THEN 1 ELSE 0 END,
                    S9 = CASE WHEN ALLCODE LIKE '%S9%' THEN 1 ELSE 0 END
            `, { type: dbServerRawHIS.QueryTypes.UPDATE });

            console.log("[ProcessETLHISController] Final Row Data Updated Successfully.");

        } catch (error) {
            console.error("[ProcessETLHISController] updateRowFinal Error:", error);
            throw error;
        }
    }
}

module.exports = ProcessETLHISController;
