var express = require('express');
var router = express.Router();
const projectController = require('../controllers/projectIntegrateController');

router.get('/start/', projectController.startProject);
router.get('/clean/', projectController.cleanDatabase);

router.get('/start/autoproject', projectController.autoProject);
router.get('/test/connection', projectController.testDatabaseConnection);


module.exports = router;