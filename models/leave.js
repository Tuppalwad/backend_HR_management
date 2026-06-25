const mongoose = require('mongoose');


const leaves = new mongoose.Schema({
    startDate: {
        type: Date,
        required: true,
    },
    endDate: {
        type: Date,
        required: true,
    },
    type: {
        type: String,
        enum: ['Sick Leave', 'Casual Leave', 'Paid Leave', 'Unpaid Leave', 'Other'],
        required: true,
    },
    reason: {
        type: String,
    },

    numberOfDays: {
        type: Number,
        required: true,
    },

    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected',"Cancelled"],
        default: 'Pending',
    },
});

const leaveSchema = new mongoose.Schema({
    empId:{
        type:String,
        required:true,
        unique:true
    },
    leaves: [leaves],
    
}, { timestamps: true });

const Leave = mongoose.model('Leave', leaveSchema);

module.exports = Leave;
