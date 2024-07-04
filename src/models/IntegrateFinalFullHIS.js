const { Model, DataTypes } = require('sequelize');
const db_server = require('../../config/connections/db_server'); // Adjust this path as necessary

class IntegrateFinalFullHIS extends Model {}

IntegrateFinalFullHIS.init({
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100) },
    lname: { type: DataTypes.STRING(100) },
    cid: { type: DataTypes.STRING(20) },
    gender: { type: DataTypes.INTEGER },
    nationality: { type: DataTypes.STRING(100) },
    dob: { type: DataTypes.DATE },
    age: { type: DataTypes.INTEGER },
    injury_date: { type: DataTypes.DATE },
    is_death: { type: DataTypes.BOOLEAN },
    admit: { type: DataTypes.INTEGER },
    occupation: { type: DataTypes.STRING(100) },
    hdate: { type: DataTypes.DATE },
    alcohol: { type: DataTypes.STRING(255) },
    belt_risk: { type: DataTypes.STRING(100) },
    helmet_risk: { type: DataTypes.STRING(100) },
    roaduser: { type: DataTypes.STRING(100) },
    vehicle_1: { type: DataTypes.STRING(100) },
    vehicle_plate_1: { type: DataTypes.STRING(20) },
    accdate: { type: DataTypes.DATE },
    atumbol: { type: DataTypes.STRING(100) },
    aaumpor: { type: DataTypes.STRING(100) },
    aprovince: { type: DataTypes.STRING(100) },
    aprovince_code: { type: DataTypes.INTEGER },
    vehicle_2: { type: DataTypes.STRING(100) },
    police_event_id: { type: DataTypes.STRING(255) },
    hospcode: { type: DataTypes.STRING(10) },
    eclaim_id: { type: DataTypes.BIGINT },
    eclaim_protocal: { type: DataTypes.STRING(255) },
    is_id: { type: DataTypes.BIGINT },
    is_protocal: { type: DataTypes.STRING(255) },
    his_id: { type: DataTypes.BIGINT },
    his_protocal: { type: DataTypes.STRING(255) },
    police_id: { type: DataTypes.BIGINT },
    police_protocal: { type: DataTypes.STRING(255) },
    alat: { type: DataTypes.FLOAT },
    along: { type: DataTypes.FLOAT },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
    acc_province_id: { type: DataTypes.INTEGER },

    // HIS
    his_pid: { type: DataTypes.STRING(20) },
    his_hospcode: { type: DataTypes.STRING(10) },
    his_date_serv: { type: DataTypes.DATE },
    his_seq: { type: DataTypes.STRING(20) },
    his_an: { type: DataTypes.STRING(20) },
    his_diagcode: { type: DataTypes.STRING(10) },
    his_isdeath: { type: DataTypes.INTEGER },
    his_cdeath: { type: DataTypes.STRING(10) },
    his_price: { type: DataTypes.FLOAT },
    his_payprice: { type: DataTypes.FLOAT },
    his_actualpay: { type: DataTypes.FLOAT },
    his_dateinhosp: { type: DataTypes.FLOAT }, // Double check this data type
    his_cid: { type: DataTypes.STRING(20) },
    his_name: { type: DataTypes.STRING(255) },
    his_lname: { type: DataTypes.STRING(255) },
    his_sex: { type: DataTypes.STRING(5) },
    his_nation: { type: DataTypes.STRING(10) },
    his_birth: { type: DataTypes.DATE },
    his_age: { type: DataTypes.INTEGER },
    his_opd_code: { type: DataTypes.TEXT },
    his_ipd_code: { type: DataTypes.TEXT },
    his_allcode: { type: DataTypes.TEXT },
    his_s0: { type: DataTypes.INTEGER },
    his_s1: { type: DataTypes.INTEGER },
    his_s2: { type: DataTypes.INTEGER },
    his_s3: { type: DataTypes.INTEGER },
    his_s4: { type: DataTypes.INTEGER },
    his_s5: { type: DataTypes.INTEGER },
    his_s6: { type: DataTypes.INTEGER },
    his_s7: { type: DataTypes.INTEGER },
    his_s8: { type: DataTypes.INTEGER },
    his_s9: { type: DataTypes.INTEGER },
    his_aeplace: { type: DataTypes.STRING(5) },
    his_aetype: { type: DataTypes.STRING(5) },
    his_airway: { type: DataTypes.STRING(5) },
    his_alcohol: { type: DataTypes.STRING(5) },
    his_splint: { type: DataTypes.STRING(5) },
    his_belt: { type: DataTypes.STRING(5) },
    his_helmet: { type: DataTypes.STRING(5) },
    his_coma_eye: { type: DataTypes.STRING(5) },
    his_coma_movement: { type: DataTypes.STRING(5) },
    his_coma_speak: { type: DataTypes.STRING(5) },
    his_nacrotic_drug: { type: DataTypes.STRING(5) },
    his_stopbleed: { type: DataTypes.STRING(5) },
    his_traffic: { type: DataTypes.STRING(5) },
    his_typein_ae: { type: DataTypes.STRING(5) },
    his_urgency: { type: DataTypes.STRING(5) },
    his_vehicle: { type: DataTypes.STRING(5) },
    his_old_id: { type: DataTypes.INTEGER },
    his_project_id: { type: DataTypes.INTEGER },
    his_project_file_id: { type: DataTypes.INTEGER },
    is_ref: { type: DataTypes.INTEGER },
    is_hosp: { type: DataTypes.STRING(10) },
    is_prov: { type: DataTypes.STRING(2) },
    is_hn: { type: DataTypes.STRING(10) },
    is_an: { type: DataTypes.STRING(12) },
    is_titlecode: { type: DataTypes.STRING(10) },
    is_prename: { type: DataTypes.STRING(20) },
    is_name: { type: DataTypes.STRING(30) },
    is_fname: { type: DataTypes.STRING(30) }, // Assuming this might be a duplicate of `is_name`
    is_lname: { type: DataTypes.STRING(30) },
    is_pid: { type: DataTypes.STRING(20) },
    is_home: { type: DataTypes.CHAR },
    is_address: { type: DataTypes.STRING(100) },
    is_tumbon: { type: DataTypes.STRING(2) },
    is_ampur: { type: DataTypes.STRING(50) },
    is_changwat: { type: DataTypes.STRING(50) },
    is_tel: { type: DataTypes.STRING(15) },
    is_sex: { type: DataTypes.TINYINT },
    is_birth: { type: DataTypes.DATE },
    is_day: { type: DataTypes.INTEGER },
    is_month: { type: DataTypes.INTEGER },
    is_age: { type: DataTypes.INTEGER },
    is_occu: { type: DataTypes.STRING(2) },
    is_occu_t: { type: DataTypes.STRING(50) },
    is_nationality: { type: DataTypes.STRING(4) },
    is_adate: { type: DataTypes.DATE },
    is_atime: { type: DataTypes.DATE },
    is_hdate: { type: DataTypes.DATE },
    is_htime: { type: DataTypes.DATE },
    is_aplace: { type: DataTypes.STRING(4) },
    is_aampur: { type: DataTypes.STRING(2) },
    is_atumbon: { type: DataTypes.STRING(2) },
    is_mooban: { type: DataTypes.STRING(50) },
    is_road_type: { type: DataTypes.STRING(4) },
    is_apoint: { type: DataTypes.STRING(3) },
    is_apointname: { type: DataTypes.STRING(50) },
    is_injby: { type: DataTypes.CHAR },
    is_injoccu: { type: DataTypes.CHAR },
    is_cause: { type: DataTypes.CHAR },
    is_cause_t: { type: DataTypes.STRING(50) },
    is_injp: { type: DataTypes.CHAR },
    is_injt: { type: DataTypes.STRING(7) },
    is_vehicle1: { type: DataTypes.STRING(30) },
    is_vehicle1_license: { type: DataTypes.STRING(20) },
    is_vehicle2: { type: DataTypes.STRING(30) },
    is_vehicle2_license: { type: DataTypes.STRING(20) },
    is_injt_t: { type: DataTypes.STRING(50) },
    is_injfrom: { type: DataTypes.STRING(7) },
    is_injfrom_t: { type: DataTypes.STRING(50) },
    is_icdcause: { type: DataTypes.STRING(50) },
    is_activity: { type: DataTypes.STRING(50) },
    is_product: { type: DataTypes.STRING(50) },
    is_alclevel: { type: DataTypes.FLOAT },
    is_risk1: { type: DataTypes.CHAR },
    is_risk2: { type: DataTypes.CHAR },
    is_risk3: { type: DataTypes.CHAR },
    is_risk4: { type: DataTypes.CHAR },
    is_risk5: { type: DataTypes.CHAR },
    is_risk9: { type: DataTypes.CHAR },
    is_risk9_text: { type: DataTypes.STRING(50) },
    is_pmi: { type: DataTypes.CHAR },
    is_atohosp: { type: DataTypes.CHAR },
    is_ems: { type: DataTypes.STRING(2) },
    is_atohosp_t: { type: DataTypes.STRING(50) },
    is_htohosp: { type: DataTypes.STRING(50) },
    is_hprov: { type: DataTypes.STRING(2) },
    is_amb: { type: DataTypes.STRING(2) },
    is_refer: { type: DataTypes.CHAR },
    is_airway: { type: DataTypes.CHAR },
    is_airway_t: { type: DataTypes.STRING(50) },
    is_blood: { type: DataTypes.CHAR },
    is_blood_t: { type: DataTypes.STRING(50) },
    is_splintc: { type: DataTypes.CHAR },
    is_splntc_t: { type: DataTypes.STRING(50) },
    is_splint: { type: DataTypes.CHAR },
    is_splint_t: { type: DataTypes.STRING(50) },
    is_iv: { type: DataTypes.CHAR },
    is_iv_t: { type: DataTypes.STRING(50) },
    is_hxcc: { type: DataTypes.CHAR },
    is_hxcc_hr: { type: DataTypes.INTEGER },
    is_hxcc_min: { type: DataTypes.INTEGER },
    is_bp1: { type: DataTypes.INTEGER },
    is_bp2: { type: DataTypes.INTEGER },
    is_bp: { type: DataTypes.STRING(3) },
    is_pr: { type: DataTypes.INTEGER },
    is_rr: { type: DataTypes.INTEGER },
    is_e: { type: DataTypes.STRING(5) },
    is_v: { type: DataTypes.STRING(5) },
    is_m: { type: DataTypes.STRING(5) },
    is_coma: { type: DataTypes.INTEGER },
    is_tinj: { type: DataTypes.CHAR },
    is_diser: { type: DataTypes.DATE },
    is_timer: { type: DataTypes.DATE },
    is_er: { type: DataTypes.CHAR },
    is_er_t: { type: DataTypes.STRING(50) },
    is_staer: { type: DataTypes.CHAR },
    is_ward: { type: DataTypes.STRING(4) },
    is_staward: { type: DataTypes.CHAR },
    is_diag1: { type: DataTypes.STRING(50) },
    is_br1: { type: DataTypes.INTEGER },
    is_ais1: { type: DataTypes.INTEGER },
    is_diag2: { type: DataTypes.STRING(50) },
    is_br2: { type: DataTypes.INTEGER },
    is_ais2: { type: DataTypes.INTEGER },
    is_diag3: { type: DataTypes.STRING(50) },
    is_br3: { type: DataTypes.INTEGER },
    is_ais3: { type: DataTypes.INTEGER },
    is_diag4: { type: DataTypes.STRING(50) },
    is_br4: { type: DataTypes.INTEGER },
    is_ais4: { type: DataTypes.INTEGER },
    is_diag5: { type: DataTypes.STRING(50) },
    is_br5: { type: DataTypes.INTEGER },
    is_ais5: { type: DataTypes.INTEGER },
    is_diag6: { type: DataTypes.STRING(50) },
    is_br6: { type: DataTypes.INTEGER },
    is_ais6: { type: DataTypes.INTEGER },
    is_rdate: { type: DataTypes.DATE },
    is_rts: { type: DataTypes.INTEGER },
    is_iss: { type: DataTypes.INTEGER },
    is_ps: { type: DataTypes.FLOAT },
    is_ps_thai: { type: DataTypes.FLOAT },
    is_pttype: { type: DataTypes.STRING(4) },
    is_pttype2: { type: DataTypes.STRING(4) },
    is_pttype3: { type: DataTypes.STRING(4) },
    is_acc_id: { type: DataTypes.STRING(7) },
    is_lblind: { type: DataTypes.INTEGER },
    is_blind1: { type: DataTypes.INTEGER },
    is_blind2: { type: DataTypes.INTEGER },
    is_blind3: { type: DataTypes.INTEGER },
    is_blind4: { type: DataTypes.INTEGER },
    is_lcost: { type: DataTypes.INTEGER },
    is_ddate: { type: DataTypes.DATE },
    is_recorder: { type: DataTypes.STRING(50) },
    is_recorderipd: { type: DataTypes.STRING(50) },
    is_referhosp: { type: DataTypes.STRING(50) },
    is_referprov: { type: DataTypes.STRING(50) },
    is_dlt: { type: DataTypes.DATE },
    is_edt: { type: DataTypes.DATE },
    is_vn: { type: DataTypes.STRING(20) },
    is_lat: { type: DataTypes.STRING(15) },
    is_lng: { type: DataTypes.STRING(15) },
    is_incident_id: { type: DataTypes.INTEGER },
    is_mass_casualty: { type: DataTypes.TINYINT },
    is_items: { type: DataTypes.STRING(30) },
    is_alcohol_check: { type: DataTypes.CHAR },
    is_alcohol_level: { type: DataTypes.INTEGER },
    is_alcohol_check2: { type: DataTypes.CHAR },
    is_alcohol_level2: { type: DataTypes.INTEGER },
    is_alcohol_prove: { type: DataTypes.TINYINT },
    is_alcohol_prove_name: { type: DataTypes.STRING(100) },
    is_car_safe: { type: DataTypes.TINYINT },
    is_license_card: { type: DataTypes.TINYINT },
    is_speed_drive: { type: DataTypes.TINYINT },
    is_roadsafety: { type: DataTypes.TINYINT },
    is_refer_result: { type: DataTypes.STRING(50) },
    is_yearly: { type: DataTypes.INTEGER },
    is_kwd: { type: DataTypes.STRING(20) },
    is_sentmoph: { type: DataTypes.DATE },
    is_version: { type: DataTypes.STRING(20) },
    is_detail: { type: DataTypes.TEXT },
    is_remark: { type: DataTypes.TEXT },
    is_his: { type: DataTypes.TEXT },
    is_dgis: { type: DataTypes.DATE },
    is_dupload: { type: DataTypes.DATE },
    is_seq: { type: DataTypes.STRING(20) },
    is_pher_id: { type: DataTypes.INTEGER },
    is_inp_src: { type: DataTypes.STRING(20) },
    is_inp_id: { type: DataTypes.STRING(20) },
    is_edit_id: { type: DataTypes.STRING(20) },
    is_ip: { type: DataTypes.STRING(20) },
    is_lastupdate: { type: DataTypes.DATE },
    police_vehicle_event_id: { type: DataTypes.STRING(50) },
    police_vehicle_vehicle_index: { type: DataTypes.INTEGER },
    police_vehicle_vehicle: { type: DataTypes.STRING(100) },
    police_vehicle_vehicle_plate: { type: DataTypes.STRING(20) },
    police_vehicle_vehicle_province: { type: DataTypes.STRING(100) },
    police_vehicle_fullname: { type: DataTypes.STRING(100) },
    police_vehicle_cid: { type: DataTypes.STRING(20) },
    police_vehicle_age: { type: DataTypes.INTEGER },
    police_vehicle_sex: { type: DataTypes.STRING(10) },
    police_vehicle_nation: { type: DataTypes.STRING(50) },
    police_vehicle_occupation: { type: DataTypes.STRING(100) },
    police_vehicle_roaduser: { type: DataTypes.STRING(100) },
    police_vehicle_vehicle_ride_index: { type: DataTypes.INTEGER },
    police_vehicle_injury: { type: DataTypes.STRING(100) },
    police_vehicle_alcohol: { type: DataTypes.STRING(100) },
    police_vehicle_injury_factor: { type: DataTypes.STRING(100) },
    police_vehicle_belt: { type: DataTypes.STRING(100) },
    police_vehicle_helmet: { type: DataTypes.STRING(100) },
    police_vehicle_vehicle_type: { type: DataTypes.STRING(100) },
    police_vehicle_driving_licence: { type: DataTypes.STRING(100) },
    police_vehicle_driving_licence_type: { type: DataTypes.STRING(100) },
    police_vehicle_driving_licence_province: { type: DataTypes.STRING(100) },
    police_vehicle_prename: { type: DataTypes.STRING(100) },
    police_vehicle_name: { type: DataTypes.STRING(100) },
    police_vehicle_lname: { type: DataTypes.STRING(100) },
    police_vehicle_adate: { type: DataTypes.DATE },
    police_vehicle_project_id: { type: DataTypes.INTEGER },
    police_vehicle_project_file_id: { type: DataTypes.INTEGER },
    police_events_event_id: { type: DataTypes.STRING(100) },
    police_events_adate: { type: DataTypes.DATE },
    police_events_atime: { type: DataTypes.STRING(100) },
    police_events_borchor: { type: DataTypes.STRING(100) },
    police_events_borkor: { type: DataTypes.STRING(100) },
    police_events_sornor: { type: DataTypes.STRING(100) },
    police_events_light: { type: DataTypes.STRING(100) },
    police_events_aroad: { type: DataTypes.STRING(100) },
    police_events_atumbol: { type: DataTypes.STRING(100) },
    police_events_aaumpor: { type: DataTypes.STRING(100) },
    police_events_aprovince: { type: DataTypes.STRING(100) },
    police_events_aroad_type: { type: DataTypes.STRING(100) },
    police_events_alane: { type: DataTypes.STRING(100) },
    police_events_aroad_character: { type: DataTypes.STRING(100) },
    police_events_aroad_factor: { type: DataTypes.STRING(100) },
    police_events_aroadfit_factor: { type: DataTypes.STRING(100) },
    police_events_aenv_factor: { type: DataTypes.STRING(100) },
    police_events_abehavior_factor: { type: DataTypes.STRING(255) },
    police_events_abehavior_other_factor: { type: DataTypes.STRING(255) },
    police_events_avehicle_factor: { type: DataTypes.STRING(255) },
    police_events_aconformation: { type: DataTypes.STRING(255) },
    police_events_vehicle_1: { type: DataTypes.STRING(100) },
    police_events_vehicle_plate_1: { type: DataTypes.STRING(20) },
    police_events_vehicle_province_1: { type: DataTypes.STRING(100) },
    police_events_vehicle_2: { type: DataTypes.STRING(100) },
    police_events_vehicle_plate_2: { type: DataTypes.STRING(30) },
    police_events_vehicle_province_2: { type: DataTypes.STRING(100) },
    police_events_vehicle_3: { type: DataTypes.STRING(100) },
    police_events_vehicle_plate_3: { type: DataTypes.STRING(30) },
    police_events_vehicle_province_3: { type: DataTypes.STRING(100) },
    police_events_vehicle_4: { type: DataTypes.STRING(100) },
    police_events_vehicle_plate_4: { type: DataTypes.STRING(30) },
    police_events_vehicle_province_4: { type: DataTypes.STRING(100) },
    police_events_id: { type: DataTypes.INTEGER },
    police_events_project_file_id: { type: DataTypes.INTEGER },
    police_events_project_id: { type: DataTypes.INTEGER },
    eclaim_cid: { type: DataTypes.STRING(20) },
    eclaim_vehicle_plate_province: { type: DataTypes.STRING(30) },
    eclaim_vehicle_plate: { type: DataTypes.STRING(30) },
    eclaim_vehicle_type: { type: DataTypes.STRING(255) },
    eclaim_prename: { type: DataTypes.STRING(20) },
    eclaim_name: { type: DataTypes.STRING(100) },
    eclaim_lname: { type: DataTypes.STRING(100) },
    eclaim_gender: { type: DataTypes.STRING(10) },
    eclaim_nation: { type: DataTypes.STRING(100) },
    eclaim_birthdate: { type: DataTypes.DATE },
    eclaim_age: { type: DataTypes.INTEGER },
    eclaim_adate: { type: DataTypes.DATE },
    eclaim_atime: { type: DataTypes.STRING(10) },
    eclaim_atumbol: { type: DataTypes.STRING(100) },
    eclaim_aaumpor: { type: DataTypes.STRING(100) },
    eclaim_aprovince: { type: DataTypes.STRING(100) },
    eclaim_alat: { type: DataTypes.FLOAT },
    eclaim_along: { type: DataTypes.FLOAT },
    eclaim_crash_desc: { type: DataTypes.STRING(100) },
    eclaim_occupation: { type: DataTypes.STRING(100) },
    eclaim_address_aumpor: { type: DataTypes.STRING(100) },
    eclaim_address_province: { type: DataTypes.STRING(100) },
    eclaim_hospcode: { type: DataTypes.STRING(10) },
    eclaim_injury_status: { type: DataTypes.STRING(100) },
    eclaim_ride_status: { type: DataTypes.STRING(100) },
    eclaim_cost: { type: DataTypes.INTEGER },
    eclaim_updated_at: { type: DataTypes.DATE },
    eclaim_adatetime: { type: DataTypes.DATE },
    eclaim_created_at: { type: DataTypes.DATE },
    eclaim_project_id: { type: DataTypes.INTEGER },
    eclaim_project_file_id: { type: DataTypes.INTEGER },
    rsis_id: { type: DataTypes.INTEGER },
    rsis_protocal: { type: DataTypes.STRING(255)},
    project_id: { type: DataTypes.INTEGER },
    url_video: { type: DataTypes.STRING(255) },
    uuid: { type: DataTypes.BIGINT }
}, {
    sequelize:db_server, // This should be your Sequelize instance
    tableName: 'integrate_final_full_his', // Adjust to match your actual table name
    timestamps: true, // Set to false if your table does not have createdAt and updatedAt
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    modelName: 'IntegrateFinalFullHIS',
});

module.exports = IntegrateFinalFullHIS;