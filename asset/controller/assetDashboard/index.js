const Asset = require('../../models/Asset');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');
const { ASSET_STATUS, ASSET_CATEGORIES } = require('../../constant/assetEnums');

exports.getAssetCountByStatus = async (req, res) => {
    try {
        const counts = await Asset.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);

        const data = ASSET_STATUS.map(status => {
            const found = counts.find(item => item._id === status);
            return { status, count: found ? found.count : 0 };
        });

        return sendSuccessResponse(res, 200, 'Asset status count fetched successfully', data);

    } catch (error) {
        console.error(error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};

exports.getAssetCountByCategory = async (req, res) => {
    try {
        const counts = await Asset.aggregate([
            {
                $group: {
                    _id: '$category',
                    count: { $sum: 1 }
                }
            }
        ]);

        const data = ASSET_CATEGORIES.map(category => {
            const found = counts.find(item => item._id === category);
            return { category, count: found ? found.count : 0 };
        });

        return sendSuccessResponse(res, 200, 'Asset category count fetched successfully', data);

    } catch (error) {
        console.error(error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};

exports.getWarrantyExpiringAssets = async (req, res) => {
    const days = req.query.days ? parseInt(req.query.days) : 30;

    try {
        const today = new Date();
        const upcomingDate = new Date();
        upcomingDate.setDate(today.getDate() + days);

        const assets = await Asset.find({
            warrantyExpiryDate: { $gte: today, $lte: upcomingDate }
        });

        return sendSuccessResponse(res, 200, 'Warranty expiring assets fetched successfully', assets);

    } catch (error) {
        console.error(error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};

exports.getAssetOverview = async (req, res) => {
    try {
        const totalAssets = await Asset.countDocuments();
        const assignedAssets = await Asset.countDocuments({ status: 'Assigned' });
        const availableAssets = await Asset.countDocuments({ status: 'Available' });
        const underMaintenanceAssets = await Asset.countDocuments({ status: 'UnderMaintenance' });

        const data = {
            totalAssets,
            assignedAssets,
            availableAssets,
            underMaintenanceAssets
        };

        return sendSuccessResponse(res, 200, 'Asset overview fetched successfully', data);

    } catch (error) {
        console.error(error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};
