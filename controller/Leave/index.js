const Leave = require('../../models/leave');
const { sendErrorResponse, sendSuccessResponse } = require('../../utils/common');
const { sendEmail } = require('../../utils/emailService');
const User = require('../../models/User');
const leaveHtmlText = require('../../utils/htmlText/leaveHtmlText');
const { acceptLeaveHtml, rejectLeaveHtml } = require('../../utils/htmlText/leaverequestHtml');
const { sendPushNotification } = require('../notification');
// Create a new leave request
// exports.setLeave = async (req, res) => {
//     const { empId, startDate, endDate, type, reason, name, hrEmail, managerEmail } = req.body;

//     try {
//         // Validate request parameters
//         if (!empId || !startDate || !endDate || !type || !reason || !name || !hrEmail || !managerEmail) {
//             return sendErrorResponse(res, 400, "User, start date, end date, and type are required");
//         }

//         if (new Date(startDate) > new Date(endDate)) {
//             return sendErrorResponse(res, 400, "Start date must be before the end date");
//         }

//         let user = await Leave.findOne({ empId });

//         // get count of leaves and make objet liek this 
//         // {
//         //     "Sick_Leave":0,
//         //     "Casual_Leave":0,
//         //     "Paid_Leave":0,
//         //     "Unpaid_Leave":0,
           
//         // }



//         if (!user) {
//             // If the user doesn't exist, create a new leave record
//             user = new Leave({
//                 empId,
//                 leaves: [{
//                     startDate,
//                     endDate,
//                     type,
//                     reason,
//                     status: 'Pending',
//                     numberOfDays: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
                    
//                 }]
//             });
//             await user.save();
//         } else {
//             // If the user exists, add the leave to their existing record
//             user.leaves.push({
//                 startDate,
//                 endDate,
//                 type,
//                 reason,
//                 status: 'Pending',
//                 numberOfDays: Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1
//             });
//             await user.save();
//         }

//         // Get the newly created leave ID
//         const leaveId = user.leaves[user.leaves.length - 1]._id;

//         // Prepare the email content
//         let htmlContent = leaveHtmlText(name, type, reason, leaveId, empId);
//         const subject = 'New Leave Request';

//         // Send email to HR and Manager
//         await sendEmail([hrEmail, managerEmail], subject, htmlContent);

//         return sendSuccessResponse(res, 200, "Leave request submitted successfully");

//     } catch (err) {
//         console.log(err);
//         if (err.name === 'ValidationError') {
//             return sendErrorResponse(res, 500, "Validation Error", err);
//         }
//         return sendErrorResponse(res, 500, "Something went wrong", err);
//     }
// };

exports.setLeave = async (req, res) => {
    const { empId, startDate, endDate, type, reason, name, hrEmail, managerEmail } = req.body;

    try {
        // Validate request parameters
        if (!empId || !startDate || !endDate || !type || !reason || !name || !hrEmail || !managerEmail) {
            return sendErrorResponse(res, 400, "User, start date, end date, and type are required");
        }

        // Ensure the start date is before the end date
        if (new Date(startDate) > new Date(endDate)) {
            return sendErrorResponse(res, 400, "Start date must be before the end date");
        }

        // Check if the employee exists in the leave collection
        let user = await Leave.findOne({ empId });

        // Maximum leave limit for an employee
        const MAX_LEAVE_LIMIT = 20;

        if (user) {
            // Calculate the total number of leaves taken by the employee
            const totalLeavesTaken = user.leaves.reduce((total, leave) => {
                return total + leave.numberOfDays;
            }, 0);

            // Check if the employee has exceeded the leave limit
            if (totalLeavesTaken >= MAX_LEAVE_LIMIT) {
                return sendErrorResponse(res, 400, "You have exceeded the maximum leave limit of 20 days");
            }
        }

        // Allow only paid leave requests
        if (type !== 'Paid_Leave') {
            return sendErrorResponse(res, 400, "You can only apply for paid leave");
        }

        // Calculate the number of days for the leave request
        const numberOfDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

        if (!user) {
            // If the user doesn't exist, create a new leave record
            user = new Leave({
                empId,
                leaves: [{
                    startDate,
                    endDate,
                    type,
                    reason,
                    status: 'Pending',
                    numberOfDays
                }]
            });
            await user.save();
        } else {
            // If the user exists, add the leave to their existing record
            user.leaves.push({
                startDate,
                endDate,
                type,
                reason,
                status: 'Pending',
                numberOfDays
            });
            await user.save();
        }

        // Get the newly created leave ID
        const leaveId = user.leaves[user.leaves.length - 1]._id;

        // Prepare the email content
        let htmlContent = leaveHtmlText(name, type, reason, leaveId, empId);
        const subject = 'New Leave Request';

        // Send email to HR and Manager
        await sendEmail([hrEmail, managerEmail], subject, htmlContent);

        return sendSuccessResponse(res, 200, "Leave request submitted successfully");

    } catch (err) {
        console.log(err);
        if (err.name === 'ValidationError') {
            return sendErrorResponse(res, 500, "Validation Error", err);
        }
        return sendErrorResponse(res, 500, "Something went wrong", err);
    }
};


