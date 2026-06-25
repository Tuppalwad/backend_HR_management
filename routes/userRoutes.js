// routes/userRoute.js
const express = require("express");
const { addUser, editUser, deleteUser, getUser, getAllUsers, closeAccount } = require("../controller/user");
const router = express.Router();

router.post('/adduser', addUser);
router.put('/edituser', editUser);  
router.delete('/deleteuser', deleteUser);  
router.get('/getuser', getUser);  
router.get('/getallusers', getAllUsers); 
router.get('/closeaccount', closeAccount); 


module.exports = router;
