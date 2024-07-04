const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../config/connections/db_server');

class LibChangwat extends Model {}

LibChangwat.init({
    code: { type: DataTypes.STRING(2), primaryKey: true },
    name: { type: DataTypes.STRING(100) },
    name_en: { type: DataTypes.STRING(100) },
    region: { type: DataTypes.STRING(2) },
    abbr_en: { type: DataTypes.STRING(10) },
    abbr_th: { type: DataTypes.STRING(10) },
    first_order: { type: DataTypes.CHAR(1) },
    lat: { type: DataTypes.STRING(20) },
    lng: { type: DataTypes.STRING(20) },
    isactive: { type: DataTypes.TINYINT(1) }
}, {
    sequelize: dbServer,
    modelName: 'LibChangwat',
    tableName: 'lib_changwat',
    timestamps: false
});

module.exports = LibChangwat;
