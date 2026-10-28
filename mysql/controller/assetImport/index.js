const XLSX = require('xlsx');
const prisma = require('../../utils/prismaClient');
const { toPrismaEnum } = require('../../utils/enumMap');
const { generateAssetId } = require('../../utils/assetId');
const { COLUMNS, REQUIRED_HEADERS, findColumn, isExportOnly } = require('../../utils/assetImportFormat');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');
const { CONDITIONS } = require('../../../asset/constant/assetEnums');

/*
 * Asset import — standard template only. One row = one laptop.
 *
 * Matched by COLUMN HEADER, not position, so column order, extra columns and the derived
 * columns the Export button adds are all tolerated.
 *
 * Create-only by design: a row whose serial already exists is reported as a duplicate and
 * skipped, never silently overwritten.
 */

const LOCATION_TYPES = ['Office', 'WFH', 'Warehouse'];

const text = (value) => {
    if (value === undefined || value === null) return '';
    if (value instanceof Date) return value.toISOString();
    return String(value).trim();
};

/* Dates must be unambiguous. A real Excel date cell arrives as a Date (cellDates:true). Typed
   text is accepted only as YYYY-MM-DD: "03/04/2026" is rejected rather than guessed at, because
   en-GB and en-US read it as different months and a silently wrong purchase date is worse than a
   rejected row. */
const parseDate = (value) => {
    if (value === undefined || value === null || value === '') return { ok: true, value: null };

    if (value instanceof Date) {
        return isNaN(value.getTime())
            ? { ok: false, reason: 'unreadable date' }
            : { ok: true, value };
    }

    const raw = String(value).trim();
    const m = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!m) {
        return { ok: false, reason: `date "${raw}" must be YYYY-MM-DD (or a real Excel date cell)` };
    }

    const [, y, mo, d] = m;
    const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
    if (isNaN(dt.getTime()) || dt.getUTCMonth() !== Number(mo) - 1 || dt.getUTCDate() !== Number(d)) {
        return { ok: false, reason: `date "${raw}" is not a real calendar date` };
    }
    return { ok: true, value: dt };
};

const parseCost = (value) => {
    if (value === undefined || value === null || value === '') return { ok: true, value: null };
    if (typeof value === 'number') return { ok: true, value };
    const cleaned = String(value).replace(/[,\s₹$]/g, '');
    if (cleaned === '') return { ok: true, value: null };
    if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
        return { ok: false, reason: `purchase cost "${value}" must be a plain number` };
    }
    return { ok: true, value: Number(cleaned) };
};

const matchEnum = (value, allowed) => {
    const wanted = text(value).toLowerCase();
    if (!wanted) return null;
    return allowed.find((a) => a.toLowerCase() === wanted) || undefined; // undefined = invalid
};

/* Picks the sheet that actually looks like the template: the one whose header row resolves the
   most known columns. Guards against a workbook whose first tab is Instructions. */
const pickSheet = (workbook) => {
    let best = null;
    for (const name of workbook.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, blankrows: false });
        if (!rows.length) continue;
        const hits = (rows[0] || []).filter((h) => findColumn(h)).length;
        if (!best || hits > best.hits) best = { name, rows, hits };
    }
    return best;
};

