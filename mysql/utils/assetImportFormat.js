/*
 * THE canonical Asset Import format.
 *
 * This is the single source of truth for the importer, the downloadable template and the
 * Export button. The frontend mirrors this list in src/pages/asset/assetImportFormat.js — if a
 * column changes here, change it there too. (The two repos deploy separately, so the list
 * cannot be literally shared; keeping them byte-identical is the next best thing.)
 *
 * Laptops only for now, so `Category` is not a column — every imported row is a Laptop.
 * Adding another category later means adding the column back, not reshaping the file.
 */

// header      -> the exact column title in the sheet
// key         -> internal name used by the importer
// required    -> a row missing this is rejected
// component   -> written as an AssetComponentCheck row rather than an Asset field
// aliases     -> tolerated older/alternate spellings, matched case-insensitively
const COLUMNS = [
    { header: 'Brand',                key: 'brand',              required: true },
    { header: 'Model Name',           key: 'modelName',          required: true, aliases: ['Model'] },
    { header: 'Serial Number',        key: 'serialNumber',       required: true, aliases: ['Serial', 'SR No', 'SR No.'] },
    { header: 'Purchase Date',        key: 'purchaseDate',       required: true },
    { header: 'Purchase Cost',        key: 'purchaseCost' },
    { header: 'Vendor',               key: 'vendor' },
    { header: 'Warranty Expiry Date', key: 'warrantyExpiryDate', aliases: ['Warranty Expiry'] },
    { header: 'Condition',            key: 'condition' },
    { header: 'Location Type',        key: 'locationType' },
    { header: 'Current Location',     key: 'currentLocation' },
    { header: 'Assigned To Emp ID',   key: 'assignedToEmpId',    aliases: ['Assigned To', 'Emp ID'] },
    { header: 'Specifications',       key: 'specifications' },
    { header: 'Notes',                key: 'notes' },

    { header: 'RAM',        key: 'RAM',        component: true },
    { header: 'HDD',        key: 'HDD',        component: true },
    { header: 'SSD',        key: 'SSD',        component: true },
    { header: 'Keyboard',   key: 'Keyboard',   component: true },
    { header: 'Mouse',      key: 'Mouse',      component: true },
    { header: 'Battery',    key: 'Battery',    component: true },
    { header: 'Processor',  key: 'Processor',  component: true },
    { header: 'Generation', key: 'Generation', component: true },
];

// Columns the Export button adds for readability. They are derived from other data, so the
// importer must ignore them rather than treat them as unknown-and-suspicious.
const EXPORT_ONLY_HEADERS = ['Asset ID', 'Category', 'Status', 'Assigned To Name', 'Assigned Since'];

/* Headers are matched loosely on purpose: trimmed, lower-cased, punctuation and the "*"
   required-marker stripped. "Model Name *", "model name" and "MODEL  NAME" all resolve. */
const normalizeHeader = (value) =>
    String(value == null ? '' : value)
        .replace(/\*/g, ' ')
        .replace(/[._-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

const HEADER_LOOKUP = (() => {
    const map = new Map();
    for (const col of COLUMNS) {
        map.set(normalizeHeader(col.header), col);
        for (const alias of col.aliases || []) map.set(normalizeHeader(alias), col);
    }
    return map;
})();

const findColumn = (header) => HEADER_LOOKUP.get(normalizeHeader(header)) || null;

const isExportOnly = (header) =>
    EXPORT_ONLY_HEADERS.some((h) => normalizeHeader(h) === normalizeHeader(header));

const REQUIRED_HEADERS = COLUMNS.filter((c) => c.required).map((c) => c.header);
const COMPONENT_KEYS = COLUMNS.filter((c) => c.component).map((c) => c.key);

module.exports = {
    COLUMNS,
    EXPORT_ONLY_HEADERS,
    REQUIRED_HEADERS,
    COMPONENT_KEYS,
    normalizeHeader,
    findColumn,
    isExportOnly,
};