exports.LeaveStatus = async (req, res) => {
    const { leaveId, empId, status, rejectReson } = req.body;


    try {
        // Validate request parameters
        if (!leaveId) {
            return sendErrorResponse(res, 400, "Leave ID is required");
        }

        // Find the leave request to be approved
        const employee = await Leave.findOne({ empId });

        if (!employee) {
            return sendErrorResponse(res, 400, "employee  not found");
        }

        const leave = employee.leaves.find(leave => leave._id == leaveId);

        if (!leave) {
            return sendErrorResponse(res, 400, "Leave request not found");
        }

        // check if the leave request has cancel status
        if (leave.status === 'Cancelled') {
            return sendErrorResponse(res, 400, "Leave request has been cancelled");
        }

        // Update the leave request status
        leave.status = status

        // sende mails according to the status

        const check = await User.findOne({ empId: empId });

        if (!check) {
            return sendErrorResponse(res, 400, "Employee not found");
        }
        const body = `Your Leave request ${status}`


        if (status === 'Approved') {
            const email = check.email;
            const subject = 'Leave Request Approved';
            const htmlContent = acceptLeaveHtml(check.fullName, leave.type, leave.startDate, leave.endDate);
            await sendEmail([email], subject, htmlContent);

        } else if (status === 'Rejected') {
            const email = check.email;
            const subject = 'Leave Request Rejected';
            const htmlContent = rejectLeaveHtml(check.fullName, leave.type, leave.startDate, leave.endDate, rejectReson);
            await sendEmail([email], subject, htmlContent);
        }
        
        sendPushNotification(empId,"Leave request Status",body)

        // Save the updated leave request
        await employee.save();

        return sendSuccessResponse(res, 200, "Leave request approved successfully", leave);

    } catch (err) {

        console.log(err, "err");
        if (err.name === 'ValidationError') {
            return sendErrorResponse(res, 500, "Something went wrong", err);
        }
        return sendErrorResponse(res, 500, "Something went wrong", err);

    }
}


exports.checkEmpOnLeave = async (req, res) => {
    const empId = req.empId;
    const date = new Date();

    

    try {
        if (!empId) {
            return sendErrorResponse(res, 400, "Employee ID is required");
        }

        const employee = await Leave.findOne({ empId });
        console.log(employee, 'kkkk');

        if (!employee) {
            return sendSuccessResponse(res, 200, "Employee is not on leave");
        }

        let currentDate = date.toISOString().split('T')[0];
        let check = employee.leaves.find(leave => 
            leave.startDate.toISOString().split('T')[0] <= currentDate &&
            leave.endDate.toISOString().split('T')[0] >= currentDate &&
            leave.status !== 'Cancelled'
        );

        console.log(check, 'kkkd');

        let status = false;

        if (!check) {
            return sendSuccessResponse(res, 200, "Employee is not on leave", status);
        }

        if (check.status === 'Cancelled') {
            return sendSuccessResponse(res, 200, "Employee is not on leave", { status: false, check });
        }

        return sendSuccessResponse(res, 200, "Employee is on leave", { status: true, check });

    } catch (err) {
        if (err.name === 'ValidationError') {
            return sendErrorResponse(res, 500, "Something went wrong", err);
        }
        return sendErrorResponse(res, 500, "Something went wrong", err);
    }
};




