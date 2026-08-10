const Asset = require('../../models/Asset');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');

exports.addMaintenanceRecord = async (req, res) => {
    const { assetId, issueReported, vendor } = req.body;

    try {
        if (!assetId || !issueReported) {
            return sendErrorResponse(res, 400, "assetId and issueReported are required");
        }

        const asset = await Asset.findOne({ assetId });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (asset.status === 'Assigned') {
            return sendErrorResponse(res, 400, "Asset is currently assigned, return it before sending for maintenance");
        }

        asset.maintenanceHistory.push({
            issueReported,
            reportedDate: new Date(),
            vendor,
            status: 'Pending'
        });

        asset.status = 'UnderMaintenance';

        await asset.save();

        return sendSuccessResponse(res, 200, 'Maintenance record added successfully', asset);

    } catch (error) {
        console.log(error);
        if (error.name === 'ValidationError') {
            return sendErrorResponse(res, 400, "Validation error occurred", error);
        }
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.updateMaintenanceRecord = async (req, res) => {
    const { assetId, maintenanceId, status, cost, remarks } = req.body;

    try {
        if (!assetId || !maintenanceId || !status) {
            return sendErrorResponse(res, 400, "assetId, maintenanceId and status are required");
        }

        const asset = await Asset.findOne({ assetId });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        const record = asset.maintenanceHistory.find(item => item._id == maintenanceId);
        if (!record) {
            return sendErrorResponse(res, 404, "Maintenance record not found");
        }

        record.status = status;
        record.cost = cost || record.cost;
        record.remarks = remarks || record.remarks;

        if (status === 'Resolved') {
            record.resolvedDate = new Date();
            asset.status = 'Available';
        }

        await asset.save();

        return sendSuccessResponse(res, 200, 'Maintenance record updated successfully', asset);

    } catch (error) {
        console.log(error);
        if (error.name === 'ValidationError') {
            return sendErrorResponse(res, 400, "Validation error occurred", error);
        }
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getMaintenanceHistory = async (req, res) => {
    const { assetId } = req.query;

    try {
        const asset = await Asset.findOne({ assetId }, { maintenanceHistory: 1, assetId: 1 });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        return sendSuccessResponse(res, 200, 'Maintenance history retrieved successfully', asset.maintenanceHistory);

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};
