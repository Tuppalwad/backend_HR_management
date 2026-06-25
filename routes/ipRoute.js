const {Router}= require('express');

const router = Router();
const { getIpAddress } = require('../controller/getIp/getipaddress');

router.get('/ip', getIpAddress);

module.exports = router;