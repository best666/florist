-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(64) NOT NULL,
    `nickname` VARCHAR(80) NOT NULL,
    `avatarUrl` VARCHAR(512) NULL,
    `loginType` VARCHAR(32) NOT NULL,
    `wechatOpenIdHash` VARCHAR(64) NULL,
    `cityCipher` TEXT NULL,
    `phoneMaskedCipher` TEXT NULL,
    `status` VARCHAR(32) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_wechatOpenIdHash_key`(`wechatOpenIdHash`),
    INDEX `User_loginType_updatedAt_idx`(`loginType`, `updatedAt`),
    INDEX `User_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Flower` (
    `id` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(64) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `nickname` VARCHAR(80) NULL,
    `category` VARCHAR(32) NOT NULL,
    `placement` VARCHAR(32) NOT NULL,
    `careDifficulty` VARCHAR(32) NOT NULL,
    `careStatus` VARCHAR(32) NOT NULL,
    `purchasedAt` DATETIME(3) NULL,
    `priceInCents` INTEGER NULL,
    `note` VARCHAR(300) NULL,
    `lastWateredAt` DATETIME(3) NULL,
    `lastFertilizedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `deletedAt` DATETIME(3) NULL,
    `pendingPurgeAt` DATETIME(3) NULL,

    INDEX `Flower_userId_isDeleted_updatedAt_idx`(`userId`, `isDeleted`, `updatedAt`),
    INDEX `Flower_userId_category_idx`(`userId`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FlowerImage` (
    `id` VARCHAR(64) NOT NULL,
    `flowerId` VARCHAR(64) NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `compressedUrl` VARCHAR(512) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FlowerImage_flowerId_idx`(`flowerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CareRecord` (
    `id` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(64) NOT NULL,
    `flowerId` VARCHAR(64) NOT NULL,
    `actionType` VARCHAR(32) NOT NULL,
    `note` VARCHAR(300) NULL,
    `cooldownMinutes` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CareRecord_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `CareRecord_flowerId_createdAt_idx`(`flowerId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CareRecordImage` (
    `id` VARCHAR(64) NOT NULL,
    `recordId` VARCHAR(64) NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `compressedUrl` VARCHAR(512) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CareRecordImage_recordId_idx`(`recordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecordUndoLog` (
    `id` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(64) NOT NULL,
    `recordId` VARCHAR(64) NOT NULL,
    `flowerId` VARCHAR(64) NOT NULL,
    `actionType` VARCHAR(32) NOT NULL,
    `revertedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `originalCreatedAt` DATETIME(3) NOT NULL,
    `note` VARCHAR(300) NULL,

    INDEX `RecordUndoLog_userId_revertedAt_idx`(`userId`, `revertedAt`),
    INDEX `RecordUndoLog_flowerId_revertedAt_idx`(`flowerId`, `revertedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Member` (
    `id` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(64) NOT NULL,
    `packageType` VARCHAR(32) NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `benefitTypes` JSON NOT NULL,
    `startedAt` DATETIME(3) NULL,
    `expiredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Member_status_expiredAt_idx`(`status`, `expiredAt`),
    UNIQUE INDEX `Member_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Feedback` (
    `id` VARCHAR(64) NOT NULL,
    `userId` VARCHAR(64) NOT NULL,
    `contentCipher` TEXT NOT NULL,
    `replyCipher` TEXT NULL,
    `repliedAt` DATETIME(3) NULL,
    `repliedBy` VARCHAR(64) NULL,
    `status` VARCHAR(32) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Feedback_userId_createdAt_idx`(`userId`, `createdAt`),
    INDEX `Feedback_status_updatedAt_idx`(`status`, `updatedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FeedbackImage` (
    `id` VARCHAR(64) NOT NULL,
    `feedbackId` VARCHAR(64) NOT NULL,
    `url` VARCHAR(512) NOT NULL,
    `compressedUrl` VARCHAR(512) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FeedbackImage_feedbackId_idx`(`feedbackId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AiDailyQuota` (
    `id` VARCHAR(128) NOT NULL,
    `userId` VARCHAR(64) NOT NULL,
    `scope` VARCHAR(32) NOT NULL,
    `dateKey` VARCHAR(16) NOT NULL,
    `usedCount` INTEGER NOT NULL DEFAULT 0,
    `limitCount` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AiDailyQuota_dateKey_scope_idx`(`dateKey`, `scope`),
    UNIQUE INDEX `AiDailyQuota_userId_scope_dateKey_key`(`userId`, `scope`, `dateKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProxyRequestLog` (
    `id` VARCHAR(64) NOT NULL,
    `scope` VARCHAR(32) NOT NULL,
    `endpoint` VARCHAR(80) NOT NULL,
    `userId` VARCHAR(64) NULL,
    `requestHash` VARCHAR(64) NULL,
    `cacheHit` BOOLEAN NOT NULL DEFAULT false,
    `success` BOOLEAN NOT NULL DEFAULT true,
    `statusCode` INTEGER NOT NULL DEFAULT 200,
    `durationMs` INTEGER NOT NULL DEFAULT 0,
    `quotaCost` INTEGER NOT NULL DEFAULT 0,
    `upstreamProvider` VARCHAR(64) NULL,
    `errorMessage` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ProxyRequestLog_scope_createdAt_idx`(`scope`, `createdAt`),
    INDEX `ProxyRequestLog_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AppConfig` (
    `key` VARCHAR(64) NOT NULL,
    `value` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AppConfig_updatedAt_idx`(`updatedAt`),
    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReminderConfig` (
    `id` VARCHAR(64) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT false,
    `reminderHour` INTEGER NOT NULL DEFAULT 9,
    `reminderMinute` INTEGER NOT NULL DEFAULT 0,
    `quietStartHour` INTEGER NOT NULL DEFAULT 22,
    `quietStartMinute` INTEGER NOT NULL DEFAULT 0,
    `quietEndHour` INTEGER NOT NULL DEFAULT 8,
    `quietEndMinute` INTEGER NOT NULL DEFAULT 0,
    `reminderText` VARCHAR(255) NOT NULL,
    `lastTriggeredDate` VARCHAR(32) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReminderPushLog` (
    `id` VARCHAR(64) NOT NULL,
    `reminderConfigId` VARCHAR(64) NOT NULL,
    `triggeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `message` VARCHAR(255) NOT NULL,
    `status` VARCHAR(32) NOT NULL,

    INDEX `ReminderPushLog_triggeredAt_idx`(`triggeredAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Flower` ADD CONSTRAINT `Flower_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FlowerImage` ADD CONSTRAINT `FlowerImage_flowerId_fkey` FOREIGN KEY (`flowerId`) REFERENCES `Flower`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareRecord` ADD CONSTRAINT `CareRecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareRecord` ADD CONSTRAINT `CareRecord_flowerId_fkey` FOREIGN KEY (`flowerId`) REFERENCES `Flower`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CareRecordImage` ADD CONSTRAINT `CareRecordImage_recordId_fkey` FOREIGN KEY (`recordId`) REFERENCES `CareRecord`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RecordUndoLog` ADD CONSTRAINT `RecordUndoLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Member` ADD CONSTRAINT `Member_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Feedback` ADD CONSTRAINT `Feedback_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeedbackImage` ADD CONSTRAINT `FeedbackImage_feedbackId_fkey` FOREIGN KEY (`feedbackId`) REFERENCES `Feedback`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReminderPushLog` ADD CONSTRAINT `ReminderPushLog_reminderConfigId_fkey` FOREIGN KEY (`reminderConfigId`) REFERENCES `ReminderConfig`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
