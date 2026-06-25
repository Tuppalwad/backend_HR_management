// routes/projectRoutes.js
const express = require('express');
const router = express.Router();
const projectController = require('../controller/project');

router.post('/addproject', projectController.addProject);

router.get('/getproject', projectController.getProjects);

router.put('/editproject', projectController.editProject);

router.post('/getprojectbyid', projectController.getProjectById);

router.delete('/deleteproject', projectController.deleteProject);

router.post('/getprojectbyempid', projectController.getProjectByempId);

module.exports = router;
