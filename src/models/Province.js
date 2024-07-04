const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../config/connections/db_server');

class Province extends Model {}

Province.init({
    code: { type: DataTypes.INTEGER, primaryKey: true },
    name_th: { type: DataTypes.STRING },
    name_th_short: { type: DataTypes.STRING },
    name_en: { type: DataTypes.STRING },
    geography_id: { type: DataTypes.INTEGER }
}, {
    sequelize: dbServer,
    modelName: 'Province',
    tableName: 'provinces',
    timestamps: false
});

module.exports = Province;
