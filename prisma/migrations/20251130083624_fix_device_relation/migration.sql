/*
  Warnings:

  - You are about to drop the column `Water_level` on the `User_Settings` table. All the data in the column will be lost.
  - You are about to alter the column `device_ID` on the `device_registrations` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Int`.
  - Added the required column `Water_level_mxm` to the `User_Settings` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `User_Settings` DROP COLUMN `Water_level`,
    ADD COLUMN `Water_level_min` FLOAT NULL,
    ADD COLUMN `Water_level_mxm` FLOAT NOT NULL;

-- AlterTable
ALTER TABLE `device_registrations` MODIFY `device_ID` INTEGER NOT NULL;
