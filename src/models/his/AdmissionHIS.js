const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../../config/connections/db_server_raw_his');

class AdmissionHIS extends Model { }

AdmissionHIS.init({
    hospcode: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    pid: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    seq: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    an: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    datetime_admit: { type: DataTypes.STRING, allowNull: true },
    wardadmit: { type: DataTypes.STRING, allowNull: true },
    instype: { type: DataTypes.STRING, allowNull: true },
    typein: { type: DataTypes.STRING, allowNull: true },
    referinhosp: { type: DataTypes.STRING, allowNull: true },
    causein: { type: DataTypes.STRING, allowNull: true },
    admitweight: { type: DataTypes.STRING, allowNull: true },
    admitheight: { type: DataTypes.STRING, allowNull: true },
    datetime_disch: { type: DataTypes.STRING, allowNull: true },
    warddisch: { type: DataTypes.STRING, allowNull: true },
    dischstatus: { type: DataTypes.STRING, allowNull: true },
    dischtype: { type: DataTypes.STRING, allowNull: true },
    referouthosp: { type: DataTypes.STRING, allowNull: true },
    causeout: { type: DataTypes.STRING, allowNull: true },
    cost: { type: DataTypes.STRING, allowNull: true },
    price: { type: DataTypes.STRING, allowNull: true },
    payprice: { type: DataTypes.STRING, allowNull: true },
    actualpay: { type: DataTypes.STRING, allowNull: true },
    provider: { type: DataTypes.STRING, allowNull: true },
    d_update: { type: DataTypes.STRING, allowNull: true },
    drg: { type: DataTypes.STRING, allowNull: true },
    rw: { type: DataTypes.STRING, allowNull: true },
    adjrw: { type: DataTypes.STRING, allowNull: true },
    error: { type: DataTypes.STRING, allowNull: true },
    warning: { type: DataTypes.STRING, allowNull: true },
    actlos: { type: DataTypes.STRING, allowNull: true },
    grouper_version: { type: DataTypes.STRING, allowNull: true }
}, {
    sequelize: dbServer,
    modelName: 'AdmissionHIS',
    tableName: 'admission',
    timestamps: false,
    underscored: false,
    freezeTableName: true
});

module.exports = AdmissionHIS;
