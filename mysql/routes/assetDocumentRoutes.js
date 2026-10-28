const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { uploadAssetDocument, deleteAssetDocument } = require('../controller/assetDocument');
const { sendErrorResponse } = require('../../utils/common');

// Reuses the same on-disk directory and /asset-uploads static mount as the Mongo-backed
// asset/routes/assetDocumentRoutes.js — one upload location for both parallel paths, not a duplicate.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '..', '..', 'asset', 'uploads', 'documents');
        fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const router = express.Router();

router.post('/upload', (req, res, next) => {
    upload.single('document')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return sendErrorResponse(res, 400, "File must be 10MB or smaller");
            }
            return sendErrorResponse(res, 400, "Failed to upload file");
        }
        next();
    });
}, uploadAssetDocument);

router.delete('/', deleteAssetDocument);

module.exports = router;
