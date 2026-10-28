-- Redefine `employee_documents` for the onboarding document-upload checklist.
--
-- The table created in the init migration mirrored the old Mongoose field set
-- (aadhaar/pan/hsc/ssc/passbook/domicile/appointment_letter/bond) but was never wired up to
-- any controller or ETL script (verified: no code anywhere reads or writes this table), so
-- there is no data to preserve. Dropping and recreating instead of a column-by-column ALTER
-- keeps this migration readable and matches the actual checklist now shipping in the mobile
-- app's onboarding flow: one nullable URL column per document, required-ness enforced in the
-- app rather than at the DB level (see schema.prisma comment on this model).
DROP TABLE `employee_documents`;

CREATE TABLE `employee_documents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `emp_id` VARCHAR(191) NOT NULL,
    `photo_url` VARCHAR(191) NULL,
    `qualification_marksheet_url` VARCHAR(191) NULL,
    `aadhar_url` VARCHAR(191) NULL,
    `pan_url` VARCHAR(191) NULL,
    `offer_relieving_letter_url` VARCHAR(191) NULL,
    `passport_url` VARCHAR(191) NULL,
    `passbook_url` VARCHAR(191) NULL,
    `form_a9_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `employee_documents_emp_id_key`(`emp_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
