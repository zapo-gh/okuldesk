import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDebounce } from "../hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("başlangıçta orijinal değeri döndürmeli", () => {
    const { result } = renderHook(() => useDebounce("test", 400));
    expect(result.current).toBe("test");
  });

  it("değer hemen güncellenmemeli — gecikme sonrası güncellenmeli", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: "a" } }
    );

    // Değeri güncelle
    rerender({ value: "ab" });

    // Gecikme süresi dolmadan değer güncellenmemiş olmalı
    expect(result.current).toBe("a");

    // 400ms sonra güncellenmeli
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current).toBe("ab");
  });

  it("hızlı ardışık değişimlerde yalnızca son değer kullanılmalı", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: "a" } }
    );

    // Hızlı yazma simülasyonu
    rerender({ value: "ab" });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: "abc" });
    act(() => { vi.advanceTimersByTime(100); });
    rerender({ value: "abcd" });

    // Henüz güncellenmemiş
    expect(result.current).toBe("a");

    // Son değişimden 400ms sonra sadece "abcd" geçerli olmalı
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current).toBe("abcd");
  });

  it("farklı gecikme süresi kullanılabilmeli", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 1000),
      { initialProps: { value: "x" } }
    );

    rerender({ value: "y" });
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe("x");

    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe("y");
  });
});
