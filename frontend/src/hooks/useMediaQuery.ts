/**
 * `useMediaQuery` — wrapper sobre o helper do MUI com breakpoints
 * do nosso tema (xs/sm/md/lg).
 *
 * Uso:
 *   const isMobile = useMediaQuery((t) => t.breakpoints.down('sm'));
 */
import { useMediaQuery as useMuiMediaQuery, type Theme } from '@mui/material';

export function useMediaQuery(query: (theme: Theme) => string): boolean {
  return useMuiMediaQuery(query);
}
