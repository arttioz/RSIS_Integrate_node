const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../config/connections/db_server');

class EclaimMergeData extends Model {}

EclaimMergeData.init({
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
    },
    cid: { type: DataTypes.STRING(20), allowNull: true },
    vehicle_plate_province: { type: DataTypes.STRING(30), allowNull: true },
    vehicle_plate: { type: DataTypes.STRING(30), allowNull: true },
    vehicle_type: { type: DataTypes.STRING(255), allowNull: true },
    prename: { type: DataTypes.STRING(20), allowNull: true },
    name: { type: DataTypes.STRING(100), allowNull: true },
    lname: { type: DataTypes.STRING(100), allowNull: true },
    gender: { type: DataTypes.STRING(10), allowNull: true },
    nation: { type: DataTypes.STRING(100), allowNull: true },
    birthdate: { type: DataTypes.DATEONLY, allowNull: true },
    age: { type: DataTypes.INTEGER, allowNull: true },
    adate: { type: DataTypes.DATE, allowNull: true },
    atime: { type: DataTypes.STRING(10), allowNull: true },
    atumbol: { type: DataTypes.STRING(100), allowNull: true },
    aaumpor: { type: DataTypes.STRING(100), allowNull: true },
    aprovince: { type: DataTypes.STRING(100), allowNull: true },
    alat: { type: DataTypes.FLOAT, allowNull: true },
    along: { type: DataTypes.FLOAT, allowNull: true },
    crash_desc: { type: DataTypes.STRING(255), allowNull: true },
    occupation: { type: DataTypes.STRING(255), allowNull: true },
    address_aumpor: { type: DataTypes.STRING(100), allowNull: true },
    address_province: { type: DataTypes.STRING(100), allowNull: true },
    hospcode: { type: DataTypes.STRING(10), allowNull: true },
    injury_status: { type: DataTypes.STRING(100), allowNull: true },
    ride_status: { type: DataTypes.STRING(100), allowNull: true },
    cost: { type: DataTypes.FLOAT, allowNull: true },
    match: { type: DataTypes.STRING(255), allowNull: true },
    is_duplicate: { type: DataTypes.BOOLEAN, allowNull: true },
    adatetime: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: true },
    project_id: { type: DataTypes.INTEGER, allowNull: true },
    project_file_id: { type: DataTypes.INTEGER, allowNull: true },
}, {
    sequelize:dbServer,
    modelName: 'EclaimMergeData',
    tableName: 'temp_eclaim_clean',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = EclaimMergeData;