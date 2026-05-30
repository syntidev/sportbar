-- AlterTable
ALTER TABLE `orders` ADD COLUMN `venue_destino_id` INTEGER NULL,
    ADD COLUMN `zone_id` INTEGER NULL;

-- CreateTable
CREATE TABLE `zones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#22c55e',
    `capacity` INTEGER NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `zones_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `venue_zones` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `venue_id` INTEGER NOT NULL,
    `zone_id` INTEGER NOT NULL,

    INDEX `venue_zones_venue_id_idx`(`venue_id`),
    INDEX `venue_zones_zone_id_idx`(`zone_id`),
    UNIQUE INDEX `venue_zones_venue_id_zone_id_key`(`venue_id`, `zone_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `venue_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `venue_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,

    INDEX `venue_users_venue_id_idx`(`venue_id`),
    INDEX `venue_users_user_id_idx`(`user_id`),
    UNIQUE INDEX `venue_users_venue_id_user_id_key`(`venue_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `venue_payment_methods` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `venue_id` INTEGER NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,

    INDEX `venue_payment_methods_venue_id_idx`(`venue_id`),
    UNIQUE INDEX `venue_payment_methods_venue_id_method_key`(`venue_id`, `method`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `orders_zone_id_idx` ON `orders`(`zone_id`);

-- CreateIndex
CREATE INDEX `orders_venue_destino_id_idx` ON `orders`(`venue_destino_id`);

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_zone_id_fkey` FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_venue_destino_id_fkey` FOREIGN KEY (`venue_destino_id`) REFERENCES `venues`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `venue_zones` ADD CONSTRAINT `venue_zones_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `venue_zones` ADD CONSTRAINT `venue_zones_zone_id_fkey` FOREIGN KEY (`zone_id`) REFERENCES `zones`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `venue_users` ADD CONSTRAINT `venue_users_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `venue_users` ADD CONSTRAINT `venue_users_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `venue_payment_methods` ADD CONSTRAINT `venue_payment_methods_venue_id_fkey` FOREIGN KEY (`venue_id`) REFERENCES `venues`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
