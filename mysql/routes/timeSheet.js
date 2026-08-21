const express = require('express');
const router = express.Router();
const timeSheetController = require('../controller/timesheet');

router.post('/timesheet', timeSheetController.createTimeSheet);
router.post('/timesheet/check', timeSheetController.checkTimeSheetStatusOnDate);
router.get('/timesheets', timeSheetController.getAllTimeSheets);
router.get('/timesheet/:id', timeSheetController.getTimeSheetById);
router.put('/timesheet/:id', timeSheetController.updateTimeSheet);
router.delete('/timesheet/:id', timeSheetController.deleteTimeSheet);

module.exports = router;
