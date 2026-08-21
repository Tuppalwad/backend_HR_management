const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const schedule = require('node-schedule');

// ---routes
// MySQL-backed — the primary implementation as of Phase 5 (Cutover). The original
// Mongo-backed controllers/routes in controller/ and routes/ are untouched and still
// present on disk (nothing deleted), just no longer mounted here — that's the rollback
// path if anything looks wrong post-cutover: revert this file via git, nothing else
// needs to change. See migration/MIGRATION_LOG.md, Phase 5.
const mysqlAdminRoute = require('./mysql/routes/adminRoutes');
const mysqlUserLoginRoute = require('./mysql/routes/userLoginRoute');
const mysqlUserRoute = require('./mysql/routes/userRoutes');
const mysqlUserinfoRoutes = require('./mysql/routes/userinfoRoutes');
const mysqlCheckLoggedin = require('./mysql/routes/checkLoggedin');
const mysqlAttendanceRoute = require('./mysql/routes/attendanceRoute');
const mysqlLeaveRoutes = require('./mysql/routes/leaveRoutes');
const mysqlTimeSheet = require('./mysql/routes/timeSheet');
const mysqlProjectRoutes = require('./mysql/routes/projectRoutes');
const mysqlNotificationRoutes = require('./mysql/routes/notificationRoutes');
const mysqlDashboard = require('./mysql/routes/dasboardRoutes');
const mysqlSendmails = require('./mysql/routes/mailserviceRoute');
const mysqlImageRoutes = require('./mysql/routes/imageRoutes');
const mysqlAssetRoutes = require('./mysql/routes/assetRoutes');
const mysqlAssetMaintenanceRoutes = require('./mysql/routes/assetMaintenanceRoutes');
const mysqlAssetDashboardRoutes = require('./mysql/routes/assetDashboardRoutes');
const mysqlAssetImportRoutes = require('./mysql/routes/assetImportRoutes');
const mysqlAssetDocumentRoutes = require('./mysql/routes/assetDocumentRoutes');
const mysqlAuthenticateToken = require('./mysql/middleware/authenticateToken');

const { updateAttendanceForAbsentUsers } = require('./mysql/controller/attendance');
const { sendDoAttendance, sendAttendanceReminder } = require('./mysql/controller/notification');

// No database dependency at all (pure OS network-interface lookup) — reused as-is, never
// needed a MySQL-backed port.
const ipRoute = require('./routes/ipRoute.js');

const { sendSuccessResponse } = require('./utils/common');

const app = express();

app.use(bodyParser.json());
app.use(cors());

// More specific prefixes first — a bare '/api' mount below would otherwise swallow these,
// and the auth-gated ones among them would 401 the unauthenticated notification routes.
// (Same ordering rule Phase 4 already proved out under '/api/mysql'.)
app.use('/api/notifications', mysqlNotificationRoutes);
app.use('/api/service', mysqlAuthenticateToken, mysqlSendmails);

// Public (no authentication required)
app.use('/api', mysqlAdminRoute);
app.use('/api', mysqlUserLoginRoute);
app.use('/api', mysqlImageRoutes);
app.use('/api', ipRoute);

// Protected (require authentication)
app.use('/api', mysqlAuthenticateToken, mysqlUserRoute);
app.use('/api', mysqlAuthenticateToken, mysqlUserinfoRoutes);
app.use('/api', mysqlAuthenticateToken, mysqlCheckLoggedin);
app.use('/api', mysqlAuthenticateToken, mysqlAttendanceRoute);
app.use('/api', mysqlAuthenticateToken, mysqlLeaveRoutes);
app.use('/api', mysqlAuthenticateToken, mysqlTimeSheet);
app.use('/api', mysqlAuthenticateToken, mysqlProjectRoutes);
app.use('/api', mysqlAuthenticateToken, mysqlDashboard);
app.use('/api/asset', mysqlAuthenticateToken, mysqlAssetRoutes);
app.use('/api/asset/maintenance', mysqlAuthenticateToken, mysqlAssetMaintenanceRoutes);
app.use('/api/asset/dashboard', mysqlAuthenticateToken, mysqlAssetDashboardRoutes);
app.use('/api/asset/import', mysqlAuthenticateToken, mysqlAssetImportRoutes);
app.use('/api/asset/documents', mysqlAuthenticateToken, mysqlAssetDocumentRoutes);
app.use('/asset-uploads', express.static(path.join(__dirname, 'asset', 'uploads', 'documents')));

app.get('/api/@me', mysqlAuthenticateToken, (req, res) => {
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
