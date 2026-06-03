-- AlterTable: Flower add custom*Id columns
ALTER TABLE `Flower`
  ADD COLUMN `customCategoryId` VARCHAR(64) NULL,
  ADD COLUMN `customPlacementId` VARCHAR(64) NULL,
  ADD COLUMN `customCareDifficultyId` VARCHAR(64) NULL,
  ADD COLUMN `customCareStatusId` VARCHAR(64) NULL;

-- CreateTable: TaxonomyItem
CREATE TABLE `TaxonomyItem` (
  `id` VARCHAR(64) NOT NULL,
  `userId` VARCHAR(64) NOT NULL,
  `type` VARCHAR(16) NOT NULL,
  `label` VARCHAR(20) NOT NULL,
  `baseValue` VARCHAR(32) NOT NULL,
  `sortOrder` INT NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`),
  INDEX `TaxonomyItem_userId_type_sortOrder_idx` (`userId`, `type`, `sortOrder`),
  CONSTRAINT `TaxonomyItem_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
