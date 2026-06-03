-- AlterTable
ALTER TABLE `User` ADD COLUMN `phoneHash` VARCHAR(64) NULL;

-- CreateIndex
ALTER TABLE `User` ADD UNIQUE INDEX `User_phoneHash_key` (`phoneHash`);
