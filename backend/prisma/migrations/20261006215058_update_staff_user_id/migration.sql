/*
  Warnings:

  - You are about to alter the column `date` on the `BoardMeeting` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to drop the column `assignedStaffName` on the `CommemorativeDay` table. All the data in the column will be lost.
  - You are about to alter the column `endDate` on the `CommemorativeDay` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `startDate` on the `CommemorativeDay` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to drop the column `type` on the `DailyViolation` table. All the data in the column will be lost.
  - You are about to alter the column `isActive` on the `DutyStation` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to drop the column `assignedStaffName` on the `Extracurricular` table. All the data in the column will be lost.
  - You are about to drop the column `assignedStaffName` on the `FieldTrip` table. All the data in the column will be lost.
  - You are about to alter the column `date` on the `FieldTrip` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `returnDate` on the `FieldTrip` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `endDate` on the `Holiday` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `startDate` on the `Holiday` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `date` on the `OrderLetter` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `deliveryDate` on the `OrderLetter` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `date` on the `ParentAssociationMeeting` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `date` on the `Procurement` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to drop the column `assignedStaffName` on the `SocialActivity` table. All the data in the column will be lost.
  - You are about to alter the column `plannedDate` on the `SocialActivity` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to drop the column `role` on the `Staff` table. All the data in the column will be lost.
  - You are about to alter the column `transferDate` on the `StaffTransfer` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to drop the column `assignedStaffName` on the `StudentClub` table. All the data in the column will be lost.
  - You are about to drop the column `memberCount` on the `StudentClub` table. All the data in the column will be lost.
  - You are about to alter the column `isActive` on the `StudentClub` table. The data in that column could be lost. The data in that column will be cast from `Int` to `Boolean`.
  - You are about to drop the column `staffName` on the `TravelAllowance` table. All the data in the column will be lost.
  - You are about to alter the column `departureDate` on the `TravelAllowance` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - You are about to alter the column `returnDate` on the `TravelAllowance` table. The data in that column could be lost. The data in that column will be cast from `String` to `DateTime`.
  - Added the required column `title` to the `Staff` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Absenteeism" ADD COLUMN "academicYear" TEXT;
ALTER TABLE "Absenteeism" ADD COLUMN "className" TEXT;

-- AlterTable
ALTER TABLE "AnnualPlanItem" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Commission" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "ParentAssociationMember" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN "deletedAt" DATETIME;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "deletedAt" DATETIME;

-- CreateTable
CREATE TABLE "StudentLeave" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "dateRanges" TEXT NOT NULL DEFAULT '[]',
    "reason" TEXT,
    "academicYear" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "StudentLeave_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DutyStaffConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "availableDays" TEXT NOT NULL DEFAULT '1,2,3,4,5',
    "maxPerMonth" INTEGER NOT NULL DEFAULT 0,
    "maxPerWeek" INTEGER NOT NULL DEFAULT 0,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "isFixedDay" BOOLEAN NOT NULL DEFAULT false,
    "fixedDayOfWeek" INTEGER,
    "isFixedStation" BOOLEAN NOT NULL DEFAULT false,
    "isExempt" BOOLEAN NOT NULL DEFAULT false,
    "fixedStationId" TEXT,
    "exemptionReason" TEXT,
    "exemptionNote" TEXT,
    "exemptionEndDate" DATETIME,
    CONSTRAINT "DutyStaffConfig_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT,
    "companyName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL DEFAULT 0,
    "invoiceDate" DATETIME,
    "dueDate" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'BEKLEYEN_ODENEK_TALEBI',
    "mebbisNo" TEXT,
    "mysNo" TEXT,
    "notes" TEXT,
    "academicYear" TEXT NOT NULL DEFAULT '2025-2026',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "TebligDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT,
    "personnelName" TEXT NOT NULL,
    "documentSubject" TEXT,
    "documentDateNum" TEXT,
    "pdfPath" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-2026',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "TebligDocument_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Timetable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYear" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TimetableEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timetableId" TEXT NOT NULL,
    "staffId" TEXT,
    "className" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "subject" TEXT,
    "subjectName" TEXT,
    "room" TEXT,
    CONSTRAINT "TimetableEntry_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "Timetable" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimetableEntry_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StaffAbsence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "reason" TEXT,
    "absenceTime" TEXT NOT NULL DEFAULT 'TAM_GUN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StaffAbsence_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CoverAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "absenceId" TEXT,
    "absentStaffId" TEXT NOT NULL,
    "substituteStaffId" TEXT,
    "isCancelled" BOOLEAN NOT NULL DEFAULT false,
    "date" DATETIME NOT NULL,
    "period" INTEGER NOT NULL,
    "className" TEXT NOT NULL,
    "subject" TEXT,
    "room" TEXT,
    "academicYear" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CoverAssignment_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "StaffAbsence" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CoverAssignment_absentStaffId_fkey" FOREIGN KEY ("absentStaffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CoverAssignment_substituteStaffId_fkey" FOREIGN KEY ("substituteStaffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BoardMeeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" DATETIME,
    "time" TEXT,
    "location" TEXT,
    "academicYear" TEXT NOT NULL,
    "agenda" TEXT,
    "decisions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANLANDI',
    "extraData" TEXT,
    "deletedAt" DATETIME
);
INSERT INTO "new_BoardMeeting" ("academicYear", "agenda", "date", "decisions", "extraData", "id", "location", "status", "time", "title") SELECT "academicYear", "agenda", "date", "decisions", "extraData", "id", "location", "status", "time", "title" FROM "BoardMeeting";
DROP TABLE "BoardMeeting";
ALTER TABLE "new_BoardMeeting" RENAME TO "BoardMeeting";
CREATE TABLE "new_CommemorativeDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "assignedStaffId" TEXT,
    "assignedClubId" TEXT,
    "description" TEXT,
    "academicYear" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BEKLIYOR',
    "extraData" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "CommemorativeDay_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CommemorativeDay_assignedClubId_fkey" FOREIGN KEY ("assignedClubId") REFERENCES "StudentClub" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CommemorativeDay" ("academicYear", "assignedStaffId", "description", "endDate", "extraData", "id", "name", "startDate", "status") SELECT "academicYear", "assignedStaffId", "description", "endDate", "extraData", "id", "name", "startDate", "status" FROM "CommemorativeDay";
DROP TABLE "CommemorativeDay";
ALTER TABLE "new_CommemorativeDay" RENAME TO "CommemorativeDay";
CREATE TABLE "new_DailyViolation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "className" TEXT,
    "academicYear" TEXT,
    "violationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedBy" TEXT NOT NULL DEFAULT 'OCR',
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "DailyViolation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyViolation_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "ViolationUpload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DailyViolation" ("createdAt", "deletedAt", "id", "isConfirmed", "matchedBy", "studentId", "uploadId", "violationDate") SELECT "createdAt", "deletedAt", "id", "isConfirmed", "matchedBy", "studentId", "uploadId", "violationDate" FROM "DailyViolation";
DROP TABLE "DailyViolation";
ALTER TABLE "new_DailyViolation" RENAME TO "DailyViolation";
CREATE INDEX "DailyViolation_studentId_idx" ON "DailyViolation"("studentId");
CREATE INDEX "DailyViolation_uploadId_idx" ON "DailyViolation"("uploadId");
CREATE INDEX "DailyViolation_violationDate_idx" ON "DailyViolation"("violationDate");
CREATE UNIQUE INDEX "DailyViolation_studentId_uploadId_key" ON "DailyViolation"("studentId", "uploadId");
CREATE TABLE "new_DutyAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL DEFAULT 0,
    "academicYear" TEXT NOT NULL,
    "month" INTEGER NOT NULL DEFAULT 0,
    "year" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DutyAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DutyAssignment_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "DutyStation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DutyAssignment" ("academicYear", "dayOfWeek", "id", "staffId", "stationId", "weekNumber") SELECT "academicYear", "dayOfWeek", "id", "staffId", "stationId", "weekNumber" FROM "DutyAssignment";
DROP TABLE "DutyAssignment";
ALTER TABLE "new_DutyAssignment" RENAME TO "DutyAssignment";
CREATE TABLE "new_DutyStation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "shift" TEXT NOT NULL DEFAULT 'tum',
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "roomKeywords" TEXT
);
INSERT INTO "new_DutyStation" ("id", "isActive", "name", "sortOrder") SELECT "id", "isActive", "name", "sortOrder" FROM "DutyStation";
DROP TABLE "DutyStation";
ALTER TABLE "new_DutyStation" RENAME TO "DutyStation";
CREATE TABLE "new_Extracurricular" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branch" TEXT NOT NULL,
    "assignedStaffId" TEXT,
    "schedule" TEXT,
    "academicYear" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ONAY_BEKLIYOR',
    "extraData" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "Extracurricular_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Extracurricular" ("academicYear", "assignedStaffId", "branch", "extraData", "id", "notes", "schedule", "status") SELECT "academicYear", "assignedStaffId", "branch", "extraData", "id", "notes", "schedule", "status" FROM "Extracurricular";
DROP TABLE "Extracurricular";
ALTER TABLE "new_Extracurricular" RENAME TO "Extracurricular";
CREATE TABLE "new_FieldTrip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "date" DATETIME,
    "returnDate" DATETIME,
    "purpose" TEXT,
    "transportation" TEXT,
    "assignedStaffId" TEXT,
    "participantClasses" TEXT,
    "academicYear" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLAN_ASAMASINDA',
    "extraData" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "FieldTrip_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FieldTrip" ("academicYear", "assignedStaffId", "date", "destination", "extraData", "id", "notes", "participantClasses", "purpose", "returnDate", "status", "title", "transportation") SELECT "academicYear", "assignedStaffId", "date", "destination", "extraData", "id", "notes", "participantClasses", "purpose", "returnDate", "status", "title", "transportation" FROM "FieldTrip";
DROP TABLE "FieldTrip";
ALTER TABLE "new_FieldTrip" RENAME TO "FieldTrip";
CREATE TABLE "new_Holiday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "type" TEXT NOT NULL DEFAULT 'RESMI_TATIL',
    "academicYear" TEXT NOT NULL,
    "extraData" TEXT,
    "deletedAt" DATETIME
);
INSERT INTO "new_Holiday" ("academicYear", "endDate", "extraData", "id", "name", "startDate", "type") SELECT "academicYear", "endDate", "extraData", "id", "name", "startDate", "type" FROM "Holiday";
DROP TABLE "Holiday";
ALTER TABLE "new_Holiday" RENAME TO "Holiday";
CREATE TABLE "new_OrderLetter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierAddress" TEXT,
    "date" DATETIME,
    "deliveryDate" DATETIME,
    "academicYear" TEXT NOT NULL,
    "procurementId" TEXT,
    "notes" TEXT,
    "extraData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "OrderLetter_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "OrderLetter_procurementId_fkey" FOREIGN KEY ("procurementId") REFERENCES "Procurement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_OrderLetter" ("academicYear", "createdAt", "date", "deliveryDate", "extraData", "id", "notes", "subject", "supplierAddress", "supplierName") SELECT "academicYear", "createdAt", "date", "deliveryDate", "extraData", "id", "notes", "subject", "supplierAddress", "supplierName" FROM "OrderLetter";
DROP TABLE "OrderLetter";
ALTER TABLE "new_OrderLetter" RENAME TO "OrderLetter";
CREATE TABLE "new_ParentAssociationMeeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME,
    "type" TEXT NOT NULL DEFAULT 'OLAGAN',
    "meetingNumber" INTEGER NOT NULL DEFAULT 1,
    "academicYear" TEXT NOT NULL,
    "notes" TEXT,
    "decisions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANLANDI',
    "extraData" TEXT,
    "deletedAt" DATETIME
);
INSERT INTO "new_ParentAssociationMeeting" ("academicYear", "date", "decisions", "extraData", "id", "meetingNumber", "notes", "status", "type") SELECT "academicYear", "date", "decisions", "extraData", "id", "meetingNumber", "notes", "status", "type" FROM "ParentAssociationMeeting";
DROP TABLE "ParentAssociationMeeting";
ALTER TABLE "new_ParentAssociationMeeting" RENAME TO "ParentAssociationMeeting";
CREATE TABLE "new_Procurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" DATETIME,
    "procedureType" TEXT NOT NULL DEFAULT '22/d',
    "estimatedCost" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ONAY_BEKLIYOR',
    "academicYear" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "supplierCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "extraData" TEXT,
    "deletedAt" DATETIME
);
INSERT INTO "new_Procurement" ("academicYear", "createdAt", "date", "estimatedCost", "extraData", "id", "itemCount", "procedureType", "status", "supplierCount", "title") SELECT "academicYear", "createdAt", "date", "estimatedCost", "extraData", "id", "itemCount", "procedureType", "status", "supplierCount", "title" FROM "Procurement";
DROP TABLE "Procurement";
ALTER TABLE "new_Procurement" RENAME TO "Procurement";
CREATE TABLE "new_SchoolSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "schoolName" TEXT NOT NULL DEFAULT '',
    "principalName" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-2026',
    "waTemplate1" TEXT DEFAULT '',
    "waTemplate2" TEXT DEFAULT '',
    "waTemplate3" TEXT DEFAULT '',
    "dutyRotationFreq" TEXT NOT NULL DEFAULT 'weekly',
    "dutyRotationDates" TEXT DEFAULT '[]',
    "dutyStartDate" TEXT,
    "lastRotationDate" DATETIME,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SchoolSettings" ("academicYear", "id", "principalName", "schoolName", "updatedAt", "waTemplate1", "waTemplate2", "waTemplate3") SELECT "academicYear", "id", "principalName", "schoolName", "updatedAt", "waTemplate1", "waTemplate2", "waTemplate3" FROM "SchoolSettings";
DROP TABLE "SchoolSettings";
ALTER TABLE "new_SchoolSettings" RENAME TO "SchoolSettings";
CREATE TABLE "new_SocialActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "plannedDate" DATETIME,
    "academicYear" TEXT NOT NULL,
    "assignedStaffId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLAN_ASAMASINDA',
    "notes" TEXT,
    "extraData" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "SocialActivity_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_SocialActivity" ("academicYear", "assignedStaffId", "description", "extraData", "id", "name", "notes", "plannedDate", "status", "type") SELECT "academicYear", "assignedStaffId", "description", "extraData", "id", "name", "notes", "plannedDate", "status", "type" FROM "SocialActivity";
DROP TABLE "SocialActivity";
ALTER TABLE "new_SocialActivity" RENAME TO "SocialActivity";
CREATE TABLE "new_Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "className" TEXT,
    "tcKimlikNo" TEXT,
    "brans" TEXT,
    "kurumSicilNo" TEXT,
    "emekliSicilNo" TEXT,
    "unvan" TEXT,
    "gorev" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    "extraData" TEXT,
    CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Staff" ("brans", "className", "createdAt", "deletedAt", "emekliSicilNo", "gorev", "id", "isActive", "kurumSicilNo", "name", "tcKimlikNo", "unvan") SELECT "brans", "className", "createdAt", "deletedAt", "emekliSicilNo", "gorev", "id", "isActive", "kurumSicilNo", "name", "tcKimlikNo", "unvan" FROM "Staff";
DROP TABLE "Staff";
ALTER TABLE "new_Staff" RENAME TO "Staff";
CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");
CREATE INDEX "Staff_title_idx" ON "Staff"("title");
CREATE TABLE "new_StaffTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffName" TEXT NOT NULL,
    "staffTitle" TEXT,
    "tcKimlikNo" TEXT,
    "sicilNo" TEXT,
    "currentSchool" TEXT,
    "newSchool" TEXT,
    "transferDate" DATETIME,
    "transferReason" TEXT,
    "academicYear" TEXT NOT NULL,
    "notes" TEXT,
    "extraData" TEXT,
    "deletedAt" DATETIME
);
INSERT INTO "new_StaffTransfer" ("academicYear", "currentSchool", "extraData", "id", "newSchool", "notes", "sicilNo", "staffName", "staffTitle", "tcKimlikNo", "transferDate", "transferReason") SELECT "academicYear", "currentSchool", "extraData", "id", "newSchool", "notes", "sicilNo", "staffName", "staffTitle", "tcKimlikNo", "transferDate", "transferReason" FROM "StaffTransfer";
DROP TABLE "StaffTransfer";
ALTER TABLE "new_StaffTransfer" RENAME TO "StaffTransfer";
CREATE TABLE "new_StudentClub" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assignedStaffId" TEXT,
    "meetingDay" TEXT,
    "meetingTime" TEXT,
    "maxMembers" INTEGER NOT NULL DEFAULT 30,
    "academicYear" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "extraData" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "StudentClub_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StudentClub" ("academicYear", "assignedStaffId", "description", "extraData", "id", "isActive", "maxMembers", "meetingDay", "meetingTime", "name") SELECT "academicYear", "assignedStaffId", "description", "extraData", "id", "isActive", "maxMembers", "meetingDay", "meetingTime", "name" FROM "StudentClub";
DROP TABLE "StudentClub";
ALTER TABLE "new_StudentClub" RENAME TO "StudentClub";
CREATE TABLE "new_StudentClubMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Ãœye',
    CONSTRAINT "StudentClubMember_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "StudentClub" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentClubMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_StudentClubMember" ("clubId", "id", "role", "studentId") SELECT "clubId", "id", "role", "studentId" FROM "StudentClubMember";
DROP TABLE "StudentClubMember";
ALTER TABLE "new_StudentClubMember" RENAME TO "StudentClubMember";
CREATE TABLE "new_TravelAllowance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT,
    "title" TEXT,
    "purpose" TEXT,
    "departurePlace" TEXT,
    "arrivalPlace" TEXT,
    "departureDate" DATETIME,
    "returnDate" DATETIME,
    "transportType" TEXT,
    "transportCost" REAL,
    "dailyAllowance" REAL,
    "accommodationCost" REAL,
    "totalCost" REAL,
    "academicYear" TEXT NOT NULL,
    "notes" TEXT,
    "extraData" TEXT,
    "deletedAt" DATETIME,
    CONSTRAINT "TravelAllowance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TravelAllowance" ("academicYear", "accommodationCost", "arrivalPlace", "dailyAllowance", "departureDate", "departurePlace", "extraData", "id", "notes", "purpose", "returnDate", "staffId", "title", "totalCost", "transportCost", "transportType") SELECT "academicYear", "accommodationCost", "arrivalPlace", "dailyAllowance", "departureDate", "departurePlace", "extraData", "id", "notes", "purpose", "returnDate", "staffId", "title", "totalCost", "transportCost", "transportType" FROM "TravelAllowance";
DROP TABLE "TravelAllowance";
ALTER TABLE "new_TravelAllowance" RENAME TO "TravelAllowance";
CREATE TABLE "new_ViolationUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "imagePath" TEXT NOT NULL,
    "ocrRawText" TEXT,
    "uploadedBy" TEXT NOT NULL DEFAULT 'Okul YÃ¶netimi',
    "violationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);
INSERT INTO "new_ViolationUpload" ("createdAt", "description", "id", "imagePath", "ocrRawText", "type", "uploadedBy", "violationDate") SELECT "createdAt", "description", "id", "imagePath", "ocrRawText", "type", "uploadedBy", "violationDate" FROM "ViolationUpload";
DROP TABLE "ViolationUpload";
ALTER TABLE "new_ViolationUpload" RENAME TO "ViolationUpload";
CREATE TABLE "new_WrittenWarning" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "warningNumber" INTEGER NOT NULL DEFAULT 1,
    "behaviorCode" TEXT NOT NULL,
    "behaviorText" TEXT NOT NULL,
    "description" TEXT,
    "guidanceNote" TEXT,
    "classTeacherName" TEXT,
    "schoolCounselorName" TEXT,
    "pdfPath" TEXT NOT NULL,
    "className" TEXT,
    "academicYear" TEXT,
    "issuedBy" TEXT NOT NULL DEFAULT 'Okul YÃ¶netimi',
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waSentAt" DATETIME,
    "deletedAt" DATETIME,
    CONSTRAINT "WrittenWarning_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_WrittenWarning" ("behaviorCode", "behaviorText", "classTeacherName", "createdAt", "deletedAt", "description", "guidanceNote", "id", "issuedAt", "issuedBy", "pdfPath", "schoolCounselorName", "studentId", "waSentAt", "warningNumber") SELECT "behaviorCode", "behaviorText", "classTeacherName", "createdAt", "deletedAt", "description", "guidanceNote", "id", "issuedAt", "issuedBy", "pdfPath", "schoolCounselorName", "studentId", "waSentAt", "warningNumber" FROM "WrittenWarning";
DROP TABLE "WrittenWarning";
ALTER TABLE "new_WrittenWarning" RENAME TO "WrittenWarning";
CREATE INDEX "WrittenWarning_studentId_idx" ON "WrittenWarning"("studentId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "StudentLeave_studentId_idx" ON "StudentLeave"("studentId");

-- CreateIndex
CREATE INDEX "DutyStaffConfig_academicYear_idx" ON "DutyStaffConfig"("academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "DutyStaffConfig_staffId_academicYear_key" ON "DutyStaffConfig"("staffId", "academicYear");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "TimetableEntry_timetableId_idx" ON "TimetableEntry"("timetableId");

-- CreateIndex
CREATE INDEX "TimetableEntry_staffId_idx" ON "TimetableEntry"("staffId");

-- CreateIndex
CREATE INDEX "TimetableEntry_className_idx" ON "TimetableEntry"("className");

-- CreateIndex
CREATE INDEX "StaffAbsence_staffId_idx" ON "StaffAbsence"("staffId");

-- CreateIndex
CREATE INDEX "StaffAbsence_startDate_endDate_idx" ON "StaffAbsence"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "CoverAssignment_date_idx" ON "CoverAssignment"("date");

-- CreateIndex
CREATE INDEX "CoverAssignment_substituteStaffId_idx" ON "CoverAssignment"("substituteStaffId");

-- CreateIndex
CREATE UNIQUE INDEX "CoverAssignment_date_absentStaffId_period_key" ON "CoverAssignment"("date", "absentStaffId", "period");
