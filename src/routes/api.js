const express = require('express');
const router = express.Router();

const projectRouter = require('./project'); // This is the same loginRoute.js as before

// Use the sub-route modules
router.use('/project/', projectRouter);


// You can add more sub-routes here

module.exports = router;