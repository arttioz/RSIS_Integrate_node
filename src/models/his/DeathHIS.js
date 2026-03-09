const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../../config/connections/db_server_raw_his');

class DeathHIS extends Model { }

DeathHIS.init({
    hospcode: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    pid: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    hospdeath: { type: DataTypes.STRING, allowNull: true },
    an: { type: DataTypes.STRING, allowNull: true },
    seq: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    ddeath: { type: DataTypes.STRING, allowNull: true },
    cdeath_a: { type: DataTypes.STRING, allowNull: true },
    cdeath_b: { type: DataTypes.STRING, allowNull: true },
    cdeath_c: { type: DataTypes.STRING, allowNull: true },
    cdeath_d: { type: DataTypes.STRING, allowNull: true },
    odisease: { type: DataTypes.STRING, allowNull: true },
    cdeath: { type: DataTypes.STRING, allowNull: true },
    pregdeath: { type: DataTypes.STRING, allowNull: true },
    pdeath: { type: DataTypes.STRING, allowNull: true },
    provider: { type: DataTypes.STRING, allowNull: true },
    d_update: { type: DataTypes.STRING, allowNull: true }
}, {
    sequelize: dbServer,
    modelName: 'DeathHIS',
    tableName: 'death',
    timestamps: false,
    underscored: false,
    freezeTableName: true
});

module.exports = DeathHIS;
