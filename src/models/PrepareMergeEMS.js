const { DataTypes, Model } = require('sequelize');
const dbServer = require('../../config/connections/db_server');

class PrepareMergeEMS extends Model { }

PrepareMergeEMS.init({
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
    in_ems: DataTypes.INTEGER,
    ems_id: DataTypes.BIGINT,
    ems_log: DataTypes.STRING,
    in_rsis: DataTypes.INTEGER,
    rsis_id: DataTypes.BIGINT,
    rsis_log: DataTypes.STRING,
    project_id: DataTypes.INTEGER,
    project_file_id: DataTypes.INTEGER,
    row_num: DataTypes.INTEGER,
    admit: DataTypes.INTEGER,
}, {
    sequelize: dbServer,
    modelName: 'PrepareMergeEMS',
    tableName: 'project_prepare_merge_ems',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = PrepareMergeEMS;
