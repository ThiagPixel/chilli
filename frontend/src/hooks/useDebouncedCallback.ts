/**
 * useDebouncedCallback — atrasa a execução de um callback até
 * `delayMs` após a última chamada. Útil para evitar spam de
 * eventos (ex.: broadcast de viewport durante pan/zoom).
 */
import { useCallback, useEffect, useRef } from 'react';

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number,
): (...args: Parameters<T>) => void {
  const fnRef = useRef<T>(fn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mantém a ref sempre apontando para a função mais recente
  // (sem invalidar o callback debounced quando fn muda).
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  // Limpa o timer no unmount.
  useEffect(
    () => () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    },
    [],
  );

  return useCallback(
    (...args: Parameters<T>) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        fnRef.current(...args);
      }, delayMs);
    },
    [delayMs],
  );
}
