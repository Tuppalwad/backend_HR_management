const { Schema, model } = require('mongoose');

const skillandExp = new Schema({
    skill: { type: String, required: true },
    experience: { type: String, required: true, min: 0 },
});

const userInfoSchema = new Schema({
    empId: { type: String, required: true, unique: true },

    // Section 1: Employee Basic Details
    // EmployeeID: { type: String, required: true, trim: true },
    CurrentEmpId: { type: String, required: true, unique: true },
    FirstName: { type: String, required: true, trim: true },
    LastName: { type: String, required: true, trim: true },
    DateOfJoining: { type: Date, required: true },
    MobileNo: { type: String, required: true, match: /^\d{10}$/ },
    Email: { type: String, required: false, match: /.+\@.+\..+/ }, // Official email is optional
    Designation: { type: String, required: true, trim: true },
    Gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
    WorkMode: { type: String, required: true, enum: ['Remote', 'On-site', 'Hybrid'] },
    EmploymentType: { type: String, required: true, enum: ['Permanent', 'Contractual'] },
    
    // Section 2: Employee Basic Details Part 2
    DOB: { type: Date, required: true },
    EmergencyContactNo: { type: String, required: true, match: /^\d{10}$/ },
    EmergencyContactPersonName: { type: String, required: true, trim: true },
    CurrentCity: { type: String, required: true, trim: true },
    FathersName: { type: String, required: true, trim: true },
    MaritalStatus: { type: String, required: true, enum: ['Married', 'Unmarried'] },
    SpouseName: { type: String, required: false, trim: true }, // Optional, required if married
    
    // Mandate ID & Bank Details
    PFMember: { type: String, required: true, enum: ['Yes', 'No'] },
    UANNo: { type: String, required: true, trim: true },
    BankAccountNo: { type: String, required: true, trim: true },
    IFSCCode: { type: String, required: true, trim: true, match: /^[A-Z]{4}0[A-Z0-9]{6}$/ },
    NameAsPerAadhar: { type: String, required: true, trim: true },
    PANNo: { type: String, required: true, match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/ },
    AadharNo: { type: String, required: true, match: /^\d{12}$/ },
    PassportNo: { type: String, required: false, trim: true }, // Optional
    
    // Laptop Details
    LaptopType: { type: String, required: true, enum: ['Personal', 'Official', 'Both'] },
    HavingOfficialInUse: { type: String, required: true, enum: ['Yes', 'No'] },
    OfficialLaptopSrNo: { type: String, required: false, trim: true }, // Required if HavingOfficialInUse is Yes
    LaptopPhoto: { type: String, required: false }, // Optional - URL or base64
    OfficialUpgrades: { type: String, required: false, trim: true }, // Conditional - if using personal laptop
    RAM: { type: String, required: true, trim: true },
    StorageType: { type: String, required: true, enum: ['SSD', 'HDD'] },
    StorageSpace: { type: String, required: true, trim: true },
    AdditionalConfigurations: { type: String, required: false, trim: true }, // Optional
    
    // Career Details
    HighestQualification: { type: String, required: true, trim: true },
    AdditionalCourses: { type: String, required: false, trim: true }, // Optional
    TotalEXP: { type: String, required: true, trim: true },
    skillAndExperience: { type: [skillandExp], default: [] }, // Optional skills
    
    status: { type: String, required: true, enum: ["Approve", "Reject", "Pending"] }
}, {
    timestamps: true
});

const userInfo = model('Userdata', userInfoSchema);

module.exports = userInfo;
