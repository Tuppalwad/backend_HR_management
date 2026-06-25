const { Schema, model } = require('mongoose');

const skillandExp = new Schema({
    skill: { type: String, required: true },
    experience: { type: String, required: true, min: 0 },
});

const userInfoSchema = new Schema({
    empId: { type: String, required: true, unique: true },
    FirstName: { type: String, required: true, trim: true },
    MiddleName: { type: String, required: false, trim: true },
    LastName: { type: String, required: true, trim: true },
    Email: { type: String, required: true, unique: true, match: /.+\@.+\..+/ },
    Gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
    DOB: { type: Date, required: true },
    DateOfJoining: { type: Date, required: true },
    YearOfPassing: { type: Number, required: true },
    ContactNo: { type: String, required: true, match: /^\d{10}$/ },
    education: { type: String, required: true },
    workExperience: { type: String, required: true, min: 0 },
    BloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], default: 'O+' },
    EmergencyContactNo: { type: String, match: /^\d{10}$/ },
    PANcardNo: { type: String, match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/ },
    AdharcardNo: { type: String, match: /^\d{12}$/ },
    PermanetAddress: { type: String, trim: true },
    PresentAddress: { type: String, trim: true },
    status: { type: String, required: true, enum: ["Approve", "Reject", "Pending"] },
    PhysicallyDisabled: { type: String, enum: ["Yes", 'No'] },
    maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'], default: 'Single' },
    CollageName: { type: String, required: true },
    currentlyWrokingProject: { type: String, required: true },
    currentManager: { type: String, required: true },
    skillAndExperience: { type: [skillandExp], default: [] }
}, {
    timestamps: true
});

const userInfo = model('Userdata', userInfoSchema);

module.exports = userInfo;
