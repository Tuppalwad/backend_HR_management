const express = require('express');
const router = express.Router();
const timeSheetController = require('../controller/TimeSheet');

// Create a new timesheet
router.post('/timesheet', timeSheetController.createTimeSheet);

router.post('/timesheet/check', timeSheetController.checkTimeSheetStatusOnDate);
// Get all timesheets
router.get('/timesheets', timeSheetController.getAllTimeSheets);

// Get a single timesheet by ID
router.get('/timesheet/:id', timeSheetController.getTimeSheetById);

// Update a timesheet
router.put('/timesheet/:id', timeSheetController.updateTimeSheet);

// Delete a timesheet
router.delete('/timesheet/:id', timeSheetController.deleteTimeSheet);

module.exports = router;
