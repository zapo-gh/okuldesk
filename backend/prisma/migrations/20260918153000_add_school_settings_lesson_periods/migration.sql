ALTER TABLE "SchoolSettings"
ADD COLUMN "lessonPeriodsJson" TEXT DEFAULT '{}';

CREATE UNIQUE INDEX IF NOT EXISTS "Timetable_one_active_per_academicYear"
ON "Timetable" ("academicYear")
WHERE "isActive" = 1;