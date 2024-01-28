var express = require('express');
var router = express.Router();
const projectController = require('../controllers/projectIntegrateController');

router.get('/start/', projectController.startProject);
router.get('/clean/', projectController.cleanDatabase);


module.exports = router;