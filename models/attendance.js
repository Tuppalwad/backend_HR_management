const mongoose = require('mongoose');

const attendanceRecordSchema = new mongoose.Schema({

    inTime: {
        type: Date,
    },
    outTime: {
        type: Date,
    },
    date: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ["Present", "Absent", "Leave", "Holiday"],
    },
    latitude: {
        type: Number
    },
    longitude: {
        type: Number
    },
    halfDay: {
        type: Boolean,
        default: false
    },
    shift: {
        type: String,
        required: true,
        enum: ["Evening Shift", "Day Shift", "Night Shift"],
    },
    totalHours: {
        type: Number
    },

}, { timestamps: true });

const attendanceSchema = new mongoose.Schema({
    empId: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: Boolean,
        default: false
    },
    closedDate: {
        type: Date,
        required: false
    },
    attendance: [attendanceRecordSchema]
});

const userAttendance = mongoose.model('Attendance', attendanceSchema);

module.exports = userAttendance;
