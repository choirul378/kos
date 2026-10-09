import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

// Memuat data setiap kali layar difokuskan (data lokal selalu segar setelah edit).
export function useFocusData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      setData(await loader());
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Gagal memuat data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return { data, error, loading, refreshing, reload: () => load(), refresh: () => load(true) };
}
