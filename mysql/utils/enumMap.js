// Bidirectional translation between the original enum strings (what the API has always sent
// and received, e.g. "Client Location") and Prisma's enum identifiers, which can't contain
// spaces (e.g. Client_Location, @map'd to "Client Location" at the DB column level).
//
// Needed on the way IN (request body -> Prisma write) same as migration/etl/_lib.js's mapEnum,
// but also on the way OUT (Prisma read -> API response): Prisma always represents an enum value
// using its declared identifier, never the raw @map'd DB string, so a value read back without
// translation would come back as "Client_Location" instead of the original "Client Location" —
// a response-shape break for anything comparing this API's output against the Mongo-backed one.

const maps = {
    workType: { 'WFO': 'WFO', 'WFH': 'WFH', 'Client Location': 'Client_Location' },
    workMode: {
        'Remote': 'Remote', 'On-site': 'On_site', 'Hybrid': 'Hybrid',
        'WFH': 'WFH', 'Work From Home': 'Work_From_Home', 'WFO': 'WFO'
    },
    leaveType: {
        'Sick Leave': 'Sick_Leave', 'Casual Leave': 'Casual_Leave', 'Paid Leave': 'Paid_Leave',
        'Unpaid Leave': 'Unpaid_Leave', 'Other': 'Other'
    },
    shift: {
        'Evening Shift': 'Evening_Shift', 'Day Shift': 'Day_Shift', 'Night Shift': 'Night_Shift'
    },
    condition: {
        'New': 'New', 'Good': 'Good', 'Fair': 'Fair', 'Damaged': 'Damaged', 'Beyond Repair': 'Beyond_Repair'
    },
    workStatus: {
        'Not Started': 'Not_Started', 'In Progress': 'In_Progress', 'Completed': 'Completed',
        'On Hold': 'On_Hold', 'Cancelled': 'Cancelled'
    }
};

const reverseMaps = {};
for (const mapName of Object.keys(maps)) {
    reverseMaps[mapName] = {};
    for (const [original, prismaValue] of Object.entries(maps[mapName])) {
        reverseMaps[mapName][prismaValue] = original;
    }
}

// Throws on an unmapped value rather than silently letting a bad enum through to the database.
const toPrismaEnum = (mapName, value) => {
    if (value === undefined || value === null || value === '') return null;
    const map = maps[mapName];
    if (!map) throw new Error(`No enum map registered for "${mapName}"`);
    const mapped = map[value];
    if (mapped === undefined) {
        throw new Error(`Unmapped enum value "${value}" for "${mapName}" — investigate before proceeding`);
    }
    return mapped;
};

// Falls back to the raw value rather than throwing — a read path shouldn't break on data that
// predates this map, it should just pass the value through as-is.
const fromPrismaEnum = (mapName, value) => {
    if (value === undefined || value === null) return value;
    const map = reverseMaps[mapName];
    if (!map) return value;
    return map[value] !== undefined ? map[value] : value;
};

module.exports = { toPrismaEnum, fromPrismaEnum };
