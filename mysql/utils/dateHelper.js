// Prisma's MySQL client requires a full ISO-8601 DateTime for any date-ish field passed as a
// string — even columns marked @db.Date. A plain "YYYY-MM-DD" string (exactly what
// request bodies send, and what the Mongo-backed API always accepted) throws
// "premature end of input. Expected ISO-8601 DateTime." Every controller writing a date field
// from request-body input needs to pass it through this first.
const toDate = (value) => {
    if (value === undefined || value === null || value === '') return null;
    if (value instanceof Date) return value;
    return new Date(value);
};

module.exports = { toDate };
