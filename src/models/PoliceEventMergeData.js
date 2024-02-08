const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../config/connections/db_server');

class PoliceEventMergeData extends Model {}

PoliceEventMergeData.init({
    event_id: { type: DataTypes.STRING(100), primaryKey: true },
    adate: { type: DataTypes.DATEONLY },
    atime: { type: DataTypes.STRING(255) },
    borchor: { type: DataTypes.STRING(255) },
    borkor: { type: DataTypes.STRING(255) },
    sornor: { type: DataTypes.STRING(255) },
    light: { type: DataTypes.STRING(255) },
    aroad: { type: DataTypes.STRING(255) },
    atumbol: { type: DataTypes.STRING(100) },
    aaumpor: { type: DataTypes.STRING(100) },
    aprovince: { type: DataTypes.STRING(100) },
    aroad_type: { type: DataTypes.STRING(100) },
    alat: { type: DataTypes.STRING(20) },
    along: { type: DataTypes.STRING(20) },
    alane: { type: DataTypes.STRING(100) },
    alane_sub: { type: DataTypes.STRING(100) },
    aroad_character: { type: DataTypes.STRING(100) },
    aroad_character_other: { type: DataTypes.STRING(100) },
    aroad_factor: { type: DataTypes.STRING(100) },
    aroadfit_factor: { type: DataTypes.STRING(100) },
    aenv_factor: { type: DataTypes.STRING(100) },
    aenv_factor_other: { type: DataTypes.STRING(255) },
    abehavior_factor: { type: DataTypes.STRING(255) },
    abehavior_other_factor: { type: DataTypes.STRING(255) },
    avehicle_factor: { type: DataTypes.STRING(255) },
    avehicle_factor_other: { type: DataTypes.STRING(255) },
    aperson_factor: { type: DataTypes.STRING(255) },
    aperson_factor_other: { type: DataTypes.STRING(255) },
    aconformation: { type: DataTypes.STRING(255) },
    case_parties: { type: DataTypes.STRING(10) },
    vehicle_1: { type: DataTypes.STRING(100) },
    vehicle_plate_1: { type: DataTypes.STRING(100) },
    vehicle_province_1: { type: DataTypes.STRING(100) },
    vehicle_2: { type: DataTypes.STRING(100) },
    vehicle_plate_2: { type: DataTypes.STRING(30) },
    vehicle_province_2: { type: DataTypes.STRING(100) },
    vehicle_3: { type: DataTypes.STRING(100) },
    vehicle_plate_3: { type: DataTypes.STRING(30) },
    vehicle_province_3: { type: DataTypes.STRING(100) },
    vehicle_4: { type: DataTypes.STRING(100) },
    vehicle_plate_4: { type: DataTypes.STRING(30) },
    vehicle_province_4: { type: DataTypes.STRING(100) },
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    project_file_id: { type: DataTypes.INTEGER },
    project_id: { type: DataTypes.INTEGER },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
}, {
    sequelize:dbServer,
    tableName: 'temp_police_events_clean',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = PoliceEventMergeData;