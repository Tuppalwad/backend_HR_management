const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const authenticateToken = require('./middleware/authenticateToken')
const schedule = require('node-schedule');

const { updateAttendanceForAbsentUsers } = require('./controller/attendance')


// ---routes 
const adminRoute = require('./routes/adminRoutes');
const userRoute = require('./routes/userRoutes')
const userinfoRoutes = require('./routes/userinfoRoutes')
const attendanceRoute = require('./routes/attendanceRoute')
const userLoginRoute = require('./routes/userLoginRoute')
const logoutRoute = require('./routes/logoutRoute')
const forgotpassRoute = require('./routes/forgotpassRoute')
const imageRoutes = require('./routes/imageRoutes')
const ipRoute = require('./routes/ipRoute.js')
const checkLoggedin = require('./routes/checkLoggedin')
const LeaveRoutes = require('./routes/leaveRoutes')
const ProjectRoutes = require('./routes/projectRoutes.js')
const notificationRoutes = require('./routes/notificationRoutes')
const timeSheet = require('./routes/timeSheet')
const sendmails = require('./routes/mailserviceRoute.js')
const Dashboard = require('./routes/dasboardRoutes.js')
const { sendSuccessResponse } = require('./utils/common');
const { sendDoAttendance, sendAttendanceReminder } = require('./controller/notification/index.js');

const app = express();

app.use(bodyParser.json());
app.use(cors());

// Public routes (no authentication required)
app.use('/api', adminRoute);
app.use('/api', userLoginRoute);
app.use('/api', forgotpassRoute);
app.use('/api', imageRoutes);
app.use('/api', ipRoute);

// Protected routes (require authentication)

app.use('/api', authenticateToken, userRoute);
app.use('/api', authenticateToken, userinfoRoutes);
app.use('/api', authenticateToken, attendanceRoute);
app.use('/api', authenticateToken, logoutRoute);
app.use('/api', authenticateToken, checkLoggedin);
app.use('/api', authenticateToken, timeSheet);

app.use('/api', authenticateToken, LeaveRoutes);
app.use('/api', authenticateToken, ProjectRoutes)
app.use('/api/service', authenticateToken, sendmails)
app.use('/api/notifications', notificationRoutes);
app.use('/api', authenticateToken, Dashboard);

app.get('/api/@me', authenticateToken, (req, res) => {
    return sendSuccessResponse(res, 200, "authorize user")
});

app.get('/', (req, res) => {
    return sendSuccessResponse(res, 200, 'welcome in EMPsystem')
})

// Schedule to send attendance at 1:00 PM (excluding Sunday)
schedule.scheduleJob('0 13 * * 1-6', async () => {
    sendDoAttendance();
});

// Schedule to send attendance reminders at 7:00 AM (excluding Sunday)
schedule.scheduleJob('0 7 * * 1-6', async () => {
    sendAttendanceReminder();
});

// Schedule to update attendance for absent users at 4:00 PM (excluding Sunday)
schedule.scheduleJob('0 16 * * 1-6', () => {
    updateAttendanceForAbsentUsers();
});


module.exports = app
