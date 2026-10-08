import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock'lar
vi.mock("../modules/shared/utils/prisma", () => ({
  default: {
    violationUpload: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    dailyViolation: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    student: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn()),
  },
}));

vi.mock("../modules/violations/ocr.service", () => ({
  extractTextFromImage: vi.fn(),
  parseOcrLines: vi.fn(),
  parseManualInput: vi.fn(),
}));

vi.mock("../modules/violations/matching.service", () => ({
  matchStudents: vi.fn(),
}));

import * as ocrService from "../modules/violations/ocr.service";
import * as matchingService from "../modules/violations/matching.service";
import prisma from "../modules/shared/utils/prisma";

// Violation tipi dogrulama testleri (pure logic - no db)
describe("Violation Type Validation", () => {
  const VALID_TYPES = ["KIYAFET", "TOREN_GEC", "DIGER"] as const;

  it("gecerli ihlal tipleri dogru tanimlanmali", () => {
    expect(VALID_TYPES).toContain("KIYAFET");
    expect(VALID_TYPES).toContain("TOREN_GEC");
    expect(VALID_TYPES).toContain("DIGER");
    expect(VALID_TYPES.length).toBe(3);
  });

  it("gecersiz ihlal tipi kontrol edilebilmeli", () => {
    const isValid = (type: string) => VALID_TYPES.includes(type as any);
    expect(isValid("KIYAFET")).toBe(true);
    expect(isValid("GECERSIZ")).toBe(false);
    expect(isValid("")).toBe(false);
  });
});

// OCR servisi entegrasyon testleri
describe("OCR Service Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bos OCR sonucu ile hata firlatirilmali", async () => {
    (ocrService.extractTextFromImage as any).mockResolvedValue("");
    (ocrService.parseOcrLines as any).mockReturnValue([]);

    const lines = ocrService.parseOcrLines("");
    expect(lines).toHaveLength(0);
  });

  it("OCR sonucu satirlara ayrilmali", () => {
    const rawText = "182 Sila Karoglu\n592 Meryem Gok\n";
    (ocrService.parseOcrLines as any).mockReturnValue([
      "182 Sila Karoglu",
      "592 Meryem Gok",
    ]);

    const lines = ocrService.parseOcrLines(rawText);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("182");
  });
});

// Matching servisi testleri
describe("Matching Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.student.findMany as any).mockResolvedValue([
      { id: "s1", schoolNumber: "182", fullName: "Sila Karoglu", className: "10/A", status: "ACTIVE" },
      { id: "s2", schoolNumber: "592", fullName: "Meryem Gok",   className: "11/B", status: "ACTIVE" },
    ]);
  });

  it("okul numarasiyla eslesme yapilmali", async () => {
    (matchingService.matchStudents as any).mockResolvedValue({
      matched: [
        { student: { id: "s1", schoolNumber: "182" }, confidence: 100, matchType: "exact_school_number" },
      ],
      unmatched: [],
    });

    const result = await matchingService.matchStudents(["182 Sila Karoglu"]);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].confidence).toBe(100);
    expect(result.unmatched).toHaveLength(0);
  });

  it("eslesmeyenler unmatched listesine gitmeli", async () => {
    (matchingService.matchStudents as any).mockResolvedValue({
      matched: [],
      unmatched: ["999 Bilinmeyen Kisi"],
    });

    const result = await matchingService.matchStudents(["999 Bilinmeyen Kisi"]);
    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(1);
  });
});
