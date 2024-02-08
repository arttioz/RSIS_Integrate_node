const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../config/connections/db_server');

class PrepareMerge extends Model {}

PrepareMerge.init({
    id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true
    },
    data_id: DataTypes.BIGINT,
    name: DataTypes.STRING,
    lname: DataTypes.STRING,
    age: DataTypes.INTEGER,
    gender: DataTypes.INTEGER,
    difdatefrom2000: DataTypes.INTEGER,
    vehicle_type: DataTypes.INTEGER,
    name_lenght: DataTypes.INTEGER,
    is_cid_good: DataTypes.TINYINT,
    cid_num: DataTypes.BIGINT,
    is_confirm_thai: DataTypes.TINYINT,
    month: DataTypes.INTEGER,
    year: DataTypes.INTEGER,
    table_name: DataTypes.STRING,
    hospdate: DataTypes.DATE,
    accdate: DataTypes.DATE,
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
    match_id: DataTypes.TEXT,
    hospcode: DataTypes.STRING,
    in_his: DataTypes.INTEGER,
    in_is: DataTypes.INTEGER,
    in_police: DataTypes.INTEGER,
    in_eclaim: DataTypes.INTEGER,
    his_id: DataTypes.BIGINT,
    is_id: DataTypes.BIGINT,
    police_id: DataTypes.BIGINT,
    eclaim_id: DataTypes.BIGINT,
    his_log: DataTypes.STRING,
    is_log: DataTypes.STRING,
    police_log: DataTypes.STRING,
    eclaim_log: DataTypes.STRING,
    project_id: DataTypes.INTEGER,
    project_file_id: DataTypes.INTEGER,
    row_num: DataTypes.INTEGER,
}, {
    sequelize:dbServer,
    modelName: 'PrepareMerge',
    tableName: 'project_prepare_merge',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = PrepareMerge;