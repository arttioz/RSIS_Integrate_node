const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../../config/connections/db_server_raw_his');

class DiagnosisOpdHIS extends Model { }

DiagnosisOpdHIS.init({
    hospcode: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    pid: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    seq: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    date_serv: { type: DataTypes.DATE, allowNull: true },
    diagtype: { type: DataTypes.STRING, allowNull: true },
    diagcode: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    clinic: { type: DataTypes.STRING, allowNull: true },
    provider: { type: DataTypes.STRING, allowNull: true },
    d_update: { type: DataTypes.DATE, allowNull: true },
    principle_diag: { type: DataTypes.STRING, allowNull: true },
    diagtype2_list: { type: DataTypes.TEXT, allowNull: true },
    diagtype3_list: { type: DataTypes.TEXT, allowNull: true },
    diagtype4_list: { type: DataTypes.TEXT, allowNull: true },
    diagtype5_list: { type: DataTypes.TEXT, allowNull: true }
}, {
    sequelize: dbServer,
    modelName: 'DiagnosisOpdHIS',
    tableName: 'diagnosis_opd',
    timestamps: false,
    underscored: false,
    freezeTableName: true
});

module.exports = DiagnosisOpdHIS;
