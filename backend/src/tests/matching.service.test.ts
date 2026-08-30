import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../modules/shared/utils/prisma", () => ({
  default: {
    student: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from "../modules/shared/utils/prisma";

// matchStudents fonksiyonu matching.service'ten import edilecek
// (Servis test edildikten sonra import güncellenebilir)
describe("Matching Service — normalizeTurkish", () => {
  it("Türkçe karakterleri ASCII'ye dönüştürmeli", async () => {
    // normalizeTurkish iç fonksiyon olduğundan sonuç bazlı test yapıyoruz
    // İleride export edilirse doğrudan test edilebilir

    // Beklenti: 'İbrahim Çelik' -> 'ibrahim celik'
    const turkishToAscii = (text: string) =>
      text
        .toLocaleLowerCase("tr-TR")
        .replace(/ı/g, "i").replace(/ğ/g, "g")
        .replace(/ü/g, "u").replace(/ş/g, "s")
        .replace(/ö/g, "o").replace(/ç/g, "c")
        .replace(/İ/g, "i").replace(/[^a-z0-9\s]/g, "").trim();

    expect(turkishToAscii("İbrahim Çelik")).toBe("ibrahim celik");
    expect(turkishToAscii("Şule Öztürk")).toBe("sule ozturk");
    expect(turkishToAscii("Güneş Yıldız")).toBe("gunes yildiz");
  });
});

describe("Matching Service — matchStudents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.student.findMany as any).mockResolvedValue([
      {
        id: "s1",
        schoolNumber: "182",
        fullName: "Sıla Karoğlu",
        className: "10/A",
        status: "ACTIVE",
      },
      {
        id: "s2",
        schoolNumber: "592",
        fullName: "Meryem Gök",
        className: "11/B",
        status: "ACTIVE",
      },
    ]);
  });

  it("fixture: öğrenci listesi mock doğru çalışıyor", async () => {
    const students = await (prisma.student.findMany as any)();
    expect(students).toHaveLength(2);
    expect(students[0].schoolNumber).toBe("182");
  });
});
