const moment = require('moment');
const sendTimesheetHtml = (timeSheet) => {
    const subject = `Timesheet Submission for ${moment(timeSheet.date).format('DD MMM YYYY')} - Employee: ${timeSheet.name}`;
    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50;">Timesheet Submission</h2>
            <p>Dear Manager,</p>
            <p>Below are the timesheet details submitted by the employee with Name: <strong>${timeSheet.name}</strong> for the date: <strong>${moment(timeSheet.date).format('DD MMM YYYY')}</strong>.</p>

            <h3 style="color: #333;">Work Details</h3>
            <p><strong>Hours Worked:</strong> ${timeSheet.hoursWorked} hours</p>
            <p><strong>Break Start Time:</strong> ${moment(timeSheet.breakStartTime).format('hh:mm A')}</p>
            <p><strong>Break End Time:</strong> ${moment(timeSheet.breakEndTime).format('hh:mm A')}</p>

            <h3 style="color: #333;">Tasks</h3>
            <p><strong>Pending Tasks:</strong></p>
            <p style="margin-left: 20px;">${timeSheet.pendingTasks || 'None'}</p>

            <p><strong>Completed Tasks:</strong></p>
            <p style="margin-left: 20px;">${timeSheet.completedTasks || 'None'}</p>

            <p><strong>Upcoming Tasks:</strong></p>
            <p style="margin-left: 20px;">${timeSheet.upcomingTasks || 'None'}</p>

            <p>Best regards,<br />${timeSheet.name}</p>
        </div>
    `;

    return { subject, html };
};

module.exports = sendTimesheetHtml;
