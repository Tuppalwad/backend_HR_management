const express = require('express');
const { sendNotification, saveFcmToken } = require('../controller/notification');
const { route } = require('express/lib/application');
const router = express.Router();

// POST route for sending push notifications
router.post('/send', sendNotification);
router.post('/save', saveFcmToken);

module.exports = router;
