const Empsection = require('../../models/employeeSection');
const User = require('../../models/User');

const userInfo = require('../../models/userInfo');
const { sendErrorResponse, sendSuccessResponse, validatePass, genJWTTokenEmp, generateOTP, genbcryptPass } = require('../../utils/common');
const { sendEmail } = require('../../utils/emailService');
const sendOtpHtml = require('../../utils/htmlText/sendOtpHtml');

exports.userLogin = async (req, res) => {
    try {
        const { empId, password } = req.body;
        

        if (!empId || !password) {
            return sendErrorResponse(res, 400, "All fields are required");
        }

        const userexit = await User.findOne({ empId });

        console.log(userexit,'kkk')

        if (!userexit) {
            return sendErrorResponse(res, 400, "Please provide correct empId and password");
        }

        const validate = await validatePass(password, userexit.password);

        if (!validate || validate === null) {
            return sendErrorResponse(res, 400, "Invalid Password");
        }

        const token = await genJWTTokenEmp(empId, userexit.fullName, userexit.worktype, userexit?.shift);

        const check = await Empsection.findOne({ empId: empId });
        if (check) {
            // Ensure FCMToken is a string
            // await user.findOneAndUpdate({ empId }, { FCMToken });
            await Empsection.findOneAndUpdate({ empId }, { jwtToken: token });
        } else {
            await Empsection.create({
                empId,
                jwtToken: token,
            });
            // await user.findOneAndUpdate({ empId }, { FCMToken });
        }

        const checkempinfo = await userInfo.find({ empId });
        let status = false;
        if (checkempinfo && checkempinfo.length > 0) {
            status = true;
        }
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

        const check = await Empsection.findOne({ empId });
        if (!check) {
            return sendErrorResponse(res, 400, "User not found");
        }

        await Empsection.findOneAndUpdate
            ({ empId },
                { jwtToken: "" }
            );

        return sendSuccessResponse(res, 200, "User logout successful");

    } catch (err) {
        console.log(err)
        return sendErrorResponse(res, 500, "Something went wrong", err);
    }
};

exports.changePassword = async (req, res) => {
    const { empId, oldpassword, newpassword } = req.body;


    try {
        const user = await User.findOne({ empId });
        if (!user) {
            return sendErrorResponse(res, 401, "User not found");
        }

        const validate = await validatePass(oldpassword, user.password);
        if (!validate) {
            return sendErrorResponse(res, 401, "Invalid old password");
        }

        const hashedPassword = await genbcryptPass(newpassword);
        user.password = hashedPassword;
        await user.save();

        return sendSuccessResponse(res, 200, 'Password changed successfully');
    }
    catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }

}

exports.sendForgotPasswordOTP = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return sendErrorResponse(res, 401, "User not found");
        }

        const otp = generateOTP();
        user.OTP = otp;
        user.OTPExpiry = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        const { subject, html } = sendOtpHtml(otp);
        await sendEmail([email], subject, html);

        return sendSuccessResponse(res, 200, 'OTP sent successfully');
    }
    catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
}

exports.verifyForgotPasswordOTP = async (req, res) => {
    const { email, otp } = req.body;

    console.log(email, otp);

    try {
        const user = await User.findOne({ email });
        console.log(user.OTP, user.OTPExpiry);
        if (!user) {
            return sendErrorResponse(res, 401, "User not found");
        }

        if (user.OTP.toString() !== otp.toString()) {
            return sendErrorResponse(res, 401, "Invalid OTP");
        }

        if (user.OTPExpiry < new Date()) {
            return sendErrorResponse(res, 401, "OTP expired");
        }

        return sendSuccessResponse(res, 200, 'OTP verified successfully');
    }
    catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
}


exports.resetPassword = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return sendErrorResponse(res, 401, "User not found");
        }

        const hashedPassword = await genbcryptPass(password);
        user.password = hashedPassword;
        await user.save();

        return sendSuccessResponse(res, 200, 'Password reset successfully');
    }
    catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }   
}
