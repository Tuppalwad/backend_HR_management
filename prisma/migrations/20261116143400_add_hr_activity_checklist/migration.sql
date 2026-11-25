CREATE TABLE `hr_activities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actor_email` VARCHAR(191) NOT NULL,
    `activity_type` VARCHAR(50) NOT NULL,
    `activity_date` DATE NOT NULL,
    `completed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `hr_activities_actor_email_activity_date_activity_type_key`(`actor_email`, `activity_date`, `activity_type`),
    INDEX `hr_activities_actor_email_activity_date_idx`(`actor_email`, `activity_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
