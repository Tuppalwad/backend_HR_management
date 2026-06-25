const empHTMLText = async (fullName, empId, mobile) => {
    const subject = 'Welcome to Our Company - Your Account Details';
    const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4CAF50;">Welcome to the Company, ${fullName}!</h2>
            <p>Dear ${fullName},</p>
            <p>We are excited to have you join our team!</p>
            <p>Here are your account details:</p>
            <ul style="list-style-type: none; padding-left: 0;">
                <li><strong>Employee ID:</strong> ${empId}</li>
                <li><strong>Initial Password:</strong> ${mobile}</li>
            </ul>
            <p style="color: #d9534f;"><strong>Note:</strong> Please change your password after your first login for security purposes.</p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Best regards,<br />Your Company Name</p>
        </div>
    `;

    return { subject, html };
};

module.exports = empHTMLText;