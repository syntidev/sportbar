/*
  Warnings:

  - You are about to drop the column `commercial_number` on the `terminals` table. All the data in the column will be lost.
  - You are about to drop the column `method` on the `terminals` table. All the data in the column will be lost.
  - Added the required column `name` to the `terminals` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `terminals` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `terminals` DROP COLUMN `commercial_number`,
    DROP COLUMN `method`,
    ADD COLUMN `merchant_number` VARCHAR(100) NULL,
    ADD COLUMN `name` VARCHAR(100) NOT NULL,
    ADD COLUMN `type` ENUM('debito', 'credito', 'biopago') NOT NULL,
    ADD COLUMN `venue_id` INTEGER NULL,
    MODIFY `serial` VARCHAR(100) NULL;
