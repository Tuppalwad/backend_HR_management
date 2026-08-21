const express = require("express");
const { addadmin, verifyadmin, verifyEmail, getAdminDetails, editAdminDetails, changePassword, getEmployHrAndManager, getManagerList, resetPassword, forgotPassSendEmail, adminLogout } = require("../controller/admin");
const authenticateToken = require("../middleware/authenticateToken");
const router = express.Router();

router.post('/register', addadmin);
router.post('/login', verifyadmin);
router.post('/verifyemail', verifyEmail);
router.post('/getadmin', getAdminDetails);
router.put('/editadmin', editAdminDetails);
router.post('/changepass', authenticateToken, changePassword);
router.post('/logout', authenticateToken, adminLogout);
router.get('/getEmployHrAndManager', getEmployHrAndManager);
router.get('/getmanagerlist', getManagerList);

// admin-side forgot-password flow (matches routes/forgotpassRoute.js in the Mongo-backed app)
router.post('/resetpassword', resetPassword);
router.post('/sendmailforgotpass', forgotPassSendEmail);

module.exports = router;
