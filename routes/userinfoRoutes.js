const { Router } = require('express');
const { getuserInfo, setOrUpdateUserInfo, getAllEmployeeinfo, updateUserInfoStatus, searchUserInfo } = require('../controller/userinfo');
const router = Router();


router.post('/userinfo', setOrUpdateUserInfo);
router.post('/getuserinfo', getuserInfo)
router.get('/getallemployeeinfo', getAllEmployeeinfo)
router.post('/updateuserinfostatus', updateUserInfoStatus)
router.get('/searchinfo', searchUserInfo)

module.exports = router;