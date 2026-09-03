require('dotenv').config();

const nodemailer = require('nodemailer');

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// Fail loudly at startup rather than at the first password reset. Credentials arrive from .env
// locally and from the `environment:` block in docker-compose.yml in production, so a missing
// value here means a deployment step was skipped — not a code problem.
if (!EMAIL_USER || !EMAIL_PASS) {
    console.error(
        '[emailService] EMAIL_USER / EMAIL_PASS are not set — no email will be sent. ' +
        'Check .env locally, or the backend service environment in docker-compose.yml.'
    );
}

// Explicit host/port rather than `service: "gmail"`, with generous timeouts. The defaults are
// short enough that a slow SMTP handshake (common from cloud VMs, where outbound 587 is often
// throttled or filtered) surfaces as a connection error that looks like an auth failure.
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000
});

/* Returns true/false instead of throwing: every caller treats mail as fire-and-forget, and a
   failed notification must not roll back the leave approval or asset assignment that triggered
   it. Callers that care can check the result. */
const sendEmail = async (to, subject, htmlContent) => {
    if (!EMAIL_USER || !EMAIL_PASS) {
        console.error('[emailService] skipped — credentials missing. Subject:', subject);
        return false;
    }

    const mailOptions = {
        from: EMAIL_USER,
        to: Array.isArray(to) ? to.join(', ') : to, // Join multiple recipients with a comma
        subject,
        html: htmlContent
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('[emailService] sent:', info.messageId, '->', mailOptions.to);
        return true;
    } catch (error) {
        console.error('[emailService] FAILED to send to', mailOptions.to, '-', error.message);
        return false;
    }
};

/* Optional startup probe: authenticates without sending anything. Off by default so the app
   never blocks on SMTP at boot; set VERIFY_SMTP_ON_BOOT=true to diagnose credential problems. */
const verifyConnection = async () => {
    try {
        await transporter.verify();
        console.log('[emailService] SMTP connection verified for', EMAIL_USER);
        return true;
    } catch (error) {
        console.error('[emailService] SMTP verification failed -', error.message);
        return false;
    }
};

if (process.env.VERIFY_SMTP_ON_BOOT === 'true' && EMAIL_USER && EMAIL_PASS) {
    verifyConnection();
}

module.exports = { sendEmail, verifyConnection };
