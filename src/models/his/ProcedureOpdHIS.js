const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../../config/connections/db_server_raw_his');

class ProcedureOpdHIS extends Model { }

ProcedureOpdHIS.init({
    hospcode: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    pid: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    seq: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    date_serv: { type: DataTypes.STRING, allowNull: true },
    clinic: { type: DataTypes.STRING, allowNull: true },
    procedcode: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    serviceprice: { type: DataTypes.STRING, allowNull: true },
    provider: { type: DataTypes.STRING, allowNull: true },
    d_update: { type: DataTypes.STRING, allowNull: true },
    hospcode9: { type: DataTypes.STRING, allowNull: true }
}, {
    sequelize: dbServer,
    modelName: 'ProcedureOpdHIS',
    tableName: 'procedure_opd',
    timestamps: false,
    underscored: false,
    freezeTableName: true
});

module.exports = ProcedureOpdHIS;
