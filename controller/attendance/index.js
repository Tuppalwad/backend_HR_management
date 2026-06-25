require('dotenv').config()
const userAttendance = require('../../models/attendance');
const workLocation = require('../../models/worklocation');
const Leave = require('../../models/leave');
const { sendErrorResponse, sendSuccessResponse } = require('../../utils/common');
const User = require('../../models/User');
const { addressLat, addressLng, radius } = require('../../constant/latitudeLongitude');
const HOLIDAY_LIST = process.env.HOLIDAY_LIST.split(',');

function calculateDistance(lat1, lon1, lat2, lon2) {
    const toRad = value => (value * Math.PI) / 180;

    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    return distance * 1000; // Convert to meters
}


// Function to check user location
const checkUserLocation = async (empId, latitude, longitude, res) => {
    try {
        const type = await User.findOne({ empId });
        if (!type) {
            sendErrorResponse(res, 400, "User not found");
            return false; // Stop further execution
        }

        if (type.worktype === 'WFO') {
            console.log('worktype', type.worktype);
            const distance = calculateDistance(latitude, longitude, addressLat, addressLng);
            if (!(distance <= radius)) {
                sendErrorResponse(res, 400, "You are not in office area for attendance");
                return false; // Stop further execution
            }
        }

        return true; // Location check passed
    } catch (error) {
        console.log(error);
        sendErrorResponse(res, 500, "Something went wrong", error);
        return false; // Stop further execution
    }
};


