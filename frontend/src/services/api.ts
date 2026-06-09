/**
 * Cliente HTTP central.
 *
 * - Base URL: `import.meta.env.VITE_API_URL` em produção, vazio (usa proxy
 *   do Vite) em dev.
 * - `withCredentials: true` para que o cookie httpOnly do JWT trafegue.
 * - Interceptor de erro padroniza o shape `ApiErrorBody` do backend.
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
