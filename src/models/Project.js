const { QueryTypes,Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../config/connections/db_server');


class Project extends Model {
    static STATUS_CREATED = "รอการอัพโหลดข้อให้ครบถ้วน";
    static STATUS_UPLOADED = "อัพโหลดแล้ว พร้อมบูรณาการ";
    static STATUS_INTEGRATE_SUCCESSED = "บูรณาการสำเร็จ";
    static STATUS_INTEGRATE_FAILED = "บูรณาการไม่สำเร็จ กรุณาตรวจสอบ Log";
    static STATUS_INTEGRATE_MERGE_SUCCESSED = "ข้อมูลบูรณาการได้รวมกับฐานหลักแล้ว";


    async updateProjectDataToFinalTable() {

        await sequelize.query("SET SESSION sql_mode='NO_ZERO_DATE'");


        try {
            const query = this.getUpdateQuery();
            const result = await sequelize.query(query, {
                replacements: { projectId: this.id },
            });

            console.log('Results', result);
        } catch (error) {
            console.error('Error', error);
        }finally {
            await sequelize.query("SET SESSION sql_mode=''");
        }
    }


    async updateIntegrateSummary() {

        const query = this.getUpdateIntegrateSummaryQuery();
        try {
            const result = await sequelize.query(query, {
                replacements: { projectId: this.id },
                type: QueryTypes.SELECT
            });

            this.total_row = result[0].total_row;
            this.IS_total = result[0].IS_total;
            this.HIS_TOTAL = result[0].HIS_TOTAL;
            this.E_TOTAL = result[0].E_TOTAL;
            this.P_TOTAL = result[0].P_TOTAL;
            this.IS_NO_HIS_total = result[0].IS_NO_HIS_total;
            this.HIS_NO_IS_total = result[0].HIS_NO_IS_total;
            this.HIS_IS_total = result[0].HIS_IS_total;
            this.H_total = result[0].H_total;
            this.H_NO_E_P_total = result[0].H_NO_E_P_total;
            this.H_E_NO_P_total = result[0].H_E_NO_P_total;
            this.H_P_NO_E_total = result[0].H_P_NO_E_total;
            this.H_E_P_total = result[0].H_E_P_total;
            this.E_NO_H_P_total = result[0].E_NO_H_P_total;
            this.E_P_NO_H_total = result[0].E_P_NO_H_total;
            this.P_NO_H_E_total = result[0].P_NO_H_E_total;

            await this.save();
        } catch(error) {
            console.error('Error', error);
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
            await sequelize.query(query1, {type: QueryTypes.DELETE});
            await sequelize.query(query2, {type: QueryTypes.DELETE});
        } catch(error) {
            console.error('Error', error);
        }
    }

    async updateIsDeathData() {

        const query = `
            UPDATE integrate_final
            SET is_death = 1
            WHERE (is_staer = '1' OR is_staer = '6' OR is_ward = '5' OR is_ward = '6') AND project_id = :projectId;
        `;

        try {
            await sequelize.query(query, {
                replacements: { projectId: this.id },
                type: QueryTypes.UPDATE
            });
        } catch (error) {
            console.error('Error', error);
        }
    }

    async updateAAumporData() {

        const query = `
            UPDATE integrate_final
            LEFT JOIN th_district ON CONCAT(integrate_final.is_aplace, integrate_final.is_aampur)  = th_district.code
            SET aaumpor = th_district.name_th
            WHERE is_aampur IS NOT NULL AND aaumpor IS NULL AND project_id = :projectId;
        `;

        try {
            await sequelize.query(query, {
                replacements: { projectId: this.id },
                type: QueryTypes.UPDATE
            });
        } catch (error) {
            console.error('Error', error);
        }
    }

    async updateRoadUserData() {
        try {
            // Update for HIS
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้ขับขี่' WHERE (his_traffic = '1' ) AND project_id = :projectId", this.id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้โดยสาร' WHERE (his_traffic = '2' ) AND project_id = :projectId", this.id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'คนเดินเท้า' WHERE (his_traffic = '3' ) AND project_id = :projectId", this.id);

            // Update for Non V1- V2
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้ขับขี่' WHERE (MID(his_diagcode, 4, 1) = '0' OR MID(his_diagcode, 4, 1) = '5') AND project_id = :projectId", this.id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้โดยสาร' WHERE (MID(his_diagcode, 4, 1) = '1' OR MID(his_diagcode, 4, 1) = '6') AND project_id = :projectId", this.id);

            // Update for V1- V2
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้ขับขี่' WHERE (LEFT(his_diagcode, 2) = 'V1' OR LEFT(his_diagcode, 2) = 'V2') AND (MID(his_diagcode, 4, 1) = '0' OR MID(his_diagcode, 4, 1) = '4') AND project_id = :projectId", this.id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้โดยสาร' WHERE (LEFT(his_diagcode, 2) = 'V1' OR LEFT(his_diagcode, 2) = 'V2') AND (MID(his_diagcode, 4, 1) = '1' or MID(his_diagcode, 4, 1) = '5') AND project_id = :projectId", this.id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'คนเดินเท้า' WHERE (LEFT(his_diagcode, 2) = 'V0') AND project_id = :projectId", this.id);

            // Update for IS
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'คนเดินเท้า' WHERE (is_injp = '1') AND project_id = :projectId", this.id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้ขับขี่' WHERE (is_injp = '2') AND project_id = :projectId", this.id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้โดยสาร' WHERE (is_injp = '3') AND project_id = :projectId", this.id);

            // Update for Eclaim
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้ขับขี่' WHERE (eclaim_ride_status = 'ผู้ขับขี่รถคู่กรณี' OR eclaim_ride_status = 'ผู้ขับขี่รถประกัน') AND project_id = :projectId", this.id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้โดยสาร' WHERE (eclaim_ride_status = 'ผู้โดยสารรถคู่กรณี' OR eclaim_ride_status = 'ผู้โดยสารรถประกัน') AND project_id = :projectId", this.id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'คนเดินเท้า' WHERE (eclaim_ride_status = 'บุคคลภายนอก') AND project_id = :projectId", this.id);

            // Update for Police
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้ขับขี่' WHERE (police_vehicle_roaduser = 'ผู้ขับขี่') AND project_id = :projectId", this.id);
            await this.executeUpdate("UPDATE integrate_final SET roaduser = 'ผู้โดยสาร' WHERE (police_vehicle_roaduser = 'ผู้โดยสาร') AND project_id = :projectId", this.id);
        }
        catch (error) {
            console.error('Error', error);
        }
    }

    async updateInjuryDateData() {
        try {
            // Update injury_date from eclaim_adate
            await this.executeUpdate("UPDATE integrate_final SET injury_date = eclaim_adate WHERE injury_date IS NULL AND eclaim_adate IS NOT NULL AND project_id = :projectId", this.id);

            // Update injury_date from police_events_adate
            await this.executeUpdate("UPDATE integrate_final SET injury_date = police_events_adate WHERE injury_date IS NULL AND police_events_adate IS NOT NULL AND project_id = :projectId", this.id);

            // Update injury_date from is_hdate
            await this.executeUpdate("UPDATE integrate_final SET injury_date = is_hdate WHERE injury_date IS NULL AND is_hdate IS NOT NULL AND project_id = :projectId", this.id);

            // Update injury_date from his_date_serv
            await this.executeUpdate("UPDATE integrate_final SET injury_date = his_date_serv WHERE injury_date IS NULL AND his_date_serv IS NOT NULL AND project_id = :projectId", this.id);
        } catch(error) {
            console.error('Error', error);
        }
    }

    async updateIsDeadData() {
        try {
            // Update is_death from eclaim_injury_status
            await this.executeUpdate("UPDATE integrate_final SET is_death = 1 WHERE eclaim_injury_status = 'เสียชีวิต' AND project_id = :projectId", this.id);

            // Update is_death from police_vehicle_injury
            await this.executeUpdate("UPDATE integrate_final SET is_death = 1 WHERE police_vehicle_injury = 'เสียชีวิต' AND project_id = :projectId", this.id);

            // Update is_death from his_isdeath
            await this.executeUpdate("UPDATE integrate_final SET is_death = 1 WHERE his_isdeath = 1 AND project_id = :projectId", this.id);
        } catch(error) {
            console.error('Error', error);
        }
    }

    async updateOccupationData() {
        try {
            // Special assignment from IS
            await this.executeUpdate("UPDATE integrate_final SET occupation = is_occu WHERE is_occu IS NOT NULL AND project_id = :projectId;", this.id);

            // Update each occupation
            const occupations = {
                "ไม่มีอาชีพ": ["00"],
                "ข้าราชการ": ["01"],
                "ข้าราชการตํารวจ ทหาร": ["02"],
                "พนักงานรัฐวิสาหกิจ": ["03"],
                "พนักงานบริษัท": ["04"],
                "ผู้ใช้แรงงาน": ["05"],
                "ค้าขาย": ["06"],
                "เกษตรกรรม": ["07"],
                "นักเรียน/นักศึกษา": ["08"],
                "นักบวช": ["09"],
                "ทนายความ": ["10"],
                "ศิลปิน นักแสดง": ["11"],
                "ประมง": ["12"],
                "พนักงานขับรถอิสระ": ["13"],
                "ช่างฝีมืออิสระ": ["14"],
                "แม่บ้าน (ไม่มีรายได้)": ["15"],
                "นักโทษ": ["16"],
                "ในปกครอง": ["17"],
                "พ่อบ้านไม่มีรายได้": ["18"],
                "แม่บ้านมีรายได้": ["19"],
                "Rider ": ["20"],
            };

            for(const [value, keys] of Object.entries(occupations)) {
                for(const key of keys) {
                    await this.executeUpdate(`UPDATE integrate_final SET occupation = '${value}' WHERE occupation = '${key}' AND project_id = :projectId;`, this.id);
                }
            }
            const specialOccupations = ['is_occu_t', 'police_vehicle_occupation', 'eclaim_occupation'];

            for(const specialOccupation of specialOccupations) {
                const query = `UPDATE integrate_final SET occupation = ${specialOccupation} 
                       WHERE (occupation IS NULL OR occupation = '99' OR occupation = '-' OR occupation = 'N' OR occupation = '') 
                       AND ${specialOccupation} IS NOT NULL AND project_id = :projectId`;
                await this.executeUpdate(query, this.id);
            }

            const nullOccupationQuery = "UPDATE integrate_final SET occupation = NULL WHERE (occupation = '99' OR occupation = '-' OR occupation = 'N' OR occupation = '') AND project_id = :projectId";
            await this.executeUpdate(nullOccupationQuery, this.id);
            

        } catch(error) {
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
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = null WHERE LEFT(his_diagcode, 2) = 'V0' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = '${bycicle}' WHERE LEFT(his_diagcode, 2) = 'V1' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = '${motorcycle}' WHERE LEFT(his_diagcode, 2) = 'V2' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = '${tricycle}' WHERE LEFT(his_diagcode, 2) = 'V3' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = '${car}' WHERE LEFT(his_diagcode, 2) = 'V4' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = '${truck}' WHERE LEFT(his_diagcode, 2) = 'V5' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = '${bigTruck}' WHERE LEFT(his_diagcode, 2) = 'V6' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = '${bus}' WHERE LEFT(his_diagcode, 2) = 'V7' AND project_id = ${this.id};`);

        } catch (error) {
            console.error('Error', error);
        }

        try{
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = '${bycicle}'     WHERE eclaim_vehicle_type LIKE '%${bycicleTxt}%' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = '${motorcycle}'  WHERE eclaim_vehicle_type LIKE '%${motorcycleTxt}%' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = '${tricycle}'    WHERE eclaim_vehicle_type LIKE '%${tricycleTxt}%' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = '${car}'         WHERE eclaim_vehicle_type LIKE '%${carTxt}%' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = '${truck}'       WHERE (eclaim_vehicle_type LIKE '%${vanTxt}%' OR eclaim_vehicle_type LIKE '%${truckTxt}%') AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = '${bigTruck}'    WHERE (eclaim_vehicle_type LIKE '%${bigTruckTxt}%' OR eclaim_vehicle_type LIKE '%${veryBigTruckTxt}%') AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = '${bus}'         WHERE (eclaim_vehicle_type LIKE '%${busTxt}%' OR eclaim_vehicle_type LIKE '%${omniBusTxt}%') AND project_id = ${this.id};`);

            await sequelize.query(`UPDATE integrate_final SET vehicle_1 = NULL             WHERE (vehicle_1 = 'คนเดินเท้า' OR vehicle_1 = 'เดินเท้า') AND project_id = ${this.id};`);

        } catch (error) {
            console.error('Error', error);
        }
    }

    async updateHelmetRiskData() {
        try {
            await sequelize.query(`UPDATE integrate_final SET helmet_risk = NULL          WHERE vehicle_1 != 'รถจักรยานยนต์' AND project_id = ${this.id};`);

            //HIS
            await sequelize.query(`UPDATE integrate_final SET helmet_risk = 'สวม'         WHERE his_helmet = '1' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET helmet_risk = 'ไม่สวม'       WHERE his_helmet = '2' AND project_id = ${this.id};`);
            // IS
            await sequelize.query(`UPDATE integrate_final SET helmet_risk = 'สวม'         WHERE is_risk4 = '1' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET helmet_risk = 'ไม่สวม'       WHERE is_risk4 = '0' AND project_id = ${this.id};`);
            // POLICE
            await sequelize.query(`UPDATE integrate_final SET helmet_risk = 'สวม'         WHERE police_vehicle_injury_factor = 'ใช้อุปกรณ์นิรภัย'  AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET helmet_risk = 'ไม่สวม'       WHERE police_vehicle_injury_factor = 'ไม่ใช้อุปกรณ์นิรภัย'  AND project_id = ${this.id};`);

            await sequelize.query(`UPDATE integrate_final SET helmet_risk = 'ไม่ทราบ'      WHERE ( helmet_risk = 'N' OR helmet_risk = '9') AND project_id = ${this.id};`);

        } catch (error) {
            console.error('Error', error);
        }
    }
    async updateBeltRiskData() {
        try {
            await sequelize.query(`UPDATE integrate_final SET belt_risk = NULL WHERE (vehicle_1 = 'รถจักรยานยนต์' OR vehicle_1 = 'คนเดินเท้า') AND project_id = ${this.id};`);
            //HIS
            await sequelize.query(`UPDATE integrate_final SET belt_risk = 'คาด' WHERE his_belt = '1' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET belt_risk = 'ไม่คาด' WHERE his_belt = '2' AND project_id = ${this.id};`);
            // IS
            await sequelize.query(`UPDATE integrate_final SET belt_risk = 'คาด' WHERE is_risk3 = '1' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET belt_risk = 'ไม่คาด' WHERE is_risk3 = '0' AND project_id = ${this.id};`);
            // POLICE
            await sequelize.query(`UPDATE integrate_final SET belt_risk = 'คาด' WHERE police_vehicle_injury_factor = 'ใช้อุปกรณ์นิรภัย' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET belt_risk = 'ไม่คาด' WHERE police_vehicle_injury_factor = 'ไม่ใช้อุปกรณ์นิรภัย' AND project_id = ${this.id};`);

            await sequelize.query(`UPDATE integrate_final SET belt_risk = 'ไม่ทราบ' WHERE (belt_risk = 'N' OR belt_risk = '9') AND project_id = ${this.id};`);

        } catch (error) {
            console.error('Error', error);
        }
    }


    async updateAlcoholRiskData() {
        try {
            //HIS
            await sequelize.query(`UPDATE integrate_final SET alcohol = 'ดื่ม' WHERE his_alcohol = '1' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET alcohol = 'ไม่ดื่ม' WHERE his_alcohol = '2' AND project_id = ${this.id};`);

            // IS
            await sequelize.query(`UPDATE integrate_final SET alcohol = 'ดื่ม' WHERE is_risk1 = '1' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET alcohol = 'ไม่ดื่ม' WHERE is_risk1 = '0' AND project_id = ${this.id};`);

            // POLICE
            await sequelize.query(`UPDATE integrate_final SET alcohol = 'ดื่ม' WHERE police_vehicle_alcohol = 'ดื่ม' AND project_id = ${this.id};`);
            await sequelize.query(`UPDATE integrate_final SET alcohol = 'ไม่ดื่ม' WHERE police_vehicle_alcohol = 'ไม่ดื่ม' AND project_id = ${this.id};`);

            await sequelize.query(`UPDATE integrate_final SET alcohol = 'ไม่ทราบ' WHERE (alcohol IS NULL OR alcohol = 'N' OR alcohol = '9') AND project_id = ${this.id};`);

        } catch (error) {
            console.error('Error', error);
        }
    }



    async executeUpdate(query, projectId) {
        return sequelize.query(query, {
            replacements: { projectId: projectId },
            type: QueryTypes.UPDATE
        });
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
                LEFT JOIN temp_is_clean AS i ON i.id = final.is_id
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

Project.init({
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    is_run: DataTypes.INTEGER,
    name: DataTypes.STRING,
    status: DataTypes.STRING,
    pre_date: DataTypes.DATEONLY,
    start_date: DataTypes.DATEONLY,
    end_date: DataTypes.DATEONLY,
    sub_date: DataTypes.DATEONLY,
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    police_file: DataTypes.STRING,
    eclaim_file: DataTypes.STRING,
    his_file: DataTypes.STRING,
    run_id: DataTypes.INTEGER,
    police_log: DataTypes.TEXT,
    eclaim_log: DataTypes.TEXT,
    his_log: DataTypes.TEXT,
    log: DataTypes.TEXT,
    total_row: DataTypes.INTEGER,
    E_total: {
        type: DataTypes.INTEGER,
        field: 'E_total'
    },
    HIS_total: {
        type: DataTypes.INTEGER,
        field: 'HIS_total'
    },
    P_total: {
        type: DataTypes.INTEGER,
        field: 'P_total'
    },
    IS_total: {
        type: DataTypes.INTEGER,
        field: 'IS_total'
    },
    HIS_IS_total: {
        type: DataTypes.INTEGER,
        field: 'HIS_IS_total'
    },
    H_total: {
        type: DataTypes.INTEGER,
        field: 'H_total'
    },
    H_NO_E_P_total: {
        type: DataTypes.INTEGER,
        field: 'H_NO_E_P_total'
    },
    H_E_NO_P_total: {
        type: DataTypes.INTEGER,
        field: 'H_E_NO_P_total'
    },
    H_P_NO_E_total: {
        type: DataTypes.INTEGER,
        field: 'H_P_NO_E_total'
    },
    H_E_P_total: {
        type: DataTypes.INTEGER,
        field: 'H_E_P_total'
    },
    E_NO_H_P_total: {
        type: DataTypes.INTEGER,
        field: 'E_NO_H_P_total'
    },
    E_P_NO_H_total: {
        type: DataTypes.INTEGER,
        field: 'E_P_NO_H_total'
    },
    P_NO_H_E_total: {
        type: DataTypes.INTEGER,
        field: 'P_NO_H_E_total'
    },
    IS_NO_HIS_total: {
        type: DataTypes.INTEGER,
        field: 'IS_NO_HIS_total'
    },
    HIS_NO_IS_total: {
        type: DataTypes.INTEGER,
        field: 'HIS_NO_IS_total'
    },

},{
    sequelize:dbServer,
    modelName: 'Project',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Project;