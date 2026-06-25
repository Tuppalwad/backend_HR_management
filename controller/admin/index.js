const Admin = require('../../models/Admin');
const { genbcryptPass, genJWTToken, validatePass, sendErrorResponse, sendSuccessResponse, verifyJWTToken } = require('../../utils/common');
const section = require('../../models/section');
const { sendEmail } = require('../../utils/emailService');
const sendVerificationEmail = require('../../utils/htmlText/sendVerificationText');



exports.addadmin = async (req, res) => {

    const { email, fullname, password, role } = req.body;
    console.log(email,'kkkkkk')

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

        const item = await Admin.findOne({ email });
        if (item) {
            return sendErrorResponse(res, 301, 'Email already exists');
        }

        await Admin.create({
            fullname,
            email,
            password: hashPass,
            role,
            conformEmail: false,
        });

        // const { subject, html } = await sendVerificationEmail(email);

        // await sendEmail([email], subject, html);

        return sendSuccessResponse(res, 200, 'User created successfully');
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};


// get employ of role hr and manaer with name and id 
exports.getEmployHrAndManager = async (req, res) => {
    try {
        const user = await Admin.find({ role: { $in: ['HR', 'MANAGER'] } }, { fullname: 1, email: 1, role: 1 });
        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }
        return sendSuccessResponse(res, 200, "User found", user);
    }
    catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
}

exports.getManagerList = async (req, res) => {
    try {
        const user = await Admin.find({ role: { $in: [ 'MANAGER'] } }, { fullname: 1, empId: 1, role: 1 });
        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }
        return sendSuccessResponse(res, 200, "User found", user);
    }
    catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
}


exports.verifyEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await Admin.findOne({ email });
        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }
        await Admin.findOneAndUpdate({ email }, { conformEmail: true });

        return sendSuccessResponse(res, 200, "Email verified successfully");
    }
    catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
}


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

        const expiryDate = new Date(); // Get current date
        expiryDate.setDate(expiryDate.getDate() + 20); // Add 20 days

        const user = await Admin.findOne({ email });
        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }

        if (!user.conformEmail) {
            return sendErrorResponse(res, 404, "Email not verified");
        }

        const isMatch = await validatePass(password, user.password);
        if (!isMatch) {
            return sendErrorResponse(res, 404, "Invalid password");
        }

        const token = genJWTToken(email, user.fullname, user.role);

        const check = await section.findOne({ email });
        if (check) {
            await section.findOneAndUpdate
                ({ email },
                    { jwtToken: token, expiredDate: expiryDate }
                );
        }
        else {
            await section.create({
                email,
                jwtToken: token,
                expiredDate: expiryDate
            });
        }


        return sendSuccessResponse(res, 200, "User verified successfully", { token, role: user?.role });
    }
    catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
}




exports.forgotPassSendEmail = async (req, res) => {
    try {
        const { email } = req.body;
        const checkuser = await Admin.findOne({ email });

        if (!checkuser) {
            return sendErrorResponse(res, 301, "User not found");
        }

        // Generate token for password reset
        const token = await genJWTToken(email);
        const link = `http://localhost:3000/forgot-password/${token}`;

        // Format the email message in HTML
        const message = `
            Reset Password
            
            A password change has been requested for your account. If this was you, please use the link below to reset your password.
            
            ${link}
        `;

        const subject = "Password Reset Request";
        const text = message; // Plain text version (optional)

        // Use sendEmail function to send the email
        await sendEmail(email, subject, text);

        return sendSuccessResponse(res, 200, "Email sent successfully");
    } catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
}


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

        await Admin.findOneAndUpdate(
            { email },
            { password: hashPass }
        );

        return sendSuccessResponse(res, 200, "Password reset successfully");
    } catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
}



exports.changePassword = async (req, res) => {
    try {
        const { email, oldpassword, newpassword } = req.body;
        const check = await Admin.findOne({ email });

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

        await Admin.findOneAndUpdate((
            { email },
            { password: haspass }
        ))

        return sendSuccessResponse(res, 200, "Password change successfully");

    } catch (error) {
        return sendErrorResponse(res, 500, 'Somethig went wrog', error)
    }
}

exports.editAdminDetails = async (req, res) => {
    const { email, fullname, country, role, gender, mobile, education, experience, address, about, profileImage, linkedIn } = req.body;
    try {

        console.log(email, fullname)

        const checkuser = await Admin.findOne({ email });

        console.log(checkuser);

        if (!checkuser) {
            return sendErrorResponse(res, 301, "User not found");
        }

        await Admin.findOneAndUpdate(
            { email },
            {
                fullname,
                role,
                gender,
                mobile,
                education,
                experience,
                address,
                country,
                about,
                profileImage,
                linkedIn
            }
        );
        return sendSuccessResponse(res, 200, 'Account updated successfully');

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
}


exports.getAdminDetails = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await Admin.findOne({ email });
        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }
        return sendSuccessResponse(res, 200, "User found", user);
    }
    catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
}


