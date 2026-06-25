const User = require('../../models/User');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/common');
const { sendEmail } = require('../../utils/emailService');
const allUsersEmailHTML = require('../../utils/htmlText/sendmailstoall');

exports.sendMailToall = async (req, res) => {
    try {
        const { body, subject } = req.body;

        // Fetch only the 'email' field and use lean() to get plain objects
        const emails = await User.find({}, 'email').lean();

        const emailList = emails.map(user => user.email);
        const { html } = allUsersEmailHTML(body);
        await sendEmail(emailList, subject, html);
        return sendSuccessResponse(res, 200, "mails send successfully");
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, 'Faild to retrive emails')
    }
};




exports.sendMailtoSelectedeEmail = async (req, res) => {
    try {
        const { emails, body, subject } = req.body;
        const { html } = allUsersEmailHTML(body);
        await sendEmail(emails, subject, html);
        return sendSuccessResponse(res, 200, "mails send successfully");

    } catch (error) {
        return sendErrorResponse(res, 500, 'something went wrong')
    }
}