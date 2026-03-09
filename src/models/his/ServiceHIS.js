const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../../config/connections/db_server_raw_his');

class ServiceHIS extends Model { }

ServiceHIS.init({
    hospcode: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    pid: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    hn: { type: DataTypes.STRING, allowNull: true },
    seq: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    date_serv: { type: DataTypes.STRING, allowNull: true },
    time_serv: { type: DataTypes.STRING, allowNull: true },
    location: { type: DataTypes.INTEGER, allowNull: true },
    intime: { type: DataTypes.INTEGER, allowNull: true },
    instype: { type: DataTypes.INTEGER, allowNull: true },
    insid: { type: DataTypes.STRING, allowNull: true },
    main: { type: DataTypes.STRING, allowNull: true },
    typein: { type: DataTypes.INTEGER, allowNull: true },
    referinhosp: { type: DataTypes.STRING, allowNull: true },
    causein: { type: DataTypes.INTEGER, allowNull: true },
    chiefcomp: { type: DataTypes.TEXT, allowNull: true },
    servplace: { type: DataTypes.INTEGER, allowNull: true },
    btemp: { type: DataTypes.DOUBLE, allowNull: true },
    sbp: { type: DataTypes.DOUBLE, allowNull: true },
    dbp: { type: DataTypes.DOUBLE, allowNull: true },
    pr: { type: DataTypes.DOUBLE, allowNull: true },
    rr: { type: DataTypes.DOUBLE, allowNull: true },
    typeout: { type: DataTypes.INTEGER, allowNull: true },
    referouthosp: { type: DataTypes.STRING, allowNull: true },
    causeout: { type: DataTypes.INTEGER, allowNull: true },
    cost: { type: DataTypes.DOUBLE, allowNull: true },
    price: { type: DataTypes.DOUBLE, allowNull: true },
    payprice: { type: DataTypes.DOUBLE, allowNull: true },
    actualpay: { type: DataTypes.DOUBLE, allowNull: true },
    d_update: { type: DataTypes.TIME, allowNull: true }
}, {
    sequelize: dbServer,
    modelName: 'ServiceHIS',
    tableName: 'service',
    timestamps: false,
    underscored: false,
    freezeTableName: true
});

module.exports = ServiceHIS;
