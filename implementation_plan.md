# Goal: Allow Multiple Advisory Teachers for Student Clubs and Fix Empty List Issue

## Overview
1. **Empty List Bug**: The user deleted the clubs via UI, setting their `deletedAt` fields. The PDF upload found these soft-deleted clubs and updated them without clearing `deletedAt`, causing them to remain hidden.
2. **Multiple Teachers**: The `StudentClub` schema currently only supports a single `assignedStaffId`. We will update the schema to support multiple teachers using a Many-to-Many relation (`advisors Staff[] @relation("ClubAdvisors")`), and update the backend/frontend to handle multiple selections.

## Proposed Changes

### 1. Prisma Schema (`backend/prisma/schema.prisma`)
- Add `advisors Staff[] @relation("ClubAdvisors")` to `StudentClub`.
- Add `advisedClubs StudentClub[] @relation("ClubAdvisors")` to `Staff`.

### 2. Backend Services (`backend/src/modules/shared/services/moduleServices.ts`)
- Update `StudentClubService.getAll` to include `advisors`, and map `assignedStaffName` to a comma-separated list of names.
- Update `StudentClubService.create` and `update` to accept an array of `advisorIds` and connect them using Prisma's `connect` / `set` API.

### 3. Backend Routes (`backend/src/modules/studentClub/studentClub.routes.ts`)
- Update Zod schema to accept `advisorIds: z.array(z.string()).optional()`.
- Update `upload-pdf` to group `parsedEntries` by club name.
- For each unique club, collect all `matchedStaffId`s.
- During `findFirst`, if a soft-deleted club is found, set `deletedAt: null`.
- Update the club using `{ advisors: { set: staffIds.map(id => ({ id })) } }`.

### 4. Frontend (`frontend/src/pages/admin/modules/StudentClubPage.tsx`)
- Update the state `formData` to hold `advisorIds: string[]`.
- Change the single `<select>` to a multi-select UI for selecting teachers.
- Ensure the table column for "Danışman Öğretmen" displays the comma-separated names correctly.

## Verification
- Run `npx prisma db push` to apply the schema changes.
- Restart the backend (handled by `tauri:dev` automatically or manually).
- Re-upload `KulupListesi.pdf` to see clubs restored from soft-delete with multiple teachers assigned.
