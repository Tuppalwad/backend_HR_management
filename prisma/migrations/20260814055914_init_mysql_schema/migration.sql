-- CreateTable
CREATE TABLE `users` (
    `emp_id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NULL,
    `last_name` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `current_emp_id` VARCHAR(191) NOT NULL,
    `gender` ENUM('MALE', 'FEMALE') NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `worktype` ENUM('WFO', 'WFH', 'Client Location') NOT NULL,
    `shift` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `otp` VARCHAR(191) NULL,
    `otp_expiry` DATETIME(3) NULL,
    `is_verified` BOOLEAN NOT NULL DEFAULT false,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `closed_date` DATE NULL,
    `date_of_joining` DATE NULL,
    `employee_type` VARCHAR(191) NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_current_emp_id_key`(`current_emp_id`),
    UNIQUE INDEX `users_mobile_key`(`mobile`),
    UNIQUE INDEX `users_legacy_mongo_id_key`(`legacy_mongo_id`),
    PRIMARY KEY (`emp_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admins` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fullname` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NULL,
    `confirm_email` BOOLEAN NOT NULL DEFAULT false,
    `gender` VARCHAR(191) NULL,
    `mobile` VARCHAR(191) NULL,
    `education` VARCHAR(191) NULL,
    `experience` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `about` TEXT NULL,
    `profile_image` LONGBLOB NULL,
    `profile_image_content_type` VARCHAR(191) NULL,
    `linked_in` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admins_email_key`(`email`),
    UNIQUE INDEX `admins_legacy_mongo_id_key`(`legacy_mongo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `clients` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cid` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `company_name` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `billing_method` VARCHAR(191) NOT NULL,
    `status` BOOLEAN NULL,
    `address` TEXT NOT NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `clients_legacy_mongo_id_key`(`legacy_mongo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_photos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `data` LONGBLOB NOT NULL,
    `content_type` VARCHAR(191) NOT NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `employee_photos_legacy_mongo_id_key`(`legacy_mongo_id`),
    INDEX `employee_photos_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emp_id` VARCHAR(191) NOT NULL,
    `jwt_token` TEXT NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employee_sessions_emp_id_key`(`emp_id`),
    UNIQUE INDEX `employee_sessions_legacy_mongo_id_key`(`legacy_mongo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `jwt_token` TEXT NULL,
    `expired_date` DATETIME(3) NOT NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_sessions_email_key`(`email`),
    UNIQUE INDEX `admin_sessions_legacy_mongo_id_key`(`legacy_mongo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `fcm_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emp_id` VARCHAR(191) NOT NULL,
    `fcm_token` VARCHAR(191) NOT NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,

    UNIQUE INDEX `fcm_tokens_emp_id_key`(`emp_id`),
    UNIQUE INDEX `fcm_tokens_legacy_mongo_id_key`(`legacy_mongo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emp_id` VARCHAR(191) NOT NULL,
    `current_emp_id` VARCHAR(191) NOT NULL,
    `first_name` VARCHAR(191) NOT NULL,
    `last_name` VARCHAR(191) NOT NULL,
    `date_of_joining` DATE NOT NULL,
    `mobile_no` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `designation` VARCHAR(191) NOT NULL,
    `gender` ENUM('Male', 'Female', 'Other') NOT NULL,
    `work_mode` ENUM('Remote', 'On-site', 'Hybrid', 'WFH', 'Work From Home', 'WFO') NOT NULL,
    `employment_type` ENUM('Permanent', 'Contractual') NOT NULL,
    `dob` DATE NOT NULL,
    `emergency_contact_no` VARCHAR(191) NOT NULL,
    `emergency_contact_person_name` VARCHAR(191) NOT NULL,
    `current_city` VARCHAR(191) NOT NULL,
    `fathers_name` VARCHAR(191) NOT NULL,
    `marital_status` ENUM('Married', 'Unmarried') NOT NULL,
    `spouse_name` VARCHAR(191) NULL,
    `pf_member` ENUM('Yes', 'No') NOT NULL,
    `uan_no` VARCHAR(191) NOT NULL,
    `bank_account_no` VARCHAR(191) NOT NULL,
    `ifsc_code` VARCHAR(191) NOT NULL,
    `name_as_per_aadhar` VARCHAR(191) NOT NULL,
    `pan_no` VARCHAR(191) NOT NULL,
    `aadhar_no` VARCHAR(191) NOT NULL,
    `passport_no` VARCHAR(191) NULL,
    `laptop_type` ENUM('Personal', 'Official', 'Both') NOT NULL,
    `having_official_in_use` ENUM('Yes', 'No') NOT NULL,
    `official_laptop_sr_no` VARCHAR(191) NULL,
    `laptop_photo` VARCHAR(191) NULL,
    `official_upgrades` TEXT NULL,
    `ram` VARCHAR(191) NOT NULL,
    `storage_type` ENUM('SSD', 'HDD') NOT NULL,
    `storage_space` VARCHAR(191) NOT NULL,
    `additional_configurations` TEXT NULL,
    `highest_qualification` VARCHAR(191) NOT NULL,
    `additional_courses` TEXT NULL,
    `total_exp` VARCHAR(191) NOT NULL,
    `status` ENUM('Approve', 'Reject', 'Pending') NOT NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employee_profiles_emp_id_key`(`emp_id`),
    UNIQUE INDEX `employee_profiles_current_emp_id_key`(`current_emp_id`),
    UNIQUE INDEX `employee_profiles_legacy_mongo_id_key`(`legacy_mongo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_skills` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `employee_profile_id` INTEGER NOT NULL,
    `skill` VARCHAR(191) NOT NULL,
    `experience` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emp_id` VARCHAR(191) NOT NULL,
    `aadhaar` VARCHAR(191) NOT NULL,
    `pan` VARCHAR(191) NOT NULL,
    `hsc` VARCHAR(191) NOT NULL,
    `ssc` VARCHAR(191) NOT NULL,
    `passbook` VARCHAR(191) NOT NULL,
    `domicile` VARCHAR(191) NOT NULL,
    `passport` VARCHAR(191) NULL,
    `experience_letter` VARCHAR(191) NULL,
    `offer_letter` VARCHAR(191) NULL,
    `appointment_letter` VARCHAR(191) NOT NULL,
    `bond` VARCHAR(191) NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employee_documents_emp_id_key`(`emp_id`),
    UNIQUE INDEX `employee_documents_legacy_mongo_id_key`(`legacy_mongo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_locations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emp_id` VARCHAR(191) NOT NULL,
    `image_url` VARCHAR(191) NOT NULL,
    `latitude` VARCHAR(191) NOT NULL,
    `longitude` VARCHAR(191) NOT NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,

    UNIQUE INDEX `work_locations_emp_id_key`(`emp_id`),
    UNIQUE INDEX `work_locations_legacy_mongo_id_key`(`legacy_mongo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emp_id` VARCHAR(191) NOT NULL,
    `in_time` DATETIME(3) NULL,
    `out_time` DATETIME(3) NULL,
    `date` DATE NOT NULL,
    `status` ENUM('Present', 'Absent', 'Leave', 'Holiday') NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `half_day` BOOLEAN NOT NULL DEFAULT false,
    `shift` ENUM('Evening Shift', 'Day Shift', 'Night Shift') NOT NULL,
    `total_hours` DECIMAL(5, 2) NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `attendance_records_legacy_mongo_id_key`(`legacy_mongo_id`),
    INDEX `attendance_records_emp_id_idx`(`emp_id`),
    INDEX `attendance_records_emp_id_date_idx`(`emp_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `leave_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emp_id` VARCHAR(191) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `type` ENUM('Sick Leave', 'Casual Leave', 'Paid Leave', 'Unpaid Leave', 'Other') NOT NULL,
    `reason` TEXT NULL,
    `number_of_days` INTEGER NOT NULL,
    `status` ENUM('Pending', 'Approved', 'Rejected', 'Cancelled') NOT NULL DEFAULT 'Pending',
    `legacy_mongo_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `leave_requests_legacy_mongo_id_key`(`legacy_mongo_id`),
    INDEX `leave_requests_emp_id_idx`(`emp_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timesheets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emp_id` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `break_start_time` DATETIME(3) NOT NULL,
    `break_end_time` DATETIME(3) NOT NULL,
    `hours_worked` DECIMAL(5, 2) NOT NULL,
    `pending_tasks` TEXT NOT NULL,
    `completed_tasks` TEXT NOT NULL,
    `upcoming_tasks` TEXT NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `timesheets_legacy_mongo_id_key`(`legacy_mongo_id`),
    INDEX `timesheets_emp_id_idx`(`emp_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timesheet_managers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `timesheet_id` INTEGER NOT NULL,
    `manager_email` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_title` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NOT NULL,
    `project_priority` ENUM('Low', 'Medium', 'High') NOT NULL,
    `project_start_date` DATE NOT NULL,
    `project_end_date` DATE NULL,
    `work_status` ENUM('Not Started', 'In Progress', 'Completed', 'On Hold', 'Cancelled') NOT NULL,
    `description` TEXT NOT NULL,
    `budget` DECIMAL(12, 2) NOT NULL DEFAULT 0,
    `client_full_name` VARCHAR(191) NULL,
    `client_email` VARCHAR(191) NULL,
    `client_phone` VARCHAR(191) NULL,
    `client_address` TEXT NULL,
    `is_client_project` BOOLEAN NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `projects_legacy_mongo_id_key`(`legacy_mongo_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_managers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `emp_id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    INDEX `project_managers_emp_id_idx`(`emp_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_team_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `emp_id` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    INDEX `project_team_members_emp_id_idx`(`emp_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `name` VARCHAR(191) NULL,
    `url` TEXT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assets` (
    `asset_id` VARCHAR(191) NOT NULL,
    `category` ENUM('Laptop', 'Mobile', 'Keyboard', 'Mouse', 'Headphone', 'RAM', 'SSD', 'Monitor', 'Charger', 'Other') NOT NULL,
    `brand` VARCHAR(191) NOT NULL,
    `model_name` VARCHAR(191) NOT NULL,
    `serial_number` VARCHAR(191) NULL,
    `specifications` TEXT NULL,
    `purchase_date` DATE NOT NULL,
    `purchase_cost` DECIMAL(10, 2) NULL,
    `vendor` VARCHAR(191) NULL,
    `warranty_expiry_date` DATE NULL,
    `condition` ENUM('New', 'Good', 'Fair', 'Damaged', 'Beyond Repair') NOT NULL DEFAULT 'New',
    `status` ENUM('Available', 'Assigned', 'UnderMaintenance', 'Lost', 'Dead', 'Retired') NOT NULL DEFAULT 'Available',
    `current_assignee_emp_id` VARCHAR(191) NULL,
    `current_assignee_emp_name` VARCHAR(191) NULL,
    `current_assignee_since` DATETIME(3) NULL,
    `location_type` ENUM('Office', 'WFH', 'Warehouse') NOT NULL DEFAULT 'Warehouse',
    `current_location` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `assets_serial_number_key`(`serial_number`),
    UNIQUE INDEX `assets_legacy_mongo_id_key`(`legacy_mongo_id`),
    INDEX `assets_current_assignee_emp_id_idx`(`current_assignee_emp_id`),
    PRIMARY KEY (`asset_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_assignment_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` VARCHAR(191) NOT NULL,
    `emp_id` VARCHAR(191) NOT NULL,
    `emp_name` VARCHAR(191) NOT NULL,
    `assigned_date` DATETIME(3) NOT NULL,
    `return_date` DATETIME(3) NULL,
    `condition_at_assign` ENUM('New', 'Good', 'Fair', 'Damaged', 'Beyond Repair') NOT NULL,
    `condition_at_return` ENUM('New', 'Good', 'Fair', 'Damaged', 'Beyond Repair') NULL,
    `courier_name` VARCHAR(191) NULL,
    `tracking_number` VARCHAR(191) NULL,
    `shipped_to_address` TEXT NULL,
    `remarks` TEXT NULL,
    `assigned_by` VARCHAR(191) NOT NULL,
    `status` ENUM('Active', 'Returned') NOT NULL DEFAULT 'Active',
    `legacy_mongo_id` VARCHAR(191) NULL,

    UNIQUE INDEX `asset_assignment_history_legacy_mongo_id_key`(`legacy_mongo_id`),
    INDEX `asset_assignment_history_emp_id_idx`(`emp_id`),
    INDEX `asset_assignment_history_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_maintenance_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` VARCHAR(191) NOT NULL,
    `issue_reported` TEXT NOT NULL,
    `reported_date` DATETIME(3) NOT NULL,
    `resolved_date` DATETIME(3) NULL,
    `vendor` VARCHAR(191) NULL,
    `cost` DECIMAL(10, 2) NULL,
    `status` ENUM('Pending', 'InProgress', 'Resolved') NOT NULL DEFAULT 'Pending',
    `remarks` TEXT NULL,
    `legacy_mongo_id` VARCHAR(191) NULL,

    UNIQUE INDEX `asset_maintenance_history_legacy_mongo_id_key`(`legacy_mongo_id`),
    INDEX `asset_maintenance_history_asset_id_idx`(`asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_component_checks` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` VARCHAR(191) NOT NULL,
    `phase` ENUM('CURRENT', 'ASSIGN', 'RETURN', 'MAINTENANCE') NOT NULL,
    `assignment_history_id` INTEGER NULL,
    `maintenance_history_id` INTEGER NULL,
    `component` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,

    INDEX `asset_component_checks_asset_id_idx`(`asset_id`),
    INDEX `asset_component_checks_assignment_history_id_idx`(`assignment_history_id`),
    INDEX `asset_component_checks_maintenance_history_id_idx`(`maintenance_history_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `asset_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `asset_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `uploaded_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employee_skills` ADD CONSTRAINT `employee_skills_employee_profile_id_fkey` FOREIGN KEY (`employee_profile_id`) REFERENCES `employee_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timesheet_managers` ADD CONSTRAINT `timesheet_managers_timesheet_id_fkey` FOREIGN KEY (`timesheet_id`) REFERENCES `timesheets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_managers` ADD CONSTRAINT `project_managers_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_team_members` ADD CONSTRAINT `project_team_members_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_documents` ADD CONSTRAINT `project_documents_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_assignment_history` ADD CONSTRAINT `asset_assignment_history_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_maintenance_history` ADD CONSTRAINT `asset_maintenance_history_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_component_checks` ADD CONSTRAINT `asset_component_checks_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_component_checks` ADD CONSTRAINT `asset_component_checks_assignment_history_id_fkey` FOREIGN KEY (`assignment_history_id`) REFERENCES `asset_assignment_history`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_component_checks` ADD CONSTRAINT `asset_component_checks_maintenance_history_id_fkey` FOREIGN KEY (`maintenance_history_id`) REFERENCES `asset_maintenance_history`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `asset_documents` ADD CONSTRAINT `asset_documents_asset_id_fkey` FOREIGN KEY (`asset_id`) REFERENCES `assets`(`asset_id`) ON DELETE CASCADE ON UPDATE CASCADE;
