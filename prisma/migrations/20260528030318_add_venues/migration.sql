-- AlterTable
ALTER TABLE `orders` ADD COLUMN `flujo` ENUM('A', 'B') NULL,
    ADD COLUMN `venue_assigned` INTEGER NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `cedula` VARCHAR(191) NULL,
    ADD COLUMN `telefono` VARCHAR(191) NULL,
    ADD COLUMN `venue_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `venues` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('matriz', 'quiosco', 'cocina') NOT NULL,
    `capabilities` JSON NOT NULL,
    `zona_geografica` JSON NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
