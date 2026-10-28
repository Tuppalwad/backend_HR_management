const prisma = require('../../utils/prismaClient');
const { sendSuccessResponse, sendErrorResponse } = require('../../../utils/common');

exports.checkLoggedin = async (req, res) => {
    try {
        const empId = req.empId; // Access empId from the req object
        const check = await prisma.employeeProfile.findUnique({ where: { empId } });
        sendSuccessResponse(res, 200, "Logged in user", { profileStatus: check ? true : false })
    } catch (error) {
        sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};
