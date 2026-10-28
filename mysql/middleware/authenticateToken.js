const prisma = require('../utils/prismaClient');
const { sendErrorResponse, verifyJWTToken } = require('../../utils/common');

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
            const empCheck = await prisma.employeeSession.findFirst({ where: { empId, jwtToken: token } });
            if (!empCheck) {
                return sendErrorResponse(res, 401, "Unauthorized");
            }
            req.empId = empId; // Attach empId to the req object
        } else if (email) {
            const sectionCheck = await prisma.adminSession.findFirst({ where: { email, jwtToken: token } });
            if (!sectionCheck) {
                // 401, never 301: browsers cache a 301 indefinitely, so one cached from a
                // logged-out request blocks every later login attempt in that browser.
                return sendErrorResponse(res, 401, "Unauthorized");
            }

            // Check if the section has expired
            if (sectionCheck.expiredDate.getTime() < new Date().getTime()) {
                return sendErrorResponse(res, 400, "Section has expired");
            }

            req.email = email; // Attach email to the req object, mirroring req.empId above
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
