const fs = require('fs');
const prisma = require('../../utils/prismaClient');
const { assetInclude, toAssetResponse } = require('../../utils/assetResponse');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');

const ALLOWED_MIME_TYPES = ['application/pdf'];

const findAsset = (assetId) => prisma.asset.findUnique({ where: { assetId }, include: assetInclude });

exports.uploadAssetDocument = async (req, res) => {
    const { assetId, name } = req.body;

    try {
        if (!req.file) {
            return sendErrorResponse(res, 400, "Please upload a document");
        }

        if (!assetId) {
            fs.unlinkSync(req.file.path);
            return sendErrorResponse(res, 400, "assetId is required");
        }

        if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
            fs.unlinkSync(req.file.path);
            return sendErrorResponse(res, 400, "Only PDF files are allowed");
        }

        const asset = await prisma.asset.findUnique({ where: { assetId } });
        if (!asset) {
            fs.unlinkSync(req.file.path);
            return sendErrorResponse(res, 404, "Asset not found");
        }

        await prisma.assetDocument.create({
            data: {
                assetId,
                name: name || req.file.originalname,
                url: `/asset-uploads/${req.file.filename}`,
                uploadedAt: new Date()
            }
        });

        const updated = await findAsset(assetId);

        return sendSuccessResponse(res, 200, 'Document uploaded successfully', toAssetResponse(updated));

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.deleteAssetDocument = async (req, res) => {
    const { assetId, documentId } = req.query;

    try {
        if (!assetId || !documentId) {
            return sendErrorResponse(res, 400, "assetId and documentId are required");
        }

        const asset = await prisma.asset.findUnique({ where: { assetId } });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        const document = await prisma.assetDocument.findFirst({ where: { id: Number(documentId), assetId } });
        if (!document) {
            return sendErrorResponse(res, 404, "Document not found");
        }

        await prisma.assetDocument.delete({ where: { id: document.id } });

        const updated = await findAsset(assetId);

        return sendSuccessResponse(res, 200, 'Document deleted successfully', toAssetResponse(updated));

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};
