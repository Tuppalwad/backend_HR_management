

const {Router} = require('express')
const { sendMailToall } = require('../controller/mailservice')

const router = Router()

router.post('/sendmaitoall',sendMailToall);
module.exports  = router;