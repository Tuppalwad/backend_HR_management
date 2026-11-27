const prisma = require('./prismaClient');

const getActivityDate = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
};

const recordHrActivity = async (req, activityType) => {
    if (!req.email) {
        return;
    }

    const actorEmail = req.email;
    const activityDate = getActivityDate();

    await prisma.hrActivity.upsert({
        where: {
            actorEmail_activityDate_activityType: {
                actorEmail,
                activityDate,
                activityType
            }
        },
        create: { actorEmail, activityDate, activityType },
        update: { completedAt: new Date() }
    });
};

module.exports = { getActivityDate, recordHrActivity };
