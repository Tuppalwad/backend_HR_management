const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        // required: true,
        // enum: ['CEO', 'HR', 'ADMIN', 'MANAGER', 'FOUNDER',"CO-FOUNDER"],
    },
    conformEmail: {
        type:Boolean,
        required:true
    },
    gender: {
        type: String,
        enum : ["MALE","FEMALE","OTHER"]
    },
    mobile: {
        type: String,
    },
    education: {
        type: String,
    },
    experience: {
        type: String,
    },
    address: {
        type: String,
    },
    about: {
        type: String,
    },
    profileImage: {
        data: Buffer,
        contentType: String,
    },
    linkedIn: {
        type: String,
    },
    country : {
        type: String,
    },

}, { timestamps: true });

const Admin = mongoose.model('Admin', AdminSchema);
module.exports = Admin;
