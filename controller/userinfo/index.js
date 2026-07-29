const { sendErrorResponse, sendSuccessResponse } = require('../../utils/common');

const userInfo = require('../../models/userInfo');
const { sendNotification, sendPushNotification } = require('../notification');


exports.setOrUpdateUserInfo = async (req, res) => {
    try {
        console.log('setOrUpdateUserInfo - Request body:', req.body);
        
        const {
            // Section 1: Employee Basic Details
            CurrentEmpId,
            FirstName,
            LastName,
            DateOfJoining,
            MobileNo,
            Email,
            Designation,
            Gender,
            WorkMode,
            EmploymentType,
            
            // Section 2: Employee Basic Details Part 2
            DOB,
            EmergencyContactNo,
            EmergencyContactPersonName,
            CurrentCity,
            FathersName,
            MaritalStatus,
            SpouseName,
            
            // Mandate ID & Bank Details
            PFMember,
            UANNo,
            BankAccountNo,
            IFSCCode,
            NameAsPerAadhar,
            PANNo,
            AadharNo,
            PassportNo,
            
            // Laptop Details
            LaptopType,
            HavingOfficialInUse,
            OfficialLaptopSrNo,
            LaptopPhoto,
            OfficialUpgrades,
            RAM,
            StorageType,
            StorageSpace,
            AdditionalConfigurations,
            
            // Career Details
            HighestQualification,
            AdditionalCourses,
            TotalEXP,
            skillAndExperience,
            
            // Employee ID
            empId
        } = req.body;

        const requiredFields = [
            'empId',
            // Section 1 required fields
            'CurrentEmpId',
            'FirstName',
            'LastName',
            'DateOfJoining',
            'MobileNo',
            'Designation',
            'Gender',
            'WorkMode',
            'EmploymentType',
            // Section 2 required fields
            'DOB',
            'EmergencyContactNo',
            'EmergencyContactPersonName',
            'CurrentCity',
            'FathersName',
            'MaritalStatus',
            // Bank Details required fields
            'PFMember',
            'UANNo',
            'BankAccountNo',
            'IFSCCode',
            'NameAsPerAadhar',
            'PANNo',
            'AadharNo',
            // Laptop Details required fields
            'LaptopType',
            'HavingOfficialInUse',
            'RAM',
            'StorageType',
            'StorageSpace',
            // Career Details required fields
            'HighestQualification',
            'TotalEXP'
        ];

        // Log each required field and its value
        // requiredFields.forEach(field => {
        //     console.log(`${field}: ${req.body[field]}`);
        // });

        // Check if any required field is missing
        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return sendErrorResponse(res, 400, `All required fields must be provided: ${missingFields.join(', ')}`);
        }

        // Conditional validation: SpouseName required if MaritalStatus is 'Married'
        if (MaritalStatus === 'Married' && !SpouseName) {
            return sendErrorResponse(res, 400, 'Spouse Name is required when Marital Status is Married');
        }

        // Conditional validation: OfficialLaptopSrNo required if HavingOfficialInUse is 'Yes'
        if (HavingOfficialInUse === 'Yes' && !OfficialLaptopSrNo) {
            return sendErrorResponse(res, 400, 'Official Laptop Sr. No is required when Having Official In Use is Yes');
        }

        // Validation: EmergencyContactNo should not be same as MobileNo
        if (EmergencyContactNo === MobileNo) {
            return sendErrorResponse(res, 400, 'Emergency Contact No should not be same as Mobile No');
        }

        // Validation: PAN No must be 10 characters
        if (PANNo && PANNo.length !== 10) {
            return sendErrorResponse(res, 400, 'PAN No must be 10 characters');
        }

        // Validation: Aadhar No must be 12 digits
        if (AadharNo && AadharNo.length !== 12) {
            return sendErrorResponse(res, 400, 'Aadhar No must be 12 digits');
        }

        // Check if user information already exists
        const existingUser = await userInfo.findOne({ empId });
        let userInfoData;

        if (existingUser) {
            // Update existing user information
            userInfoData = await userInfo.findOneAndUpdate(
                { empId },
                {
                    // Section 1
                    // EmployeeID,
                    CurrentEmpId,
                    FirstName,
                    LastName,
                    DateOfJoining,
                    MobileNo,
                    Email,
                    Designation,
                    Gender,
                    WorkMode,
                    EmploymentType,
                    // Section 2
                    DOB,
                    EmergencyContactNo,
                    EmergencyContactPersonName,
                    CurrentCity,
                    FathersName,
                    MaritalStatus,
                    SpouseName,
                    // Bank Details
                    PFMember,
                    UANNo,
                    BankAccountNo,
                    IFSCCode,
                    NameAsPerAadhar,
                    PANNo,
                    AadharNo,
                    PassportNo,
                    // Laptop Details
                    LaptopType,
                    HavingOfficialInUse,
                    OfficialLaptopSrNo,
                    LaptopPhoto,
                    OfficialUpgrades,
                    RAM,
                    StorageType,
                    StorageSpace,
                    AdditionalConfigurations,
                    // Career Details
                    HighestQualification,
                    AdditionalCourses,
                    TotalEXP,
                    skillAndExperience
                },
                { new: true, runValidators: true }
            );

            console.log('setOrUpdateUserInfo - Updated user data:', userInfoData);
            return sendSuccessResponse(res, 200, "User information updated successfully", userInfoData);
        } else {
            // Create new user information with initial status "Pending"
            userInfoData = await userInfo.create({
                // Section 1
                // EmployeeID,
                empId,
                CurrentEmpId,
                FirstName,
                LastName,
                DateOfJoining,
                MobileNo,
                Email,
                Designation,
                Gender,
                WorkMode,
                EmploymentType,
                // Section 2
                DOB,
                EmergencyContactNo,
                EmergencyContactPersonName,
                CurrentCity,
                FathersName,
                MaritalStatus,
                SpouseName,
                // Bank Details
                PFMember,
                UANNo,
                BankAccountNo,
                IFSCCode,
                NameAsPerAadhar,
                PANNo,
                AadharNo,
                PassportNo,
                // Laptop Details
                LaptopType,
                HavingOfficialInUse,
                OfficialLaptopSrNo,
                LaptopPhoto,
                OfficialUpgrades,
                RAM,
                StorageType,
                StorageSpace,
                AdditionalConfigurations,
                // Career Details
                HighestQualification,
                AdditionalCourses,
                TotalEXP,
                skillAndExperience,
                status: "Pending"
            });

            console.log('setOrUpdateUserInfo - Created new user data:', userInfoData);
            return sendSuccessResponse(res, 200, "User information added successfully", userInfoData);
        }
    } catch (err) {
        console.log(err, 'err');
        if (err.name === 'ValidationError') {
            return sendErrorResponse(res, 400, "Validation error occurred", err);
        }
        return sendErrorResponse(res, 500, "Something went wrong", err);
    }
};


