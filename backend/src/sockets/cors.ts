/**
 * Callback de CORS do Socket.IO.
 *
 * Política por ambiente (NODE_ENV):
 *   - `development` → allowlist restrita (Vite em :5173/:3001, backend :3000).
 *     Bloqueia qualquer origin externa para não vazar o cookie de auth
 *     em ambiente local.
 *   - `staging` / `production` / `test` → sem checagem. Frontend e backend
 *     estão no mesmo origin (atrás do nginx), então o navegador não
 *     envia cookie cross-site e CORS não é necessário. Staging também
 *     confia no mesmo nginx (proxy reverso TLS).
 *
 * Sem header `Origin` (ex.: curl, same-origin sem header) → permite.
 */
export type CorsOriginCallback = (
  err: Error | null,
  ok?: boolean,
) => void;

const ALLOWED_DEV_ORIGINS = new Set<string>([
  'http://localhost:3001',
  'http://localhost:5173',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:5173',
]);

export function buildSocketCorsOrigin(
  nodeEnv: string | undefined,
): (origin: string | undefined, cb: CorsOriginCallback) => void {
  const isDev = nodeEnv === 'development';
  return (origin, cb) => {
    if (!origin) {
      cb(null, true);
      return;
    }
    if (isDev && !ALLOWED_DEV_ORIGINS.has(origin)) {
      cb(new Error(`Origin não permitido: ${origin}`), false);
      return;
    }
    cb(null, true);
  };
}
