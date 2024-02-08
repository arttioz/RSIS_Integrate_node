const { Sequelize, Model, DataTypes } = require('sequelize');
const dbServer = require('../../../config/connections/db_server_raw');

class PoliceEventApi extends Model {}

PoliceEventApi.init({
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
    FactorLight: DataTypes.STRING(255),
    CaseLatitude: DataTypes.STRING(20),
    CaseLongitude: DataTypes.STRING(20),
    CaseRoad: DataTypes.STRING(255),
    CaseSubdistrict: DataTypes.STRING(255),
    CaseDistrict: DataTypes.STRING(255),
    CaseProvince: DataTypes.STRING(255),
    FactorRoadType: DataTypes.STRING(255),
    FactorLane: DataTypes.STRING(255),
    FactorLane_Sub: DataTypes.STRING(255),
    CaseRoadDetails: DataTypes.STRING(255),
    CaseRoadDetailsOther: DataTypes.STRING(255),
    CaseRoadCondition: DataTypes.STRING(255),
    CaseRoadConditionOther: DataTypes.STRING(255),
    CaseRoadComponent: DataTypes.STRING(255),
    CaseRoadComponentOther: DataTypes.STRING(255),
    CaseRoadEnvironment: DataTypes.STRING(255),
    CaseRoadEnvironmentOther: DataTypes.STRING(255),
    CaseEquipmentDefective: DataTypes.STRING(255),
    CaseEquipmentDefectiveOther: DataTypes.STRING(255),
    CaseBehaviorDriver: DataTypes.STRING(255),
    CaseBehaviorDriverOther: DataTypes.STRING(255),
    CaseBehaviorPersonal: DataTypes.STRING(255),
    CaseBehaviorPersonalOther: DataTypes.STRING(255),
    CaseParties: DataTypes.INTEGER,
    VehiclesType: DataTypes.STRING(255),
    Vehicles: DataTypes.TEXT,
}, {
    sequelize: dbServer,
    tableName: 'police_event_records',
    timestamps: false, // Assuming there are no 'createdAt' and 'updatedAt' fields in your table
    createdAt: false,
    updatedAt: false
});

module.exports = PoliceEventApi;