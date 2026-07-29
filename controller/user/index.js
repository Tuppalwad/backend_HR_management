const Admin = require('../../models/Admin');
const userAttendance = require('../../models/attendance');
const User = require('../../models/User');
const { genbcryptPass, sendErrorResponse, sendSuccessResponse, validatePass, generateOTP, } = require('../../utils/common');
const { sendEmail } = require('../../utils/emailService');
const empHTMLText = require('../../utils/htmlText/empHtmlText');
const sendOtpHtml = require('../../utils/htmlText/sendOtpHtml');
// Generate a unique employee ID
const generateEmpId = () => {
    return 'EMP' + Math.floor(1000 + Math.random() * 9000).toString();
};


exports.addUser = async (req, res) => {
    const { firstName, lastName, email, gender, role, worktype, mobile, shift, status, dateofjoining, employeeType, currentEmpId } = req.body;
    try {
        if (!firstName || !lastName || !email || !gender || !role || !worktype || !mobile || !status || !currentEmpId) {
            return sendErrorResponse(res, 401, "All fields are required");
        }

        const checkEmail = await User.findOne({ email });
        const checkEmailInAdmin = await Admin.findOne({ email });
        const checkMobile = await User.findOne({ mobile });
        const checkMobileInAdmin = await Admin.findOne({ mobile });
        const checkCurrentEmpId = await User.findOne({ currentEmpId });

        console.log(checkEmail, checkEmailInAdmin, checkMobile, checkMobileInAdmin);

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

        // Generate employee ID and hash the mobile number
        const hashedPassword = await genbcryptPass(mobile);

        const empId = generateEmpId();

        // Create a new user
        const newUser = new User({
            firstName,
            lastName,
            email,
            empId,
            currentEmpId,
            gender,
            role,
            worktype,
            mobile,
            password: hashedPassword,
            shift,
            closedDate: null,
            status: status?.toLowerCase() == 'active' ? true : false,
            dateofjoining: dateofjoining || null,
            employeeType: employeeType || null
        });

        // Save the new user to the database
        await newUser.save();

        // Send email to the user
        const { subject, html } = await empHTMLText(`${firstName} ${lastName}`, empId, mobile)

        // await sendEmail([email], subject, html)

        return sendSuccessResponse(res, 201, 'User added successfully', { empId });

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.editUser = async (req, res) => {
    const { empId, firstName, lastName, email, gender, role, mobile, shift, status, dateofjoining, worktype, employeeType, currentEmpId } = req.body;

    console.log("status", status);

    try {
        const user = await User.findOne({ empId });
        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }

        user.firstName = firstName || user.firstName;
        user.lastName = lastName || user.lastName;
        user.email = email || user.email;
        user.gender = gender || user.gender;
        user.role = role || user.role;
        user.worktype = worktype || user.worktype;
        user.mobile = mobile || user.mobile;
        user.currentEmpId = currentEmpId || user.currentEmpId;
        user.password = user.password;
        user.shift = shift || user.shift;
        user.status = status || user?.status?.toLowerCase() == 'active' ? true : false;
        user.dateofjoining = dateofjoining || user?.dateofjoining;
        user.employeeType = employeeType || user?.employeeType

        await user?.save();
        const { subject, text } = await empHTMLText(`${firstName} ${lastName}`, empId, mobile)

        await sendEmail(email, subject, text)

        return sendSuccessResponse(res, 200, 'User updated successfully');
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.deleteUser = async (req, res) => {
    const { empId } = req.query;
    try {
        const user = await User.findOne({ empId });
        if (!user) {
            return sendErrorResponse(res, 401, "User not found");
        }

        await User.deleteOne({ empId });

        return sendSuccessResponse(res, 200, 'User deleted successfully');
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};


exports.getUser = async (req, res) => {
    const { empId } = req.query;

    try {
        const user = await User.findOne({ empId });
        if (!user) {
            return sendErrorResponse(res, 401, "User not found");
        }

        return sendSuccessResponse(res, 200, 'User retrieved successfully', user);
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        return sendSuccessResponse(res, 200, 'Users retrieved successfully', users);
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};


exports.closeAccount = async (req, res) => {
    try {
        const { empId } = req.query;

        // Find the user by empId
        const user = await User.findOne({ empId });

        // If the user does not exist, return a 404 error
        if (!user) {
            return sendErrorResponse(res, 404, "User not found");
        }

        // Find the attendance record for the user
        const absentUsers = await userAttendance.findOne({ empId });

        // Update the user's status and closedDate
        user.status = !user.status; // Toggle the status
        user.closedDate = user.status ? new Date() : null

        // Save the user changes
        await user.save();

        // Check if the attendance record exists before updating
        if (absentUsers) {
            absentUsers.closedDate = absentUsers.status ? new Date() : null;
            absentUsers.status = !absentUsers.status; // Toggle the status
            await absentUsers.save(); // Save the attendance record
        }

        // Send a success response
        return sendSuccessResponse(res, 200, "User's account closed successfully");

    } catch (error) {
        console.error(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};




