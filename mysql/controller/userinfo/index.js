const prisma = require('../../utils/prismaClient');
const { toPrismaEnum, fromPrismaEnum } = require('../../utils/enumMap');
const { toDate } = require('../../utils/dateHelper');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');
const { sendPushNotification } = require('../notification');

const toProfileResponse = (profile) => profile ? { ...profile, workMode: fromPrismaEnum('workMode', profile.workMode) } : profile;

exports.setOrUpdateUserInfo = async (req, res) => {
    try {
        const {
            CurrentEmpId, FirstName, LastName, DateOfJoining, MobileNo, Email, Designation, Gender,
            WorkMode, EmploymentType, DOB, EmergencyContactNo, EmergencyContactPersonName, CurrentCity,
            FathersName, MaritalStatus, SpouseName, PFMember, UANNo, BankAccountNo, IFSCCode,
            NameAsPerAadhar, PANNo, AadharNo, PassportNo, LaptopType, HavingOfficialInUse,
            OfficialLaptopSrNo, LaptopPhoto, OfficialUpgrades, RAM, StorageType, StorageSpace,
            AdditionalConfigurations, HighestQualification, AdditionalCourses, TotalEXP,
            skillAndExperience, empId
        } = req.body;

        const requiredFields = [
            'empId', 'CurrentEmpId', 'FirstName', 'LastName', 'DateOfJoining', 'MobileNo',
            'Designation', 'Gender', 'WorkMode', 'EmploymentType', 'DOB', 'EmergencyContactNo',
            'EmergencyContactPersonName', 'CurrentCity', 'FathersName', 'MaritalStatus',
            'PFMember', 'UANNo', 'BankAccountNo', 'IFSCCode', 'NameAsPerAadhar', 'PANNo', 'AadharNo',
            'LaptopType', 'HavingOfficialInUse', 'RAM', 'StorageType', 'StorageSpace',
            'HighestQualification', 'TotalEXP'
        ];

        const missingFields = requiredFields.filter(field => !req.body[field]);
        if (missingFields.length > 0) {
            return sendErrorResponse(res, 400, `All required fields must be provided: ${missingFields.join(', ')}`);
        }

        if (MaritalStatus === 'Married' && !SpouseName) {
            return sendErrorResponse(res, 400, 'Spouse Name is required when Marital Status is Married');
        }
        if (HavingOfficialInUse === 'Yes' && !OfficialLaptopSrNo) {
            return sendErrorResponse(res, 400, 'Official Laptop Sr. No is required when Having Official In Use is Yes');
        }
        if (EmergencyContactNo === MobileNo) {
            return sendErrorResponse(res, 400, 'Emergency Contact No should not be same as Mobile No');
        }
        if (PANNo && PANNo.length !== 10) {
            return sendErrorResponse(res, 400, 'PAN No must be 10 characters');
        }
        if (AadharNo && AadharNo.length !== 12) {
            return sendErrorResponse(res, 400, 'Aadhar No must be 12 digits');
        }

        const data = {
            currentEmpId: CurrentEmpId,
            firstName: FirstName,
            lastName: LastName,
            dateOfJoining: toDate(DateOfJoining),
            mobileNo: MobileNo,
            email: Email || null,
            designation: Designation,
            gender: Gender,
            workMode: toPrismaEnum('workMode', WorkMode),
            employmentType: EmploymentType,
            dob: toDate(DOB),
            emergencyContactNo: EmergencyContactNo,
            emergencyContactPersonName: EmergencyContactPersonName,
            currentCity: CurrentCity,
            fathersName: FathersName,
            maritalStatus: MaritalStatus,
            spouseName: SpouseName || null,
            pfMember: PFMember,
            uanNo: UANNo,
            bankAccountNo: BankAccountNo,
            ifscCode: IFSCCode,
            nameAsPerAadhar: NameAsPerAadhar,
            panNo: PANNo,
            aadharNo: AadharNo,
            passportNo: PassportNo || null,
            laptopType: LaptopType,
            havingOfficialInUse: HavingOfficialInUse,
            officialLaptopSrNo: OfficialLaptopSrNo || null,
            laptopPhoto: LaptopPhoto || null,
            officialUpgrades: OfficialUpgrades || null,
            ram: RAM,
            storageType: StorageType,
            storageSpace: StorageSpace,
            additionalConfigurations: AdditionalConfigurations || null,
            highestQualification: HighestQualification,
            additionalCourses: AdditionalCourses || null,
            totalExp: TotalEXP
        };

        const existingProfile = await prisma.employeeProfile.findUnique({ where: { empId } });

        let profile;
        if (existingProfile) {
            await prisma.employeeSkill.deleteMany({ where: { employeeProfileId: existingProfile.id } });
            profile = await prisma.employeeProfile.update({
                where: { empId },
                data: {
                    ...data,
                    skills: { create: (skillAndExperience || []).map(s => ({ skill: s.skill, experience: s.experience })) }
                },
                include: { skills: true }
            });

            return sendSuccessResponse(res, 200, "User information updated successfully", toProfileResponse(profile));
        } else {
            profile = await prisma.employeeProfile.create({
                data: {
                    empId,
                    ...data,
                    status: 'Pending',
                    skills: { create: (skillAndExperience || []).map(s => ({ skill: s.skill, experience: s.experience })) }
                },
                include: { skills: true }
            });

            return sendSuccessResponse(res, 200, "User information added successfully", toProfileResponse(profile));
        }
    } catch (err) {
        console.log(err, 'err');
        if (err.name === 'ValidationError' || err.code === 'P2002') {
            return sendErrorResponse(res, 400, "Validation error occurred", err);
        }
        return sendErrorResponse(res, 500, "Something went wrong", err);
    }
};

