const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../config/connections/db_server');
class PoliceVehicleMergeData extends Model {

    static associate(models) {
        this.belongsTo(models.PoliceEventMergeData, { foreignKey: 'event_id', as: 'policeEvent' });
    }

}

PoliceVehicleMergeData.init({
    event_id: { type: DataTypes.STRING(50) },
    vehicle_index: { type: DataTypes.INTEGER },
    vehicle: { type: DataTypes.STRING(255) },
    vehicle_plate: { type: DataTypes.STRING(20) },
    vehicle_province: { type: DataTypes.STRING(100) },
    fullname: { type: DataTypes.STRING(255) },
    cid: { type: DataTypes.STRING(20) },
    age: { type: DataTypes.INTEGER },
    sex: { type: DataTypes.STRING(10) },
    nation: { type: DataTypes.STRING(50) },
    occupation: { type: DataTypes.STRING(255) },
    roaduser: { type: DataTypes.STRING(100) },
    vehicle_ride_index: { type: DataTypes.INTEGER },
    injury: { type: DataTypes.STRING(255) },
    alcohol: { type: DataTypes.STRING(100) },
    injury_factor: { type: DataTypes.STRING(100) },
    belt: { type: DataTypes.STRING(100) },
    helmet: { type: DataTypes.STRING(100) },
    vehicle_type: { type: DataTypes.STRING(100) },
    driving_licence: { type: DataTypes.STRING(255) },
    driving_licence_type: { type: DataTypes.STRING(255) },
    driving_licence_province: { type: DataTypes.STRING(100) },
    prename: { type: DataTypes.STRING(100) },
    name: { type: DataTypes.STRING(100) },
    lname: { type: DataTypes.STRING(100) },
    adate: { type: DataTypes.DATEONLY },
    match: { type: DataTypes.STRING(255) },
    is_duplicate: { type: DataTypes.INTEGER },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
    project_id: { type: DataTypes.INTEGER },
    project_file_id: { type: DataTypes.INTEGER }
}, {
    sequelize:dbServer,
    modelName: 'PoliceVehicleMergeData',
    tableName: 'temp_police_vehicle_clean',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = PoliceVehicleMergeData;