import { useState, useEffect } from 'react';

/**
 * Bir değerin güncellenmesini belirtilen süre kadar geciktirir.
 * Arama inputlarında API istek sayısını azaltmak için kullanılır.
 *
 * @param value Debounce edilecek değer
 * @param delayMs Gecikme süresi (ms). Varsayılan: 400ms
 * @returns Geciktirilmiş değer
 *
 * @example
 * const debouncedSearch = useDebounce(searchInput, 400);
 * useEffect(() => { fetchData(debouncedSearch); }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delayMs: number = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    // Değer değişirse önceki timer'ı iptal et
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
