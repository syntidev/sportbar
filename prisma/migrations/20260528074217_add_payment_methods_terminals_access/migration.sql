-- AlterTable
ALTER TABLE `users` ADD COLUMN `access_days` JSON NULL,
    ADD COLUMN `access_end` VARCHAR(191) NULL,
    ADD COLUMN `access_start` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `payment_methods` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `type` ENUM('cash', 'transfer', 'mobile', 'biometric', 'other') NOT NULL,
    `bank_name` VARCHAR(100) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `terminals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `method` ENUM('pos_debit', 'pos_credit', 'biopago') NOT NULL,
    `bank_name` VARCHAR(100) NOT NULL,
    `serial` VARCHAR(50) NULL,
    `commercial_number` VARCHAR(50) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
