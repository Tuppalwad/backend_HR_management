const {Router} = require('express');
const { logout } = require('../controller/logout');

const router = Router();

router.post('/logout',logout);

module.exports = router;