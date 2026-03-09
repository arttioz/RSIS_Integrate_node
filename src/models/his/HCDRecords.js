const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../../config/connections/db_server_raw_his');

class HCDRecords extends Model { }

HCDRecords.init({
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    match: { type: DataTypes.TEXT, allowNull: true },
    is_duplicate: { type: DataTypes.TINYINT, allowNull: true },
    PID: { type: DataTypes.STRING(20), allowNull: true },
    HOSPCODE: { type: DataTypes.STRING(10), allowNull: true },
    DATE_SERV: { type: DataTypes.DATE, allowNull: true },
    SEQ: { type: DataTypes.STRING(20), allowNull: true },
    AN: { type: DataTypes.STRING(20), allowNull: true },

    service_typein: { type: DataTypes.INTEGER, allowNull: true },
    service_referinhosp: { type: DataTypes.STRING, allowNull: true },
    service_causein: { type: DataTypes.INTEGER, allowNull: true },
    service_chiefcomp: { type: DataTypes.TEXT, allowNull: true },
    service_servplace: { type: DataTypes.INTEGER, allowNull: true },
    service_btemp: { type: DataTypes.DOUBLE, allowNull: true },
    service_sbp: { type: DataTypes.DOUBLE, allowNull: true },
    service_dbp: { type: DataTypes.DOUBLE, allowNull: true },
    service_pr: { type: DataTypes.DOUBLE, allowNull: true },
    service_rr: { type: DataTypes.DOUBLE, allowNull: true },
    service_typeout: { type: DataTypes.INTEGER, allowNull: true },
    service_referouthosp: { type: DataTypes.STRING, allowNull: true },
    service_causeout: { type: DataTypes.INTEGER, allowNull: true },
    service_cost: { type: DataTypes.DOUBLE, allowNull: true },
    service_price: { type: DataTypes.DOUBLE, allowNull: true },
    service_payprice: { type: DataTypes.DOUBLE, allowNull: true },
    service_actualpay: { type: DataTypes.DOUBLE, allowNull: true },


    admission_datetime_admit: { type: DataTypes.STRING, allowNull: true },
    admission_wardadmit: { type: DataTypes.STRING, allowNull: true },
    admission_instype: { type: DataTypes.STRING, allowNull: true },
    admission_typein: { type: DataTypes.STRING, allowNull: true },
    admission_referinhosp: { type: DataTypes.STRING, allowNull: true },
    admission_causein: { type: DataTypes.STRING, allowNull: true },
    admission_admitweight: { type: DataTypes.STRING, allowNull: true },
    admission_admitheight: { type: DataTypes.STRING, allowNull: true },
    admission_datetime_disch: { type: DataTypes.STRING, allowNull: true },
    admission_warddisch: { type: DataTypes.STRING, allowNull: true },
    admission_dischstatus: { type: DataTypes.STRING, allowNull: true },
    admission_dischtype: { type: DataTypes.STRING, allowNull: true },
    admission_referouthosp: { type: DataTypes.STRING, allowNull: true },
    admission_causeout: { type: DataTypes.STRING, allowNull: true },
    admission_cost: { type: DataTypes.STRING, allowNull: true },
    admission_price: { type: DataTypes.STRING, allowNull: true },
    admission_payprice: { type: DataTypes.STRING, allowNull: true },
    admission_actualpay: { type: DataTypes.STRING, allowNull: true },
    admission_provider: { type: DataTypes.STRING, allowNull: true },
    admission_d_update: { type: DataTypes.STRING, allowNull: true },
    admission_drg: { type: DataTypes.STRING, allowNull: true },
    admission_rw: { type: DataTypes.STRING, allowNull: true },
    admission_adjrw: { type: DataTypes.STRING, allowNull: true },
    admission_error: { type: DataTypes.STRING, allowNull: true },
    admission_warning: { type: DataTypes.STRING, allowNull: true },
    admission_actlos: { type: DataTypes.STRING, allowNull: true },


    DIAGCODE: { type: DataTypes.STRING(10), allowNull: true },
    ISDEATH: { type: DataTypes.INTEGER, allowNull: true },
    CDEATH: { type: DataTypes.STRING(10), allowNull: true },
    ddeath: { type: DataTypes.DATEONLY, allowNull: true },

    DATEINHOSP: { type: DataTypes.FLOAT, allowNull: true },
    CID: { type: DataTypes.STRING(20), allowNull: true },
    NAME: { type: DataTypes.STRING(255), allowNull: true },
    LNAME: { type: DataTypes.STRING(255), allowNull: true },
    SEX: { type: DataTypes.STRING(5), allowNull: true },
    NATION: { type: DataTypes.STRING(10), allowNull: true },
    BIRTH: { type: DataTypes.DATEONLY, allowNull: true },
    AGE: { type: DataTypes.INTEGER, allowNull: true },
    OPD_CODE: { type: DataTypes.TEXT, allowNull: true },
    IPD_CODE: { type: DataTypes.TEXT, allowNull: true },
    ALLCODE: { type: DataTypes.TEXT, allowNull: true },




    S0: { type: DataTypes.INTEGER, allowNull: true },
    S1: { type: DataTypes.INTEGER, allowNull: true },
    S2: { type: DataTypes.INTEGER, allowNull: true },
    S3: { type: DataTypes.INTEGER, allowNull: true },
    S4: { type: DataTypes.INTEGER, allowNull: true },
    S5: { type: DataTypes.INTEGER, allowNull: true },
    S6: { type: DataTypes.INTEGER, allowNull: true },
    S7: { type: DataTypes.INTEGER, allowNull: true },
    S8: { type: DataTypes.INTEGER, allowNull: true },
    S9: { type: DataTypes.INTEGER, allowNull: true },

    AEPLACE: { type: DataTypes.STRING(5), allowNull: true },
    AETYPE: { type: DataTypes.STRING(5), allowNull: true },
    AIRWAY: { type: DataTypes.STRING(5), allowNull: true },
    ALCOHOL: { type: DataTypes.STRING(5), allowNull: true },
    SPLINT: { type: DataTypes.STRING(5), allowNull: true },

    BELT: { type: DataTypes.STRING(5), allowNull: true },
    HELMET: { type: DataTypes.STRING(5), allowNull: true },
    COMA_EYE: { type: DataTypes.STRING(5), allowNull: true },
    COMA_MOVEMENT: { type: DataTypes.STRING(5), allowNull: true },
    COMA_SPEAK: { type: DataTypes.STRING(5), allowNull: true },
    NACROTIC_DRUG: { type: DataTypes.STRING(5), allowNull: true },
    STOPBLEED: { type: DataTypes.STRING(5), allowNull: true },
    TRAFFIC: { type: DataTypes.STRING(5), allowNull: true },
    TYPEIN_AE: { type: DataTypes.STRING(5), allowNull: true },
    URGENCY: { type: DataTypes.STRING(5), allowNull: true },
    VEHICLE: { type: DataTypes.STRING(5), allowNull: true },

    old_id: { type: DataTypes.INTEGER, allowNull: true },
    province_id: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: true },
    project_id: { type: DataTypes.INTEGER, allowNull: true },
    project_file_id: { type: DataTypes.INTEGER, allowNull: true }
}, {
    sequelize: dbServer,
    modelName: 'HCDRecords',
    tableName: 'hdc_records',
    timestamps: false,
    underscored: false,
    freezeTableName: true,
    indexes: [
        {
            name: 'idx_temp_his_hospcode_seq',
            using: 'BTREE',
            fields: ['HOSPCODE', 'SEQ']
        }
    ]
});

module.exports = HCDRecords;