// Reject a leave request
exports.rejectLeave = async (req, res) => {
    const { leaveId, empId } = req.body;

    try {
        // Validate request parameters
        if (!leaveId) {
            return sendErrorResponse(res, 400, "Leave ID is required");
        }


        const employee = await Leave.findOne({ empId });

        if (!employee) {
            return sendErrorResponse(res, 400, "employee  not found");
        }

        const leave = employee.leaves.find(leave => leave._id == leaveId);

        if (!leave) {
            return sendErrorResponse(res, 400, "Leave request not found");
        }


        if (leave.status === 'Cancelled') {
            return sendErrorResponse(res, 400, "Leave request has been cancelled");
        }

        // Update the leave request status
        leave.status = 'Rejected';

        // Save the updated leave request
        await employee.save();


        // Send email to the user
        sendEmail(leave.empId, 'Leave Request Rejected', 'Your leave request has been rejected');

        return sendSuccessResponse(res, 200, "Leave request rejected successfully", leave);
    } catch (err) {
        if (err.name === 'ValidationError') {
            return sendErrorResponse(res, 500, "Something went wrong", err);
        }
        return sendErrorResponse(res, 500, "Something went wrong", err);

    }
};



// Cancel a leave request
exports.cancelLeave = async (req, res) => {
    const { leaveId, empId } = req.body;

    console.log(leaveId, "leaveId");
    try {
        // Validate request parameters
        if (!leaveId) {
            return sendErrorResponse(res, 400, "Leave ID is required");
        }

        const employee = await Leave.findOne({ empId });

        if (!employee) {
            return sendErrorResponse(res, 400, "employee  not found");
        }

        const leave = employee.leaves.find(leave => leave._id == leaveId);

        if (!leave) {
            return sendErrorResponse(res, 400, "Leave request not found");
        }

        // Update the leave request status
        leave.status = 'Cancelled';

        // Save the updated leave request
        await employee.save();

        return sendSuccessResponse(res, 200, "Leave request cancelled successfully", leave);


    } catch (err) {
        if (err.name === 'ValidationError') {
            return sendErrorResponse(res, 500, "Something went wrong", err);
        }
        return sendErrorResponse(res, 500, "Something went wrong", err);

    }

};

// Edit an existing leave request
exports.editLeave = async (req, res) => {

    const { leaveId, startDate, endDate, type, reason } = req.body;

    try {
        // Validate request parameters
        if (!leaveId || !startDate || !endDate || !type || !reason) {
            return sendErrorResponse(res, 400, "Leave ID, start date, end date, and type are required");
        }

        if (new Date(startDate) > new Date(endDate)) {
            return sendErrorResponse(res, 400, "Start date must be before to end date");
        }

        // Find the leave request to be edited
        const leave = await Leave.findById(leaveId);

        if (!leave) {
            return sendErrorResponse(res, 400, "Leave request not found");
        }

        // Update the leave request details
        leave.startDate = startDate;
        leave.endDate = endDate;
        leave.type = type;
        leave.reason = reason;
        leave.numberOfDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;
        // Save the updated leave request
        await leave.save();

        return sendSuccessResponse(res, 200, "Leave request updated successfully", leave);

    } catch (err) {
        if (err.name === 'ValidationError') {
            return sendErrorResponse(res, 500, "Something went wrong", err);
        }
        return sendErrorResponse(res, 500, "Something went wrong", err);

    }
};



// get all leave request
exports.getAllLeave = async (req, res) => {
    try {
        // Aggregate leave data and join with user details
        const leave = await Leave.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'empId',
                    foreignField: 'empId',
                    as: 'user'
                }
            },
            {
                $unwind: '$user'
            },
            {
                $project: {
                    _id: 0,
                    leaves: {
                        $map: {
                            input: "$leaves",
                            as: "leave",
                            in: {
                                empId: "$empId",
                                fullName: "$user.fullName",
                                startDate: "$$leave.startDate",
                                endDate: "$$leave.endDate",
                                type: "$$leave.type",
                                reason: "$$leave.reason",
                                status: "$$leave.status",
                                _id: "$$leave._id"
                            }
                        }
                    }
                }
            },
            {
                $unwind: "$leaves"
            },
            {
                $replaceRoot: { newRoot: "$leaves" }
            }
        ]);

        return sendSuccessResponse(res, 200, "All leave request", leave);

    } catch (err) {
        return sendErrorResponse(res, 500, "Something went wrong", err);
    }
}
