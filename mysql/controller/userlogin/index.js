const prisma = require('../../utils/prismaClient');
const { fromPrismaEnum } = require('../../utils/enumMap');
const { sendErrorResponse, sendSuccessResponse, validatePass, genJWTTokenEmp, genbcryptPass, generateOTP } = require('../../../utils/common');
const { sendEmail } = require('../../../utils/emailService');
const sendOtpHtml = require('../../../utils/htmlText/sendOtpHtml');

exports.userLogin = async (req, res) => {
    try {
        const { empId, password } = req.body;

        if (!empId || !password) {
            return sendErrorResponse(res, 400, "All fields are required");
        }

        const userexit = await prisma.user.findUnique({ where: { empId } });

        if (!userexit) {
            return sendErrorResponse(res, 400, "Please provide correct empId and password");
        }

        const validate = await validatePass(password, userexit.password);

        if (!validate) {
            return sendErrorResponse(res, 400, "Invalid Password");
        }

        // Original Mongo controller signed the token with userexit.fullName, a field that
        // doesn't exist on the User schema (firstName/lastName do) — pre-existing bug, not
        // reproduced here. See migration/MIGRATION_LOG.md, sub-phase 4a.
        const fullName = `${userexit.firstName || ''} ${userexit.lastName || ''}`.trim();
        const token = genJWTTokenEmp(empId, fullName, fromPrismaEnum('workType', userexit.worktype), userexit.shift);

        const existing = await prisma.employeeSession.findUnique({ where: { empId } });
        if (existing) {
            await prisma.employeeSession.update({ where: { empId }, data: { jwtToken: token } });
        } else {
            await prisma.employeeSession.create({ data: { empId, jwtToken: token } });
        }

        const checkempinfo = await prisma.employeeProfile.findUnique({ where: { empId } });
        const status = !!checkempinfo;

        return sendSuccessResponse(res, 200, "User login successful", { token: token, profileStatus: status });

    } catch (err) {
        console.log(err);
        return sendErrorResponse(res, 500, "Something went wrong", err);
    }
};

exports.userLogout = async (req, res) => {
    try {
        const empId = req.empId;
        if (!empId) {
            return sendErrorResponse(res, 400, "empId is required");
        }

        const check = await prisma.employeeSession.findUnique({ where: { empId } });
        if (!check) {
            return sendErrorResponse(res, 400, "User not found");
        }

        await prisma.employeeSession.update({ where: { empId }, data: { jwtToken: "" } });

        return sendSuccessResponse(res, 200, "User logout successful");

    } catch (err) {
        console.log(err)
        return sendErrorResponse(res, 500, "Something went wrong", err);
    }
};

exports.changePassword = async (req, res) => {
    const { empId, oldpassword, newpassword } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { empId } });
        if (!user) {
            return sendErrorResponse(res, 401, "User not found");
        }

        const validate = await validatePass(oldpassword, user.password);
        if (!validate) {
            return sendErrorResponse(res, 401, "Invalid old password");
        }

        const hashedPassword = await genbcryptPass(newpassword);
        await prisma.user.update({ where: { empId }, data: { password: hashedPassword } });

        return sendSuccessResponse(res, 200, 'Password changed successfully');
    }
    catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.sendForgotPasswordOTP = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return sendErrorResponse(res, 401, "User not found");
        }

        const otp = generateOTP();
        await prisma.user.update({
            where: { email },
            data: { otp, otpExpiry: new Date(Date.now() + 15 * 60 * 1000) }
        });

        const { subject, html } = sendOtpHtml(otp);
        await sendEmail([email], subject, html);

        return sendSuccessResponse(res, 200, 'OTP sent successfully');
    }
    catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.verifyForgotPasswordOTP = async (req, res) => {
    const { email, otp } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return sendErrorResponse(res, 401, "User not found");
        }

        if (user.otp !== otp.toString()) {
            return sendErrorResponse(res, 401, "Invalid OTP");
        }

        if (user.otpExpiry < new Date()) {
            return sendErrorResponse(res, 401, "OTP expired");
        }

        return sendSuccessResponse(res, 200, 'OTP verified successfully');
    }
    catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.resetPassword = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return sendErrorResponse(res, 401, "User not found");
        }

        const hashedPassword = await genbcryptPass(password);
        await prisma.user.update({ where: { email }, data: { password: hashedPassword } });

        return sendSuccessResponse(res, 200, 'Password reset successfully');
    }
    catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};
