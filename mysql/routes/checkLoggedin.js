const { Router } = require('express');
const { checkLoggedin } = require('../controller/checkLoggedin');

const router = Router();

router.get('/checkLoggedin', checkLoggedin);

module.exports = router;
