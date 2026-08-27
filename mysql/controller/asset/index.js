const prisma = require('../../utils/prismaClient');
const { toPrismaEnum, fromPrismaEnum } = require('../../utils/enumMap');
const { toDate } = require('../../utils/dateHelper');
const { assetInclude, toAssetResponse, toAssignmentResponse } = require('../../utils/assetResponse');
const { generateAssetId } = require('../../utils/assetId');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');
const { sendEmail } = require('../../../utils/emailService');
const { sendPushNotification } = require('../notification');
const assetAssignHtml = require('../../../asset/utils/htmlText/assetAssignHtml');
const assetReturnHtml = require('../../../asset/utils/htmlText/assetReturnHtml');
const { ASSET_CATEGORIES, ASSET_STATUS, CONDITIONS } = require('../../../asset/constant/assetEnums');

// Convenience shorthand for the componentChecks array, matching the named fields (RAM, HDD, etc.) from the HR excel register
const buildComponentChecksFromFields = ({ ram, hdd, ssd, keyboard, mouse, battery, processor, generation }) => {
    const fields = [
        { component: 'RAM', status: ram },
        { component: 'HDD', status: hdd },
        { component: 'SSD', status: ssd },
        { component: 'Keyboard', status: keyboard },
        { component: 'Mouse', status: mouse },
        { component: 'Battery', status: battery },
        { component: 'Processor', status: processor },
        { component: 'Generation', status: generation }
    ];

    const checks = fields.filter(field => field.status !== undefined && field.status !== null && field.status.toString().trim() !== '');
    return checks.length ? checks : undefined;
};

const appendLegacyTag = (notes, legacyTag) => {
    if (!legacyTag) return notes;
    if (notes && notes.toLowerCase().includes(legacyTag.trim().toLowerCase())) {
        return notes;
    }
    return `${notes ? notes + ' | ' : ''}Legacy tag(s): ${legacyTag}`;
};

// Replaces every phase=CURRENT row for this asset with a fresh set — the relational equivalent
// of overwriting the embedded componentChecks array wholesale (used when a raw componentChecks
// array is sent directly, taking precedence over the named fields).
const replaceCurrentChecks = async (assetId, checks) => {
    await prisma.assetComponentCheck.deleteMany({ where: { assetId, phase: 'CURRENT' } });
    if (checks && checks.length) {
        await prisma.assetComponentCheck.createMany({
            data: checks.map(c => ({ assetId, phase: 'CURRENT', component: c.component, status: c.status }))
        });
    }
};

// Upserts each named-field check by component label, leaving every other CURRENT-phase entry
// (e.g. from an excel import) untouched — the relational equivalent of mergeComponentChecks.
const mergeCurrentChecks = async (assetId, updates) => {
    for (const update of updates) {
        const existing = await prisma.assetComponentCheck.findFirst({ where: { assetId, phase: 'CURRENT', component: update.component } });
        if (existing) {
            await prisma.assetComponentCheck.update({ where: { id: existing.id }, data: { status: update.status } });
        } else {
            await prisma.assetComponentCheck.create({ data: { assetId, phase: 'CURRENT', component: update.component, status: update.status } });
        }
    }
};

const findAsset = (assetId) => prisma.asset.findUnique({ where: { assetId }, include: assetInclude });

