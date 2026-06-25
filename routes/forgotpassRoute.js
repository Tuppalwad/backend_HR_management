const {Router}=require('express');
const { resetPassword ,forgotPassSendEmail} = require('../controller/admin');
const router=Router();

router.post('/resetpassword',resetPassword  );
router.post('/sendmailforgotpass',forgotPassSendEmail);

module.exports=router;