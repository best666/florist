-- CreateTable
CREATE TABLE "Flower" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nickname" TEXT,
    "category" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "careDifficulty" TEXT NOT NULL,
    "careStatus" TEXT NOT NULL,
    "note" TEXT,
    "lastWateredAt" DATETIME,
    "lastFertilizedAt" DATETIME,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" DATETIME,
    "pendingPurgeAt" DATETIME
);

-- CreateTable
CREATE TABLE "FlowerImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "compressedUrl" TEXT,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "FlowerImage_flowerId_fkey" FOREIGN KEY ("flowerId") REFERENCES "Flower" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CareRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flowerId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "note" TEXT,
    "cooldownMinutes" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "CareRecord_flowerId_fkey" FOREIGN KEY ("flowerId") REFERENCES "Flower" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CareRecordImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "compressedUrl" TEXT,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "CareRecordImage_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "CareRecord" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecordUndoLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recordId" TEXT NOT NULL,
    "flowerId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "revertedAt" DATETIME NOT NULL,
    "originalCreatedAt" DATETIME NOT NULL,
    "note" TEXT
);

-- CreateTable
CREATE TABLE "ReminderConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderHour" INTEGER NOT NULL DEFAULT 9,
    "reminderMinute" INTEGER NOT NULL DEFAULT 0,
    "quietStartHour" INTEGER NOT NULL DEFAULT 22,
    "quietStartMinute" INTEGER NOT NULL DEFAULT 0,
    "quietEndHour" INTEGER NOT NULL DEFAULT 8,
    "quietEndMinute" INTEGER NOT NULL DEFAULT 0,
    "reminderText" TEXT NOT NULL,
    "lastTriggeredDate" TEXT,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReminderPushLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reminderConfigId" TEXT NOT NULL,
    "triggeredAt" DATETIME NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "ReminderPushLog_reminderConfigId_fkey" FOREIGN KEY ("reminderConfigId") REFERENCES "ReminderConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "FlowerImage_flowerId_idx" ON "FlowerImage"("flowerId");

-- CreateIndex
CREATE INDEX "CareRecord_flowerId_createdAt_idx" ON "CareRecord"("flowerId", "createdAt");

-- CreateIndex
CREATE INDEX "CareRecordImage_recordId_idx" ON "CareRecordImage"("recordId");

-- CreateIndex
CREATE INDEX "RecordUndoLog_flowerId_revertedAt_idx" ON "RecordUndoLog"("flowerId", "revertedAt");

-- CreateIndex
CREATE INDEX "ReminderPushLog_triggeredAt_idx" ON "ReminderPushLog"("triggeredAt");
