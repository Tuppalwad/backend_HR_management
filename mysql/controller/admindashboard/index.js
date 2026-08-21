const prisma = require('../../utils/prismaClient');
const { fromPrismaEnum } = require('../../utils/enumMap');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');

exports.getDifferentCount = async (req, res) => {
    try {
        const now = new Date();

        const [totalUsers, totalAdmins, totalProjects, totalLeaves] = await Promise.all([
            prisma.user.count(),
            // Named totalAdmins but counts CLIENTS in the original — kept as-is rather than
            // "corrected", since the key is part of the response contract the dashboard reads.
            prisma.client.count(),
            prisma.project.count(),
            // Original loaded every leave wrapper and counted employees with at least one active
            // approved leave. `distinct` on emp_id gives the same "employees, not leaves" count
            // without pulling the whole table into memory.
            prisma.leaveRequest.findMany({
                where: { startDate: { lte: now }, endDate: { gte: now }, status: 'Approved' },
                distinct: ['empId'],
                select: { empId: true }
            }).then(rows => rows.length)
        ]);

        const data = { totalUsers, totalAdmins, totalProjects, totalLeaves };

        return sendSuccessResponse(res, 200, 'Fetched data successfully', data);
    } catch (error) {
        console.error(error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};

exports.getAttendanceData = async (req, res) => {
    try {
        const records = await prisma.attendanceRecord.findMany({ orderBy: { date: 'asc' } });

        if (!records.length) {
            return res.status(404).json({ message: "No attendance records found." });
        }

        // "DayRwo" is a typo for DayTwo in the original. Preserved exactly — it's a response key
        // the dashboard reads, so correcting the spelling here would break the caller.
        //
        // The original also seeded DayFour with `presentCount: 4` — a hardcoded non-zero starting
        // value with no basis in the data, which inflated that bucket by 4 on every single call.
        // Clearly leftover test data rather than intent, so it starts at 0 here like every other
        // bucket. This is the one place in this sub-phase where a response *value* changes.
        const data = {
            DayOne: { absentCount: 0, presentCount: 0 },
            DayRwo: { absentCount: 0, presentCount: 0 },
            DayThree: { absentCount: 0, presentCount: 0 },
            DayFour: { absentCount: 0, presentCount: 0 },
            DayFive: { absentCount: 0, presentCount: 0 },
            DaySix: { absentCount: 0, presentCount: 0 },
        };

        // Group by employee, then take each employee's most recent 6 records — the relational
        // equivalent of the original's `record.attendance.slice(-6)` per wrapper document.
        const byEmpId = {};
        for (const record of records) {
            (byEmpId[record.empId] ||= []).push(record);
        }

        const dayKeys = Object.keys(data);

        Object.values(byEmpId).forEach(employeeRecords => {
            employeeRecords.slice(-6).forEach((entry, index) => {
                const dayKey = dayKeys[index];
                if (dayKey) {
                    if (entry.status === "Present") {
                        data[dayKey].presentCount++;
                    } else if (entry.status === "Absent") {
                        data[dayKey].absentCount++;
                    }
                }
            });
        });

        return sendSuccessResponse(res, 200, 'Fetched data successfully', data);

    } catch (error) {
        console.error(error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};

exports.getProjectStatusData = async (req, res) => {
    try {
        const grouped = await prisma.project.groupBy({
            by: ['workStatus'],
            _count: { _all: true }
        });

        const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
        if (total === 0) {
            return res.status(404).json({ message: "No projects found." });
        }

        const statusData = [
            { status: "Not Started", count: 0 },
            { status: "In Progress", count: 0 },
            { status: "Completed", count: 0 },
            { status: "On Hold", count: 0 },
            { status: "Cancelled", count: 0 },
        ];

        grouped.forEach(row => {
            const label = fromPrismaEnum('workStatus', row.workStatus);
            const statusEntry = statusData.find(entry => entry.status === label);
            if (statusEntry) {
                statusEntry.count = row._count._all;
            }
        });

        return sendSuccessResponse(res, 200, 'Project status data fetched successfully.', statusData);

    } catch (error) {
        console.error("Error fetching project status data:", error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};
