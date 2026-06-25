
const Admin = require('../../models/Admin');
const User = require('../../models/User');
const Leave = require('../../models/leave');
const Project = require('../../models/Project');
const userAttendance = require('../../models/attendance');
const Client = require('../../models/Clients');

const { sendErrorResponse, sendSuccessResponse } = require('../../utils/common');

exports.getDifferentCount = async (req, res) => {
    try {
        // Fetch counts for each collection
        const totalUsers = await User.countDocuments(); // Count total users
        const totalAdmins = await Client.countDocuments(); // Count total clients
        const totalProjects = await Project.countDocuments(); // Count total projects
        const LeavesData = await Leave.find(); // Fetch all leave data

        const date = new Date();
        let totalLeaves = 0;

        LeavesData.forEach((element) => {
            const onLeaves = element.leaves.filter((item) =>
                item.startDate <= date && item.endDate >= date && item.status === 'Approved' // Check if the current date is within the leave period and status is 'Approved'
            );
            if (onLeaves.length > 0) {
                totalLeaves += 1; // Increment by 1 for each employee with active leaves
            }
        });

        // Create a single object with the counts
        const data = {
            totalUsers,
            totalAdmins,
            totalProjects,
            totalLeaves,
        };

        // Send the response with the data
        return sendSuccessResponse(res, 200, 'Fetched data successfully', data);
    } catch (error) {
        console.error(error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};


exports.getAttendanceData = async (req, res) => {
    try {
        // Fetch attendance records
        const attendanceRecords = await userAttendance.find();

        if (!attendanceRecords || attendanceRecords.length === 0) {
            return res.status(404).json({ message: "No attendance records found." });
        }

        // Initialize the final data object with the desired structure
        const data = {
            DayOne: { absentCount: 0, presentCount: 0 },
            DayRwo: { absentCount: 0, presentCount: 0 },
            DayThree: { absentCount: 0, presentCount: 0 },
            DayFour: { absentCount: 0, presentCount: 4 },
            DayFive: { absentCount: 0, presentCount: 0 },
            DaySix: { absentCount: 0, presentCount: 0 },
        };

        // Loop through each employee's attendance record
        attendanceRecords.forEach((record) => {
            // Retrieve the last 6 records
            const lastSixRecords = record.attendance.slice(-6); // Get the last 6 records

            // Iterate over the last 6 records and map them to day names
            lastSixRecords.forEach((entry, index) => {
                const dayKey = Object.keys(data)[index]; // Map index to keys like "dayone", "daytwo", etc.

                if (dayKey) {
                    // Increment counts based on the status
                    if (entry.status === "Present") {
                        data[dayKey].presentCount++;
                    } else if (entry.status === "Absent") {
                        data[dayKey].absentCount++;
                    }
                }
            });
        });

        // Return the grouped data
        return sendSuccessResponse(res, 200, 'Fetched data successfully', data);

    } catch (error) {
        console.error(error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);
    }
};




exports.getProjectStatusData = async (req, res) => {
    try {
        // Fetch all projects
        const projects = await Project.find();

        if (!projects || projects.length === 0) {
            return res.status(404).json({ message: "No projects found." });
        }

        // Initialize the status data template
        const statusData = [
            { status: "Not Started", count: 0 },
            { status: "In Progress", count: 0 },
            { status: "Completed", count: 0 },
            { status: "On Hold", count: 0 },
            { status: "Cancelled", count: 0 },
        ];

        // Count projects by their workStatus
        projects.forEach((project) => {
            const statusEntry = statusData.find((entry) => entry.status === project.workStatus);
            if (statusEntry) {
                statusEntry.count++;
            }
        });

        return sendSuccessResponse(res, 200, 'Project status data fetched successfully.', statusData);

    } catch (error) {
        console.error("Error fetching project status data:", error);
        return sendErrorResponse(res, 500, 'Something went wrong', error);

    }
};


