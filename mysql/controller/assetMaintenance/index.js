const prisma = require('../../utils/prismaClient');
const { assetInclude, toAssetResponse, toMaintenanceResponse } = require('../../utils/assetResponse');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');

const findAsset = (assetId) => prisma.asset.findUnique({ where: { assetId }, include: assetInclude });

exports.addMaintenanceRecord = async (req, res) => {
    const { assetId, issueReported, vendor, componentChecks } = req.body;

    try {
        if (!assetId || !issueReported) {
            return sendErrorResponse(res, 400, "assetId and issueReported are required");
        }

        const asset = await prisma.asset.findUnique({ where: { assetId } });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (asset.status === 'Assigned') {
            return sendErrorResponse(res, 400, "Asset is currently assigned, return it before sending for maintenance");
        }

        await prisma.assetMaintenanceHistory.create({
            data: {
                assetId,
                issueReported,
                reportedDate: new Date(),
                vendor: vendor || null,
                status: 'Pending',
                componentChecks: componentChecks ? { create: componentChecks.map(c => ({ assetId, phase: 'MAINTENANCE', component: c.component, status: c.status })) } : undefined
            }
        });

        await prisma.asset.update({ where: { assetId }, data: { status: 'UnderMaintenance' } });

        if (componentChecks) {
            await prisma.assetComponentCheck.deleteMany({ where: { assetId, phase: 'CURRENT' } });
            await prisma.assetComponentCheck.createMany({
                data: componentChecks.map(c => ({ assetId, phase: 'CURRENT', component: c.component, status: c.status }))
            });
        }

        const updated = await findAsset(assetId);

        return sendSuccessResponse(res, 200, 'Maintenance record added successfully', toAssetResponse(updated));

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.updateMaintenanceRecord = async (req, res) => {
    const { assetId, maintenanceId, status, cost, componentChecks, remarks } = req.body;

    try {
        if (!assetId || !maintenanceId || !status) {
            return sendErrorResponse(res, 400, "assetId, maintenanceId and status are required");
        }

        const asset = await prisma.asset.findUnique({ where: { assetId } });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        const record = await prisma.assetMaintenanceHistory.findFirst({ where: { id: Number(maintenanceId), assetId } });
        if (!record) {
            return sendErrorResponse(res, 404, "Maintenance record not found");
        }

        await prisma.assetMaintenanceHistory.update({
            where: { id: record.id },
            data: {
                status,
                cost: cost != null ? cost : record.cost,
                remarks: remarks || record.remarks,
                resolvedDate: status === 'Resolved' ? new Date() : record.resolvedDate
            }
        });

        if (componentChecks) {
            await prisma.assetComponentCheck.deleteMany({ where: { maintenanceHistoryId: record.id } });
            await prisma.assetComponentCheck.createMany({
                data: componentChecks.map(c => ({ assetId, phase: 'MAINTENANCE', maintenanceHistoryId: record.id, component: c.component, status: c.status }))
            });
        }

        if (status === 'Resolved') {
            await prisma.asset.update({ where: { assetId }, data: { status: 'Available' } });

            if (componentChecks) {
                await prisma.assetComponentCheck.deleteMany({ where: { assetId, phase: 'CURRENT' } });
                await prisma.assetComponentCheck.createMany({
                    data: componentChecks.map(c => ({ assetId, phase: 'CURRENT', component: c.component, status: c.status }))
                });
            }
        }

        const updated = await findAsset(assetId);

        return sendSuccessResponse(res, 200, 'Maintenance record updated successfully', toAssetResponse(updated));

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getMaintenanceHistory = async (req, res) => {
    const { assetId } = req.query;

    try {
        const asset = await prisma.asset.findUnique({
            where: { assetId },
            include: { maintenanceHistory: { include: { componentChecks: true } } }
        });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        return sendSuccessResponse(res, 200, 'Maintenance history retrieved successfully', asset.maintenanceHistory.map(toMaintenanceResponse));

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};
