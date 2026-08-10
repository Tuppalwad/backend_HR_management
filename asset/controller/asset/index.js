const Asset = require('../../models/Asset');
const User = require('../../models/User');
const { sendErrorResponse, sendSuccessResponse } = require('../../utils/common');
const { sendEmail } = require('../../utils/email');
const { sendPushNotification } = require('../../controller/notification');
const assetAssignHtml = require('../../utils/htmlText/assetAssignHtml');
const assetReturnHtml = require('../../utils/htmlText/assetReturnHtml');
const { ASSET_CATEGORIES, ASSET_STATUS, CONDITIONS } = require('../../constant/assetEnums');

// Generate a unique asset ID based on category
const generateAssetId = (category) => {
    const prefix = category.substring(0, 3).toUpperCase();
    return `AST-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
};

exports.addAsset = async (req, res) => {
    const { category, brand, modelName, serialNumber, specifications, purchaseDate, purchaseCost, vendor, warrantyExpiryDate, condition, locationType, currentLocation, documents, notes } = req.body;

    try {
        if (!category || !brand || !modelName || !purchaseDate) {
            return sendErrorResponse(res, 400, "Category, brand, model name and purchase date are required");
        }

        if (serialNumber) {
            const checkSerial = await Asset.findOne({ serialNumber });
            if (checkSerial) {
                return sendErrorResponse(res, 401, "An asset with this serial number already exists");
            }
        }

        const assetId = generateAssetId(category);

        const newAsset = new Asset({
            assetId,
            category,
            brand,
            modelName,
            serialNumber,
            specifications,
            purchaseDate,
            purchaseCost,
            vendor,
            warrantyExpiryDate,
            condition: condition || 'New',
            locationType: locationType || 'Warehouse',
            currentLocation,
            documents,
            notes
        });

        await newAsset.save();

        return sendSuccessResponse(res, 201, 'Asset added successfully', { assetId });

    } catch (error) {
        console.log(error);
        if (error.name === 'ValidationError') {
            return sendErrorResponse(res, 400, "Validation error occurred", error);
        }
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.editAsset = async (req, res) => {
    const { assetId, category, brand, modelName, serialNumber, specifications, purchaseDate, purchaseCost, vendor, warrantyExpiryDate, condition, locationType, currentLocation, documents, notes } = req.body;

    try {
        const asset = await Asset.findOne({ assetId });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (serialNumber && serialNumber !== asset.serialNumber) {
            const checkSerial = await Asset.findOne({ serialNumber, assetId: { $ne: assetId } });
            if (checkSerial) {
                return sendErrorResponse(res, 401, "An asset with this serial number already exists");
            }
        }

        asset.category = category || asset.category;
        asset.brand = brand || asset.brand;
        asset.modelName = modelName || asset.modelName;
        asset.serialNumber = serialNumber || asset.serialNumber;
        asset.specifications = specifications || asset.specifications;
        asset.purchaseDate = purchaseDate || asset.purchaseDate;
        asset.purchaseCost = purchaseCost || asset.purchaseCost;
        asset.vendor = vendor || asset.vendor;
        asset.warrantyExpiryDate = warrantyExpiryDate || asset.warrantyExpiryDate;
        asset.condition = condition || asset.condition;
        asset.locationType = locationType || asset.locationType;
        asset.currentLocation = currentLocation || asset.currentLocation;
        asset.documents = documents || asset.documents;
        asset.notes = notes || asset.notes;

        await asset.save();

        return sendSuccessResponse(res, 200, 'Asset updated successfully', asset);

    } catch (error) {
        console.log(error);
        if (error.name === 'ValidationError') {
            return sendErrorResponse(res, 400, "Validation error occurred", error);
        }
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.deleteAsset = async (req, res) => {
    const { assetId } = req.query;

    try {
        const asset = await Asset.findOne({ assetId });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (asset.assignmentHistory.length > 0) {
            return sendErrorResponse(res, 400, "Asset has assignment history, retire it instead of deleting");
        }

        await Asset.deleteOne({ assetId });

        return sendSuccessResponse(res, 200, 'Asset deleted successfully');

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.retireAsset = async (req, res) => {
    const { assetId } = req.body;

    try {
        const asset = await Asset.findOne({ assetId });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (asset.status === 'Assigned') {
            return sendErrorResponse(res, 400, "Asset is currently assigned, return it before retiring");
        }

        asset.status = 'Retired';
        await asset.save();

        return sendSuccessResponse(res, 200, 'Asset retired successfully', asset);

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getAsset = async (req, res) => {
    const { assetId } = req.query;

    try {
        const asset = await Asset.findOne({ assetId });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        return sendSuccessResponse(res, 200, 'Asset retrieved successfully', asset);

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getAllAssets = async (req, res) => {
    const { category, status, condition } = req.query;

    try {
        const query = {};
        if (category) query.category = category;
        if (status) query.status = status;
        if (condition) query.condition = condition;

        const assets = await Asset.find(query);

        return sendSuccessResponse(res, 200, 'Assets retrieved successfully', assets);

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.searchAsset = async (req, res) => {
    const { query } = req.query;

    try {
        if (!query) {
            return sendErrorResponse(res, 400, "Search query is required");
        }

        const assets = await Asset.find({
            $or: [
                { serialNumber: { $regex: query, $options: 'i' } },
                { brand: { $regex: query, $options: 'i' } },
                { modelName: { $regex: query, $options: 'i' } }
            ]
        });

        return sendSuccessResponse(res, 200, 'Assets retrieved successfully', assets);

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getAssetsByEmpId = async (req, res) => {
    const { empId } = req.query;

    try {
        if (!empId) {
            return sendErrorResponse(res, 400, "empId is required");
        }

        const assets = await Asset.find({ 'currentAssignee.empId': empId, status: 'Assigned' });

        return sendSuccessResponse(res, 200, 'Assets retrieved successfully', assets);

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getEmployeeAssetHistory = async (req, res) => {
    const { empId } = req.query;

    try {
        if (!empId) {
            return sendErrorResponse(res, 400, "empId is required");
        }

        const assets = await Asset.find({ 'assignmentHistory.empId': empId });

        return sendSuccessResponse(res, 200, 'Employee asset history retrieved successfully', assets);

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getAssetHistory = async (req, res) => {
    const { assetId } = req.query;

    try {
        const asset = await Asset.findOne({ assetId }, { assignmentHistory: 1, assetId: 1 });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        return sendSuccessResponse(res, 200, 'Asset history retrieved successfully', asset.assignmentHistory);

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.assignAsset = async (req, res) => {
    const { assetId, empId, conditionAtAssign, remarks, assignedBy } = req.body;

    try {
        if (!assetId || !empId || !conditionAtAssign || !assignedBy) {
            return sendErrorResponse(res, 400, "assetId, empId, conditionAtAssign and assignedBy are required");
        }

        const asset = await Asset.findOne({ assetId });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (asset.status !== 'Available') {
            return sendErrorResponse(res, 400, "Asset is not available for assignment");
        }

        const employee = await User.findOne({ empId });
        if (!employee) {
            return sendErrorResponse(res, 404, "Employee not found");
        }

        const empName = `${employee.firstName} ${employee.lastName}`;
        const assignedDate = new Date();

        asset.assignmentHistory.push({
            empId,
            empName,
            assignedDate,
            conditionAtAssign,
            remarks,
            assignedBy,
            status: 'Active'
        });

        asset.currentAssignee = { empId, empName, assignedDate };
        asset.status = 'Assigned';
        asset.condition = conditionAtAssign;

        await asset.save();

        const { subject, html } = assetAssignHtml(empName, asset.category, `${asset.brand} ${asset.modelName}`, asset.assetId, assignedDate);
        if (employee.email) {
            await sendEmail([employee.email], subject, html);
        }
        sendPushNotification(empId, "Asset Assigned", `${asset.category} (${asset.assetId}) has been assigned to you`);

        return sendSuccessResponse(res, 200, 'Asset assigned successfully', asset);

    } catch (error) {
        console.log(error);
        if (error.name === 'ValidationError') {
            return sendErrorResponse(res, 400, "Validation error occurred", error);
        }
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.returnAsset = async (req, res) => {
    const { assetId, conditionAtReturn, remarks } = req.body;

    try {
        if (!assetId || !conditionAtReturn) {
            return sendErrorResponse(res, 400, "assetId and conditionAtReturn are required");
        }

        const asset = await Asset.findOne({ assetId });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (asset.status !== 'Assigned') {
            return sendErrorResponse(res, 400, "Asset is not currently assigned");
        }

        const activeAssignment = asset.assignmentHistory.find(record => record.status === 'Active');
        if (!activeAssignment) {
            return sendErrorResponse(res, 400, "Active assignment record not found for this asset");
        }

        const empId = activeAssignment.empId;
        const empName = activeAssignment.empName;

        activeAssignment.returnDate = new Date();
        activeAssignment.conditionAtReturn = conditionAtReturn;
        activeAssignment.remarks = remarks || activeAssignment.remarks;
        activeAssignment.status = 'Returned';

        asset.currentAssignee = undefined;
        asset.condition = conditionAtReturn;
        asset.status = conditionAtReturn === 'Damaged' || conditionAtReturn === 'Beyond Repair' ? 'UnderMaintenance' : 'Available';

        await asset.save();

        const employee = await User.findOne({ empId });

        const { subject, html } = assetReturnHtml(empName, asset.category, `${asset.brand} ${asset.modelName}`, asset.assetId, activeAssignment.returnDate);
        if (employee && employee.email) {
            await sendEmail([employee.email], subject, html);
        }
        sendPushNotification(empId, "Asset Returned", `${asset.category} (${asset.assetId}) has been marked as returned`);

        return sendSuccessResponse(res, 200, 'Asset returned successfully', asset);

    } catch (error) {
        console.log(error);
        if (error.name === 'ValidationError') {
            return sendErrorResponse(res, 400, "Validation error occurred", error);
        }
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.transferAsset = async (req, res) => {
    const { assetId, newEmpId, conditionAtReturn, conditionAtAssign, remarks, assignedBy } = req.body;

    try {
        if (!assetId || !newEmpId || !conditionAtReturn || !conditionAtAssign || !assignedBy) {
            return sendErrorResponse(res, 400, "assetId, newEmpId, conditionAtReturn, conditionAtAssign and assignedBy are required");
        }

        const asset = await Asset.findOne({ assetId });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (asset.status !== 'Assigned') {
            return sendErrorResponse(res, 400, "Asset is not currently assigned");
        }

        const newEmployee = await User.findOne({ empId: newEmpId });
        if (!newEmployee) {
            return sendErrorResponse(res, 404, "Employee not found");
        }

        const activeAssignment = asset.assignmentHistory.find(record => record.status === 'Active');
        if (!activeAssignment) {
            return sendErrorResponse(res, 400, "Active assignment record not found for this asset");
        }

        activeAssignment.returnDate = new Date();
        activeAssignment.conditionAtReturn = conditionAtReturn;
        activeAssignment.status = 'Returned';

        const newEmpName = `${newEmployee.firstName} ${newEmployee.lastName}`;
        const assignedDate = new Date();

        asset.assignmentHistory.push({
            empId: newEmpId,
            empName: newEmpName,
            assignedDate,
            conditionAtAssign,
            remarks,
            assignedBy,
            status: 'Active'
        });

        asset.currentAssignee = { empId: newEmpId, empName: newEmpName, assignedDate };
        asset.condition = conditionAtAssign;

        await asset.save();

        const { subject, html } = assetAssignHtml(newEmpName, asset.category, `${asset.brand} ${asset.modelName}`, asset.assetId, assignedDate);
        if (newEmployee.email) {
            await sendEmail([newEmployee.email], subject, html);
        }
        sendPushNotification(newEmpId, "Asset Assigned", `${asset.category} (${asset.assetId}) has been assigned to you`);

        return sendSuccessResponse(res, 200, 'Asset transferred successfully', asset);

    } catch (error) {
        console.log(error);
        if (error.name === 'ValidationError') {
            return sendErrorResponse(res, 400, "Validation error occurred", error);
        }
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getAssetCategories = async (req, res) => {
    try {
        return sendSuccessResponse(res, 200, 'Asset categories fetched successfully', { ASSET_CATEGORIES, ASSET_STATUS, CONDITIONS });
    } catch (error) {
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};
