const { Model, DataTypes } = require('sequelize');
const dbServer = require('../../config/connections/db_server');

class ProjectIntegrateFinalHIS extends Model {}

ProjectIntegrateFinalHIS.init(
    {
        id: { type: DataTypes.BIGINT, primaryKey: true },
        name: DataTypes.STRING(100),
        lname: DataTypes.STRING(100),
        cid: DataTypes.STRING(20),
        gender: DataTypes.INTEGER(11),
        nationality: DataTypes.STRING(100),
        dob: DataTypes.DATE,
        age: DataTypes.INTEGER(11),
        is_death: DataTypes.BOOLEAN,
        occupation: DataTypes.STRING(100),
        hdate: DataTypes.DATE,
        alcohol: DataTypes.STRING(255),
        belt_risk: DataTypes.STRING(100),
        helmet_risk: DataTypes.STRING(100),
        roaduser: DataTypes.STRING(100),
        vehicle_1: DataTypes.STRING(100),
        vehicle_plate_1: DataTypes.STRING(20),
        accdate: DataTypes.DATE,
        atumbol: DataTypes.STRING(100),
        aaumpor: DataTypes.STRING(100),
        aprovince: DataTypes.STRING(100),
        vehicle_2: DataTypes.STRING(100),
        police_event_id: DataTypes.STRING(255),
        hospcode: DataTypes.STRING(10),
        eclaim_id: DataTypes.BIGINT(20),
        eclaim_protocal: DataTypes.STRING(255),
        his_id: DataTypes.BIGINT(20),
        his_protocal: DataTypes.STRING(255),
        rsis_id: DataTypes.BIGINT(20),
        rsis_protocal: DataTypes.STRING(255),
        alat: DataTypes.FLOAT,
        along: DataTypes.FLOAT,
        created_at: DataTypes.DATE,
        updated_at: DataTypes.DATE,
        acc_province_id: DataTypes.INTEGER(11),
        url_video: DataTypes.STRING(255),
        project_id: DataTypes.INTEGER(11),
        admin: DataTypes.INTEGER(1)
    },
    {
        sequelize:dbServer,
        tableName: 'project_integrate_final_his',
        underscored: true,
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

module.exports = ProjectIntegrateFinalHIS;