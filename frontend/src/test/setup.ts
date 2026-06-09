/**
 * Setup global de testes (Vitest + jsdom).
 * - Importa matchers do jest-dom.
 * - Mocka APIs do browser que não existem em jsdom.
 */
import '@testing-library/jest-dom/vitest';

// jsdom não tem matchMedia por padrão; MUI o usa.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
