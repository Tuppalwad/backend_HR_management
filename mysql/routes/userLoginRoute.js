const express = require('express');
const router = express.Router();
const { userLogin, userLogout, changePassword, sendForgotPasswordOTP, verifyForgotPasswordOTP, resetPassword } = require('../controller/userlogin');
const authenticateToken = require('../middleware/authenticateToken');

router.post('/signin', userLogin);
router.get('/signout', authenticateToken, userLogout);
router.put('/changepassword', changePassword);
router.post('/sendforgotpasswordotp', sendForgotPasswordOTP);
router.post('/verifyforgotpasswordotp', verifyForgotPasswordOTP);
router.post('/resetpasswordemp', resetPassword);

module.exports = router;
