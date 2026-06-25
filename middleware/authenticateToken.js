const Empsection = require('../models/employeeSection');
const Section = require('../models/section');
const { sendErrorResponse, verifyJWTToken } = require('../utils/common');

const authenticateToken = async (req, res, next) => {
    try {
        // Gather the jwt access token from the request header
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

        if (token == null) {
            return sendErrorResponse(res, 401, "Unauthorized");
        }

        const decode = await verifyJWTToken(token);

        if (!decode) {
            return sendErrorResponse(res, 401, "Unauthorized");
        }

        const empId = decode?.empId;
        const email = decode?.email;

        if (empId) {
            const empCheck = await Empsection.findOne({ empId: empId, jwtToken: token });
            if (!empCheck) {
                return sendErrorResponse(res, 401, "Unauthorized");
            }
            req.empId = empId; // Attach empId to the req object
        } else if (email) {
            const sectionCheck = await Section.findOne({ email: email, jwtToken: token });
            if (!sectionCheck) {
                return sendErrorResponse(res, 301, "User not found");
            }

            // Check if the section has expired
            if (sectionCheck.expiredDate.getTime() < new Date().getTime()) {
                return sendErrorResponse(res, 400, "Section has expired");
            }
        } else {
            return sendErrorResponse(res, 401, "Unauthorized");
        }

        next();

    } catch (error) {
        console.error('Error in authenticateToken middleware:', error);
        return sendErrorResponse(res, 500, "Internal Server Error", error);
    }
};

module.exports = authenticateToken;
    