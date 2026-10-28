const prisma = require('../../utils/prismaClient');
const { sendSuccessResponse, sendErrorResponse } = require('../../../utils/common');
const { sendEmail } = require('../../../utils/emailService');
const allUsersEmailHTML = require('../../../utils/htmlText/sendmailstoall');

exports.sendMailToall = async (req, res) => {
    try {
        const { body, subject } = req.body;

        const emails = await prisma.user.findMany({ select: { email: true } });
        const emailList = emails.map(user => user.email);

        const { html } = allUsersEmailHTML(body);
        await sendEmail(emailList, subject, html);
        return sendSuccessResponse(res, 200, "mails send successfully");
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, 'Faild to retrive emails')
    }
};

// Never wired to a route in the original either — ported anyway since, unlike the dead code
// skipped in 4b, this one is complete and functional, just unmounted.
exports.sendMailtoSelectedeEmail = async (req, res) => {
    try {
        const { emails, body, subject } = req.body;
        const { html } = allUsersEmailHTML(body);
        await sendEmail(emails, subject, html);
        return sendSuccessResponse(res, 200, "mails send successfully");

    } catch (error) {
        return sendErrorResponse(res, 500, 'something went wrong')
    }
};
