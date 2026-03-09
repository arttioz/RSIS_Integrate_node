const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../../config/connections/db_server_raw_his');

class DiagnosisIpdHIS extends Model { }

DiagnosisIpdHIS.init({
    hospcode: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    pid: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    an: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    datetime_admit: { type: DataTypes.DATE, allowNull: true },
    warddiag: { type: DataTypes.STRING, allowNull: true },
    diagtype: { type: DataTypes.STRING, allowNull: true },
    diagcode: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    provider: { type: DataTypes.STRING, allowNull: true },
    d_update: { type: DataTypes.DATE, allowNull: true },
    principle_diag: { type: DataTypes.STRING, allowNull: true },
    diagtype2_list: { type: DataTypes.TEXT, allowNull: true },
    diagtype3_list: { type: DataTypes.TEXT, allowNull: true },
    diagtype4_list: { type: DataTypes.TEXT, allowNull: true },
    diagtype5_list: { type: DataTypes.TEXT, allowNull: true }
}, {
    sequelize: dbServer,
    modelName: 'DiagnosisIpdHIS',
    tableName: 'diagnosis_ipd',
    timestamps: false,
    underscored: false,
    freezeTableName: true
});

module.exports = DiagnosisIpdHIS;
