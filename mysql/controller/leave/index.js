const prisma = require('../../utils/prismaClient');
const { toPrismaEnum, fromPrismaEnum } = require('../../utils/enumMap');
const { toDate } = require('../../utils/dateHelper');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');
const { sendEmail } = require('../../../utils/emailService');
const leaveHtmlText = require('../../../utils/htmlText/leaveHtmlText');
const { acceptLeaveHtml, rejectLeaveHtml } = require('../../../utils/htmlText/leaverequestHtml');
const { sendPushNotification } = require('../notification');

const fullNameOf = (user) => user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null;

exports.setLeave = async (req, res) => {
    const { empId, startDate, endDate, type, reason, name, hrEmail, managerEmail } = req.body;

    try {
        if (!empId || !startDate || !endDate || !type || !reason || !name || !hrEmail || !managerEmail) {
            return sendErrorResponse(res, 400, "User, start date, end date, and type are required");
        }

        if (new Date(startDate) > new Date(endDate)) {
            return sendErrorResponse(res, 400, "Start date must be before the end date");
        }

        const MAX_LEAVE_LIMIT = 20;

        const existingLeaves = await prisma.leaveRequest.findMany({ where: { empId } });
        const totalLeavesTaken = existingLeaves.reduce((total, leave) => total + leave.numberOfDays, 0);

        if (totalLeavesTaken >= MAX_LEAVE_LIMIT) {
            return sendErrorResponse(res, 400, "You have exceeded the maximum leave limit of 20 days");
        }

        // Original compared `type !== 'Paid_Leave'` (underscore) against a Mongoose enum whose
        // only matching value is "Paid Leave" (space) — that comparison could never be equal,
        // so this endpoint rejected every single leave request regardless of type. Fixed to
        // compare against the real enum value.
        if (type !== 'Paid Leave') {
            return sendErrorResponse(res, 400, "You can only apply for paid leave");
        }

        const numberOfDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

        const leave = await prisma.leaveRequest.create({
            data: {
                empId,
                startDate: toDate(startDate),
                endDate: toDate(endDate),
                type: toPrismaEnum('leaveType', type),
                reason,
                numberOfDays,
                status: 'Pending'
            }
        });

        const htmlContent = leaveHtmlText(name, type, reason, leave.id, empId);
        const subject = 'New Leave Request';

        await sendEmail([hrEmail, managerEmail], subject, htmlContent);

        return sendSuccessResponse(res, 200, "Leave request submitted successfully");

    } catch (err) {
        console.log(err);
        return sendErrorResponse(res, 500, "Something went wrong", err);
    }
};

exports.LeaveStatus = async (req, res) => {
    const { leaveId, empId, status, rejectReson } = req.body;

    try {
        if (!leaveId) {
            return sendErrorResponse(res, 400, "Leave ID is required");
        }

        const leave = await prisma.leaveRequest.findFirst({ where: { id: Number(leaveId), empId } });

        if (!leave) {
            return sendErrorResponse(res, 400, "Leave request not found");
        }

        if (leave.status === 'Cancelled') {
            return sendErrorResponse(res, 400, "Leave request has been cancelled");
        }

        const check = await prisma.user.findUnique({ where: { empId } });

        if (!check) {
            return sendErrorResponse(res, 400, "Employee not found");
        }
        const body = `Your Leave request ${status}`;
        const leaveType = fromPrismaEnum('leaveType', leave.type);

        if (status === 'Approved') {
            const htmlContent = acceptLeaveHtml(fullNameOf(check), leaveType, leave.startDate, leave.endDate);
            await sendEmail([check.email], 'Leave Request Approved', htmlContent);
        } else if (status === 'Rejected') {
            const htmlContent = rejectLeaveHtml(fullNameOf(check), leaveType, leave.startDate, leave.endDate, rejectReson);
            await sendEmail([check.email], 'Leave Request Rejected', htmlContent);
        }

        sendPushNotification(empId, "Leave request Status", body);

        const updated = await prisma.leaveRequest.update({ where: { id: leave.id }, data: { status } });

        return sendSuccessResponse(res, 200, "Leave request approved successfully", { ...updated, type: leaveType });

    } catch (err) {
        console.log(err, "err");
        return sendErrorResponse(res, 500, "Something went wrong", err);
    }
}

