const { Sequelize, Model, DataTypes } = require('sequelize');
const dbServer = require('../../../config/connections/db_server_raw');

class EclaimApi extends Model {
    setTable(table) {
        this.table = table;
    }
}

EclaimApi.init({id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
    }
    ,
    IdCard: DataTypes.STRING(20),
    CarProv: DataTypes.STRING(50),
    CarType: DataTypes.STRING(255),
    Prefix: DataTypes.STRING(20),
    Fname: DataTypes.STRING(255),
    Lname: DataTypes.STRING(255),
    Sex: DataTypes.STRING(20),
    Nationality: DataTypes.STRING(255),
    BirthDate: DataTypes.DATEONLY,
    Age: DataTypes.INTEGER,
    AccDate: DataTypes.DATE,
    AccSubDistict: DataTypes.STRING(255),
    AccDistict: DataTypes.STRING(255),
    AccProvince: DataTypes.STRING(255),
    Latitude: DataTypes.STRING(20),
    Longitude: DataTypes.STRING(20),
    Career: DataTypes.STRING(255),
    DistictAddress: DataTypes.STRING(255),
    ProvinceAddress: DataTypes.STRING(255),
    HospitalId: DataTypes.STRING(20),
    BrokenStatus: DataTypes.STRING(255),
    VictimType: DataTypes.STRING(255),
    Broken: DataTypes.STRING(255),
    AmountOf: DataTypes.STRING(255),
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
}, {
    sequelize: dbServer,
    tableName: 'eclaim_records',
    createdAt: "created_at",
    updatedAt: "updated_at"
});

module.exports = EclaimApi;