const express = require('express');
const multer = require('multer');
const { uploadEmployeeDocument, getEmployeeDocuments, deleteEmployeeDocument } = require('../controller/employeeDocument');
const { sendErrorResponse } = require('../../utils/common');

// memoryStorage, not diskStorage: the controller needs req.body.empId/docType to name the file
// and pick its folder, but multer's diskStorage callbacks fire mid-stream and only see body
// fields that arrived *before* the file part in the multipart payload — a fragile ordering
// requirement. Buffering in memory and writing to disk in the controller (after multer has
// fully parsed the request) sidesteps that entirely, same as imageRoutes.js.
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

const router = express.Router();

router.post('/upload', (req, res, next) => {
    upload.single('document')(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return sendErrorResponse(res, 400, 'File must be 5MB or smaller');
            }
            return sendErrorResponse(res, 400, 'Failed to upload file');
        }
        next();
    });
}, uploadEmployeeDocument);

router.get('/:empId', getEmployeeDocuments);
router.delete('/', deleteEmployeeDocument);

module.exports = router;
