const admin = require('firebase-admin');
const serviceAccount = require('../../../config/firebase-admin.json');
const prisma = require('../../utils/prismaClient');
const { toDate } = require('../../utils/dateHelper');
const { sendSuccessResponse, sendErrorResponse } = require('../../../utils/common');

// The Mongo-backed controller/notification/index.js calls admin.initializeApp() unguarded at
// module scope. Both trees are loaded in the same process during the migration, and a second
// unguarded call throws "The default Firebase app already exists" — crashing the server at
// startup. Guarded so whichever module loads first wins and the other reuses that app.
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

exports.saveFcmToken = async (req, res) => {
  const { empId, fcmToken } = req.body;
  try {
    if (!empId) {
      return sendErrorResponse(res, 400, 'Empid is requied');
    }
    if (!fcmToken) {
      return sendErrorResponse(res, 400, 'fcmToken is requied');
    }

    const existing = await prisma.fcmToken.findUnique({ where: { empId } });
    if (existing) {
      await prisma.fcmToken.update({ where: { empId }, data: { fcmToken } });
    } else {
      await prisma.fcmToken.create({ data: { empId, fcmToken } });
    }

    return sendSuccessResponse(res, 200, 'Token saved/updated successfully.');
  } catch (error) {
    console.error(error);
    return sendErrorResponse(res, 500, 'Internal Server Error');
  }
};

exports.sendNotification = async (req, res) => {
  const { empId, title, body } = req.body;
  try {
    const user = await prisma.fcmToken.findUnique({ where: { empId } });
    if (!user) {
      throw new Error('User not found');
    }
    const payload = {
      notification: { title, body },
      token: user.fcmToken,
    };

    await admin.messaging().send(payload);

    return sendSuccessResponse(res, 200, 'Notification sent successfully');
  } catch (error) {
    console.error('Error sending message:', error);
    return sendErrorResponse(res, 500, 'Internal Server Error');
  }
};

// Internal helper used by the other mysql/ controllers (userinfo, leave, asset). Deliberately
// swallows its own errors — a failed push must never fail the request that triggered it, same
// as the original.
exports.sendPushNotification = async (empId, title, body) => {
  try {
    const user = await prisma.fcmToken.findUnique({ where: { empId } });
    if (!user) {
      throw new Error('User not found');
    }
    const payload = {
      notification: { title, body },
      token: user.fcmToken,
    };

    await admin.messaging().send(payload);

  } catch (error) {
    console.error('Error sending message:', error);
  }
};

// Both cron helpers below notify every employee with no attendance record for today. The
// original loaded every attendance wrapper document and compared local-midnight timestamps
// against stored UTC dates — fragile across timezones. Here the date match is done in the
// query, consistent with mysql/controller/attendance.
const notifyEmployeesMissingAttendance = async (title, body) => {
  const todayDate = new Date().toISOString().split('T')[0];

  const users = await prisma.user.findMany();

  for (const user of users) {
    const todayAttendance = await prisma.attendanceRecord.findFirst({
      where: { empId: user.empId, date: toDate(todayDate) }
    });

    if (!todayAttendance) {
      await exports.sendPushNotification(user.empId, title, body);
    }
  }
};

exports.sendDoAttendance = async () => {
  try {
    await notifyEmployeesMissingAttendance(
      "Attendance Reminder",
      "You have not marked your attendance for today. Please do it before your shift ends."
    );
    console.log("Attendance check complete and notifications sent.");
  } catch (error) {
    console.error("Error in sendDoAttendance:", error);
  }
};

exports.sendAttendanceReminder = async () => {
  try {
    await notifyEmployeesMissingAttendance(
      "Attendance Reminder",
      "Don't forget to mark your attendance today!"
    );
    console.log("Attendance reminders sent successfully.");
  } catch (error) {
    console.error("Error in sendAttendanceReminder:", error);
  }
};
