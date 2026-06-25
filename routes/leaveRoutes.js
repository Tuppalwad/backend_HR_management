const { Router } = require('express');
const { setLeave, editLeave, cancelLeave, checkEmpOnLeave, getAllLeave, LeaveStatus } = require('../controller/Leave');

const router = Router();

router.post('/setleave', setLeave);
router.put('/editLeave', editLeave);
router.post('/cancelLeave', cancelLeave);
router.get('/checkonleave', checkEmpOnLeave);
// router.post('/acceptleave', acceptLeave);
// router.post('/rejectleave', rejectLeave);
router.get('/getallLeave', getAllLeave);
router.post('/leaveStatus', LeaveStatus);

module.exports = router;