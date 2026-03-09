const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../../config/connections/db_server_raw_his');

class ProcedureIpdHIS extends Model { }

ProcedureIpdHIS.init({
    hospcode: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    pid: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    an: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    datetime_admit: { type: DataTypes.STRING, allowNull: true },
    wardstay: { type: DataTypes.STRING, allowNull: true },
    procedcode: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    timestart: { type: DataTypes.STRING, allowNull: true },
    timefinish: { type: DataTypes.STRING, allowNull: true },
    serviceprice: { type: DataTypes.STRING, allowNull: true },
    provider: { type: DataTypes.STRING, allowNull: true },
    d_update: { type: DataTypes.STRING, allowNull: true },
    hospcode9: { type: DataTypes.STRING, allowNull: true }
}, {
    sequelize: dbServer,
    modelName: 'ProcedureIpdHIS',
    tableName: 'procedure_ipd',
    timestamps: false,
    underscored: false,
    freezeTableName: true
});

module.exports = ProcedureIpdHIS;
