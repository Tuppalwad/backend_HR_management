const sendOtpHtml = (otp) => {
    const subject = 'Password Reset Request - OTP for Your Account';
    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50;">Password Reset Request</h2>
            <p>Dear User,</p>
            <p>We received a request to reset your password for your account. Please use the following OTP to proceed with resetting your password:</p>
            <div style="text-align: center; margin: 20px 0;">
                <h1 style="font-size: 36px; color: #d9534f;">${otp}</h1>
            </div>
            <p>This OTP is valid for the next 15 minutes. If you did not request this, please ignore this email or contact support.</p>
            <p>For security reasons, never share your OTP with anyone.</p>
            <p>If you have any questions or need further assistance, please reach out to our support team.</p>
            <p>Best regards,<br />MindNeverse Technology </p>
        </div>
    `;

    return { subject, html };
};

module.exports = sendOtpHtml;
