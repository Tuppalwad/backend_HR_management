const { Router } = require('express');
const { getDifferentCount, getAttendanceData, getProjectStatusData } = require('../controller/admindashboard');


const router = Router();


router.get('/getCoutData', getDifferentCount);
router.get('/getattendancedata', getAttendanceData);
router.get('/getprojectdata', getProjectStatusData)

module.exports = router;