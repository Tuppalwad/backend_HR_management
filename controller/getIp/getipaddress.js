const os = require('os');
const { sendErrorResponse, sendSuccessResponse } = require('../../utils/common');

const getIpAddress = async (req, res) => {
    try {
        const interfaces = os.networkInterfaces();
        let ipAddress = '';

        // Loop through each network interface and its addresses
        for (let interfaceName in interfaces) {
            const addresses = interfaces[interfaceName];
            for (let i = 0; i < addresses.length; i++) {
                const address = addresses[i];
                // Select the desired IPv4 address
                if (address.family === 'IPv4' && !address.internal && address.address.startsWith('192.168.43.')) {
                    ipAddress = address.address;
                    break;
                }
            }
            if (ipAddress) break;
        }

        // If no IP address is found, handle the case
        if (!ipAddress) {
            console.log("IP Address not found");
            return sendErrorResponse(res, 404, "IP Address not found");
        }

        console.log("IP Address found:", ipAddress);
        return sendSuccessResponse(res, "IP Address fetched successfully", { ip: ipAddress });
    } catch (error) {
        console.log("Error occurred:", error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

module.exports = {
    getIpAddress
};
