/*
  Warnings:

  - You are about to drop the column `dayOfWeek` on the `Availability` table. All the data in the column will be lost.
  - Changed the type of `startTime` on the `Availability` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `endTime` on the `Availability` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ParticipantStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterTable
ALTER TABLE "Availability" DROP COLUMN "dayOfWeek",
DROP COLUMN "startTime",
ADD COLUMN     "startTime" TIMESTAMP(3) NOT NULL,
DROP COLUMN "endTime",
ADD COLUMN     "endTime" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "agendaTopics" TEXT[],
ADD COLUMN     "botThreadId" TEXT,
ADD COLUMN     "confirmationStatus" TEXT NOT NULL DEFAULT 'unconfirmed',
ADD COLUMN     "voiceCallStatus" TEXT NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "status" "ParticipantStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "voiceResponse" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "AIResult" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "taskType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "meetingId" TEXT,
    "userId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotSession" (
    "id" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "intent" TEXT,
    "slots" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "meetingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceCallLog" (
    "id" TEXT NOT NULL,
    "participantUserId" TEXT NOT NULL,
    "participantMeetingId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "callSid" TEXT,
    "transcript" TEXT,
    "outcome" TEXT NOT NULL DEFAULT 'pending',
    "agendaExtracted" TEXT[],
    "duration" INTEGER,
    "calledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIResult_meetingId_idx" ON "AIResult"("meetingId");

-- CreateIndex
CREATE INDEX "AIEvent_meetingId_idx" ON "AIEvent"("meetingId");

-- CreateIndex
CREATE INDEX "AIEvent_userId_idx" ON "AIEvent"("userId");

-- CreateIndex
CREATE INDEX "AIEvent_createdAt_idx" ON "AIEvent"("createdAt");

-- CreateIndex
CREATE INDEX "BotSession_telegramId_idx" ON "BotSession"("telegramId");

-- CreateIndex
CREATE INDEX "BotSession_meetingId_idx" ON "BotSession"("meetingId");

-- CreateIndex
CREATE INDEX "VoiceCallLog_meetingId_idx" ON "VoiceCallLog"("meetingId");

-- CreateIndex
CREATE INDEX "VoiceCallLog_participantUserId_idx" ON "VoiceCallLog"("participantUserId");

-- CreateIndex
CREATE INDEX "VoiceCallLog_participantMeetingId_idx" ON "VoiceCallLog"("participantMeetingId");

-- CreateIndex
CREATE INDEX "Meeting_voiceCallStatus_idx" ON "Meeting"("voiceCallStatus");

-- CreateIndex
CREATE INDEX "Meeting_startTime_idx" ON "Meeting"("startTime");

-- AddForeignKey
ALTER TABLE "AIResult" ADD CONSTRAINT "AIResult_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIEvent" ADD CONSTRAINT "AIEvent_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIEvent" ADD CONSTRAINT "AIEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotSession" ADD CONSTRAINT "BotSession_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCallLog" ADD CONSTRAINT "VoiceCallLog_participantMeetingId_participantUserId_fkey" FOREIGN KEY ("participantMeetingId", "participantUserId") REFERENCES "Participant"("meetingId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCallLog" ADD CONSTRAINT "VoiceCallLog_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
