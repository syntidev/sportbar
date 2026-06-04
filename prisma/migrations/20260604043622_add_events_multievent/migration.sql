-- AlterTable
ALTER TABLE `orders` ADD COLUMN `event_id` INTEGER NULL,
    ADD COLUMN `seat_ref` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `venues` ADD COLUMN `event_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `zones` ADD COLUMN `event_id` INTEGER NULL,
    ADD COLUMN `seat_count` INTEGER NULL,
    ADD COLUMN `seat_prefix` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `type` ENUM('VENUE', 'OUTDOOR') NOT NULL DEFAULT 'VENUE',
    `date` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `description` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `events_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `venues` ADD CONSTRAINT `venues_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zones` ADD CONSTRAINT `zones_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
