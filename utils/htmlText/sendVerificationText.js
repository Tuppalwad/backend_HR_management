const sendVerificationEmail = async (email) => {
    const HRMS_FRONTEND_URL = process.env.HRMS_FRONTEND_URL || "http://localhost:3030/";    
    const link = `${HRMS_FRONTEND_URL}verifyemail/${email}`;
    const subject = "Account Created Successfully";
    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50;">Welcome to Our Platform!</h2>
            <p>Dear User,</p>
            <p>We're excited to have you join us. Your account has been created successfully!</p>
            <p>To complete your registration, please verify your email by clicking the button below:</p>

            <div style="text-align: center; margin-top: 20px;">
                <a href="${link}" style="
                    background-color: #4CAF50;
                    color: white;
                    padding: 12px 20px;
                    text-align: center;
                    text-decoration: none;
                    border-radius: 5px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    display: inline-block;
                ">Verify Your Email</a>
            </div>

            <p style="margin-top: 30px;">If you did not sign up for this account, please ignore this email.</p>
            <p>Best regards,<br />The Company Team</p>
        </div>
    `;
    return { subject, html };
};

module.exports = sendVerificationEmail;