exports.addAsset = async (req, res) => {
    const { category, brand, modelName, serialNumber, specifications, purchaseDate, purchaseCost, vendor, warrantyExpiryDate, condition, locationType, currentLocation, componentChecks, legacyTag, documents, notes } = req.body;

    try {
        if (!category || !brand || !modelName || !purchaseDate) {
            return sendErrorResponse(res, 400, "Category, brand, model name and purchase date are required");
        }

        if (serialNumber) {
            const checkSerial = await prisma.asset.findUnique({ where: { serialNumber } });
            if (checkSerial) {
                return sendErrorResponse(res, 401, "An asset with this serial number already exists");
            }
        }

        const assetId = await generateAssetId(category);
        const checks = componentChecks || buildComponentChecksFromFields(req.body);

        await prisma.asset.create({
            data: {
                assetId,
                category,
                brand,
                modelName,
                serialNumber: serialNumber || null,
                specifications: specifications || null,
                purchaseDate: toDate(purchaseDate),
                purchaseCost: purchaseCost != null ? purchaseCost : null,
                vendor: vendor || null,
                warrantyExpiryDate: toDate(warrantyExpiryDate),
                condition: toPrismaEnum('condition', condition) || 'New',
                locationType: locationType || 'Warehouse',
                currentLocation: currentLocation || null,
                notes: appendLegacyTag(notes, legacyTag) || null,
                componentChecks: checks ? { create: checks.map(c => ({ phase: 'CURRENT', component: c.component, status: c.status })) } : undefined,
                documents: documents ? { create: documents.map(d => ({ name: d.name || 'Untitled document', url: d.url || '', uploadedAt: toDate(d.uploadedAt) || undefined })) } : undefined
            }
        });

        return sendSuccessResponse(res, 201, 'Asset added successfully', { assetId });

    } catch (error) {
        console.log(error);
        if (error.code === 'P2002') {
            return sendErrorResponse(res, 400, "Validation error occurred", error);
        }
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.editAsset = async (req, res) => {
    const { assetId, category, brand, modelName, serialNumber, specifications, purchaseDate, purchaseCost, vendor, warrantyExpiryDate, condition, locationType, currentLocation, componentChecks, legacyTag, notes } = req.body;

    try {
        const asset = await prisma.asset.findUnique({ where: { assetId } });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (serialNumber && serialNumber !== asset.serialNumber) {
            const checkSerial = await prisma.asset.findFirst({ where: { serialNumber, assetId: { not: assetId } } });
            if (checkSerial) {
                return sendErrorResponse(res, 401, "An asset with this serial number already exists");
            }
        }

        await prisma.asset.update({
            where: { assetId },
            data: {
                category: category || asset.category,
                brand: brand || asset.brand,
                modelName: modelName || asset.modelName,
                serialNumber: serialNumber || asset.serialNumber,
                specifications: specifications || asset.specifications,
                purchaseDate: purchaseDate ? toDate(purchaseDate) : asset.purchaseDate,
                purchaseCost: purchaseCost != null ? purchaseCost : asset.purchaseCost,
                vendor: vendor || asset.vendor,
                warrantyExpiryDate: warrantyExpiryDate ? toDate(warrantyExpiryDate) : asset.warrantyExpiryDate,
                condition: condition ? toPrismaEnum('condition', condition) : asset.condition,
                locationType: locationType || asset.locationType,
                currentLocation: currentLocation || asset.currentLocation,
                notes: appendLegacyTag(notes || asset.notes, legacyTag)
            }
        });

        if (componentChecks) {
            await replaceCurrentChecks(assetId, componentChecks);
        } else {
            const namedFieldChecks = buildComponentChecksFromFields(req.body);
            if (namedFieldChecks) {
                await mergeCurrentChecks(assetId, namedFieldChecks);
            }
        }

        const updated = await findAsset(assetId);

        return sendSuccessResponse(res, 200, 'Asset updated successfully', toAssetResponse(updated));

    } catch (error) {
        console.log(error);
        if (error.code === 'P2002') {
            return sendErrorResponse(res, 400, "Validation error occurred", error);
        }
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.deleteAsset = async (req, res) => {
    const { assetId } = req.query;

    try {
        const asset = await prisma.asset.findUnique({ where: { assetId }, include: { assignmentHistory: true } });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (asset.assignmentHistory.length > 0) {
            return sendErrorResponse(res, 400, "Asset has assignment history, retire it instead of deleting");
        }

        // asset_component_checks, asset_maintenance_history, asset_documents cascade automatically
        await prisma.asset.delete({ where: { assetId } });

        return sendSuccessResponse(res, 200, 'Asset deleted successfully');

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.retireAsset = async (req, res) => {
    const { assetId } = req.body;

    try {
        const asset = await prisma.asset.findUnique({ where: { assetId } });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (asset.status === 'Assigned') {
            return sendErrorResponse(res, 400, "Asset is currently assigned, return it before retiring");
        }

        await prisma.asset.update({ where: { assetId }, data: { status: 'Retired' } });
        const updated = await findAsset(assetId);

        return sendSuccessResponse(res, 200, 'Asset retired successfully', toAssetResponse(updated));

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.markAssetDead = async (req, res) => {
    const { assetId, remarks } = req.body;

    try {
        const asset = await prisma.asset.findUnique({ where: { assetId } });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (asset.status === 'Assigned') {
            return sendErrorResponse(res, 400, "Asset is currently assigned, return it before marking it dead");
        }

        await prisma.asset.update({
            where: { assetId },
            data: {
                status: 'Dead',
                condition: 'Beyond_Repair',
                notes: remarks ? `${asset.notes ? asset.notes + ' | ' : ''}${remarks}` : asset.notes
            }
        });
        const updated = await findAsset(assetId);

        return sendSuccessResponse(res, 200, 'Asset marked as dead', toAssetResponse(updated));

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getAsset = async (req, res) => {
    const { assetId } = req.query;

    try {
        const asset = await findAsset(assetId);
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        return sendSuccessResponse(res, 200, 'Asset retrieved successfully', toAssetResponse(asset));
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getAllAssets = async (req, res) => {
    const { category, status, condition, query } = req.query;

    try {
        const filter = {};
        if (category) filter.category = category;
        if (status) filter.status = status;
        if (condition) filter.condition = toPrismaEnum('condition', condition);

        if (query) {
            filter.OR = [
                { assetId: { contains: query } },
                { serialNumber: { contains: query } },
                { brand: { contains: query } },
                { modelName: { contains: query } },
                { notes: { contains: query } }
            ];
        }

        const assets = await prisma.asset.findMany({ where: filter, include: assetInclude });

        return sendSuccessResponse(res, 200, 'Assets retrieved successfully', assets.map(toAssetResponse));
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

// /search shares the exact same behaviour as /getall, same as the Mongo-backed version
exports.searchAsset = exports.getAllAssets;

exports.getAssetsByEmpId = async (req, res) => {
    const { empId } = req.query;

    try {
        if (!empId) {
            return sendErrorResponse(res, 400, "empId is required");
        }

        const assets = await prisma.asset.findMany({
            where: { currentAssigneeEmpId: empId, status: 'Assigned' },
            include: assetInclude
        });

        return sendSuccessResponse(res, 200, 'Assets retrieved successfully', assets.map(toAssetResponse));
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

        const assets = await prisma.asset.findMany({
            where: { assignmentHistory: { some: { empId } } },
            include: assetInclude
        });

        return sendSuccessResponse(res, 200, 'Employee asset history retrieved successfully', assets.map(toAssetResponse));
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.getAssetHistory = async (req, res) => {
    const { assetId } = req.query;

    try {
        const asset = await prisma.asset.findUnique({
            where: { assetId },
            include: { assignmentHistory: { include: { componentChecks: true } } }
        });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        return sendSuccessResponse(res, 200, 'Asset history retrieved successfully', asset.assignmentHistory.map(toAssignmentResponse));
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.assignAsset = async (req, res) => {
    const { assetId, empId, conditionAtAssign, componentChecksAtAssign, courierName, trackingNumber, shippedToAddress, remarks, assignedBy } = req.body;

    try {
        if (!assetId || !empId || !conditionAtAssign || !assignedBy) {
            return sendErrorResponse(res, 400, "assetId, empId, conditionAtAssign and assignedBy are required");
        }

        const asset = await prisma.asset.findUnique({ where: { assetId } });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (asset.status !== 'Available') {
            return sendErrorResponse(res, 400, "Asset is not available for assignment");
        }

        const employee = await prisma.user.findUnique({ where: { empId } });
        if (!employee) {
            return sendErrorResponse(res, 404, "Employee not found");
        }

        const empName = `${employee.firstName} ${employee.lastName}`;
        const assignedDate = new Date();

        const assignment = await prisma.assetAssignmentHistory.create({
            data: {
                assetId,
                empId,
                empName,
                assignedDate,
                conditionAtAssign: toPrismaEnum('condition', conditionAtAssign),
                courierName: courierName || null,
                trackingNumber: trackingNumber || null,
                shippedToAddress: shippedToAddress || null,
                remarks: remarks || null,
                assignedBy,
                status: 'Active',
                componentChecks: componentChecksAtAssign ? { create: componentChecksAtAssign.map(c => ({ assetId, phase: 'ASSIGN', component: c.component, status: c.status })) } : undefined
            }
        });

        await prisma.asset.update({
            where: { assetId },
            data: {
                currentAssigneeEmpId: empId,
                currentAssigneeEmpName: empName,
                currentAssigneeSince: assignedDate,
                status: 'Assigned',
                condition: toPrismaEnum('condition', conditionAtAssign),
                locationType: employee.worktype === 'WFO' ? 'Office' : 'WFH'
            }
        });

        if (componentChecksAtAssign) {
            await replaceCurrentChecks(assetId, componentChecksAtAssign);
        }

        const updated = await findAsset(assetId);

        const { subject, html } = assetAssignHtml(empName, updated.category, `${updated.brand} ${updated.modelName}`, updated.assetId, assignedDate);
        if (employee.email) {
            await sendEmail([employee.email], subject, html);
        }
        sendPushNotification(empId, "Asset Assigned", `${updated.category} (${updated.assetId}) has been assigned to you`);

        return sendSuccessResponse(res, 200, 'Asset assigned successfully', toAssetResponse(updated));

    } catch (error) {
        console.log(error);
        if (error.code === 'P2002') {
            return sendErrorResponse(res, 400, "Validation error occurred", error);
        }
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.returnAsset = async (req, res) => {
    const { assetId, conditionAtReturn, componentChecksAtReturn, remarks } = req.body;

    try {
        if (!assetId || !conditionAtReturn) {
            return sendErrorResponse(res, 400, "assetId and conditionAtReturn are required");
        }

        const asset = await prisma.asset.findUnique({ where: { assetId } });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (asset.status !== 'Assigned') {
            return sendErrorResponse(res, 400, "Asset is not currently assigned");
        }

        const activeAssignment = await prisma.assetAssignmentHistory.findFirst({ where: { assetId, status: 'Active' } });
        if (!activeAssignment) {
            return sendErrorResponse(res, 400, "Active assignment record not found for this asset");
        }

        const { empId, empName } = activeAssignment;
        const returnDate = new Date();

        await prisma.assetAssignmentHistory.update({
            where: { id: activeAssignment.id },
            data: {
                returnDate,
                conditionAtReturn: toPrismaEnum('condition', conditionAtReturn),
                remarks: remarks || activeAssignment.remarks,
                status: 'Returned',
                componentChecks: componentChecksAtReturn ? { create: componentChecksAtReturn.map(c => ({ assetId, phase: 'RETURN', component: c.component, status: c.status })) } : undefined
            }
        });

        const mappedCondition = toPrismaEnum('condition', conditionAtReturn);
        await prisma.asset.update({
            where: { assetId },
            data: {
                currentAssigneeEmpId: null,
                currentAssigneeEmpName: null,
                currentAssigneeSince: null,
                condition: mappedCondition,
                status: (mappedCondition === 'Damaged' || mappedCondition === 'Beyond_Repair') ? 'UnderMaintenance' : 'Available',
                locationType: 'Warehouse'
            }
        });

        if (componentChecksAtReturn) {
            await replaceCurrentChecks(assetId, componentChecksAtReturn);
        }

        const updated = await findAsset(assetId);

        const employee = await prisma.user.findUnique({ where: { empId } });

        const { subject, html } = assetReturnHtml(empName, updated.category, `${updated.brand} ${updated.modelName}`, updated.assetId, returnDate);
        if (employee && employee.email) {
            await sendEmail([employee.email], subject, html);
        }
        sendPushNotification(empId, "Asset Returned", `${updated.category} (${updated.assetId}) has been marked as returned`);

        return sendSuccessResponse(res, 200, 'Asset returned successfully', toAssetResponse(updated));

    } catch (error) {
        console.log(error);
        if (error.code === 'P2002') {
            return sendErrorResponse(res, 400, "Validation error occurred", error);
        }
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.transferAsset = async (req, res) => {
    const { assetId, newEmpId, conditionAtReturn, conditionAtAssign, componentChecksAtReturn, componentChecksAtAssign, courierName, trackingNumber, shippedToAddress, remarks, assignedBy } = req.body;

    try {
        if (!assetId || !newEmpId || !conditionAtReturn || !conditionAtAssign || !assignedBy) {
            return sendErrorResponse(res, 400, "assetId, newEmpId, conditionAtReturn, conditionAtAssign and assignedBy are required");
        }

        const asset = await prisma.asset.findUnique({ where: { assetId } });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        if (asset.status !== 'Assigned') {
            return sendErrorResponse(res, 400, "Asset is not currently assigned");
        }

        const newEmployee = await prisma.user.findUnique({ where: { empId: newEmpId } });
        if (!newEmployee) {
            return sendErrorResponse(res, 404, "Employee not found");
        }

        const activeAssignment = await prisma.assetAssignmentHistory.findFirst({ where: { assetId, status: 'Active' } });
        if (!activeAssignment) {
            return sendErrorResponse(res, 400, "Active assignment record not found for this asset");
        }

        await prisma.assetAssignmentHistory.update({
            where: { id: activeAssignment.id },
            data: {
                returnDate: new Date(),
                conditionAtReturn: toPrismaEnum('condition', conditionAtReturn),
                status: 'Returned',
                componentChecks: componentChecksAtReturn ? { create: componentChecksAtReturn.map(c => ({ assetId, phase: 'RETURN', component: c.component, status: c.status })) } : undefined
            }
        });

        const newEmpName = `${newEmployee.firstName} ${newEmployee.lastName}`;
        const assignedDate = new Date();

        await prisma.assetAssignmentHistory.create({
            data: {
                assetId,
                empId: newEmpId,
                empName: newEmpName,
                assignedDate,
                conditionAtAssign: toPrismaEnum('condition', conditionAtAssign),
                courierName: courierName || null,
                trackingNumber: trackingNumber || null,
                shippedToAddress: shippedToAddress || null,
                remarks: remarks || null,
                assignedBy,
                status: 'Active',
                componentChecks: componentChecksAtAssign ? { create: componentChecksAtAssign.map(c => ({ assetId, phase: 'ASSIGN', component: c.component, status: c.status })) } : undefined
            }
        });

        await prisma.asset.update({
            where: { assetId },
            data: {
                currentAssigneeEmpId: newEmpId,
                currentAssigneeEmpName: newEmpName,
                currentAssigneeSince: assignedDate,
                condition: toPrismaEnum('condition', conditionAtAssign),
                locationType: newEmployee.worktype === 'WFO' ? 'Office' : 'WFH'
            }
        });

        if (componentChecksAtAssign) {
            await replaceCurrentChecks(assetId, componentChecksAtAssign);
        }

        const updated = await findAsset(assetId);

        const { subject, html } = assetAssignHtml(newEmpName, updated.category, `${updated.brand} ${updated.modelName}`, updated.assetId, assignedDate);
        if (newEmployee.email) {
            await sendEmail([newEmployee.email], subject, html);
        }
        sendPushNotification(newEmpId, "Asset Assigned", `${updated.category} (${updated.assetId}) has been assigned to you`);

        return sendSuccessResponse(res, 200, 'Asset transferred successfully', toAssetResponse(updated));

    } catch (error) {
        console.log(error);
        if (error.code === 'P2002') {
            return sendErrorResponse(res, 400, "Validation error occurred", error);
        }
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};

exports.correctAssignmentEmployee = async (req, res) => {
    const { assetId, assignmentId, empId } = req.body;

    try {
        if (!assetId || !assignmentId || !empId) {
            return sendErrorResponse(res, 400, "assetId, assignmentId and empId are required");
        }

        const asset = await prisma.asset.findUnique({ where: { assetId } });
        if (!asset) {
            return sendErrorResponse(res, 404, "Asset not found");
        }

        const assignment = await prisma.assetAssignmentHistory.findFirst({ where: { id: Number(assignmentId), assetId } });
        if (!assignment) {
            return sendErrorResponse(res, 404, "Assignment record not found");
        }

        const employee = await prisma.user.findUnique({ where: { empId } });
        if (!employee) {
            return sendErrorResponse(res, 404, "Employee not found");
        }

        const empName = `${employee.firstName} ${employee.lastName}`;

        await prisma.assetAssignmentHistory.update({
            where: { id: assignment.id },
            data: { empId, empName }
        });

        if (assignment.status === 'Active') {
            await prisma.asset.update({
                where: { assetId },
                data: { currentAssigneeEmpId: empId, currentAssigneeEmpName: empName, currentAssigneeSince: assignment.assignedDate }
            });
        }

        const updated = await findAsset(assetId);

        return sendSuccessResponse(res, 200, 'Assignment record updated successfully', toAssetResponse(updated));

    } catch (error) {
        console.log(error);
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
