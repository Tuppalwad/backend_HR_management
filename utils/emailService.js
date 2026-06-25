// require('dotenv').config();  // Ensure this is at the top

// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS
//     }
// });

// const sendEmail = async (to, subject, text) => {
//     const mailOptions = {
//         from: process.env.EMAIL_USER,
//         to,
//         subject,
//         text
//     };

//     try {
//         await transporter.sendMail(mailOptions);
//         console.log('Email sent successfully');
//     } catch (error) {
//         console.error('Error sending email:', error);
//     }
// };
require('dotenv').config();  // Ensure this is at the top

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    // Add this line to increase timeout
    timeout: 5000 // 5 seconds
});

const sendEmail = async (to, subject, htmlContent) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: Array.isArray(to) ? to.join(', ') : to, // Join multiple recipients with a comma
        subject,
        html: htmlContent
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Error sending email:', error);
    }
};


module.exports = { sendEmail };
