const prisma = require('../../utils/prismaClient');
const { getActivityDate } = require('../../utils/hrActivity');
const { sendErrorResponse, sendSuccessResponse } = require('../../../utils/common');

exports.getTodayActivities = async (req, res) => {
    if (!req.email) {
        return sendErrorResponse(res, 403, 'HR account is required');
    }

    try {
        const activities = await prisma.hrActivity.findMany({
            where: {
                actorEmail: req.email,
                activityDate: getActivityDate()
            },
            select: {
                activityType: true,
                completedAt: true
            },
            orderBy: { completedAt: 'desc' }
        });

        return sendSuccessResponse(res, 200, "Today's HR activities retrieved successfully", activities);
    } catch (error) {
        console.error('Error retrieving HR activities:', error);
        return sendErrorResponse(res, 500, 'Unable to retrieve HR activities', error);
    }
};
