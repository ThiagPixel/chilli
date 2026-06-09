/**
 * Tema global — Material UI, mobile-first.
 *
 * Princípios (CLAUDE.md):
 *  - Design parte de 390px (iPhone 12 width).
 *  - Tablet (>=600) e desktop (>=900) são ampliações.
 *  - Tipografia e espaçamentos generosos para toque.
 *  - Paleta quente (vermelho chili) com alto contraste.
 */
import { createTheme, type ThemeOptions } from '@mui/material/styles';

// =========================================================================
// Paleta
// =========================================================================
const palette = {
  // "Chilli" — vermelho ardido
  primary: {
    main: '#c62828',
    light: '#ff5f52',
    dark: '#8e0000',
    contrastText: '#ffffff',
  },
  // Acompanhante: laranja queimado
  secondary: {
    main: '#ef6c00',
    light: '#ff9d3f',
    dark: '#b53d00',
    contrastText: '#ffffff',
  },
  background: {
    default: '#faf7f5',
    paper: '#ffffff',
    dark: '#0f0f10',
  },
  success: { main: '#2e7d32' },
  warning: { main: '#ed6c02' },
  error: { main: '#d32f2f' },
  info: { main: '#0288d1' },
} as const;

// =========================================================================
// Tipografia mobile-first
// =========================================================================
const typography: ThemeOptions['typography'] = {
  fontFamily: [
    'Roboto',
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Helvetica',
    'Arial',
    'sans-serif',
  ].join(','),
  // 1rem = 16px. Em mobile, tamanhos levemente maiores para legibilidade.
  htmlFontSize: 16,
  fontSize: 14,
  h1: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 },
  h2: { fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.25 },
  h3: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3 },
  h4: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.35 },
  h5: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
  h6: { fontSize: '0.95rem', fontWeight: 600, lineHeight: 1.4 },
  body1: { fontSize: '0.95rem', lineHeight: 1.5 },
  body2: { fontSize: '0.85rem', lineHeight: 1.5 },
  button: { textTransform: 'none', fontWeight: 600 },
};

// =========================================================================
// Componentes — overrides globais
// =========================================================================
const components: ThemeOptions['components'] = {
  MuiCssBaseline: {
    styleOverrides: {
      // Mobile-first: scroll confortável, sem bounce horizontal acidental.
      html: { WebkitTextSizeAdjust: '100%' },
      body: {
        overscrollBehaviorY: 'none',
        backgroundColor: palette.background.default,
      },
      // Container raiz do app ocupa 100dvh (notch-friendly).
      '#root': { minHeight: '100dvh', display: 'flex', flexDirection: 'column' },
    },
  },
  MuiButton: {
    defaultProps: { disableElevation: true },
    styleOverrides: {
      root: {
        minHeight: 44, // alvo de toque recomendado
        borderRadius: 12,
        paddingInline: 16,
      },
      sizeLarge: { minHeight: 52, fontSize: '1rem' },
    },
  },
  MuiTextField: {
    defaultProps: { fullWidth: true, variant: 'outlined' },
  },
  MuiOutlinedInput: {
    styleOverrides: {
      root: { borderRadius: 12 },
    },
  },
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: { backgroundImage: 'none' },
    },
  },
  MuiAppBar: {
    defaultProps: { color: 'inherit', elevation: 0 },
    styleOverrides: {
      root: {
        backgroundColor: palette.background.paper,
        borderBottom: '1px solid rgba(0,0,0,0.08)',
      },
    },
  },
  MuiBottomNavigation: {
    styleOverrides: {
      root: {
        height: 64,
        borderTop: '1px solid rgba(0,0,0,0.08)',
        backgroundColor: palette.background.paper,
      },
    },
  },
  MuiBottomNavigationAction: {
    styleOverrides: {
      root: { minWidth: 64, fontSize: '0.7rem' },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: { borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)' },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: { borderRadius: 16, margin: 12 },
    },
  },
  MuiSnackbarContent: {
    styleOverrides: {
      root: { borderRadius: 12 },
    },
  },
};

// =========================================================================
// Theme final
// =========================================================================
export const theme = createTheme({
  palette: { mode: 'light', ...palette },
  typography,
  shape: { borderRadius: 12 },
  spacing: 8, // 1 unidade = 8px (alinhado com MUI default)
  breakpoints: {
    // Mobile-first: xs é o default; sm = tablet retrato; md = tablet paisagem/desktop.
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  components,
});

/** Tema escuro para iteração futura (PWA pode preferir em ambientes escuros). */
export const darkTheme = createTheme({
  ...theme,
  palette: {
    mode: 'dark',
    ...palette,
    background: {
      default: '#0f0f10',
      paper: '#1a1a1c',
    },
  },
});

export type AppTheme = typeof theme;
