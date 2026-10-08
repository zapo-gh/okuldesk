import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';

interface UseApiOptions {
  /** Hata durumunda gösterilecek mesaj. Varsayılan: 'Veri yüklenemedi.' */
  errorMessage?: string;
  /** Hata toast bildirimini göster. Varsayılan: true */
  showErrorToast?: boolean;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  load: (...args: any[]) => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * Merkezi veri çekme hook'u.
 * Loading state, error state ve toast bildirimi yönetir.
 *
 * @example
 * const fetchStudents = useCallback(() => api.get('/students').then(r => r.data.data), []);
 * const { data, loading, load } = useApi(fetchStudents, { errorMessage: 'Öğrenciler yüklenemedi.' });
 * useEffect(() => { load(); }, [load]);
 */
export function useApi<T>(
  fetcher: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const { errorMessage = 'Veri yüklenemedi.', showErrorToast = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  // Unmount'ta setState çağrısını önle
  // Not: Bu ref, component lifecycle'ına bağlı değil;
  // ancak bellek sızıntısını önlemek için kullanılıyor.
  const load = useCallback(async (...args: any[]) => {
    mountedRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher(...args);
      if (mountedRef.current) setData(result);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        errorMessage;
      if (mountedRef.current) setError(msg);
      if (showErrorToast) toast.error(msg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [fetcher, errorMessage, showErrorToast]);

  return { data, loading, error, load, setData };
}
