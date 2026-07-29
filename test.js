const nodemailer = require("nodemailer");

async function testMail() {
    const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
            user: "mindnerves2013@gmail.com",
            pass: "bcfodzmipopjurlc"
        },
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000
    });

    try {
        // Verify SMTP connection
        await transporter.verify();
        console.log("✅ SMTP connection successful!");

        // Send test email
        const info = await transporter.sendMail({
            from: "mindnerves2013@gmail.com",
            to: "vtuppalwad@gmail.com",
            subject: "NodeMailer Test",
            text: "This is a test email from Node.js using Nodemailer."
        });

        console.log("✅ Email sent successfully!");
        console.log("Message ID:", info.messageId);
    } catch (error) {
        console.error("❌ Error:");
        console.error(error);
    }
}

testMail();