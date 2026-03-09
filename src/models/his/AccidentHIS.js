const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../../config/connections/db_server_raw_his');

class AccidentHIS extends Model { }

AccidentHIS.init({
    hospcode: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    pid: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    seq: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    datetime_serv: { type: DataTypes.STRING, allowNull: true },
    datetime_ae: { type: DataTypes.STRING, allowNull: true },
    aetype: { type: DataTypes.STRING, allowNull: true },
    aeplace: { type: DataTypes.STRING, allowNull: true },
    typein_ae: { type: DataTypes.STRING, allowNull: true },
    traffic: { type: DataTypes.STRING, allowNull: true },
    vehicle: { type: DataTypes.STRING, allowNull: true },
    alcohol: { type: DataTypes.STRING, allowNull: true },
    nacrotic_drug: { type: DataTypes.STRING, allowNull: true },
    belt: { type: DataTypes.STRING, allowNull: true },
    helmet: { type: DataTypes.STRING, allowNull: true },
    airway: { type: DataTypes.STRING, allowNull: true },
    stopbleed: { type: DataTypes.STRING, allowNull: true },
    splint: { type: DataTypes.STRING, allowNull: true },
    fluid: { type: DataTypes.STRING, allowNull: true },
    urgency: { type: DataTypes.STRING, allowNull: true },
    coma_eye: { type: DataTypes.STRING, allowNull: true },
    coma_speak: { type: DataTypes.STRING, allowNull: true },
    coma_movement: { type: DataTypes.STRING, allowNull: true },
    d_update: { type: DataTypes.STRING, allowNull: true }
}, {
    sequelize: dbServer,
    modelName: 'AccidentHIS',
    tableName: 'accident',
    timestamps: false,
    underscored: false,
    freezeTableName: true
});

module.exports = AccidentHIS;
