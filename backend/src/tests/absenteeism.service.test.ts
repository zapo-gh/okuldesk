import { describe, it, expect, vi, beforeEach } from "vitest";

// Prisma mock
vi.mock("../modules/shared/utils/prisma", () => ({
  default: {
    absenteeism: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    student: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn({
      absenteeism: { count: vi.fn(), create: vi.fn() },
      student:     { findUnique: vi.fn() },
    })),
  },
}));

vi.mock("../modules/absenteeism/pdfPreview.service", () => ({
  generateAbsenteeismPreview: vi.fn().mockResolvedValue(null),
  deletePreviewFile: vi.fn(),
  extractAbsenceDays: vi.fn().mockResolvedValue({ excusedDays: null, unexcusedDays: null }),
}));

import prisma from "../modules/shared/utils/prisma";
import { AbsenteeismService } from "../modules/absenteeism/absenteeism.service";

describe("AbsenteeismService", () => {
  let service: AbsenteeismService;

  beforeEach(() => {
    service = new AbsenteeismService();
    vi.clearAllMocks();
  });

  describe("getWarningCount", () => {
    it("yalnizca deletedAt: null olan kayitlari saymalı", async () => {
      (prisma.absenteeism.count as any).mockResolvedValue(3);

      const result = await service.getWarningCount("student-123");

      expect(prisma.absenteeism.count).toHaveBeenCalledWith({
        where: {
          studentId: "student-123",
          deletedAt: null,  // <- kritik: silinmis kayitlar sayilmamali
        },
      });
      expect(result).toBe(3);
    });

    it("kayit yoksa 0 donmeli", async () => {
      (prisma.absenteeism.count as any).mockResolvedValue(0);
      const result = await service.getWarningCount("student-xyz");
      expect(result).toBe(0);
    });
  });
});
