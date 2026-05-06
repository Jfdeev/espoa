import { liveQuery } from "dexie";
import { useState, useEffect, useRef } from "react";

/**
 * Hook reativo para queries no Dexie IndexedDB.
 * Atualiza automaticamente quando os dados mudam.
 *
 * @param querier Função que executa a query no Dexie
 * @param fallback Valor inicial/fallback enquanto carrega
 * @param deps Dependências extras (similar ao useEffect)
 */
export function useLiveQuery<T>(
  querier: () => T | Promise<T>,
  fallback: T,
  deps: unknown[] = [],
): T {
  const [value, setValue] = useState<T>(fallback);
  const querierRef = useRef(querier);
  querierRef.current = querier;

  useEffect(() => {
    const subscription = liveQuery(() => querierRef.current()).subscribe({
      next: (v) => setValue(v as T),
      error: () => setValue(fallback),
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return value;
}