exports.getuserInfo = async (req, res) => {
    try {
        const { empId } = req.body;
        console.log('getuserInfo - Request empId:', empId);

        // Fetch user information based on user ID
        const user = await userInfo.findOne({ empId });
        console.log('getuserInfo - Retrieved user data:', user);

        // Check if user information exists
        if (!user) {
            return sendErrorResponse(res, 400, "User information not found");
        }

        // Send a success message with the user information
        return sendSuccessResponse(res, 200, 'User information retrieved successfully', user);

    } catch (err) {
        // Handle errors
        console.log('getuserInfo - Error:', err);
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
};



exports.getAllEmployeeinfo = async (req, res) => {
    try {
        // Fetch all user information
        const users = await userInfo.find();

        // Check if user information exists
        if (!users) {
            return sendErrorResponse(res, 400, "User information not found");
        }

        // Send a success message with the user information
        return sendSuccessResponse(res, 200, 'User information retrieved successfully', users);

    } catch (err) {
        // Handle errors
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
}



exports.updateUserInfoStatus = async (req, res) => {
    try {
        const { empId, status } = req.body;

        // Validate request parameters
        if (!empId || !status) {
            return sendErrorResponse(res, 400, "User ID and status are required");
        }

        // Find and update user information status
        const userInfoData = await userInfo.findOneAndUpdate(
            { empId },
            { status },
            { new: true, runValidators: true }
        );

        // Check if user information exists
        if (!userInfoData) {
            return sendErrorResponse(res, 400, "User information not found");
        }
        const body = `Your request is ${status}`
        sendPushNotification(empId, "Your Infomrmation status", body);
        // Send a success message with the updated user information
        return sendSuccessResponse(res, 200, "User information status updated successfully", userInfoData);

    } catch (err) {
        // Handle errors
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
}



exports.searchUserInfo = async (req, res) => {
    try {
        const { name, skill, experience } = req.query; // Extract parameters from request query

        const query = {};

        // Handling name filtering
        if (name) {
            const nameParts = name.trim().split(/\s+/); // Split name by spaces
            if (nameParts.length === 1) {
                query.$or = [
                    { FirstName: { $regex: nameParts[0], $options: 'i' } },
                    { LastName: { $regex: nameParts[0], $options: 'i' } }
                ];
            } else if (nameParts.length >= 2) {
                query.$and = [
                    { FirstName: { $regex: nameParts[0], $options: 'i' } },
                    { LastName: { $regex: nameParts.slice(1).join(" "), $options: 'i' } } // Handles multi-part last names
                ];
            }
        }

        // Filter by skill and experience
        if (skill || experience) {
            query.skillAndExperience = { $elemMatch: {} };

            if (skill) {
                // Convert skill into an array if it's not already one
                const skillArray = Array.isArray(skill) ? skill : skill.split(',').map(s => s.trim());
                query.skillAndExperience.$elemMatch.skill = { $in: skillArray.map(s => new RegExp(s, 'i')) };
            }

            if (experience) {
                query.skillAndExperience.$elemMatch.experience = experience;
            }
        }

        // If no filters provided, return all users
        const users = Object.keys(query).length ? await userInfo.find(query) : await userInfo.find({});

        return sendSuccessResponse(res, 200, "User information", users);

    } catch (error) {
        console.error('Error fetching users:', error);
        sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

