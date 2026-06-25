const TimeSheet = require('../../models/TimeSheet'); // Adjust path as per your project structure
const User = require('../../models/User');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/common');
const { sendEmail } = require('../../utils/emailService');
const sendTimesheetHtml = require('../../utils/htmlText/timesheetText');

// Create a new TimeSheet entry
const createTimeSheet = async (req, res) => {
  const { empId, date, breakEndTime, breakStartTime, hoursWorked, pendingTasks, completedTasks, upcomingTasks, listOfSelectedManager } = req.body;

  try {
    // Validate required fields
    if (!empId || !date || !breakStartTime || !breakEndTime || !hoursWorked || !pendingTasks || !completedTasks) {
      // return res.status(400).json({ message: 'All required fields must be provided' });
      return sendErrorResponse(res, 400, "All required fields must be provided");
    }

    if (listOfSelectedManager.lenght == 0) {
      return sendErrorResponse(res, 400, "List of manager not be zero");
    }
    // Extract only the date part (without time) for the timesheet check
    const timesheetDate = new Date(date).toISOString().split('T')[0];

    // Find the timesheet for the employee
    const employeeTimeSheet = await TimeSheet.findOne({ empId });

    const name = await User.findOne({ empId });
    console.log(name,'kkkkkkk')

    if (employeeTimeSheet) {
      // Check if the timesheet for the given date already exists in the array
      const existingEntry = employeeTimeSheet.timeSheets.find(ts => {
        const tsDate = new Date(ts.date).toISOString().split('T')[0];
        return tsDate === timesheetDate;
      });

      if (existingEntry) {
        return sendErrorResponse(res, 400, "TimeSheet already exists for this date", existingEntry);
      }

      // If no timesheet for the given date exists, add a new entry to the array
      employeeTimeSheet.timeSheets.push({
        date,
        breakStartTime,
        breakEndTime,
        hoursWorked,
        pendingTasks,
        completedTasks,
        upcomingTasks
      });

      // Save the updated document
      await employeeTimeSheet.save();
      // return res.status(201).json({ message: 'New timesheet entry added successfully', employeeTimeSheet });
      return sendSuccessResponse(res, 201, "New timesheet entry added successfully", employeeTimeSheet);
    } else {
      // If no timesheet exists for the employee, create a new document
      const newTimeSheet = new TimeSheet({
        empId,
        timeSheets: [
          {
            date,
            breakStartTime,
            breakEndTime,
            hoursWorked,
            pendingTasks,
            completedTasks,
            upcomingTasks,
            listOfmanager: listOfSelectedManager
          }
        ]
      });

      // Save the new document
      const savedTimeSheet = await newTimeSheet.save();

      const info = {
        date,
        breakStartTime,
        breakEndTime,
        hoursWorked,
        pendingTasks,
        completedTasks,
        upcomingTasks,
        listOfmanager: listOfSelectedManager,
        name: name.fullName
      }

      const { subject, html } = sendTimesheetHtml(info)
      await sendEmail(listOfSelectedManager, subject, html);
      return sendSuccessResponse(res, 201, "TimeSheet created successfully", savedTimeSheet);
    }
  } catch (error) {
    console.error(error);
    // res.status(500).json({ message: 'Server error. Unable to create timesheet.' });
    return sendErrorResponse(res, 500, "Server error. Unable to create timesheet.");
  }
};

const checkTimeSheetStatusOnDate = async (req, res) => {
  try {
    const { empId, date } = req.body;

    // Extract only the date part (without time) for the timesheet check
    const timesheetDate = new Date(date).toISOString().split('T')[0];

    // Find the timesheet document for the given employee
    const employeeTimeSheet = await TimeSheet.findOne({ empId });

    if (!employeeTimeSheet) {
      // No timesheet exists for the employee
      return sendSuccessResponse(res, 200, "failure", null);
    }

    // Check if a timesheet for the given date exists in the timeSheets array
    const existingEntry = employeeTimeSheet.timeSheets.find(ts => {
      const tsDate = new Date(ts.date).toISOString().split('T')[0];
      return tsDate === timesheetDate;
    });

    if (!existingEntry) {
      // No timesheet found for the given date
      return sendSuccessResponse(res, 200, "failure", null);
    }

    // Timesheet found, return success and the timesheet data
    return sendSuccessResponse(res, 200, "success", existingEntry);

  } catch (error) {
    console.error(error);
    return sendErrorResponse(res, 500, "Server error. Unable to check timesheet status.");
  }
};



// Get all timesheets
const getAllTimeSheets = async (req, res) => {
  try {
    const timeSheets = await TimeSheet.find();
    res.status(200).json(timeSheets);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Unable to retrieve timesheets.' });
  }
};


// Get a single timesheet by ID
const getTimeSheetById = async (req, res) => {
  const { id } = req.params;

  try {
    const timeSheet = await TimeSheet.findById(id);
    if (!timeSheet) {
      return res.status(404).json({ message: 'TimeSheet not found' });
    }
    res.status(200).json(timeSheet);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Unable to retrieve timesheet.' });
  }
};

// Update a timesheet
const updateTimeSheet = async (req, res) => {
  const { id } = req.params;
  const { empId, date, breakTime, hoursWorked, pendingTasks, completedTasks, upcomingTasks,listOfSelectedManager } = req.body;

  try {
    const timeSheet = await TimeSheet.findById(id);
    if (!timeSheet) {
      return res.status(404).json({ message: 'TimeSheet not found' });
    }

    // Update the fields
    timeSheet.empId = empId || timeSheet.empId;
    timeSheet.date = date || timeSheet.date;
    timeSheet.breakTime = breakTime || timeSheet.breakTime;
    timeSheet.hoursWorked = hoursWorked || timeSheet.hoursWorked;
    timeSheet.pendingTasks = pendingTasks || timeSheet.pendingTasks;
    timeSheet.completedTasks = completedTasks || timeSheet.completedTasks;
    timeSheet.upcomingTasks = upcomingTasks || timeSheet.upcomingTasks;
    timeSheet.listOfmanager = listOfSelectedManager || timeSheet.listOfmanager
    const updatedTimeSheet = await timeSheet.save();

    res.status(200).json({
      message: 'TimeSheet updated successfully',
      data: updatedTimeSheet,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Unable to update timesheet.' });
  }
};

// Delete a timesheet
const deleteTimeSheet = async (req, res) => {
  const { id } = req.params;

  try {
    const timeSheet = await TimeSheet.findById(id);
    if (!timeSheet) {
      return res.status(404).json({ message: 'TimeSheet not found' });
    }

    await timeSheet.remove();
    res.status(200).json({ message: 'TimeSheet deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Unable to delete timesheet.' });
  }
};

module.exports = {
  createTimeSheet,
  getAllTimeSheets,
  getTimeSheetById,
  updateTimeSheet,
  checkTimeSheetStatusOnDate,
  deleteTimeSheet,
};
