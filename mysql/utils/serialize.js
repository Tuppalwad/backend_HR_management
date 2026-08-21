// Prisma returns DECIMAL columns as Decimal.js objects, which serialize to JSON as *strings*
// ("9.5"), whereas Mongoose returned plain JS numbers (9.5) for the same fields. That's a real
// response-shape break for any client doing arithmetic or .toFixed() on them, so every Decimal
// field is passed through here on the way out.
//
// Affects: Timesheet.hoursWorked, AttendanceRecord.totalHours, Project.budget,
// Asset.purchaseCost, AssetMaintenanceHistory.cost.
const num = (value) => {
    if (value === null || value === undefined) return value;
    return Number(value);
};

module.exports = { num };
