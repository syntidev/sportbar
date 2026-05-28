/*
  Warnings:

  - You are about to drop the column `merchant_number` on the `terminals` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `terminals` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `terminals` table. All the data in the column will be lost.
  - You are about to drop the column `venue_id` on the `terminals` table. All the data in the column will be lost.
  - You are about to alter the column `serial` on the `terminals` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(50)`.
  - Added the required column `method` to the `terminals` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `terminals` DROP COLUMN `merchant_number`,
    DROP COLUMN `name`,
    DROP COLUMN `type`,
    DROP COLUMN `venue_id`,
    ADD COLUMN `commercial_number` VARCHAR(50) NULL,
    ADD COLUMN `method` ENUM('pos_debit', 'pos_credit', 'biopago') NOT NULL,
    MODIFY `serial` VARCHAR(50) NULL;
