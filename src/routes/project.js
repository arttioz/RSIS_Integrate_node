var express = require('express');
var router = express.Router();
const projectController = require('../controllers/projectIntegrateController');

router.get('/start/', projectController.startProject);
router.get('/clean/', projectController.cleanDatabase);

router.get('/start/autoproject/custom', projectController.autoProjectCustomDate);

router.get('/start/autoproject/province/custom', projectController.autoProjectCustomProvince);

router.get('/start/autoproject', projectController.autoProject);

router.get('/start/autoProject/province', projectController.autoProjectProvince);

router.get('/start/autoProject/his', projectController.autoProjectHISProvince);


router.get('/start/autoProject/ereport', projectController.autoCompareWithEreportCustomDate);

router.get('/start/autoProject/map', projectController.autoRiskMapCustomDate);

router.get('/test/connection', projectController.testDatabaseConnection);

router.get('/test/ems', projectController.testEMSData);

router.get('/start/autoProject/ems', projectController.autoProjectEMSProvince);

//test helloworld route
router.get('/test/helloworld', function (req, res) {
    res.send('Hello World!');
});


router.get('/his/etl', projectController.autoProjectHISETL);


module.exports = router;