exports.getuserInfo = async (req, res) => {
    try {
        const { empId } = req.body;

        const user = await prisma.employeeProfile.findUnique({ where: { empId }, include: { skills: true } });

        if (!user) {
            return sendErrorResponse(res, 400, "User information not found");
        }

        return sendSuccessResponse(res, 200, 'User information retrieved successfully', toProfileResponse(user));

    } catch (err) {
        console.log('getuserInfo - Error:', err);
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
};

exports.getAllEmployeeinfo = async (req, res) => {
    try {
        const users = await prisma.employeeProfile.findMany({ include: { skills: true } });
        return sendSuccessResponse(res, 200, 'User information retrieved successfully', users.map(toProfileResponse));
    } catch (err) {
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
};

exports.updateUserInfoStatus = async (req, res) => {
    try {
        const { empId, status } = req.body;

        if (!empId || !status) {
            return sendErrorResponse(res, 400, "User ID and status are required");
        }

        const existing = await prisma.employeeProfile.findUnique({ where: { empId } });
        if (!existing) {
            return sendErrorResponse(res, 400, "User information not found");
        }

        const userInfoData = await prisma.employeeProfile.update({
            where: { empId },
            data: { status },
            include: { skills: true }
        });

        const body = `Your request is ${status}`;
        sendPushNotification(empId, "Your Infomrmation status", body);

        return sendSuccessResponse(res, 200, "User information status updated successfully", toProfileResponse(userInfoData));

    } catch (err) {
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
};

exports.searchUserInfo = async (req, res) => {
    try {
        const { name, skill, experience } = req.query;

        const where = { AND: [] };

        if (name) {
            const nameParts = name.trim().split(/\s+/);
            if (nameParts.length === 1) {
                where.AND.push({
                    OR: [
                        { firstName: { contains: nameParts[0] } },
                        { lastName: { contains: nameParts[0] } }
                    ]
                });
            } else if (nameParts.length >= 2) {
                where.AND.push({ firstName: { contains: nameParts[0] } });
                where.AND.push({ lastName: { contains: nameParts.slice(1).join(' ') } });
            }
        }

        if (skill || experience) {
            // Original used a per-skill regex (partial match, e.g. "java" matches "JavaScript"),
            // not an exact match — replicated here as an OR of `contains` rather than Prisma's
            // exact-match `in`, which would have been a real behavior regression on search.
            const skillConditions = [];
            if (skill) {
                const skillArray = Array.isArray(skill) ? skill : skill.split(',').map(s => s.trim());
                skillConditions.push({ OR: skillArray.map(s => ({ skill: { contains: s } })) });
            }
            if (experience) {
                skillConditions.push({ experience });
            }
            where.AND.push({ skills: { some: { AND: skillConditions } } });
        }

        const users = where.AND.length
            ? await prisma.employeeProfile.findMany({ where, include: { skills: true } })
            : await prisma.employeeProfile.findMany({ include: { skills: true } });

        return sendSuccessResponse(res, 200, "User information", users.map(toProfileResponse));

    } catch (error) {
        console.error('Error fetching users:', error);
        sendErrorResponse(res, 500, "Something went wrong", error);
    }
};
