const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        // required: true
    },
    lastName: {
        type: String,
        // required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    empId: {
        type: String,
        required: true,
        unique: true
    },
    currentEmpId: {
        type: String,
        required: true,
        unique: true
    },
    gender: {
        type: String,
        required: true,
        enum: ['MALE', 'FEMALE']
    },
    role: {
        type: String,
        required: true
    },
    worktype: {
        type: String,
        required: true,
        enum: ['WFO', 'WFH', "Client Location"]
    },

    shift: {
        type: String,
        required: false,
        // enum: ['Day Shift', 'Evening Shift', 'Night Shift']
    },

    mobile: {
        type: Number,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    OTP: {
        type: Number
    },
    OTPExpiry: {
        type: Date
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    status: {
        type: Boolean,
        default: false
    },
    closedDate: {
        type: Date,
        required: false

    },
    status: {
        type: Boolean,
        default: true
    },
    dateofjoining: {
        type: Date,
        required: false
    },
    employeeType: {
        type: String,
        required: false
    }
    

}, { timestamps: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
