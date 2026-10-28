const prisma = require('../../utils/prismaClient');
const { genbcryptPass, genJWTToken, validatePass, sendErrorResponse, sendSuccessResponse, verifyJWTToken } = require('../../../utils/common');
const { sendEmail } = require('../../../utils/emailService');
const sendVerificationEmail = require('../../../utils/htmlText/sendVerificationText');

exports.addadmin = async (req, res) => {

    const { email, fullname, password, role } = req.body;

    try {
        if (!email) {
            return sendErrorResponse(res, 400, "Email field required");
        }
        if (!fullname) {
            return sendErrorResponse(res, 400, "fullname field required");
        }
        if (!password) {
            return sendErrorResponse(res, 400, "Password field required");
        }
        if (password.length < 6) {
            return sendErrorResponse(res, 400, "Password must be at least 6 characters");
        }

        if (!role) {
            return sendErrorResponse(res, 400, "Role field required");
        }

        const hashPass = await genbcryptPass(password);

        const item = await prisma.admin.findUnique({ where: { email } });
        if (item) {
            return sendErrorResponse(res, 301, 'Email already exists');
        }

        await prisma.admin.create({
            data: {
                fullname,
                email,
                password: hashPass,
                role,
                confirmEmail: false
            }
        });

        const { subject, html } = await sendVerificationEmail(email);
        await sendEmail([email], subject, html);

        return sendSuccessResponse(res, 200, 'User created successfully');
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.admin.findUnique({ where: { email } });
        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }
        await prisma.admin.update({ where: { email }, data: { confirmEmail: true } });

        return sendSuccessResponse(res, 200, "Email verified successfully");
    }
    catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.verifyadmin = async (req, res) => {
    const { email, password } = req.body;
    try {
        if (!email) {
            return sendErrorResponse(res, 404, "Email field required");
        }
        if (!password) {
            return sendErrorResponse(res, 404, "Password field required");
        }
        if (password.length < 6) {
            return sendErrorResponse(res, 400, 'Password length must be greater then equal to 6')
        }

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 20);

        const user = await prisma.admin.findUnique({ where: { email } });
        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }

        if (!user.confirmEmail) {
            return sendErrorResponse(res, 404, "Email not verified");
        }

        const isMatch = await validatePass(password, user.password);
        if (!isMatch) {
            return sendErrorResponse(res, 404, "Invalid password");
        }

        const token = genJWTToken(email, user.fullname, user.role);

        const existing = await prisma.adminSession.findUnique({ where: { email } });
        if (existing) {
            await prisma.adminSession.update({
                where: { email },
                data: { jwtToken: token, expiredDate: expiryDate }
            });
        } else {
            await prisma.adminSession.create({
                data: { email, jwtToken: token, expiredDate: expiryDate }
            });
        }

        return sendSuccessResponse(res, 200, "User verified successfully", { token, role: user?.role });
    }
    catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

// No admin equivalent of this ever existed and worked: the original Mongo-backed /api/logout
// read res.body instead of req.body and queried a nonexistent 'token' field on the session
// schema, so it was dropped rather than ported during the MySQL cutover (see
// migration/MIGRATION_LOG.md). The admin frontend still calls POST /api/logout though, so this
// fills that gap the same way userLogin's userLogout does for employee_sessions.
exports.adminLogout = async (req, res) => {
    try {
        const email = req.email;
        if (!email) {
            return sendErrorResponse(res, 400, "email is required");
        }

        const check = await prisma.adminSession.findUnique({ where: { email } });
        if (!check) {
            return sendErrorResponse(res, 400, "User not found");
        }

        await prisma.adminSession.update({ where: { email }, data: { jwtToken: "" } });

        return sendSuccessResponse(res, 200, "Admin logout successful");
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.forgotPassSendEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const checkuser = await prisma.admin.findUnique({ where: { email } });

        if (!checkuser) {
            return sendErrorResponse(res, 301, "User not found");
        }

        const token = genJWTToken(email);
        const link = `http://localhost:3000/forgot-password/${token}`;

        const message = `
            Reset Password

            A password change has been requested for your account. If this was you, please use the link below to reset your password.

            ${link}
        `;

        const subject = "Password Reset Request";

        await sendEmail(email, subject, message);

        return sendSuccessResponse(res, 200, "Email sent successfully");
    } catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token) {
            return sendErrorResponse(res, 400, "Token is required");
        }
        if (!password) {
            return sendErrorResponse(res, 400, "Password is required");
        }

        const decodetoken = verifyJWTToken(token);
        if (!decodetoken) {
            return sendErrorResponse(res, 400, "Invalid token");
        }

        const email = decodetoken.email;
        const hashPass = await genbcryptPass(password);

        await prisma.admin.update({ where: { email }, data: { password: hashPass } });

        return sendSuccessResponse(res, 200, "Password reset successfully");
    } catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { email, oldpassword, newpassword } = req.body;
        const check = await prisma.admin.findUnique({ where: { email } });

        if (!check) {
            return sendErrorResponse(res, 301, "User not found");
        }

        if (oldpassword === newpassword) {
            return sendErrorResponse(res, 301, "New and old password not be same")
        }

        const validate = await validatePass(oldpassword, check.password);

        if (!validate) {
            return sendErrorResponse(res, 301, "Old password incorret");
        }

        const haspass = await genbcryptPass(newpassword);

        // Original had a bug here: Admin.findOneAndUpdate(({email},{password:haspass})) — the
        // extra outer parens make the whole thing a JS comma expression, so Mongoose actually
        // received only ONE argument ({password: haspass}) and the update never persisted.
        // Fixed here rather than reproduced, per the same rule applied to the fullName bug in 4a.
        await prisma.admin.update({ where: { email }, data: { password: haspass } });

        return sendSuccessResponse(res, 200, "Password change successfully");

    } catch (error) {
        return sendErrorResponse(res, 500, 'Somethig went wrog', error)
    }
};

exports.editAdminDetails = async (req, res) => {
    const { email, fullname, country, role, gender, mobile, education, experience, address, about, profileImage, linkedIn } = req.body;
    try {
        const checkuser = await prisma.admin.findUnique({ where: { email } });

        if (!checkuser) {
            return sendErrorResponse(res, 301, "User not found");
        }

        await prisma.admin.update({
            where: { email },
            data: {
                fullname,
                role,
                gender,
                mobile,
                education,
                experience,
                address,
                country,
                about,
                linkedIn,
                profileImage: profileImage && profileImage.data ? Buffer.from(profileImage.data) : undefined,
                profileImageContentType: profileImage ? profileImage.contentType : undefined
            }
        });
        return sendSuccessResponse(res, 200, 'Account updated successfully');

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getAdminDetails = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await prisma.admin.findUnique({ where: { email } });
        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }
        return sendSuccessResponse(res, 200, "User found", user);
    }
    catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

// get employ of role hr and manaer with name and id
exports.getEmployHrAndManager = async (req, res) => {
    try {
        const user = await prisma.admin.findMany({
            where: { role: { in: ['HR', 'MANAGER'] } },
            select: { fullname: true, email: true, role: true }
        });
        return sendSuccessResponse(res, 200, "User found", user);
    }
    catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getManagerList = async (req, res) => {
    try {
        // Original also selected `empId` on Admin, a field that doesn't exist on that schema
        // (Mongoose silently ignores an unknown projection field; Prisma would throw). Dropped.
        const user = await prisma.admin.findMany({
            where: { role: { in: ['MANAGER'] } },
            select: { fullname: true, role: true }
        });
        return sendSuccessResponse(res, 200, "User found", user);
    }
    catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};
