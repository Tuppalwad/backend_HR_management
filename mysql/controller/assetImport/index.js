const XLSX = require('xlsx');
const prisma = require('../../utils/prismaClient');
const { toPrismaEnum } = require('../../utils/enumMap');
const { toDate } = require('../../utils/dateHelper');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');

// Generate a unique asset ID based on category
const generateAssetId = (category) => {
    const prefix = category.substring(0, 3).toUpperCase();
    return `AST-${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
};

// Column positions in the "Laptop IN -OUT Register" sheet: Date, New SR No., SR No. / Code, Model, status, (blank), From, Contact No., Remarks, RAM, HDD, SSD, Keyboard, Mouse, Battery, Processor, Generation
const COMPONENT_COLUMNS = [
    { label: 'RAM', index: 9 },
    { label: 'HDD', index: 10 },
    { label: 'SSD', index: 11 },
    { label: 'Keyboard', index: 12 },
    { label: 'Mouse', index: 13 },
    { label: 'Battery', index: 14 },
    { label: 'Processor', index: 15 },
    { label: 'Generation', index: 16 }
];

const normalizeAction = (value) => {
    if (!value) return null;
    const action = value.toString().trim().toLowerCase();
    if (action === 'new') return 'new';
    if (action === 'out') return 'out';
    if (action === 'in') return 'in';
    if (action === 'out for repair') return 'outForRepair';
    if (action === 'in from repair') return 'inFromRepair';
    return null;
};

const buildComponentChecks = (row) => {
    return COMPONENT_COLUMNS
        .filter(col => row[col.index] !== undefined && row[col.index] !== null && row[col.index].toString().trim() !== '')
        .map(col => ({ component: col.label, status: row[col.index].toString().trim() }));
};

// Matches the "Label: value | Label: value" convention the Add/Edit Asset form now writes, so imported and manually-added assets read alike
const buildSpecifications = (row) => {
    const checks = buildComponentChecks(row);
    return checks.length ? checks.map(check => `${check.component}: ${check.status}`).join(' | ') : undefined;
};

const findRegisterSheet = (workbook) => {
    for (const sheetName of workbook.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
        const header = rows[0] || [];
        const hasSerialColumn = header.some(cell => cell && cell.toString().toLowerCase().includes('code'));
        const hasDateColumn = header.some(cell => cell && cell.toString().toLowerCase().includes('date'));
        if (hasSerialColumn && hasDateColumn) {
            return rows;
        }
    }
    return null;
};

exports.importAssetsFromExcel = async (req, res) => {
    const { importedBy } = req.body;

    try {
        if (!req.file) {
            return sendErrorResponse(res, 400, "Please upload an excel file");
        }
        if (!importedBy) {
            return sendErrorResponse(res, 400, "importedBy is required");
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const rows = findRegisterSheet(workbook);
        if (!rows) {
            return sendErrorResponse(res, 400, "Could not find a laptop register sheet in this file");
        }

        const users = await prisma.user.findMany({ select: { empId: true, firstName: true, lastName: true } });
        const empByName = new Map();
        users.forEach(user => {
            empByName.set(`${user.firstName} ${user.lastName}`.trim().toLowerCase(), {
                empId: user.empId,
                empName: `${user.firstName} ${user.lastName}`
            });
        });

        const groups = new Map();
        const skippedRows = [];

        rows.slice(1).forEach((row, index) => {
            const serial = row[2] ? row[2].toString().trim() : '';
            const action = normalizeAction(row[4]);

            if (!serial || !action) {
                skippedRows.push({ row: index + 2, reason: !serial ? 'Missing serial number' : 'Unrecognized status value' });
                return;
            }

            const key = serial.toLowerCase();
            if (!groups.has(key)) {
                groups.set(key, { serial, legacyTags: new Set(), rows: [] });
            }

            const group = groups.get(key);
            if (row[1]) group.legacyTags.add(row[1].toString().trim());
            group.rows.push({
                date: row[0] instanceof Date ? row[0] : new Date(row[0]),
                action,
                model: row[3] ? row[3].toString().trim() : null,
                from: row[6] ? row[6].toString().trim() : null,
                remarks: row[8] ? row[8].toString().trim() : null,
                raw: row
            });
        });

        let created = 0;
        let skippedExisting = 0;
        const unresolvedAssignments = [];

        for (const group of groups.values()) {
            const existing = await prisma.asset.findUnique({ where: { serialNumber: group.serial } });
            if (existing) {
                skippedExisting += 1;
                continue;
            }

            group.rows.sort((a, b) => a.date - b.date);

            const latestModelRow = [...group.rows].reverse().find(row => row.model);
            const firstNewRow = group.rows.find(row => row.action === 'new');
            const modelText = latestModelRow ? latestModelRow.model : 'Unknown';

            const assignmentHistory = [];
            const maintenanceHistory = [];
            let openAssignment = null;
            let openMaintenance = null;

            group.rows.forEach(row => {
                if (row.action === 'new' || row.action === 'out') {
                    const match = row.from ? empByName.get(row.from.toLowerCase()) : null;
                    if (match) {
                        const record = {
                            empId: match.empId,
                            empName: match.empName,
                            assignedDate: row.date,
                            conditionAtAssign: 'Good',
                            componentChecksAtAssign: buildComponentChecks(row.raw),
                            remarks: row.remarks || undefined,
                            assignedBy: importedBy,
                            status: 'Active'
                        };
                        assignmentHistory.push(record);
                        openAssignment = record;
                    } else if (row.from) {
                        unresolvedAssignments.push({ serial: group.serial, date: row.date, rawName: row.from });
                    }
                } else if (row.action === 'in' && openAssignment) {
                    openAssignment.returnDate = row.date;
                    openAssignment.conditionAtReturn = 'Good';
                    openAssignment.componentChecksAtReturn = buildComponentChecks(row.raw);
                    openAssignment.status = 'Returned';
                    openAssignment = null;
                } else if (row.action === 'outForRepair') {
                    const record = {
                        issueReported: row.remarks || 'Issue reported',
                        reportedDate: row.date,
                        vendor: row.from || undefined,
                        componentChecks: buildComponentChecks(row.raw),
                        status: 'Pending'
                    };
                    maintenanceHistory.push(record);
                    openMaintenance = record;
                } else if (row.action === 'inFromRepair' && openMaintenance) {
                    openMaintenance.resolvedDate = row.date;
                    openMaintenance.status = 'Resolved';
                    openMaintenance.remarks = row.remarks || undefined;
                    openMaintenance = null;
                }
            });

            const status = openAssignment ? 'Assigned' : (openMaintenance ? 'UnderMaintenance' : 'Available');
            const currentChecks = buildComponentChecks(group.rows[group.rows.length - 1].raw);
            const newAssetId = generateAssetId('Laptop');

            await prisma.asset.create({
                data: {
                    assetId: newAssetId,
                    category: 'Laptop',
                    brand: modelText.split(' ')[0],
                    modelName: modelText,
                    serialNumber: group.serial,
                    purchaseDate: toDate(firstNewRow ? firstNewRow.date : group.rows[0].date),
                    condition: 'Good',
                    status,
                    currentAssigneeEmpId: openAssignment ? openAssignment.empId : undefined,
                    currentAssigneeEmpName: openAssignment ? openAssignment.empName : undefined,
                    currentAssigneeSince: openAssignment ? toDate(openAssignment.assignedDate) : undefined,
                    locationType: 'Warehouse',
                    specifications: buildSpecifications(group.rows[group.rows.length - 1].raw),
                    notes: group.legacyTags.size ? `Legacy tag(s) from Excel register: ${[...group.legacyTags].join(', ')}` : undefined,
                    componentChecks: currentChecks.length
                        ? { create: currentChecks.map(c => ({ phase: 'CURRENT', component: c.component, status: c.status })) }
                        : undefined,
                    assignmentHistory: assignmentHistory.length
                        ? {
                            create: assignmentHistory.map(a => ({
                                empId: a.empId,
                                empName: a.empName,
                                assignedDate: toDate(a.assignedDate),
                                returnDate: a.returnDate ? toDate(a.returnDate) : null,
                                conditionAtAssign: toPrismaEnum('condition', a.conditionAtAssign),
                                conditionAtReturn: a.conditionAtReturn ? toPrismaEnum('condition', a.conditionAtReturn) : null,
                                remarks: a.remarks || null,
                                assignedBy: a.assignedBy,
                                status: a.status,
                                componentChecks: {
                                    create: [
                                        ...a.componentChecksAtAssign.map(c => ({ assetId: newAssetId, phase: 'ASSIGN', component: c.component, status: c.status })),
                                        ...(a.componentChecksAtReturn || []).map(c => ({ assetId: newAssetId, phase: 'RETURN', component: c.component, status: c.status }))
                                    ]
                                }
                            }))
                        }
                        : undefined,
                    maintenanceHistory: maintenanceHistory.length
                        ? {
                            create: maintenanceHistory.map(m => ({
                                issueReported: m.issueReported,
                                reportedDate: toDate(m.reportedDate),
                                resolvedDate: m.resolvedDate ? toDate(m.resolvedDate) : null,
                                vendor: m.vendor || null,
                                status: m.status,
                                remarks: m.remarks || null,
                                componentChecks: m.componentChecks.length
                                    ? { create: m.componentChecks.map(c => ({ assetId: newAssetId, phase: 'MAINTENANCE', component: c.component, status: c.status })) }
                                    : undefined
                            }))
                        }
                        : undefined
                }
            });

            created += 1;
        }

        return sendSuccessResponse(res, 200, 'Excel import completed', {
            totalLaptopsFound: groups.size,
            created,
            skippedExisting,
            skippedRows,
            unresolvedAssignments
        });

    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, "Something went wrong", error);
    }
};
