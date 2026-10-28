require('dotenv').config()
const prisma = require('../../utils/prismaClient');
const { toPrismaEnum, fromPrismaEnum } = require('../../utils/enumMap');
const { toDate } = require('../../utils/dateHelper');
const { num } = require('../../utils/serialize');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');
const { addressLat, addressLng, radius } = require('../../../constant/latitudeLongitude');
const HOLIDAY_LIST = process.env.HOLIDAY_LIST.split(',');

// Shapes one attendance row back into the response form the Mongo-backed API returned:
// enum values with their spaces restored, and totalHours as a number rather than a
// Decimal-as-string.
const toRecordResponse = (record) => record
    ? { ...record, shift: fromPrismaEnum('shift', record.shift), totalHours: num(record.totalHours) }
    : record;

function calculateDistance(lat1, lon1, lat2, lon2) {
    const toRad = value => (value * Math.PI) / 180;

    const R = 6371; // Radius of the Earth in kilometers
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in kilometers

    return distance * 1000; // Convert to meters
}

// Function to check user location
const checkUserLocation = async (empId, latitude, longitude, res) => {
    try {
        const type = await prisma.user.findUnique({ where: { empId } });
        if (!type) {
            sendErrorResponse(res, 400, "User not found");
            return false;
        }

        if (type.worktype === 'WFO') {
            const distance = calculateDistance(latitude, longitude, addressLat, addressLng);
            if (!(distance <= radius)) {
                sendErrorResponse(res, 400, "You are not in office area for attendance");
                return false;
            }
        }

        return true;
    } catch (error) {
        console.log(error);
        sendErrorResponse(res, 500, "Something went wrong", error);
        return false;
    }
};

