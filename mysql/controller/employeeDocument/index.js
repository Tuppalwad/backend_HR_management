const fs = require('fs');
const path = require('path');
const prisma = require('../../utils/prismaClient');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');

// employeesystemserver/uploads/employee-documents/<empId>/<docType>-<timestamp><ext>
// const UPLOAD_ROOT = path.join(__dirname, '..', '..', '..', 'uploads', 'employee-documents');
const UPLOAD_ROOT = path.join(
    __dirname,
    '..',
    '..',
    '..',
    'asset',
    'uploads',
    'employee-documents'
);

// Single source of truth for the onboarding document checklist: what each docType is called,
// whether it's mandatory, which mime types it accepts, and which EmployeeDocument column its
// URL is stored in. Keep this in sync with DOCUMENT_TYPES in the mobile app's DocumentInfo.js.
const DOCUMENT_TYPES = {
    PHOTO: { label: 'Passport Size Photo', required: true, mimeTypes: ['image/jpeg', 'image/jpg'], column: 'photoUrl' },
    QUALIFICATION_MARKSHEET: { label: 'Highest Qualification Marksheet', required: true, mimeTypes: ['application/pdf'], column: 'qualificationMarksheetUrl' },
    AADHAR: { label: 'Aadhar Card', required: true, mimeTypes: ['application/pdf'], column: 'aadharUrl' },
    PAN: { label: 'PAN Card', required: true, mimeTypes: ['application/pdf'], column: 'panUrl' },
    OFFER_RELIEVING_LETTER: { label: "Previous Company's Offer & Relieving Letter", required: false, mimeTypes: ['application/pdf'], column: 'offerRelievingLetterUrl' },
    PASSPORT: { label: 'Passport', required: false, mimeTypes: ['application/pdf'], column: 'passportUrl' },
    PASSBOOK: { label: 'Bank Passbook', required: false, mimeTypes: ['application/pdf'], column: 'passbookUrl' },
    FORM_A9: { label: 'Form A9', required: false, mimeTypes: ['application/pdf'], column: 'formA9Url' },
};

exports.uploadEmployeeDocument = async (req, res) => {
    try {
        const { empId, docType } = req.body;

        if (!req.file) {
            return sendErrorResponse(res, 400, 'Please upload a document');
        }
        if (!empId) {
            return sendErrorResponse(res, 400, 'empId is required');
        }
        // req.empId comes from the verified JWT (see authenticateToken middleware) — the body's
        // empId still has to be provided because the mobile client keys its FormData off it, but
        // it must not be trusted blindly to identify whose row gets written.
        if (req.empId && req.empId !== empId) {
            return sendErrorResponse(res, 403, 'Not allowed to upload documents for another employee');
        }

        const docConfig = DOCUMENT_TYPES[docType];
        if (!docConfig) {
            return sendErrorResponse(res, 400, 'Invalid document type');
        }
        if (!docConfig.mimeTypes.includes(req.file.mimetype)) {
            return sendErrorResponse(res, 400, `${docConfig.label} must be uploaded as ${docConfig.mimeTypes.join(' or ')}`);
        }

        const empDir = path.join(UPLOAD_ROOT, empId);
        fs.mkdirSync(empDir, { recursive: true });

        const ext = path.extname(req.file.originalname) || (docType === 'PHOTO' ? '.jpg' : '.pdf');
        const filename = `${docType}-${Date.now()}${ext}`;
        fs.writeFileSync(path.join(empDir, filename), req.file.buffer);

        const existing = await prisma.employeeDocument.findUnique({ where: { empId } });
        const previousFile = existing?.[docConfig.column];

        const updated = await prisma.employeeDocument.upsert({
            where: { empId },
            update: { [docConfig.column]: `/emp-documents/${empId}/${filename}` },
            create: { empId, [docConfig.column]: `/emp-documents/${empId}/${filename}` },
        });

        // Best-effort cleanup of the file this upload replaces — never blocks the response on it.
        if (previousFile) {
            fs.unlink(path.join(empDir, path.basename(previousFile)), () => {});
        }

        return sendSuccessResponse(res, 200, `${docConfig.label} uploaded successfully`, updated);
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};

exports.getEmployeeDocuments = async (req, res) => {
    try {
        const { empId } = req.params;
        if (!empId) {
            return sendErrorResponse(res, 400, 'empId is required');
        }

        const documents = await prisma.employeeDocument.findUnique({ where: { empId } });
        return sendSuccessResponse(res, 200, 'Documents fetched successfully', documents || {});
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};

exports.deleteEmployeeDocument = async (req, res) => {
    try {
        const { empId, docType } = req.body;

        const docConfig = DOCUMENT_TYPES[docType];
        if (!empId || !docConfig) {
            return sendErrorResponse(res, 400, 'empId and a valid docType are required');
        }
        if (req.empId && req.empId !== empId) {
            return sendErrorResponse(res, 403, 'Not allowed to delete documents for another employee');
        }

        const existing = await prisma.employeeDocument.findUnique({ where: { empId } });
        const currentFile = existing?.[docConfig.column];
        if (!currentFile) {
            return sendErrorResponse(res, 404, 'Document not found');
        }

        fs.unlink(path.join(UPLOAD_ROOT, empId, path.basename(currentFile)), () => {});

        const updated = await prisma.employeeDocument.update({
            where: { empId },
            data: { [docConfig.column]: null },
        });

        return sendSuccessResponse(res, 200, `${docConfig.label} removed successfully`, updated);
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};
