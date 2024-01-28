
const {log} = require("debug");
const moment = require('moment');
const LogModel = require('../models/jobLog');


class ProjectIntegrateController {


}
module.exports = ProjectIntegrateController;


module.exports = {


    startProject: async function (req, res) {

        res.json({"code":200, "message":"Job success"})
    },
    cleanDatabase: function (req, res) {

        res.json({"code":200, "message":"Job success"})
    }
}
