-- AlterTable
ALTER TABLE `Feedback`
  ADD COLUMN `isPublic` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `voteCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `aiModerationResult` JSON NULL;

-- CreateTable
CREATE TABLE `FeedbackVote` (
  `id` VARCHAR(64) NOT NULL,
  `feedbackId` VARCHAR(64) NOT NULL,
  `userId` VARCHAR(64) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  UNIQUE INDEX `FeedbackVote_feedbackId_userId_key` (`feedbackId`, `userId`),
  INDEX `FeedbackVote_feedbackId_idx` (`feedbackId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeedbackComment` (
  `id` VARCHAR(64) NOT NULL,
  `feedbackId` VARCHAR(64) NOT NULL,
  `userId` VARCHAR(64) NOT NULL,
  `content` VARCHAR(500) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`id`),
  INDEX `FeedbackComment_feedbackId_createdAt_idx` (`feedbackId`, `createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FeedbackVote` ADD CONSTRAINT `FeedbackVote_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `Feedback`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedbackVote` ADD CONSTRAINT `FeedbackVote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedbackComment` ADD CONSTRAINT `FeedbackComment_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `Feedback`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedbackComment` ADD CONSTRAINT `FeedbackComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Rebuild index for community sort
ALTER TABLE `Feedback` DROP INDEX `Feedback_status_updatedAt_idx`;
CREATE INDEX `Feedback_status_isPublic_voteCount_idx` ON `Feedback` (`status`, `isPublic`, `voteCount` DESC);
