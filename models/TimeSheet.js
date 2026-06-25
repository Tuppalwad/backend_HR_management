const mongoose = require('mongoose');

const timeSheetSchema = new mongoose.Schema({
    empId: {
        type: String,
        required: true,
        unique: true
    },
    timeSheets: [
        {
            date: {
                type: Date,
                required: true
            },
            breakStartTime: {
                type: Date,
                required: true
            },
            breakEndTime: {
                type: Date,
                required: true
            },
            hoursWorked: {
                type: Number,
                required: true
            },
            pendingTasks: {
                type: String,
                required: true
            },
            completedTasks: {
                type: String,
                required: true
            },
            upcomingTasks: {
                type: String,
                required: false
            },
            listOfmanager: {
                type: Array,
                require: true
            }
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model('TimeSheet', timeSheetSchema);
