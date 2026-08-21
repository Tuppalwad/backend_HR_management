const express = require('express');
const { setuserAttendance, checkInTime, checkOutTime, getEmployeeAttendanceToday, getEmployeeAttendanceReport, getMonthlyAttendance, getEmployeeAttendanceMonthly } = require('../controller/attendance');
const router = express.Router();

router.post('/attendance', setuserAttendance);
router.post('/checkIntimetoday', checkInTime);
router.post('/checkOuttimetoday', checkOutTime);
router.get('/getemployeeattendanceToday', getEmployeeAttendanceToday);
router.post('/getemployeeattendanceinfo', getEmployeeAttendanceReport);
router.post('/getempMonthlyAttendance', getMonthlyAttendance);
router.post('/getempMonthlyAttendanceAdmin', getEmployeeAttendanceMonthly)

module.exports = router;
