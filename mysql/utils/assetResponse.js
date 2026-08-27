const { fromPrismaEnum } = require('./enumMap');
const { num } = require('./serialize');

// Every embedded structure in the original Asset document (assignmentHistory, maintenanceHistory,
// componentChecks, documents, currentAssignee) is a separate table or flat columns now (Phase 2
// schema). This reconstructs the exact nested shape the Mongo-backed API always returned, so a
// frontend built against that shape doesn't need to change to read this one.
//
// Sub-array items get `_id` set to their real Prisma `id` — the field name the frontend already
// reads, holding a different kind of value (an integer) than the ObjectId it used to hold. Every
// endpoint that accepts one back (correctAssignmentEmployee's assignmentId, updateMaintenanceRecord's
// maintenanceId, deleteAssetDocument's documentId) expects that same integer.
//
// Top-level componentChecks entries do NOT get an `_id` — the original's componentCheckSchema was
// declared with `{ _id: false }`, so those never had one either.

// Every relation path to AssetComponentCheck (Asset.componentChecks, AssetAssignmentHistory.componentChecks,
// AssetMaintenanceHistory.componentChecks) sees every row for that asset regardless of phase, since
// they're all still linked by the same asset_id. Filtered separately by phase after fetching.
const assetInclude = {
    assignmentHistory: { include: { componentChecks: true } },
    maintenanceHistory: { include: { componentChecks: true } },
    documents: true,
    componentChecks: { where: { phase: 'CURRENT' } }
};

const splitByPhase = (checks, phase) => (checks || [])
    .filter(c => c.phase === phase)
    .map(c => ({ component: c.component, status: c.status }));

const toAssignmentResponse = (a) => ({
    _id: a.id,
    empId: a.empId,
    empName: a.empName,
    assignedDate: a.assignedDate,
    returnDate: a.returnDate || undefined,
    conditionAtAssign: fromPrismaEnum('condition', a.conditionAtAssign),
    conditionAtReturn: a.conditionAtReturn ? fromPrismaEnum('condition', a.conditionAtReturn) : undefined,
    componentChecksAtAssign: splitByPhase(a.componentChecks, 'ASSIGN'),
    componentChecksAtReturn: splitByPhase(a.componentChecks, 'RETURN'),
    courierName: a.courierName || undefined,
    trackingNumber: a.trackingNumber || undefined,
    shippedToAddress: a.shippedToAddress || undefined,
    remarks: a.remarks || undefined,
    assignedBy: a.assignedBy,
    status: a.status
});

const toMaintenanceResponse = (m) => ({
    _id: m.id,
    issueReported: m.issueReported,
    reportedDate: m.reportedDate,
    resolvedDate: m.resolvedDate || undefined,
    vendor: m.vendor || undefined,
    cost: num(m.cost),
    status: m.status,
    remarks: m.remarks || undefined,
    componentChecks: splitByPhase(m.componentChecks, 'MAINTENANCE')
});

const toAssetResponse = (asset) => {
    if (!asset) return asset;
    const {
        assignmentHistory, maintenanceHistory, documents, componentChecks,
        currentAssigneeEmpId, currentAssigneeEmpName, currentAssigneeSince,
        purchaseCost, condition, ...rest
    } = asset;

    return {
        ...rest,
        // Frontend AG Grid tables key rows by `_id` (a holdover from raw Mongo documents,
        // same reasoning as project/index.js's top-level `_id`). Asset has no separate
        // autoincrement id to alias — assetId is the real, already-unique primary key.
        _id: asset.assetId,
        condition: fromPrismaEnum('condition', condition),
        purchaseCost: num(purchaseCost),
        currentAssignee: currentAssigneeEmpId
            ? { empId: currentAssigneeEmpId, empName: currentAssigneeEmpName, assignedDate: currentAssigneeSince }
            : undefined,
        componentChecks: (componentChecks || []).map(c => ({ component: c.component, status: c.status })),
        documents: (documents || []).map(d => ({ _id: d.id, name: d.name, url: d.url, uploadedAt: d.uploadedAt })),
        assignmentHistory: (assignmentHistory || []).map(toAssignmentResponse),
        maintenanceHistory: (maintenanceHistory || []).map(toMaintenanceResponse)
    };
};

module.exports = { assetInclude, toAssetResponse, toAssignmentResponse, toMaintenanceResponse, splitByPhase };
