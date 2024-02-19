const { Model, DataTypes } = require('sequelize');
const dbServer = require('../../config/connections/db_server');

class Project extends Model {}

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
    province_code: DataTypes.INTEGER,
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