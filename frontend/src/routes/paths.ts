/**
 * Paths canônicos do app.
 *
 * Centralizar evita strings mágicas espalhadas e ajuda em refactors.
 * Use sempre `PATHS.xxx` em vez de concatenar a URL na mão.
 */
export const PATHS = {
  home: '/',
  createRoom: '/criar',
  joinRoom: '/entrar',
  room: (code: string) => `/r/${code}`,
  roomPattern: '/r/:code',
  notFound: '/404',
} as const;

/**
 * Mapeia uma pathname para o título e subtítulo do TopBar.
 * Mantém o AppShell desacoplado do conhecimento de cada página.
 */
export function getTitleForPath(pathname: string): { title: string; subtitle?: string } {
  if (pathname === PATHS.home) return { title: 'Chilli', subtitle: 'A sua mesa, do nosso jeito, à mão' };
  if (pathname.startsWith(PATHS.createRoom)) return { title: 'Criar mesa' };
  if (pathname.startsWith(PATHS.joinRoom)) return { title: 'Entrar em mesa' };
  if (pathname.startsWith('/r/')) return { title: 'Mesa', subtitle: 'Sessão em andamento' };
  return { title: 'Chilli' };
}
