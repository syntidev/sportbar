-- AlterTable
ALTER TABLE `dollar_rates` ADD COLUMN `currency_type` VARCHAR(191) NOT NULL DEFAULT 'USD';

-- CreateIndex
CREATE INDEX `dollar_rates_currency_type_is_active_effective_from_idx` ON `dollar_rates`(`currency_type`, `is_active`, `effective_from`);
