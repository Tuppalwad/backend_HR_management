const leaveHtmlText = (name, type, reason, id,empId) => `
    const HRMS_FRONTEND_URL = process.env.HRMS_FRONTEND_URL || "http://localhost:3030/";
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2 style="color: #4CAF50;">New Leave Request</h2>
        <p>Hello HR,</p>
        <p>A new leave request has been submitted by <strong>${name}</strong>.</p>
        <p><strong>Leave Type:</strong> ${type}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please review the request and take the necessary action.</p>

        <div style="display: flex; justify-content: center; margin-top: 30px;">
            <a href="${HRMS_FRONTEND_URL}leavestatus/${id}?empid=${empId}&status=Approved" style="
                background-color: #4CAF50;
                color: white;
                padding: 12px 20px;
                text-align: center;
                text-decoration: none;
                border-radius: 5px;
                margin-right: 20px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
            ">Accept</a>

            <a href="${HRMS_FRONTEND_URL}leavestatus/${id}?empid=${empId}&status=Rejected" style="
                background-color: #f44336;
                color: white;
                padding: 12px 20px;
                text-align: center;
                text-decoration: none;
                border-radius: 5px;
                font-size: 16px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
            ">Reject</a>
        </div>

        <p style="margin-top: 30px;">Thank you.</p>
        <p>Best regards,<br />Leave Management System</p>
    </div>
`;

module.exports = leaveHtmlText;