exports.importAssetsFromExcel = async (req, res) => {
    const { importedBy } = req.body;

    try {
        if (!req.file) {
            return sendErrorResponse(res, 400, 'Please upload an excel file');
        }
        if (!importedBy) {
            return sendErrorResponse(res, 400, 'importedBy is required');
        }

        const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
        const sheet = pickSheet(workbook);

        if (!sheet || sheet.hits === 0) {
            return sendErrorResponse(
                res,
                400,
                'No recognisable asset sheet found. Download the template from the Add Asset page and fill that in.'
            );
        }

        // Map each spreadsheet column index to a known field, so order does not matter.
        const headerRow = sheet.rows[0] || [];
        const colIndex = {};
        const unknownHeaders = [];
        headerRow.forEach((header, index) => {
            if (text(header) === '') return;
            const col = findColumn(header);
            if (col) colIndex[col.key] = index;
            else if (!isExportOnly(header)) unknownHeaders.push(text(header));
        });

        const missingHeaders = REQUIRED_HEADERS.filter((h) => !(findColumn(h).key in colIndex));
        if (missingHeaders.length) {
            return sendErrorResponse(
                res,
                400,
                `Template is missing required column(s): ${missingHeaders.join(', ')}`
            );
        }

        const cell = (row, key) => (colIndex[key] === undefined ? '' : row[colIndex[key]]);

        const employees = await prisma.user.findMany({ select: { empId: true, firstName: true, lastName: true, worktype: true } });
        const byEmpId = new Map(employees.map((e) => [e.empId.toLowerCase(), e]));

        const created = [];
        const skipped = [];   // row read fine but deliberately not imported (duplicate/invalid)
        const failed = [];    // row passed validation but the write itself blew up
        const unassigned = []; // imported, but the named employee could not be resolved

        const seenSerials = new Map(); // serial -> first row number, to catch dupes inside one file

        for (let i = 1; i < sheet.rows.length; i++) {
            const row = sheet.rows[i] || [];
            const rowNo = i + 1; // 1-based, matching what the user sees in Excel

            const brand = text(cell(row, 'brand'));
            const modelName = text(cell(row, 'modelName'));
            const serialNumber = text(cell(row, 'serialNumber'));

            // A wholly blank line (trailing rows in a saved sheet) is not an error.
            if (!brand && !modelName && !serialNumber) continue;

            // The shipped template carries two illustrative rows; ignore them silently.
            if (/^example\b/i.test(modelName) || /^example\b/i.test(brand)) continue;

            const missing = [];
            if (!brand) missing.push('Brand');
            if (!modelName) missing.push('Model Name');
            if (!serialNumber) missing.push('Serial Number');
            if (text(cell(row, 'purchaseDate')) === '') missing.push('Purchase Date');
            if (missing.length) {
                skipped.push({ row: rowNo, serial: serialNumber || null, reason: `missing required: ${missing.join(', ')}` });
                continue;
            }

            const purchase = parseDate(cell(row, 'purchaseDate'));
            if (!purchase.ok || !purchase.value) {
                skipped.push({ row: rowNo, serial: serialNumber, reason: purchase.reason || 'missing Purchase Date' });
                continue;
            }

            const warranty = parseDate(cell(row, 'warrantyExpiryDate'));
            if (!warranty.ok) {
                skipped.push({ row: rowNo, serial: serialNumber, reason: `warranty ${warranty.reason}` });
                continue;
            }
            if (warranty.value && warranty.value <= purchase.value) {
                skipped.push({ row: rowNo, serial: serialNumber, reason: 'Warranty Expiry Date must be after Purchase Date' });
                continue;
            }

            const cost = parseCost(cell(row, 'purchaseCost'));
            if (!cost.ok) {
                skipped.push({ row: rowNo, serial: serialNumber, reason: cost.reason });
                continue;
            }

            const condition = matchEnum(cell(row, 'condition'), CONDITIONS);
            if (condition === undefined) {
                skipped.push({ row: rowNo, serial: serialNumber, reason: `Condition "${text(cell(row, 'condition'))}" is not one of: ${CONDITIONS.join(', ')}` });
                continue;
            }

            const locationType = matchEnum(cell(row, 'locationType'), LOCATION_TYPES);
            if (locationType === undefined) {
                skipped.push({ row: rowNo, serial: serialNumber, reason: `Location Type "${text(cell(row, 'locationType'))}" is not one of: ${LOCATION_TYPES.join(', ')}` });
                continue;
            }

            // Duplicate serial — within this file, then against what is already stored.
            const serialKey = serialNumber.toLowerCase();
            if (seenSerials.has(serialKey)) {
                skipped.push({ row: rowNo, serial: serialNumber, reason: `duplicate of row ${seenSerials.get(serialKey)} in this file` });
                continue;
            }
            seenSerials.set(serialKey, rowNo);

            const existing = await prisma.asset.findUnique({ where: { serialNumber }, select: { assetId: true } });
            if (existing) {
                skipped.push({ row: rowNo, serial: serialNumber, reason: `already exists as ${existing.assetId}` });
                continue;
            }

            // Optional handover. An unmatched name must not lose the asset, so the row still
            // imports and the mismatch is reported for reconciliation.
            const wantedEmpId = text(cell(row, 'assignedToEmpId'));
            let assignee = null;
            if (wantedEmpId) {
                assignee = byEmpId.get(wantedEmpId.toLowerCase()) || null;
                if (!assignee) unassigned.push({ row: rowNo, serial: serialNumber, empId: wantedEmpId });
            }

            const componentChecks = COLUMNS
                .filter((c) => c.component)
                .map((c) => ({ component: c.header, status: text(cell(row, c.key)) }))
                .filter((c) => c.status !== '');

            try {
                const assetId = await generateAssetId('Laptop');
                const empName = assignee ? `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() : null;
                const assignedDate = new Date();

                await prisma.asset.create({
                    data: {
                        assetId,
                        category: 'Laptop',
                        brand,
                        modelName,
                        serialNumber,
                        specifications: text(cell(row, 'specifications')) || null,
                        purchaseDate: purchase.value,
                        purchaseCost: cost.value,
                        vendor: text(cell(row, 'vendor')) || null,
                        warrantyExpiryDate: warranty.value,
                        condition: toPrismaEnum('condition', condition || 'New'),
                        status: assignee ? 'Assigned' : 'Available',
                        currentAssigneeEmpId: assignee ? assignee.empId : null,
                        currentAssigneeEmpName: assignee ? empName : null,
                        currentAssigneeSince: assignee ? assignedDate : null,
                        // Where a laptop physically sits follows the holder, matching assignAsset.
                        locationType: assignee
                            ? (assignee.worktype === 'WFO' ? 'Office' : 'WFH')
                            : (locationType || 'Warehouse'),
                        currentLocation: text(cell(row, 'currentLocation')) || null,
                        notes: text(cell(row, 'notes')) || null,
                        componentChecks: componentChecks.length
                            ? { create: componentChecks.map((c) => ({ phase: 'CURRENT', component: c.component, status: c.status })) }
                            : undefined,
                        assignmentHistory: assignee
                            ? {
                                create: [{
                                    empId: assignee.empId,
                                    empName,
                                    assignedDate,
                                    conditionAtAssign: toPrismaEnum('condition', condition || 'New'),
                                    assignedBy: importedBy,
                                    status: 'Active',
                                    componentChecks: componentChecks.length
                                        ? { create: componentChecks.map((c) => ({ assetId, phase: 'ASSIGN', component: c.component, status: c.status })) }
                                        : undefined,
                                }],
                            }
                            : undefined,
                    },
                });

                created.push({ row: rowNo, assetId, serial: serialNumber, assignedTo: assignee ? assignee.empId : null });
            } catch (rowError) {
                console.log(`Import failed for row ${rowNo} (serial "${serialNumber}"):`, rowError);
                failed.push({ row: rowNo, serial: serialNumber, reason: rowError.message || 'Something went wrong' });
            }
        }

        return sendSuccessResponse(res, 200, 'Import completed', {
            sheet: sheet.name,
            totalRows: Math.max(0, sheet.rows.length - 1),
            createdCount: created.length,
            skippedCount: skipped.length,
            failedCount: failed.length,
            created,
            skipped,
            failed,
            unassigned,
            unknownHeaders,
        });
    } catch (error) {
        console.log(error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};
