const userInfo = require("../../models/userInfo");
const { sendSuccessResponse, sendErrorResponse } = require("../../utils/common");


exports.checkLoggedin = async (req, res) => {

    try {
        const empId = req.empId; // Access empId from the req object
        const check = await userInfo.findOne({ empId });
        sendSuccessResponse(res, 200, "Logged in user", { profileStatus: check ? true : false })
    } catch (error) {
        sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};  