/**
 * Cliente HTTP central.
 *
 * - Base URL: `import.meta.env.VITE_API_URL` em produção, vazio (usa proxy
 *   do Vite) em dev.
 * - `withCredentials: true` para que o cookie httpOnly do JWT trafegue.
 * - Interceptor de erro padroniza o shape `ApiErrorBody` do backend.
 *
 * Topologia assumida (MVP): SPA e API no mesmo origin. O nginx
 * reverse-proxia `/api` e `/socket.io` para o backend, e a SPA
 * é servida como estática. Por isso `VITE_API_URL=''` em prod
 * (o build do frontend é feito com `ARG VITE_API_URL=""`).
 *
 * Se a topologia mudar (CDN, split de origem, shell mobile), sete
 * `VITE_API_URL` para a URL absoluta do backend no build args e
 * configure CORS no backend de acordo.
 */
import axios, { AxiosError, type AxiosInstance } from 'axios';
import type { ApiErrorBody } from '@/types';

const baseURL = import.meta.env.VITE_API_URL ?? '';

export const api: AxiosInstance = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

/** Converte AxiosError em um erro de domínio com `code` e `message` amigáveis. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

api.interceptors.response.use(
  (r) => r,
  (err: AxiosError<ApiErrorBody>) => {
    const status = err.response?.status ?? 0;
    const body = err.response?.data;
    if (body?.error) {
      throw new ApiError(body.error.code, body.error.message, status, body.error.details);
    }
    throw new ApiError(
      status === 0 ? 'NETWORK_ERROR' : 'UNKNOWN_ERROR',
      err.message || 'Erro desconhecido',
      status,
    );
  },
);
