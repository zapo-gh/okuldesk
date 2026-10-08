-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PARENT',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schoolNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ParentContact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "waConsentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "waConsentDate" DATETIME,
    CONSTRAINT "ParentContact_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Absenteeism" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "warningNumber" INTEGER NOT NULL DEFAULT 1,
    "isBep" BOOLEAN NOT NULL DEFAULT false,
    "pdfPath" TEXT NOT NULL,
    "previewPath" TEXT,
    "excusedDays" REAL,
    "unexcusedDays" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewedByParent" BOOLEAN NOT NULL DEFAULT false,
    "waSentAt" DATETIME,
    "deletedAt" DATETIME,
    CONSTRAINT "Absenteeism_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WrittenWarning" (
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
    "issuedBy" TEXT NOT NULL DEFAULT 'Okul Yönetimi',
    "issuedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "waSentAt" DATETIME,
    "deletedAt" DATETIME,
    CONSTRAINT "WrittenWarning_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ViolationUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "imagePath" TEXT NOT NULL,
    "ocrRawText" TEXT,
    "uploadedBy" TEXT NOT NULL DEFAULT 'Okul Yönetimi',
    "violationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DailyViolation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "violationDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedBy" TEXT NOT NULL DEFAULT 'OCR',
    "isConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "DailyViolation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DailyViolation_uploadId_fkey" FOREIGN KEY ("uploadId") REFERENCES "ViolationUpload" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SchoolSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "schoolName" TEXT NOT NULL DEFAULT '',
    "principalName" TEXT NOT NULL DEFAULT '',
    "academicYear" TEXT NOT NULL DEFAULT '2025-2026',
    "waTemplate1" TEXT DEFAULT '',
    "waTemplate2" TEXT DEFAULT '',
    "waTemplate3" TEXT DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Staff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "className" TEXT,
    "tcKimlikNo" TEXT,
    "brans" TEXT,
    "kurumSicilNo" TEXT,
    "emekliSicilNo" TEXT,
    "unvan" TEXT,
    "gorev" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "GradeReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "className" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "meetingDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "karneText" TEXT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "GradeReportStudent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "studentId" TEXT,
    "fullName" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "tcKimlikNo" TEXT,
    "schoolNumber" TEXT,
    "pdfPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GradeReportStudent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "GradeReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GradeReportStudent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GradeReportStudentSubject" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gradeReportStudentId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "grade" REAL NOT NULL,
    CONSTRAINT "GradeReportStudentSubject_gradeReportStudentId_fkey" FOREIGN KEY ("gradeReportStudentId") REFERENCES "GradeReportStudent" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DutyStation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "DutyAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL DEFAULT 0,
    "academicYear" TEXT NOT NULL,
    CONSTRAINT "DutyAssignment_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "DutyStation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "taxNumber" TEXT,
    "taxOffice" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "iban" TEXT,
    "contactPerson" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OrderLetter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subject" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL,
    "supplierAddress" TEXT,
    "date" TEXT NOT NULL,
    "deliveryDate" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "notes" TEXT,
    "extraData" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OrderLetterItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "unitPrice" REAL NOT NULL,
    "total" REAL NOT NULL,
    CONSTRAINT "OrderLetterItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "OrderLetter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Procurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "procedureType" TEXT NOT NULL DEFAULT '22/d',
    "estimatedCost" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ONAY_BEKLIYOR',
    "academicYear" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "supplierCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "extraData" TEXT
);

-- CreateTable
CREATE TABLE "ProcurementCommissionMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "procurementId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT,
    CONSTRAINT "ProcurementCommissionMember_procurementId_fkey" FOREIGN KEY ("procurementId") REFERENCES "Procurement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcurementItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "procurementId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "estimatedUnitPrice" REAL NOT NULL,
    CONSTRAINT "ProcurementItem_procurementId_fkey" FOREIGN KEY ("procurementId") REFERENCES "Procurement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProcurementOffer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "procurementId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "offeredPrice" REAL NOT NULL,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ProcurementOffer_procurementId_fkey" FOREIGN KEY ("procurementId") REFERENCES "Procurement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProcurementOffer_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ProcurementItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProcurementOffer_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StudentClub" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "assignedStaffId" TEXT,
    "assignedStaffName" TEXT,
    "meetingDay" TEXT,
    "meetingTime" TEXT,
    "maxMembers" INTEGER NOT NULL DEFAULT 30,
    "academicYear" TEXT NOT NULL,
    "isActive" INTEGER NOT NULL DEFAULT 1,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "extraData" TEXT
);

-- CreateTable
CREATE TABLE "StudentClubMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clubId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'Üye',
    CONSTRAINT "StudentClubMember_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "StudentClub" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentClubMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Extracurricular" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "branch" TEXT NOT NULL,
    "assignedStaffId" TEXT,
    "assignedStaffName" TEXT,
    "schedule" TEXT,
    "academicYear" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ONAY_BEKLIYOR',
    "extraData" TEXT
);

-- CreateTable
CREATE TABLE "SocialActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "plannedDate" TEXT,
    "academicYear" TEXT NOT NULL,
    "assignedStaffId" TEXT,
    "assignedStaffName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLAN_ASAMASINDA',
    "notes" TEXT,
    "extraData" TEXT
);

-- CreateTable
CREATE TABLE "FieldTrip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "returnDate" TEXT,
    "purpose" TEXT,
    "transportation" TEXT,
    "assignedStaffId" TEXT,
    "assignedStaffName" TEXT,
    "participantClasses" TEXT,
    "academicYear" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLAN_ASAMASINDA',
    "extraData" TEXT
);

