const axios = require('axios');
const admin = require('firebase-admin');
const serviceAccount = require('../../config/firebase-admin.json');
const FcmToken = require('../../models/notification');
const { sendSuccessResponse, sendErrorResponse } = require('../../utils/common');
const User = require('../../models/User');
const userAttendance = require('../../models/attendance');


admin.initializeApp(
  { credential: admin.credential.cert(serviceAccount) }
)

exports.saveFcmToken = async (req, res) => {
  const { empId, fcmToken } = req.body;
  try {
    if (!empId) {
      return sendErrorResponse(res, 400, 'Empid is requied');
    }
    if (!fcmToken) {
      return sendErrorResponse(res, 400, 'fcmToken is requied');
    }
    let user = await FcmToken.findOne({ empId });
    if (user) {
      user.fcmToken = fcmToken;
      await user.save();
    } else {
      user = new FcmToken({ empId, fcmToken });
      await user.save();
    }
    // res.status(200).send('Token saved/updated successfully.');
    return sendSuccessResponse(res, 200, 'Token saved/updated successfully.');
  } catch (error) {
    // res.status(500).send('Internal Server Error');
    return sendErrorResponse(res, 500, 'Internal Server Error');
  }
};



exports.sendNotification = async (req, res) => {
  const { empId, title, body } = req.body;
  try {
    const user = await FcmToken.findOne({ empId });
    if (!user) {
      throw new Error('User not found');
    }
    const payload = {
      notification: {
        title: title,
        body: body,
      },
      token: user.fcmToken,
    };

    const response = await admin.messaging().send(payload);

    return sendSuccessResponse(res, 200, 'Notification sent successfully');
  } catch (error) {
    console.error('Error sending message:', error);
    return sendErrorResponse(res, 500, 'Internal Server Error');
  }
};


exports.sendPushNotification = async (empId, title, body) => {
  try {
    const user = await FcmToken.findOne({ empId });
    if (!user) {
      throw new Error('User not found');
    }
    const payload = {
      notification: {
        title: title,
        body: body,
      },
      token: user.fcmToken,
    };

    await admin.messaging().send(payload);

  } catch (error) {
    console.error('Error sending message:', error);
    // return sendErrorResponse(res, 500, 'Internal Server Error');
  }
};

exports.sendDoAttendance = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of the day

    // Get list of all employee IDs
    const userlist = (await User.find({})).map(user => user.empId);

    // Get all attendance records
    const attendancelist = await userAttendance.find({});

    for (let empId of userlist) {
      // Find attendance record for the employee
      const attendanceRecord = attendancelist.find(record => record.empId === empId);

      if (attendanceRecord) {
        // Check if today's attendance exists
        const todayAttendance = attendanceRecord.attendance.find(
          entry => new Date(entry.date).getTime() === today.getTime()
        );

        if (!todayAttendance) {
          // No attendance for today; send push notification
          const title = "Attendance Reminder";
          const body = "You have not marked your attendance for today. Please do it before your shift ends.";

          await exports.sendPushNotification(empId, title, body);
        }
      } else {
        // No attendance record at all; send push notification
        const title = "Attendance Reminder";
        const body = "You have not marked your attendance for today. Please do it before your shift ends.";

        await exports.sendPushNotification(empId, title, body);
      }
    }
    console.log("Attendance check complete and notifications sent.");
  } catch (error) {
    console.error("Error in sendDoAttendance:", error);
  }
};


exports.sendAttendanceReminder = async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of the day

    // Get list of all employee IDs
    const userlist = (await User.find({})).map(user => user.empId);

    // Get all attendance records
    const attendancelist = await userAttendance.find({});

    for (let empId of userlist) {
      // Find attendance record for the employee
      const attendanceRecord = attendancelist.find(record => record.empId === empId);

      if (attendanceRecord) {
        // Check if today's attendance exists
        const todayAttendance = attendanceRecord.attendance.find(
          entry => new Date(entry.date).getTime() === today.getTime()
        );

        if (!todayAttendance) {
          // No attendance for today; send push notification
          const title = "Attendance Reminder";
          const body = "Don't forget to mark your attendance today!";

          await exports.sendPushNotification(empId, title, body);
        }
      } else {
        // No attendance record at all; send push notification
        const title = "Attendance Reminder";
        const body = "Don't forget to mark your attendance today!";

        await exports.sendPushNotification(empId, title, body);
      }
    }
    console.log("Attendance reminders sent successfully.");
  } catch (error) {
    console.error("Error in sendAttendanceReminder:", error);
  }
};
