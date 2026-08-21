const prisma = require('../../utils/prismaClient');
const { toDate } = require('../../utils/dateHelper');
const { num } = require('../../utils/serialize');
const { sendSuccessResponse, sendErrorResponse } = require('../../../utils/common');
const { sendEmail } = require('../../../utils/emailService');
const sendTimesheetHtml = require('../../../utils/htmlText/timesheetText');

// hoursWorked is a DECIMAL column, which Prisma serializes to a string — Mongoose returned a
// number. Normalized on the way out so responses stay shape-compatible.
const toTimesheetResponse = (ts) => ts ? { ...ts, hoursWorked: num(ts.hoursWorked) } : ts;

// Create a new TimeSheet entry
const createTimeSheet = async (req, res) => {
  const { empId, date, breakEndTime, breakStartTime, hoursWorked, pendingTasks, completedTasks, upcomingTasks, listOfSelectedManager } = req.body;

  try {
    if (!empId || !date || !breakStartTime || !breakEndTime || !hoursWorked || !pendingTasks || !completedTasks) {
      return sendErrorResponse(res, 400, "All required fields must be provided");
    }

    // Original checked `listOfSelectedManager.lenght` (typo for `.length`) — `undefined == 0`
    // is false, so this validation never actually ran regardless of whether the list was
    // empty. Also crashed with a 500 if listOfSelectedManager was omitted entirely, since
    // reading `.lenght` off `undefined` throws. Fixed to the working, clearly-intended check.
    if (!listOfSelectedManager || listOfSelectedManager.length === 0) {
      return sendErrorResponse(res, 400, "List of manager not be zero");
    }

    const timesheetDate = toDate(date);

    const existingEntry = await prisma.timesheet.findFirst({ where: { empId, date: timesheetDate } });

    if (existingEntry) {
      return sendErrorResponse(res, 400, "TimeSheet already exists for this date", toTimesheetResponse(existingEntry));
    }

    const user = await prisma.user.findUnique({ where: { empId } });

    const savedTimeSheet = await prisma.timesheet.create({
      data: {
        empId,
        date: timesheetDate,
        breakStartTime: toDate(breakStartTime),
        breakEndTime: toDate(breakEndTime),
        hoursWorked,
        pendingTasks,
        completedTasks,
        upcomingTasks: upcomingTasks || null,
        managers: { create: listOfSelectedManager.map(email => ({ managerEmail: email.toString() })) }
      },
      include: { managers: true }
    });

    const info = {
      date, breakStartTime, breakEndTime, hoursWorked, pendingTasks, completedTasks, upcomingTasks,
      listOfmanager: listOfSelectedManager,
      name: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : null
    };

    const { subject, html } = sendTimesheetHtml(info);
    await sendEmail(listOfSelectedManager, subject, html);

    return sendSuccessResponse(res, 201, "TimeSheet created successfully", toTimesheetResponse(savedTimeSheet));

  } catch (error) {
    console.error(error);
    return sendErrorResponse(res, 500, "Server error. Unable to create timesheet.");
  }
};

const checkTimeSheetStatusOnDate = async (req, res) => {
  try {
    const { empId, date } = req.body;

    const existingEntry = await prisma.timesheet.findFirst({
      where: { empId, date: toDate(date) },
      include: { managers: true }
    });

    if (!existingEntry) {
      return sendSuccessResponse(res, 200, "failure", null);
    }

    return sendSuccessResponse(res, 200, "success", toTimesheetResponse(existingEntry));

  } catch (error) {
    console.error(error);
    return sendErrorResponse(res, 500, "Server error. Unable to check timesheet status.");
  }
};

// Get all timesheets — original responded with a raw array, not the standard envelope; kept
// exactly as-is rather than "fixed" into the envelope, so this stays response-compatible with
// whatever the frontend already expects from this specific endpoint.
const getAllTimeSheets = async (req, res) => {
  try {
    const timeSheets = await prisma.timesheet.findMany({ include: { managers: true } });
    res.status(200).json(timeSheets.map(toTimesheetResponse));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Unable to retrieve timesheets.' });
  }
};

// Get a single timesheet by ID
const getTimeSheetById = async (req, res) => {
  const { id } = req.params;

  try {
    const timeSheet = await prisma.timesheet.findUnique({ where: { id: Number(id) }, include: { managers: true } });
    if (!timeSheet) {
      return res.status(404).json({ message: 'TimeSheet not found' });
    }
    res.status(200).json(toTimesheetResponse(timeSheet));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error. Unable to retrieve timesheet.' });
  }
};

// Update a timesheet
//
// Original fetched the wrapper-per-employee document by Mongo _id via TimeSheet.findById(id),
// then assigned straight onto that wrapper: `timeSheet.date = date`, `timeSheet.breakTime = ...`,
// `timeSheet.listOfmanager = ...`. None of those fields exist on the wrapper schema (they only
// exist on the nested per-day sub-document), so Mongoose's strict mode silently dropped every
// one of those assignments — this endpoint never actually updated anything except `updatedAt`.
// The relational `id` here identifies one real timesheet row, so update is implemented for real
// against the fields that genuinely exist on it — same call made for editLeave and the
// getTimeSheetById/deleteTimeSheet siblings below.
//
// One field is deliberately still not updatable: the original destructured `breakTime`
// (singular), which never matched the schema's `breakStartTime`/`breakEndTime` either — there's
// no way to tell whether that meant to update both, or was its own separate mistake, so it's
// left alone rather than guessed at.
const updateTimeSheet = async (req, res) => {
  const { id } = req.params;
  const { date, hoursWorked, pendingTasks, completedTasks, upcomingTasks, listOfSelectedManager } = req.body;

  try {
    const timeSheet = await prisma.timesheet.findUnique({ where: { id: Number(id) } });
    if (!timeSheet) {
      return res.status(404).json({ message: 'TimeSheet not found' });
    }

    const updated = await prisma.timesheet.update({
      where: { id: Number(id) },
      data: {
        date: date ? toDate(date) : timeSheet.date,
        hoursWorked: hoursWorked || timeSheet.hoursWorked,
        pendingTasks: pendingTasks || timeSheet.pendingTasks,
        completedTasks: completedTasks || timeSheet.completedTasks,
        upcomingTasks: upcomingTasks || timeSheet.upcomingTasks
      }
    });

    if (listOfSelectedManager && listOfSelectedManager.length > 0) {
      await prisma.timesheetManager.deleteMany({ where: { timesheetId: Number(id) } });
      await prisma.timesheetManager.createMany({
        data: listOfSelectedManager.map(email => ({ timesheetId: Number(id), managerEmail: email.toString() }))
      });
    }

    const withManagers = await prisma.timesheet.findUnique({ where: { id: Number(id) }, include: { managers: true } });

    res.status(200).json({
      message: 'TimeSheet updated successfully',
      data: toTimesheetResponse(withManagers),
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
    const timeSheet = await prisma.timesheet.findUnique({ where: { id: Number(id) } });
    if (!timeSheet) {
      return res.status(404).json({ message: 'TimeSheet not found' });
    }

    await prisma.timesheet.delete({ where: { id: Number(id) } });
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