-- CreateTable
CREATE TABLE "BoardMeeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time" TEXT,
    "location" TEXT,
    "academicYear" TEXT NOT NULL,
    "agenda" TEXT,
    "decisions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANLANDI',
    "extraData" TEXT
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "academicYear" TEXT NOT NULL,
    "members" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AKTIF',
    "extraData" TEXT
);

-- CreateTable
CREATE TABLE "CommemorativeDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT NOT NULL,
    "assignedStaffId" TEXT,
    "assignedStaffName" TEXT,
    "description" TEXT,
    "academicYear" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'BEKLIYOR',
    "extraData" TEXT
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "type" TEXT NOT NULL DEFAULT 'RESMI_TATIL',
    "academicYear" TEXT NOT NULL,
    "extraData" TEXT
);

-- CreateTable
CREATE TABLE "AnnualPlanItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "academicYear" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "extraData" TEXT
);

-- CreateTable
CREATE TABLE "ParentAssociationMeeting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OLAGAN',
    "meetingNumber" INTEGER NOT NULL DEFAULT 1,
    "academicYear" TEXT NOT NULL,
    "notes" TEXT,
    "decisions" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANLANDI',
    "extraData" TEXT
);

-- CreateTable
CREATE TABLE "ParentAssociationMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'UYE',
    "phone" TEXT,
    "academicYear" TEXT NOT NULL,
    "extraData" TEXT
);

-- CreateTable
CREATE TABLE "TravelAllowance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT,
    "staffName" TEXT,
    "title" TEXT,
    "purpose" TEXT,
    "departurePlace" TEXT,
    "arrivalPlace" TEXT,
    "departureDate" TEXT,
    "returnDate" TEXT,
    "transportType" TEXT,
    "transportCost" REAL,
    "dailyAllowance" REAL,
    "accommodationCost" REAL,
    "totalCost" REAL,
    "academicYear" TEXT NOT NULL,
    "notes" TEXT,
    "extraData" TEXT
);

-- CreateTable
CREATE TABLE "StaffTransfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffName" TEXT NOT NULL,
    "staffTitle" TEXT,
    "tcKimlikNo" TEXT,
    "sicilNo" TEXT,
    "currentSchool" TEXT,
    "newSchool" TEXT,
    "transferDate" TEXT NOT NULL,
    "transferReason" TEXT,
    "academicYear" TEXT NOT NULL,
    "notes" TEXT,
    "extraData" TEXT
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BoardAgendaItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "meetingId" TEXT NOT NULL,
    "orderNumber" INTEGER NOT NULL DEFAULT 1,
    "topic" TEXT NOT NULL,
    "decision" TEXT,
    "explanation" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BoardAgendaItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "BoardMeeting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommissionRole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "commissionId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CommissionRole_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "Commission" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommissionAssignment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    CONSTRAINT "CommissionAssignment_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "CommissionRole" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CommissionAssignment_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_StudentParents" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_StudentParents_A_fkey" FOREIGN KEY ("A") REFERENCES "Parent" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_StudentParents_B_fkey" FOREIGN KEY ("B") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolNumber_key" ON "Student"("schoolNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_userId_key" ON "Parent"("userId");

-- CreateIndex
CREATE INDEX "ParentContact_phone_idx" ON "ParentContact"("phone");

-- CreateIndex
CREATE INDEX "Absenteeism_studentId_idx" ON "Absenteeism"("studentId");

-- CreateIndex
CREATE INDEX "WrittenWarning_studentId_idx" ON "WrittenWarning"("studentId");

-- CreateIndex
CREATE INDEX "DailyViolation_studentId_idx" ON "DailyViolation"("studentId");

-- CreateIndex
CREATE INDEX "DailyViolation_uploadId_idx" ON "DailyViolation"("uploadId");

-- CreateIndex
CREATE INDEX "DailyViolation_type_idx" ON "DailyViolation"("type");

-- CreateIndex
CREATE INDEX "DailyViolation_violationDate_idx" ON "DailyViolation"("violationDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyViolation_studentId_uploadId_key" ON "DailyViolation"("studentId", "uploadId");

-- CreateIndex
CREATE INDEX "Staff_role_idx" ON "Staff"("role");

-- CreateIndex
CREATE INDEX "GradeReportStudent_reportId_idx" ON "GradeReportStudent"("reportId");

-- CreateIndex
CREATE INDEX "GradeReportStudent_studentId_idx" ON "GradeReportStudent"("studentId");

-- CreateIndex
CREATE INDEX "GradeReportStudentSubject_gradeReportStudentId_idx" ON "GradeReportStudentSubject"("gradeReportStudentId");

-- CreateIndex
CREATE INDEX "OrderLetterItem_orderId_idx" ON "OrderLetterItem"("orderId");

-- CreateIndex
CREATE INDEX "ProcurementCommissionMember_procurementId_idx" ON "ProcurementCommissionMember"("procurementId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "BoardAgendaItem_meetingId_idx" ON "BoardAgendaItem"("meetingId");

-- CreateIndex
CREATE INDEX "CommissionRole_commissionId_idx" ON "CommissionRole"("commissionId");

-- CreateIndex
CREATE INDEX "CommissionAssignment_roleId_idx" ON "CommissionAssignment"("roleId");

-- CreateIndex
CREATE INDEX "CommissionAssignment_staffId_idx" ON "CommissionAssignment"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "_StudentParents_AB_unique" ON "_StudentParents"("A", "B");

-- CreateIndex
CREATE INDEX "_StudentParents_B_index" ON "_StudentParents"("B");