exports.setuserAttendance = async (req, res) => {
    const { empId, inTime, outTime, halfDay, longitude, latitude, shift } = req.body;

    const date = new Date().toISOString().split('T')[0]; // Normalize date to the start of the day (midnight)

    try {
        if (inTime || outTime) {
            const isLocationValid = await checkUserLocation(empId, latitude, longitude, res);
            if (!isLocationValid) {
                return;
            }
        }

        // One row per (empId, date) now, instead of finding a wrapper doc and searching its array
        let record = await prisma.attendanceRecord.findFirst({ where: { empId, date: toDate(date) } });

        const nineAM = new Date(date);
        nineAM.setUTCHours(9, 0, 0, 0);
        const threePM = new Date(date);
        threePM.setUTCHours(15, 0, 0, 0);

        if (inTime) {
            const inTimeDate = new Date(inTime);
            if (shift === 'Day Shift') {
                if (inTimeDate < nineAM) {
                    return sendErrorResponse(res, 400, "In-time must be greater than or equal to 9 AM");
                }
                if (inTimeDate > threePM) {
                    return sendErrorResponse(res, 400, "In-time must be less than or equal to 3 PM");
                }
            } else if (shift === 'Evening Shift') {
                const twoPM = new Date(date);
                twoPM.setUTCHours(14, 0, 0, 0);
                const elevenPM = new Date(date);
                elevenPM.setUTCHours(23, 0, 0, 0);
                if (inTimeDate < twoPM) {
                    return sendErrorResponse(res, 400, "In-time must be greater than or equal to 2 PM");
                }
                if (inTimeDate > elevenPM) {
                    return sendErrorResponse(res, 400, "In-time must be less than or equal to 11 PM");
                }
            } else if (shift === 'Night Shift') {
                const tenPM = new Date(date);
                tenPM.setUTCHours(22, 0, 0, 0);
                const sevenAM = new Date(date);
                sevenAM.setUTCHours(7, 0, 0, 0);
                if (inTimeDate < tenPM) {
                    return sendErrorResponse(res, 400, "In-time must be greater than or equal to 10 PM");
                }
                if (inTimeDate > sevenAM) {
                    return sendErrorResponse(res, 400, "In-time must be less than or equal to 7 AM");
                }
            }

            const fields = {
                inTime: inTimeDate,
                status: 'Absent',
                halfDay: halfDay || false,
                latitude: latitude != null ? latitude : null,
                longitude: longitude != null ? longitude : null,
                shift: toPrismaEnum('shift', shift),
                totalHours: 0
            };

            if (record) {
                record = await prisma.attendanceRecord.update({ where: { id: record.id }, data: fields });
            } else {
                record = await prisma.attendanceRecord.create({ data: { empId, date: toDate(date), ...fields } });
            }
        } else if (outTime) {
            const outTimeDate = new Date(outTime);
            if (!record) {
                return sendErrorResponse(res, 400, "Attendance record not found for the given date");
            }
            if (!record.inTime) {
                return sendErrorResponse(res, 400, "In-time record not found for the given date");
            }

            const difference = outTimeDate - record.inTime;
            const hoursDifference = difference / (1000 * 60 * 60);

            if (hoursDifference < 8) {
                return sendErrorResponse(res, 400, "Working hours should not be less than 8 hours");
            }

            record = await prisma.attendanceRecord.update({
                where: { id: record.id },
                data: {
                    outTime: outTimeDate,
                    status: 'Present',
                    halfDay: halfDay || record.halfDay,
                    latitude: latitude != null ? latitude : record.latitude,
                    longitude: longitude != null ? longitude : record.longitude,
                    shift: toPrismaEnum('shift', shift),
                    totalHours: hoursDifference
                }
            });
        }

        return sendSuccessResponse(res, 200, "Attendance updated successfully", toRecordResponse(record));

    } catch (err) {
        console.log(err);
        if (err.message === 'Please set working location' || err.message === 'You are not within the allowed location for attendance') {
            return sendErrorResponse(res, 400, err.message);
        } else if (err.code === 'P2002') {
            return sendErrorResponse(res, 400, "Validation error", err);
        }
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
};

// check today inTime did or not
exports.checkInTime = async (req, res) => {
    const { empId } = req.body;
    const date = new Date().toISOString().split('T')[0];
    try {
        const record = await prisma.attendanceRecord.findFirst({ where: { empId, date: toDate(date) } });

        if (record && record.inTime) {
            return sendSuccessResponse(res, 200, "In-time recorded for today", { inTime: true });
        }
        return sendErrorResponse(res, 404, "In-time not recorded for today", { inTime: false });
    } catch (err) {
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
}

exports.checkOutTime = async (req, res) => {
    const { empId } = req.body;
    const date = new Date().toISOString().split('T')[0];

    try {
        const record = await prisma.attendanceRecord.findFirst({ where: { empId, date: toDate(date) } });

        if (record && record.outTime) {
            return sendSuccessResponse(res, 200, "Out-time recorded for today", { outTime: true });
        }
        return sendErrorResponse(res, 404, "Out-time not recorded for today", { outTime: false });
    } catch (err) {
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
}

// Called by the node-schedule cron job in server.js, not a route.
exports.updateAttendanceForAbsentUsers = async () => {
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];
    const todayFormatted = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`;

    const isWeekend = today.getDay() === 0 || today.getDay() === 6;
    const isHoliday = HOLIDAY_LIST.includes(todayFormatted);

    try {
        const users = await prisma.user.findMany();

        for (const user of users) {
            // Faithfully replicated, NOT fixed: the original also skips whenever the employee's
            // own status is truthy (active, since User.status defaults to true) — meaning this
            // job, as originally written, only ever marks *inactive* employees absent and skips
            // every active one, which looks backwards for a job whose whole purpose is marking
            // active employees absent when they don't check in. Left as-is rather than silently
            // inverted, since this is a background cron job with no HTTP surface to verify a fix
            // against — flagged in migration/MIGRATION_LOG.md as needing a product decision.
            if (user.status) {
                continue;
            }

            if (!user.shift) {
                continue; // Skip if user has no shift assigned
            }

            const existing = await prisma.attendanceRecord.findFirst({ where: { empId: user.empId, date: toDate(todayDate) } });

            if (existing && existing.status === 'Present') {
                continue;
            }

            let status = isWeekend || isHoliday ? 'Holiday' : 'Absent';

            if (!isWeekend && !isHoliday) {
                const onLeave = await prisma.leaveRequest.findFirst({
                    where: {
                        empId: user.empId,
                        startDate: { lte: toDate(todayDate) },
                        endDate: { gte: toDate(todayDate) },
                        status: 'Approved'
                    }
                });
                status = onLeave ? 'Leave' : 'Absent';
            }

            if (existing) {
                await prisma.attendanceRecord.update({ where: { id: existing.id }, data: { status } });
            } else {
                await prisma.attendanceRecord.create({
                    data: {
                        empId: user.empId,
                        date: toDate(todayDate),
                        status,
                        shift: toPrismaEnum('shift', user.shift),
                        totalHours: 0
                    }
                });
            }
        }

        console.log("Attendance updated for absent users.");
    } catch (err) {
        console.error("Error updating attendance:", err);
    }
};

// get all employee today attendance
exports.getEmployeeAttendanceToday = async (req, res) => {
    const today = new Date();
    const todayDate = today.toISOString().split('T')[0];

    try {
        // Original also filtered on the attendance wrapper's own `status` field (`$match:
        // {status: false}`) before this. That field is gone (dropped as redundant during Phase 2
        // schema design — see schema.prisma header), and its polarity relative to User.status was
        // never clearly consistent in the original either (see updateAttendanceForAbsentUsers'
        // comment above). Rather than guess at a replacement filter, it's dropped entirely here —
        // this endpoint now returns today's attendance for every employee with a record, full stop.
        const records = await prisma.attendanceRecord.findMany({ where: { date: toDate(todayDate) } });

        if (!records.length) {
            return sendErrorResponse(res, 404, "Attendance records not found for today");
        }

        const empIds = [...new Set(records.map(r => r.empId))];
        const users = await prisma.user.findMany({ where: { empId: { in: empIds } } });
        const userByEmpId = Object.fromEntries(users.map(u => [u.empId, u]));

        const todayAttendance = records.map(r => {
            const user = userByEmpId[r.empId];
            return {
                empId: r.empId,
                inTime: r.inTime,
                outTime: r.outTime,
                status: r.status,
                halfDay: r.halfDay,
                shift: fromPrismaEnum('shift', r.shift),
                fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null,
                totalHours: num(r.totalHours)
            };
        });

        return sendSuccessResponse(res, 200, "Employee attendance for today", todayAttendance);
    } catch (err) {
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
}

// get emp attendance monthly report (all employees)
exports.getEmployeeAttendanceMonthly = async (req, res) => {
    const { month, year } = req.body;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    try {
        const records = await prisma.attendanceRecord.findMany({
            where: { date: { gte: startDate, lt: endDate } },
            orderBy: { date: 'asc' }
        });

        if (!records.length) {
            return sendErrorResponse(res, 404, "No attendance records found for the given month and year");
        }

        const empIds = [...new Set(records.map(r => r.empId))];
        const users = await prisma.user.findMany({ where: { empId: { in: empIds } } });
        const userByEmpId = Object.fromEntries(users.map(u => [u.empId, u]));

        const byEmpId = {};
        for (const r of records) {
            if (!byEmpId[r.empId]) {
                const user = userByEmpId[r.empId];
                byEmpId[r.empId] = {
                    empId: r.empId,
                    fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null,
                    attendanceRecords: []
                };
            }
            byEmpId[r.empId].attendanceRecords.push(toRecordResponse(r));
        }

        return sendSuccessResponse(res, 200, "Employee attendance for the given month", Object.values(byEmpId));
    } catch (err) {
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
}

exports.getEmployeeAttendanceReport = async (req, res) => {
    const { empId } = req.body;

    try {
        const records = await prisma.attendanceRecord.findMany({ where: { empId } });

        if (!records.length) {
            return sendErrorResponse(res, 404, "No attendance records found for the given employee");
        }

        const user = await prisma.user.findUnique({ where: { empId } });

        const totalLeave = records.filter(r => r.status === 'Leave').length;
        const present = records.filter(r => r.status === 'Present').length;
        const absent = records.filter(r => r.status === 'Absent').length;
        // Original counted a "Medical Leave" status that was never a valid enum value on the
        // schema — dead code that always evaluated to 0. Kept as a literal 0 for the same
        // response shape, rather than inventing a status that never existed.
        const medicalLeave = 0;

        const hoursValues = records.map(r => r.totalHours).filter(v => v != null).map(Number);
        const avgWorkingTime = hoursValues.length ? hoursValues.reduce((a, b) => a + b, 0) / hoursValues.length : null;

        const inTimes = records.filter(r => r.inTime).map(r => r.inTime.getTime());
        const avgInTime = inTimes.length ? new Date(inTimes.reduce((a, b) => a + b, 0) / inTimes.length) : null;

        const outTimes = records.filter(r => r.outTime).map(r => r.outTime.getTime());
        const avgOutTime = outTimes.length ? new Date(outTimes.reduce((a, b) => a + b, 0) / outTimes.length) : null;

        return sendSuccessResponse(res, 200, "Employee attendance report", {
            empId,
            fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null,
            totalLeave,
            present,
            absent,
            medicalLeave,
            avgWorkingTime,
            avgInTime,
            avgOutTime
        });
    }
    catch (err) {
        sendErrorResponse(res, 500, "Something went wrong", err);
    }
}

// get monthly attendance array for one empId
exports.getMonthlyAttendance = async (req, res) => {
    const { empId, month, year } = req.body;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    try {
        const records = await prisma.attendanceRecord.findMany({
            where: { empId, date: { gte: startDate, lt: endDate } },
            orderBy: { date: 'asc' }
        });

        if (!records.length) {
            return sendErrorResponse(res, 404, 'No attendance records found for the given employee');
        }

        const user = await prisma.user.findUnique({ where: { empId } });

        return sendSuccessResponse(res, 200, 'Employee attendance report', {
            empId,
            fullName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null,
            attendanceRecords: records.map(toRecordResponse)
        });
    } catch (err) {
        sendErrorResponse(res, 500, 'Something went wrong', err);
    }
};
