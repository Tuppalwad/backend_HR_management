// accept rejest leave request html text 

const acceptLeaveHtml = (employeeName, leaveType, startDate, endDate) => {
    return `
    <h2>Leave Request Accepted</h2>
    <p>Dear ${employeeName},</p>
    <p>Your leave request for ${leaveType} from ${startDate} to ${endDate} has been approved.</p>
    <p>Enjoy your time off!</p>
    `;
};



const rejectLeaveHtml = (employeeName, leaveType, startDate, endDate, reason) => {
    return `
    <h2>Leave Request Rejected</h2>
    <p>Dear ${employeeName},</p>
    <p>Your leave request for ${leaveType} from ${startDate} to ${endDate} has been rejected.</p>
    <p>Reason: ${reason}</p>
    `;
}


module.exports = { acceptLeaveHtml, rejectLeaveHtml };