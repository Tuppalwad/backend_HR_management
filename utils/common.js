const jwt = require('jsonwebtoken')
const fs = require('fs')
const bcrypt = require('bcryptjs');

const saltRounds = 10;

const genbcryptPass = async (password) => {
    try {
        const salt = await bcrypt.genSalt(saltRounds);
        const hash = await bcrypt.hash(password, salt);
        return hash;
    } catch (err) {
        throw new Error('Error generating hash');
    }
};

const validatePass = async (password,hashedPassword)=>{
    try {
        const isMatch = await bcrypt.compare(password.toString(), hashedPassword);
        return isMatch;
    } catch (err) {
        throw new Error( err);
    }
}

const genJWTToken = (email,fullname,role) => {
    const privateKey = fs.readFileSync('./private.key', 'utf8'); // Use readFileSync to read the file synchronously
    const token = jwt.sign(
        { email,fullname,role }, // Correct the property to email
        privateKey, 
        { algorithm: 'RS256', expiresIn: '20d' } // Correct the property to expiresIn and set it to 20 days
    );
    return token;
};

const genJWTTokenEmp = (empId,fullName,worktype,shift) => {
    const privateKey = fs.readFileSync('./private.key', 'utf8'); // Use readFileSync to read the file synchronously
    const token = jwt.sign(
        { empId,fullName,worktype,shift }, // Correct the property to email
        privateKey, 
        { algorithm: 'RS256', expiresIn: '20d' } // Correct the property to expiresIn and set it to 20 days
    );
    return token;
};

const verifyJWTToken = (token) => {
    const publicKey = fs.readFileSync('public.key', 'utf8'); // Read the public key for verification
    try {
        const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
        return decoded;
    } catch (err) {
        console.log('Token verification failed:', err.message);
        return null; // or throw an error depending on your use case
    }
};

// Utility function to send success response
const sendSuccessResponse = (res, code, message, data = {}) => {
    res.status(code).json({
        status: 'success',
        message: message,
        code: code,
        data: data
    });
};

// Utility function to send error response
const sendErrorResponse = (res, code, message, error = {}) => {
    res.status(code).json({
        status: 'error',
        message: message,
        code: code,
        error: error
    });
};

const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};




module.exports = {generateOTP,genJWTTokenEmp, genbcryptPass,genJWTToken,verifyJWTToken,validatePass,sendSuccessResponse,sendErrorResponse };


