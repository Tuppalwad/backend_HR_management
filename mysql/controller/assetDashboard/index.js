const prisma = require('../../utils/prismaClient');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');
const { ASSET_STATUS, ASSET_CATEGORIES } = require('../../../asset/constant/assetEnums');
const { num } = require('../../utils/serialize');
const { fromPrismaEnum } = require('../../utils/enumMap');

exports.getAssetCountByStatus = async (req, res) => {
    try {
        const counts = await prisma.asset.groupBy({ by: ['status'], _count: { status: true } });

        const data = ASSET_STATUS.map(status => {
            const found = counts.find(item => item.status === status);
            return { status, count: found ? found._count.status : 0 };
        });

        return sendSuccessResponse(res, 200, 'Asset status count fetched successfully', data);

    } catch (error) {
        console.error(error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};

exports.getAssetCountByCategory = async (req, res) => {
    try {
        const counts = await prisma.asset.groupBy({ by: ['category'], _count: { category: true } });

        const data = ASSET_CATEGORIES.map(category => {
            const found = counts.find(item => item.category === category);
            return { category, count: found ? found._count.category : 0 };
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

        const assets = await prisma.asset.findMany({
            where: { warrantyExpiryDate: { gte: today, lte: upcomingDate } }
        });

        const data = assets.map(a => ({ ...a, condition: fromPrismaEnum('condition', a.condition), purchaseCost: num(a.purchaseCost) }));

        return sendSuccessResponse(res, 200, 'Warranty expiring assets fetched successfully', data);

    } catch (error) {
        console.error(error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};

exports.getAssetOverview = async (req, res) => {
    try {
        const totalAssets = await prisma.asset.count();
        const assignedAssets = await prisma.asset.count({ where: { status: 'Assigned' } });
        const availableAssets = await prisma.asset.count({ where: { status: 'Available' } });
        const underMaintenanceAssets = await prisma.asset.count({ where: { status: 'UnderMaintenance' } });

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
