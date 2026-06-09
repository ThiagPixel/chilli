/**
 * Tipos auxiliares para a camada HTTP.
 * Espelha `backend/src/types/http.ts`.
 */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
