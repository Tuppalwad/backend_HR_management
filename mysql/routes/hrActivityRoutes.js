const { Router } = require('express');
const { getTodayActivities } = require('../controller/hrActivity');

const router = Router();

router.get('/hr-activities/today', getTodayActivities);

module.exports = router;
