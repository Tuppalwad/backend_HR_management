const express = require("express");
const { addadmin, verifyadmin, verifyEmail, getAdminDetails, editAdminDetails, changePassword, getEmployHrAndManager, getManagerList } = require("../controller/admin");
const authenticateToken = require("../middleware/authenticateToken");
const router = express.Router();

router.post('/register',addadmin);
router.post('/login',verifyadmin);
router.post('/verifyemail',verifyEmail);
router.post('/getadmin',getAdminDetails);
router.put('/editadmin',editAdminDetails);
router.post('/changepass',authenticateToken, changePassword);
router.get('/getEmployHrAndManager', getEmployHrAndManager);
router.get('/getmanagerlist',getManagerList)

module.exports = router