exports.setuserAttendance = async (req, res) => {
    const { empId, inTime, outTime, halfDay, longitude, latitude, shift } = req.body;

    const date = new Date().toISOString().split('T')[0]; // Normalize date to the start of the day (midnight)

    try {
        // Validate user location for inTime and outTime
        if (inTime || outTime) {
            const isLocationValid = await checkUserLocation(empId, latitude, longitude, res);
            if (!isLocationValid) {
                return; // Stop further execution if location check failed
            }
        }

        // Find the attendance record for the given user and date
        let attendance = await userAttendance.findOne({ empId });

        const nineAM = new Date(date);
        nineAM.setUTCHours(9, 0, 0, 0);
        const threePM = new Date(date);
        threePM.setUTCHours(15, 0, 0, 0);

        if (inTime) {
            const inTimeDate = new Date(inTime);
            if (shift === 'Day Shift') {
                if (inTimeDate < nineAM) {
                    return sendErrorResponse(res, 400, "In-time must be greater than or equal to 9 AM");
                }
                if (inTimeDate > threePM) {
                    return sendErrorResponse(res, 400, "In-time must be less than or equal to 3 PM");
                }
            } else if (shift === 'Evening Shift') {
                const twoPM = new Date(date);
                twoPM.setUTCHours(14, 0, 0, 0);
                const elevenPM = new Date(date);
                elevenPM.setUTCHours(23, 0, 0, 0);
                if (inTimeDate < twoPM) {
                    return sendErrorResponse(res, 400, "In-time must be greater than or equal to 2 PM");
                }
                if (inTimeDate > elevenPM) {
                    return sendErrorResponse(res, 400, "In-time must be less than or equal to 11 PM");
                }
            } else if (shift === 'Night Shift') {
                const tenPM = new Date(date);
                tenPM.setUTCHours(22, 0, 0, 0);
                const sevenAM = new Date(date);
                sevenAM.setUTCHours(7, 0, 0, 0);
                if (inTimeDate < tenPM) {
                    return sendErrorResponse(res, 400, "In-time must be greater than or equal to 10 PM");
                }
                if (inTimeDate > sevenAM) {
                    return sendErrorResponse(res, 400, "In-time must be less than or equal to 7 AM");
                }
            }

            if (!attendance) {
                attendance = new userAttendance({
                    empId,
                    closedDate: null,
                    attendance: [{
                        inTime: inTimeDate,
                        date: new Date(date),
                        status: 'Absent',
                        halfDay: halfDay || false,
                        latitude,
                        longitude,
                        shift,
                        totalHours: 0,
                    }]
                });
            } else {
                let record = attendance.attendance.find(record => record.date.toISOString().split('T')[0] === date);
                if (record) {
                    record.inTime = inTimeDate;
                    record.status = 'Absent';
                    record.halfDay = halfDay || false;
                    record.latitude = latitude;
                    record.longitude = longitude;
                    record.shift = shift;
                    record.totalHours = 0;
                } else {
                    attendance.attendance.push({
                        inTime: inTimeDate,
                        date: new Date(date),
                        status: 'Absent',
                        halfDay: halfDay || false,
                        latitude,
                        longitude,
                        shift,
                        totalHours: 0
                    });
                }
            }
        } else if (outTime) {
            const outTimeDate = new Date(outTime);
            if (attendance) {
                let record = attendance.attendance.find(record => record.date.toISOString().split('T')[0] === date);
                if (record) {
                    if (record.inTime) {
                        const difference = outTimeDate - record.inTime;
                        const hoursDifference = difference / (1000 * 60 * 60);

                        if (hoursDifference < 8) {
                            return sendErrorResponse(res, 400, "Working hours should not be less than 8 hours");
                        }

                        record.outTime = outTimeDate;
                        record.status = 'Present';
                        record.halfDay = halfDay || record.halfDay;
                        record.latitude = latitude;
                        record.longitude = longitude;
                        record.shift = shift;
                        record.totalHours = hoursDifference;
                    } else {
                        return sendErrorResponse(res, 400, "In-time record not found for the given date");
                    }
                } else {
                    return sendErrorResponse(res, 400, "Attendance record not found for the given date");
                }
            } else {
                return sendErrorResponse(res, 400, "Attendance record not found for the given date");
            }
        }

        await attendance.save();
        return sendSuccessResponse(res, 200, "Attendance updated successfully", attendance);

    } catch (err) {
        console.log(err);
        if (err.message === 'Please set working location' || err.message === 'You are not within the allowed location for attendance') {
            return sendErrorResponse(res, 400, err.message);
        } else if (err.name === 'ValidationError') {
            return sendErrorResponse(res, 400, "Validation error", err.errors);
        }
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
};


// check today inTime did or not
exports.checkInTime = async (req, res) => {
    const { empId } = req.body;
    const date = new Date().toISOString().split('T')[0]; // Normalize date to the start of the day (midnight)
    try {
        const attendance = await userAttendance.findOne({ empId });

        if (attendance) {
            const record = attendance.attendance.find(record => record.date.toISOString().split('T')[0] === date);
            if (record && record.inTime) {
                return sendSuccessResponse(res, 200, "In-time recorded for today", { inTime: true });
            }
            else {
                return sendSuccessResponse(res, 200, "In-time not recorded for today", { inTime: false });
            }
        }

        return sendErrorResponse(res, 404, "In-time not recorded for today", { inTime: false });
    } catch (err) {
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
}


exports.checkOutTime = async (req, res) => {
    const { empId } = req.body;

    const date = new Date().toISOString().split('T')[0]; // Normalize date to the start of the day (midnight)

    try {
        const attendance = await userAttendance.findOne({ empId });
        if (attendance) {
            const record = attendance.attendance.find(record => record.date.toISOString().split('T')[0] === date);
            if (record && record.outTime) {
                return sendSuccessResponse(res, 200, "Out-time recorded for today", { outTime: true });
            }
            else {
                return sendSuccessResponse(res, 200, "Out-time not recorded for today", { outTime: false });
            }
        }

        return sendErrorResponse(res, 404, "Out-time not recorded for today", { outTime: false });
    } catch (err) {
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
}



// Function to update attendance for absent users
// exports.updateAttendanceForAbsentUsers = async () => {
//     const today = new Date();
//     const todayDate = today.toISOString().split('T')[0];  // Get date in YYYY-MM-DD format
//     const todayFormatted = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;  // Get date in DD-MM-YYYY format

//     const isWeekend = today.getDay() === 0 || today.getDay() === 6;  // 0 is Sunday, 6 is Saturday
//     const isHoliday = HOLIDAY_LIST.includes(todayFormatted);

//     try {
//         // Get users who do not have any attendance records for today
//         const absentUsers = await userAttendance.find({});

//         for (let attendance of absentUsers) {
//             let record = attendance.attendance.find(record => record.date.toISOString().split('T')[0] === todayDate);
//             if (record) {
//                 if (isWeekend || isHoliday) {
//                     // Set attendance to "Holiday" for weekends and holidays
//                     record.status = 'Holiday';
//                 } else {
//                     // Check if the user is on leave
//                     const leave = await Leave.findOne({
//                         user: attendance.user,
//                         startDate: { $lte: todayDate },
//                         endDate: { $gte: todayDate },
//                         status: 'Approved'
//                     });

//                     if (leave) {
//                         // Set attendance to "Leave"
//                         record.status = 'Leave';
//                     } else {
//                         // Set attendance to "Absent"
//                         record.status = 'Absent';
//                     }
//                 }

//                 // Save the updated attendance record
//                 await attendance.save();
//             }
//             else{
//                 record.status = 'Absent';
//                 await attendance.save();
//             }
//         }



//         console.log("Attendance updated for absent users.");
//     } catch (err) {
//         console.error("Error updating attendance:", err);
//     }
// };

exports.updateAttendanceForAbsentUsers = async () => {
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const todayFormatted = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`; // DD-MM-YYYY format

    const isWeekend = today.getDay() === 0 || today.getDay() === 6; // 0 = Sunday, 6 = Saturday
    const isHoliday = HOLIDAY_LIST.includes(todayFormatted);

    try {
        // Get all users' attendance records
        const absentUsers = await userAttendance.find({});


        for (let attendance of absentUsers) {
            // Check if the user has a "Present" record for today
            const hasPresentRecord = attendance.attendance.some(
                record => record.date.toISOString().split('T')[0] === todayDate && record.status === "Present"
            );
            const status = (await User.findOne({ empId: attendance.empId })).status;

            if (hasPresentRecord || status) {
                // Skip processing if user is already marked "Present" today
                continue;
            }

            // Find today's attendance record if exists
            let record = attendance.attendance.find(
                record => record.date.toISOString().split('T')[0] === todayDate
            );

            if (!record) {
                // If no record for today, create a new one
                const shift = (await User.findOne({ empId: attendance.empId })).shift;

                if (!shift) {
                    continue; // Skip if user has no shift assigned
                }

                record = {
                    date: new Date(todayDate),
                    status: isWeekend || isHoliday ? 'Holiday' : 'Absent',
                    shift: shift,
                    totalHours: 0,
                    inTime: 0,
                    outTime: 0
                };
                attendance.attendance.push(record);
            }

            if (!isWeekend && !isHoliday && record.status !== 'Leave') {
                // Check if the user is on leave
                const leave = await Leave.findOne({
                    user: attendance.user,
                    startDate: { $lte: todayDate },
                    endDate: { $gte: todayDate },
                    status: 'Approved'
                });

                if (leave) {
                    // Update status to "Leave"
                    record.status = 'Leave';
                } else {
                    // Mark as "Absent" if no leave found
                    record.status = 'Absent';
                }
            }

            // Save the updated attendance record
            await attendance.save();
        }

        console.log("Attendance updated for absent users.");
    } catch (err) {
        console.error("Error updating attendance:", err);
    }
};




// get all employee today attendance 

exports.getEmployeeAttendanceToday = async (req, res) => {
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];  // Get date in YYYY-MM-DD format

    try {
        // Aggregate to match today's attendance and join with employee details
        const todayAttendance = await userAttendance.aggregate([
            {
                $match: { 'attendance.date': new Date(todayDate) }
            },
            {
                $match: { 'status': false }
            },
            {
                $unwind: '$attendance'
            },
            {
                $match: { 'attendance.date': new Date(todayDate) }
            },
            {
                $lookup: {
                    from: 'users', // Collection name is 'users', not 'user'
                    localField: 'empId',
                    foreignField: 'empId',
                    as: 'employeeDetails'
                }
            },
            {
                $unwind: '$employeeDetails'
            },
            {
                $project: {
                    empId: 1,
                    'inTime': '$attendance.inTime',
                    'outTime': '$attendance.outTime',
                    'status': '$attendance.status',
                    'halfDay': '$attendance.halfDay',
                    'shift': '$attendance.shift',
                    'fullName': '$employeeDetails.fullName',
                    'totalHours': '$attendance.totalHours'
                }
            }
        ]);

        if (!todayAttendance.length) {
            return sendErrorResponse(res, 404, "Attendance records not found for today");
        }

        return sendSuccessResponse(res, 200, "Employee attendance for today", todayAttendance);
    } catch (err) {
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
}


// get emp attendance monthly report
exports.getEmployeeAttendanceMonthly = async (req, res) => {
    const { month, year } = req.body;
    const startDate = new Date(year, month - 1, 1); // Start of the given month
    const endDate = new Date(year, month, 1); // Start of the next month

    try {
        // Aggregate attendance records for all employees for the given month and year
        const monthlyAttendance = await userAttendance.aggregate([
            {
                $unwind: '$attendance'
            },
            {
                $match: {
                    'attendance.date': {
                        $gte: startDate,
                        $lt: endDate
                    }
                }
            },
            {
                $lookup: {
                    from: 'users', // Collection name
                    localField: 'empId',
                    foreignField: 'empId',
                    as: 'employeeDetails'
                }
            },
            {
                $unwind: '$employeeDetails'
            },
            {
                $group: {
                    _id: '$empId',
                    fullName: { $first: '$employeeDetails.fullName' },
                    attendanceRecords: { $push: '$attendance' }
                }
            },
            {
                $project: {
                    empId: '$_id',
                    fullName: 1,
                    attendanceRecords: 1
                }
            }
        ]);

        if (!monthlyAttendance.length) {
            return sendErrorResponse(res, 404, "No attendance records found for the given month and year");
        }

        return sendSuccessResponse(res, 200, "Employee attendance for the given month", monthlyAttendance);
    } catch (err) {
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
}



exports.getEmployeeAttendanceReport = async (req, res) => {
    const { empId } = req.body;

    try {
        // Aggregate attendance records for the given employee
        const employeeAttendance = await userAttendance.aggregate([
            {
                $match: { empId }
            },
            {
                $unwind: '$attendance'
            },
            {
                $lookup: {
                    from: 'users', // Collection name
                    localField: 'empId',
                    foreignField: 'empId',
                    as: 'employeeDetails'
                }
            },
            {
                $unwind: '$employeeDetails'
            },
            {
                $group: {
                    _id: '$empId',
                    fullName: { $first: '$employeeDetails.fullName' },
                    totalLeave: {
                        $sum: {
                            $cond: [{ $eq: ['$attendance.status', 'Leave'] }, 1, 0]
                        }
                    },
                    present: {
                        $sum: {
                            $cond: [{ $eq: ['$attendance.status', 'Present'] }, 1, 0]
                        }
                    },
                    absent: {
                        $sum: {
                            $cond: [{ $eq: ['$attendance.status', 'Absent'] }, 1, 0]
                        }
                    },
                    medicalLeave: {
                        $sum: {
                            $cond: [{ $eq: ['$attendance.status', 'Medical Leave'] }, 1, 0]
                        }
                    },
                    avgWorkingTime: {
                        $avg: '$attendance.totalHours'
                    },
                    avgInTime: {
                        $avg: {
                            $cond: [{ $ne: ['$attendance.inTime', null] }, '$attendance.inTime', null]
                        }
                    },
                    avgOutTime: {
                        $avg: {
                            $cond: [{ $ne: ['$attendance.outTime', null] }, '$attendance.outTime', null]
                        }
                    },
                    // attendanceRecords: { $push: '$attendance' }
                }
            },
            {
                $project: {
                    empId: '$_id',
                    fullName: 1,
                    totalLeave: 1,
                    present: 1,
                    absent: 1,
                    medicalLeave: 1,
                    avgWorkingTime: 1,
                    avgInTime: 1,
                    avgOutTime: 1,
                }
            }
        ]);

        if (!employeeAttendance.length) {
            return sendErrorResponse(res, 404, "No attendance records found for the given employee");
        }

        return sendSuccessResponse(res, 200, "Employee attendance report", employeeAttendance[0]);
    }
    catch (err) {
        sendErrorResponse(res, 500, "Something went wrong", err);
    }

}


// get muntholy attendance arry on empi id 
exports.getMonthlyAttendance = async (req, res) => {
    const { empId, month, year } = req.body;

    // Correct month handling for date filtering
    // Subtract 1 from the month to correctly match JavaScript's Date object indexing (0-based)
    const startDate = new Date(year, month - 1, 1); // Start of the given month
    const endDate = new Date(year, month, 1); // Start of the next month

    // console.log('Start Date:', startDate);
    // console.log('End Date:', endDate);

    try {
        // Aggregate attendance records for the given employee
        const employeeAttendance = await userAttendance.aggregate([
            {
                $match: { empId },
            },
            {
                $unwind: '$attendance',
            },
            {
                $match: {
                    'attendance.date': {
                        $gte: startDate,
                        $lt: endDate, // Use the start of the next month to filter attendance records correctly
                    },
                },
            },
            {
                $lookup: {
                    from: 'users', // Collection name
                    localField: 'empId',
                    foreignField: 'empId',
                    as: 'employeeDetails',
                },
            },
            {
                $unwind: '$employeeDetails',
            },
            {
                $group: {
                    _id: '$empId',
                    fullName: { $first: '$employeeDetails.fullName' },
                    attendanceRecords: { $push: '$attendance' },
                },
            },
            {
                $project: {
                    empId: '$_id',
                    fullName: 1,
                    attendanceRecords: 1,
                },
            },
        ]);

        if (!employeeAttendance.length) {
            return sendErrorResponse(res, 404, 'No attendance records found for the given employee');
        }

        return sendSuccessResponse(res, 200, 'Employee attendance report', employeeAttendance[0]);
    } catch (err) {
        sendErrorResponse(res, 500, 'Something went wrong', err);
    }
};
