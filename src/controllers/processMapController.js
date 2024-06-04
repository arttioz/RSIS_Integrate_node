
const {log} = require("debug");
const moment = require('moment');
const { DBSCAN } = require('density-clustering');

// Import all models
const IntegrateFinalFull = require('../models/IntegrateFinalFull');
const {Op} = require("sequelize");

require('dotenv').config();

class ProcessMapController {
    constructor(startDate,endDate, meters= 100.0) {
        this.startDate = startDate
        this.endDate = endDate
        this.meters = meters
    }

    toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    async fetchData() {
        const rawData = await IntegrateFinalFull.findAll({
            attributes: [
                'id', 'alat', 'along', 'aprovince', 'aaumpor', 'atumbol',
                'is_death', 'admit', 'accdate', 'age'
            ],
            where: {
                alat: { [Op.ne]: null },
                along: { [Op.ne]: null },
                injury_date: {
                    [Op.between]: [this.startDate, this.endDate.endOf('day').toDate()]
                }
            }
        });

        // Grouping data manually by 'alat', 'along', and 'accdate'
        const groupedData = {};
        rawData.forEach(item => {
            const key = `${item.alat}_${item.along}_${item.accdate}`;
            if (!groupedData[key]) {
                groupedData[key] = {
                    Acc_lat: item.alat,
                    Acc_long: item.along,
                    Accdate: item.accdate,
                    Case: [],
                    Aprovince: item.aprovince, // Assuming province is consistent within each group
                    Aaumpor: item.aaumpor,
                    Atumbol: item.atumbol
                };
            }
            // Add participant data to the group
            groupedData[key].Case.push({
                ID: item.id,
                IsDeath: item.is_death,
                Admit: item.admit,
                Age: item.age
            });
        });

        // Convert object to array if needed for further processing
        return Object.values(groupedData);
    }

    clusterData(data) {
        const kms_per_radian = 6371.0088;
        const epsilon = (this.meters / 1000.0) / kms_per_radian; // 100 meters
        const coords = data.map(d => [this.toRadians(d.Acc_lat), this.toRadians(d.Acc_long)]);


        const haversineDistance = (pointA, pointB) => {
            const R = 6371.0088; // Radius of the Earth in km
            const dLat = pointB[0] - pointA[0];
            const dLon = pointB[1] - pointA[1];
            const lat1 = pointA[0];
            const lat2 = pointB[0];

            const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c; // Distance in km
        };


        const dbscan = new DBSCAN();
        const clusters = dbscan.run(coords, epsilon, 1, haversineDistance);
        let clusterResults = [];

        // Assign clusters back to data
        clusters.forEach((cluster, index) => {
            clusterResults[index] = [];
            for (const itemIndex of cluster) {
                data[itemIndex].cluster = index;
                clusterResults[index].push(data[itemIndex]);
            }
        });
        return clusterResults.filter(cluster => cluster.length);
    }


    async performClustering(){

        const data = await this.fetchData();

        const groupedByProvince = data.reduce((acc, item) => {
            if (!acc[item.Aprovince]) acc[item.Aprovince] = [];
            acc[item.Aprovince].push(item);
            return acc;
        }, {});

        const clusterPromises = Object.values(groupedByProvince).map(items => this.clusterData(items));

        // Resolve all clusterData promises in parallel
        const clustersArray = await Promise.all(clusterPromises);

        // Concatenate all clusters into a single array
        const allClusters = clustersArray.reduce((acc, clusters) => acc.concat(clusters), []);

        // Optional: Sort clusters by the number of members (descending)
        allClusters.sort((a, b) => b.length - a.length);

        return allClusters;
    }

}

module.exports = ProcessMapController;