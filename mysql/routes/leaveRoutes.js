// rejectLeave was never wired to a route in the original either (commented out) — not ported,
// same as controller/userdocument and the standalone controller/logout in sub-phase 4b.
const { Router } = require('express');
const { setLeave, editLeave, cancelLeave, checkEmpOnLeave, getAllLeave, LeaveStatus } = require('../controller/leave');

const router = Router();

router.post('/setleave', setLeave);
router.put('/editLeave', editLeave);
router.post('/cancelLeave', cancelLeave);
router.get('/checkonleave', checkEmpOnLeave);
router.get('/getallLeave', getAllLeave);
router.post('/leaveStatus', LeaveStatus);

module.exports = router;
