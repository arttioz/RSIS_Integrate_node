const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../config/connections/db_server');

class PrepareMergeEreport extends Model {}

PrepareMergeEreport.init({
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
    cid: DataTypes.STRING,
    cid_num: DataTypes.STRING,
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
    in_e_report: DataTypes.INTEGER,
    e_report_id: DataTypes.BIGINT,
    e_report_log: DataTypes.STRING,
    in_rsis: DataTypes.INTEGER,
    rsis_id: DataTypes.BIGINT,
    rsis_log : DataTypes.STRING,
    project_id: DataTypes.INTEGER,
    project_file_id: DataTypes.INTEGER,
    row_num: DataTypes.INTEGER,
    admit: DataTypes.INTEGER,
}, {
    sequelize:dbServer,
    modelName: 'PrepareMergeEreport',
    tableName: 'project_prepare_merge_ereport',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = PrepareMergeEreport;