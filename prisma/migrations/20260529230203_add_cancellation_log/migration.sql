-- CreateTable
CREATE TABLE `cancellation_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `order_code` VARCHAR(191) NOT NULL,
    `cancelled_by` INTEGER NOT NULL,
    `reason` TEXT NOT NULL,
    `previous_status` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `cancellation_logs_order_id_fkey`(`order_id`),
    INDEX `cancellation_logs_cancelled_by_fkey`(`cancelled_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cancellation_logs` ADD CONSTRAINT `cancellation_logs_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cancellation_logs` ADD CONSTRAINT `cancellation_logs_cancelled_by_fkey` FOREIGN KEY (`cancelled_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
