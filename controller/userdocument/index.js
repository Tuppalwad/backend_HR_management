const UserDoc = require('../../models/userdoc');
const { sendErrorResponse, sendSuccessResponse } = require('../../utils/common');

// Set (Create) Document
const setUserDoc = async (req, res) => {
    try {
        const { empId, aadhaar, pan, hsc, ssc, passbook, domicile, passport, experienceLetter, offerLetter, form16, appointmentLetter, bond } = req.body;
        
        if(!empId || !aadhaar || !pan || !hsc || !ssc || !passbook || !domicile || !passport  || !offerLetter || !appointmentLetter) {
            return sendErrorResponse(res, 400, 'All required fields must be provided');
        }
        
        const newUserDoc = new UserDoc({
            empId,
            aadhaar,
            pan,
            hsc,
            ssc,
            passbook,
            domicile,
            passport,
            experienceLetter,
            offerLetter,
            form16,
            appointmentLetter,
            bond
        });

        await newUserDoc.save();
        return sendSuccessResponse(res, 200, 'Document created successfully');
    } catch (error) {
        return sendErrorResponse(res,500 , 'Failed to create document',error);
    }
};

// Change (Update) Document
const updateUserDoc = async (req, res) => {
    try {
        const updateData = req.body;
        const updatedUserDoc = await UserDoc.findOneAndUpdate({ empId: updateData.empId },
            updateData,
            { new: true, runValidators: true });

        if (!updatedUserDoc) {
            return sendErrorResponse(res, 404, 'User with this empId not found');
        }

        return sendSuccessResponse(res, 200, 'Document updated successfully');
    } catch (error) {
        return sendErrorResponse(res, 500, 'Failed to update document',error);
    }
};

// Delete Document
const deleteUserDoc = async (req, res) => {
    try {
        const { empId } = req.params;
        const deletedUserDoc = await UserDoc.findOne({empId});

        if (!deletedUserDoc) {
            return sendErrorResponse(res, null, 'Document not found', 404);
        }

        await UserDoc.deleteOne({empId});

        return sendSuccessResponse(res, 200, 'Document deleted successfully');
    } catch (error) {
        sendErrorResponse(res, 500, 'Failed to delete document',error);
    }
};

module.exports = {
    setUserDoc,
    updateUserDoc,
    deleteUserDoc
};
