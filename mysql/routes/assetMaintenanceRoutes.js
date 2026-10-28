const express = require('express');
const { addMaintenanceRecord, updateMaintenanceRecord, getMaintenanceHistory } = require('../controller/assetMaintenance');
const router = express.Router();

router.post('/add', addMaintenanceRecord);
router.put('/update', updateMaintenanceRecord);
router.get('/get', getMaintenanceHistory);

module.exports = router;
