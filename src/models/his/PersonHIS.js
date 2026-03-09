const { Sequelize, DataTypes, Model } = require('sequelize');
const dbServer = require('../../../config/connections/db_server_raw_his');

class PersonHIS extends Model { }

PersonHIS.init({
    h_pid: { type: DataTypes.STRING, allowNull: true },
    hospcode: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    cid: { type: DataTypes.STRING, allowNull: true },
    pid: { type: DataTypes.STRING, allowNull: true, primaryKey: true },
    hid: { type: DataTypes.STRING, allowNull: true },
    prename: { type: DataTypes.STRING, allowNull: true },
    name: { type: DataTypes.TEXT, allowNull: true },
    lname: { type: DataTypes.TEXT, allowNull: true },
    hn: { type: DataTypes.STRING, allowNull: true },
    sex: { type: DataTypes.STRING, allowNull: true },
    birth: { type: DataTypes.STRING, allowNull: true },
    mstatus: { type: DataTypes.STRING, allowNull: true },
    occupation_old: { type: DataTypes.STRING, allowNull: true },
    occupation_new: { type: DataTypes.STRING, allowNull: true },
    race: { type: DataTypes.STRING, allowNull: true },
    nation: { type: DataTypes.STRING, allowNull: true },
    religion: { type: DataTypes.STRING, allowNull: true },
    education: { type: DataTypes.STRING, allowNull: true },
    fstatus: { type: DataTypes.STRING, allowNull: true },
    father: { type: DataTypes.STRING, allowNull: true },
    mother: { type: DataTypes.STRING, allowNull: true },
    couple: { type: DataTypes.STRING, allowNull: true },
    vstatus: { type: DataTypes.STRING, allowNull: true },
    movein: { type: DataTypes.STRING, allowNull: true },
    discharge: { type: DataTypes.STRING, allowNull: true },
    ddischarge: { type: DataTypes.STRING, allowNull: true },
    abogroup: { type: DataTypes.STRING, allowNull: true },
    rhgroup: { type: DataTypes.STRING, allowNull: true },
    labor: { type: DataTypes.STRING, allowNull: true },
    passport: { type: DataTypes.STRING, allowNull: true },
    typearea: { type: DataTypes.STRING, allowNull: true },
    d_update: { type: DataTypes.DATE, allowNull: true },
    telephone: { type: DataTypes.STRING, allowNull: true },
    mobile: { type: DataTypes.STRING, allowNull: true },
    hospcode9: { type: DataTypes.STRING, allowNull: true },
    hash_all: { type: DataTypes.CHAR(32), allowNull: true }
}, {
    sequelize: dbServer,
    modelName: 'PersonHIS',
    tableName: 'person',
    timestamps: false,
    underscored: false,
    freezeTableName: true,
    indexes: [
        {
            name: 'idx_cid',
            using: 'BTREE',
            fields: ['cid']
        },
        {
            name: 'idx_hospcode',
            using: 'BTREE',
            fields: ['hospcode']
        },
        {
            name: 'idx_pid',
            using: 'BTREE',
            fields: ['pid']
        },
        {
            name: 'idx_hash_update',
            using: 'BTREE',
            fields: ['hash_all', 'd_update']
        },
        {
            name: 'idx_hpc',
            using: 'BTREE',
            fields: ['h_pid', 'cid', 'hospcode']
        },
        {
            name: 'idx_pid_cid_hospcode_d_update',
            using: 'BTREE',
            fields: ['pid', 'cid', 'hospcode', 'd_update']
        },
        {
            name: 'idx_join',
            using: 'BTREE',
            fields: ['hospcode', 'pid', 'cid', 'd_update']
        }
    ]
});

module.exports = PersonHIS;
