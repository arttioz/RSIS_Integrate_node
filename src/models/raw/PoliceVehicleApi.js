const { Sequelize, Model, DataTypes } = require('sequelize');
const dbServer = require('../../../config/connections/db_server_raw');

class PoliceVehicleApi extends Model {}

PoliceVehicleApi.init({
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    },
    AccidentNumber: DataTypes.STRING(255),
    CaseDay: DataTypes.DATEONLY,
    CaseTime: DataTypes.TIME,
    CaseStation: DataTypes.STRING(255),
    CaseSubOffice: DataTypes.STRING(255),
    CaseOffice: DataTypes.STRING(255),
    VehiclesSequence: DataTypes.STRING(255),
    SequenceOfPersonal: DataTypes.INTEGER,
    VehiclesType: DataTypes.STRING(255),
    Vehicleslicense: DataTypes.STRING(255),
    VehicleslicenseProvince: DataTypes.STRING(255),
    PersonalIDcardNo: DataTypes.STRING(255),
    PersonaName: DataTypes.TEXT,
    PersonalDrivingLicenseNo: DataTypes.STRING(255),
    PersonaAge: DataTypes.INTEGER,
    PersonaSex: DataTypes.STRING(255),
    PersonaNationality: DataTypes.STRING(255),
    PersonaOccupation: DataTypes.STRING(255),
    PersonaOccupationOther: DataTypes.STRING(255),
    PersonaCasualtyPerson: DataTypes.STRING(255),
    PersonaAccidentDetail: DataTypes.STRING(255),
    PersonaAlcoho: DataTypes.STRING(255),
    PersonaFactorsInjuryAndDeath: DataTypes.STRING(255),
    PersonaFactorsInjuryAndDeathType: DataTypes.STRING(255),
    PersonaCarType: DataTypes.STRING(255),
    PersonalDrivingLicense: DataTypes.STRING(255),
    PersonalDrivingLicenseType: DataTypes.STRING(255),
    PersonalDrivingLicenseProvinceName: DataTypes.STRING(255),
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
}, {
    sequelize: dbServer,
    tableName: 'police_vehicle_records',
    createdAt: "created_at",
    updatedAt: "updated_at"
});

module.exports = PoliceVehicleApi;