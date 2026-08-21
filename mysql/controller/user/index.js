const prisma = require('../../utils/prismaClient');
const { toPrismaEnum, fromPrismaEnum } = require('../../utils/enumMap');
const { toDate } = require('../../utils/dateHelper');
const { genbcryptPass, sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');
const { sendEmail } = require('../../../utils/emailService');
const empHTMLText = require('../../../utils/htmlText/empHtmlText');

// Generate a unique employee ID
const generateEmpId = () => {
    return 'EMP' + Math.floor(1000 + Math.random() * 9000).toString();
};

const toUserResponse = (user) => user ? { ...user, worktype: fromPrismaEnum('workType', user.worktype) } : user;

exports.addUser = async (req, res) => {
    const { firstName, lastName, email, gender, role, worktype, mobile, shift, status, dateofjoining, employeeType, currentEmpId } = req.body;
    try {
        if (!firstName || !lastName || !email || !gender || !role || !worktype || !mobile || !status || !currentEmpId) {
            return sendErrorResponse(res, 401, "All fields are required");
        }

        const mobileStr = mobile.toString();

        const [checkEmail, checkEmailInAdmin, checkMobile, checkMobileInAdmin, checkCurrentEmpId] = await Promise.all([
            prisma.user.findUnique({ where: { email } }),
            prisma.admin.findUnique({ where: { email } }),
            prisma.user.findUnique({ where: { mobile: mobileStr } }),
            prisma.admin.findFirst({ where: { mobile: mobileStr } }),
            prisma.user.findUnique({ where: { currentEmpId } })
        ]);

        if (checkEmailInAdmin) {
            return sendErrorResponse(res, 401, "An account with this email already exists");
        }
        if (checkMobileInAdmin) {
            return sendErrorResponse(res, 401, "An account with this mobile number already exists");
        }
        if (checkEmail) {
            return sendErrorResponse(res, 401, "An account with this email already exists");
        }
        if (checkMobile) {
            return sendErrorResponse(res, 401, "An account with this mobile number already exists");
        }
        if (checkCurrentEmpId) {
            return sendErrorResponse(res, 401, "An account with this Current Employee ID already exists");
        }

        const hashedPassword = await genbcryptPass(mobileStr);
        const empId = generateEmpId();

        await prisma.user.create({
            data: {
                firstName,
                lastName,
                email,
                empId,
                currentEmpId,
                gender,
                role,
                worktype: toPrismaEnum('workType', worktype),
                mobile: mobileStr,
                password: hashedPassword,
                shift: shift || null,
                closedDate: null,
                status: status?.toLowerCase() == 'active' ? true : false,
                dateOfJoining: toDate(dateofjoining),
                employeeType: employeeType || null
            }
        });

        // Matches the original: the welcome email is composed but not sent on add, only on edit
        await empHTMLText(`${firstName} ${lastName}`, empId, mobileStr);

        return sendSuccessResponse(res, 201, 'User added successfully', { empId });

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.editUser = async (req, res) => {
    // The original also accepted a Mongo _id as an alternate lookup key. empId is the primary
    // key here and the only identifier that still makes sense, so lookup is by empId only.
    const { empId, firstName, lastName, email, gender, role, mobile, shift, status, dateofjoining, worktype, employeeType, currentEmpId } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { empId } });
        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }

        const mobileStr = mobile != null ? mobile.toString() : null;

        const updated = await prisma.user.update({
            where: { empId },
            data: {
                firstName: firstName || user.firstName,
                lastName: lastName || user.lastName,
                email: email || user.email,
                gender: gender || user.gender,
                role: role || user.role,
                worktype: worktype ? toPrismaEnum('workType', worktype) : user.worktype,
                mobile: mobileStr || user.mobile,
                currentEmpId: currentEmpId || user.currentEmpId,
                shift: shift || user.shift,
                status: status !== undefined ? (status.toLowerCase() == 'active') : user.status,
                dateOfJoining: dateofjoining ? toDate(dateofjoining) : user.dateOfJoining,
                employeeType: employeeType || user.employeeType
            }
        });

        const { subject, text } = await empHTMLText(`${firstName || user.firstName} ${lastName || user.lastName}`, empId, mobileStr || user.mobile);
        await sendEmail(updated.email, subject, text);

        return sendSuccessResponse(res, 200, 'User updated successfully');
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.deleteUser = async (req, res) => {
    const { empId } = req.query;
    try {
        const user = await prisma.user.findUnique({ where: { empId } });
        if (!user) {
            return sendErrorResponse(res, 401, "User not found");
        }

        await prisma.user.delete({ where: { empId } });

        return sendSuccessResponse(res, 200, 'User deleted successfully');
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getUser = async (req, res) => {
    const { empId } = req.query;

    try {
        const user = await prisma.user.findUnique({ where: { empId } });
        if (!user) {
            return sendErrorResponse(res, 401, "User not found");
        }

        return sendSuccessResponse(res, 200, 'User retrieved successfully', toUserResponse(user));
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        return sendSuccessResponse(res, 200, 'Users retrieved successfully', users.map(toUserResponse));
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.closeAccount = async (req, res) => {
    try {
        const { empId } = req.query;

        const user = await prisma.user.findUnique({ where: { empId } });

        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }

        // If the account is currently active, block closing it until assigned assets are returned
        // (same rule added to the Mongo-backed controller alongside the Asset module).
        if (user.status) {
            const activeAssets = await prisma.asset.findMany({ where: { currentAssigneeEmpId: empId, status: 'Assigned' } });
            if (activeAssets.length > 0) {
                return sendErrorResponse(res, 400, "Employee still has assets assigned, return them before closing the account", activeAssets);
            }
        }

        const newStatus = !user.status;

        await prisma.user.update({
            where: { empId },
            data: {
                status: newStatus,
                closedDate: newStatus ? new Date() : null
            }
        });

        return sendSuccessResponse(res, 200, "User's account closed successfully");

    } catch (error) {
        console.error(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};
