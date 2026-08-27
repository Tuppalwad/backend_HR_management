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
                // 401, not 301. This is a GET-able auth check, and 301 "Moved Permanently" is
                // cached by browsers indefinitely — once a logged-out user hit /api/@me the
                // browser kept replaying that cached 301 without ever contacting the server
                // again, so a valid token could never authenticate afterwards. Confirmed:
                // requests with no Authorization header at all still returned 301 from cache.
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