exports.checkEmpOnLeave = async (req, res) => {
    const empId = req.empId;
    const today = toDate(new Date().toISOString().split('T')[0]);

    try {
        if (!empId) {
            return sendErrorResponse(res, 400, "Employee ID is required");
        }

        const check = await prisma.leaveRequest.findFirst({
            where: {
                empId,
                startDate: { lte: today },
                endDate: { gte: today },
                status: { not: 'Cancelled' }
            }
        });

        if (!check) {
            return sendSuccessResponse(res, 200, "Employee is not on leave", false);
        }

        return sendSuccessResponse(res, 200, "Employee is on leave", { status: true, check: { ...check, type: fromPrismaEnum('leaveType', check.type) } });

    } catch (err) {
        return sendErrorResponse(res, 500, "Something went wrong", err);
    }
};

exports.cancelLeave = async (req, res) => {
    const { leaveId, empId } = req.body;

    try {
        if (!leaveId) {
            return sendErrorResponse(res, 400, "Leave ID is required");
        }

        const leave = await prisma.leaveRequest.findFirst({ where: { id: Number(leaveId), empId } });

        if (!leave) {
            return sendErrorResponse(res, 400, "Leave request not found");
        }

        const updated = await prisma.leaveRequest.update({ where: { id: leave.id }, data: { status: 'Cancelled' } });

        return sendSuccessResponse(res, 200, "Leave request cancelled successfully", { ...updated, type: fromPrismaEnum('leaveType', updated.type) });

    } catch (err) {
        return sendErrorResponse(res, 500, "Something went wrong", err);
    }
};

exports.editLeave = async (req, res) => {
    const { leaveId, startDate, endDate, type, reason } = req.body;

    try {
        if (!leaveId || !startDate || !endDate || !type || !reason) {
            return sendErrorResponse(res, 400, "Leave ID, start date, end date, and type are required");
        }

        if (new Date(startDate) > new Date(endDate)) {
            return sendErrorResponse(res, 400, "Start date must be before to end date");
        }

        // Original looked this up with Leave.findById(leaveId) on the wrapper-per-employee
        // model, but leaveId is populated everywhere else in this file from a *subdocument's*
        // _id — findById searches the wrapper's own _id, so in practice this almost always
        // returned nothing and the endpoint reported "not found" regardless of a valid leaveId.
        // The relational id here genuinely identifies one leave request, so this now works as
        // the code was clearly meant to (same call made for TimeSheet's per-entry endpoints).
        const leave = await prisma.leaveRequest.findUnique({ where: { id: Number(leaveId) } });

        if (!leave) {
            return sendErrorResponse(res, 400, "Leave request not found");
        }

        const numberOfDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

        const updated = await prisma.leaveRequest.update({
            where: { id: leave.id },
            data: {
                startDate: toDate(startDate),
                endDate: toDate(endDate),
                type: toPrismaEnum('leaveType', type),
                reason,
                numberOfDays
            }
        });

        return sendSuccessResponse(res, 200, "Leave request updated successfully", { ...updated, type: fromPrismaEnum('leaveType', updated.type) });

    } catch (err) {
        return sendErrorResponse(res, 500, "Something went wrong", err);
    }
};

exports.getAllLeave = async (req, res) => {
    try {
        const leaves = await prisma.leaveRequest.findMany();
        const empIds = [...new Set(leaves.map(l => l.empId))];
        const users = await prisma.user.findMany({ where: { empId: { in: empIds } } });
        const userByEmpId = Object.fromEntries(users.map(u => [u.empId, u]));

        const result = leaves.map(l => ({
            empId: l.empId,
            fullName: fullNameOf(userByEmpId[l.empId]),
            startDate: l.startDate,
            endDate: l.endDate,
            type: fromPrismaEnum('leaveType', l.type),
            reason: l.reason,
            status: l.status,
            _id: l.id
        }));

        return sendSuccessResponse(res, 200, "All leave request", result);

    } catch (err) {
        return sendErrorResponse(res, 500, "Something went wrong", err);
    }
}
