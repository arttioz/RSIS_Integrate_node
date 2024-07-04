const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../config/connections/db_server');
class LibAddressMoi  extends Model {}

LibAddressMoi.init({
    add_id: { type: DataTypes.INTEGER, primaryKey: true },
    ad_level: { type: DataTypes.STRING(10) },
    ta_id: { type: DataTypes.STRING(6) },
    tambon_t: { type: DataTypes.STRING(200) },
    tambon_e: { type: DataTypes.STRING(100) },
    am_id: { type: DataTypes.STRING(4) },
    amphoe_t: { type: DataTypes.STRING(200) },
    amphoe_e: { type: DataTypes.STRING(200) },
    ch_id: { type: DataTypes.STRING(2) },
    changwat_t: { type: DataTypes.STRING(200) },
    changwat_e: { type: DataTypes.STRING(200) },
    latitude: { type: DataTypes.STRING(20) },
    longitude: { type: DataTypes.STRING(20) }
}, {
    sequelize: dbServer,
    modelName: 'LibAddressMoi',
    tableName: 'lib_address_moi',
    timestamps: false
});

module.exports = LibAddressMoi;