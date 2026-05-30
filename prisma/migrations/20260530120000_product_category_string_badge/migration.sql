-- AlterTable: category enum → VARCHAR, add badge, add is_featured
ALTER TABLE `products` MODIFY COLUMN `category` VARCHAR(191) NOT NULL;
ALTER TABLE `products` ADD COLUMN `badge` VARCHAR(191) NULL;
ALTER TABLE `products` ADD COLUMN `is_featured` TINYINT(1) NOT NULL DEFAULT 0;
