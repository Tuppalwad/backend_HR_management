const mongoose = require('mongoose');
const { Schema } = mongoose;

const userDocSchema = new Schema({
    empId: { type: String, required: true, unique: true },
    aadhaar: { type: String, required: true },
    pan: { type: String, required: true },
    hsc: { type: String, required: true },
    ssc: { type: String, required: true },
    passbook: { type: String, required: true },
    domicile: { type: String, required: true },
    passport: { type: String, required: false},
    experienceLetter: { type: String, required: false },
    offerLetter: { type: String, required: false },
    appointmentLetter: { type: String, required: true },
    bond: { type: String, required: false }
}, { timestamps: true });

const UserDoc = mongoose.model('UserDoc', userDocSchema);

module.exports = UserDoc;
