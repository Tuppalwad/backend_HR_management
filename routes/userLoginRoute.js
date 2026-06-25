const express = require('express');
const router = express.Router();
const { userLogin,userLogout, changePassword, sendForgotPasswordOTP, verifyForgotPasswordOTP, resetPassword } = require('../controller/userlogin'); // Destructure to get the userLogin function
const authenticateToken = require('../middleware/authenticateToken');

router.post('/signin', userLogin);
router.get('/signout', authenticateToken, userLogout);
router.put('/changepassword', changePassword);  // Route to change password
router.post('/sendforgotpasswordotp', sendForgotPasswordOTP);  // Route to send OTP for forgot password
router.post('/verifyforgotpasswordotp', verifyForgotPasswordOTP);
router.post('/resetpasswordemp', resetPassword);  // Route to reset password

module.exports = router;
