const mongoose = require('mongoose');



const FcmToken = new mongoose.Schema({
    empId: { type: String, required: true, unique: true },
    fcmToken: { type: String, required: true },
});


module.exports = mongoose.model('FcmToken', FcmToken);
