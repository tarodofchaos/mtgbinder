import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme, PaletteMode } from '@mui/material';
import type { Theme } from '@mui/material';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'mtg_binder_theme';

function createAppTheme(mode: PaletteMode): Theme {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#3b82f6', // blue-500
        light: '#60a5fa', // blue-400
        dark: '#2563eb', // blue-600
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#8b5cf6', // violet-500
        light: '#a78bfa', // violet-400
        dark: '#7c3aed', // violet-600
        contrastText: '#ffffff',
      },
      error: {
        main: '#ef4444', // red-500
        light: '#f87171', // red-400
        dark: '#dc2626', // red-600
      },
      warning: {
        main: '#f59e0b', // amber-500
        light: '#fbbf24', // amber-400
        dark: '#d97706', // amber-600
      },
      success: {
        main: '#22c55e', // green-500
        light: '#4ade80', // green-400
        dark: '#16a34a', // green-600
      },
      background: {
        default: mode === 'dark' ? '#111827' : '#f3f4f6', // gray-900 / gray-100
        paper: mode === 'dark' ? '#1f2937' : '#ffffff', // gray-800 / white
      },
      text: {
        primary: mode === 'dark' ? '#f9fafb' : '#111827', // gray-50 / gray-900
        secondary: mode === 'dark' ? '#9ca3af' : '#6b7280', // gray-400 / gray-500
      },
      divider: mode === 'dark' ? '#374151' : '#e5e7eb', // gray-700 / gray-200
    },
    typography: {
      fontFamily: [
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ].join(','),
      h1: {
        fontSize: '2.25rem',
        fontWeight: 700,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '1.875rem',
        fontWeight: 700,
        lineHeight: 1.3,
      },
      h3: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h4: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.5,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
      button: {
        textTransform: 'none',
        fontWeight: 500,
      },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: mode === 'dark' ? '#374151 #1f2937' : '#d1d5db #f3f4f6',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: mode === 'dark' ? '#1f2937' : '#f3f4f6',
            },
            '&::-webkit-scrollbar-thumb': {
              background: mode === 'dark' ? '#374151' : '#d1d5db',
              borderRadius: '4px',
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 16px',
          },
          contained: {
            boxShadow: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
          },
        },
      },
      MuiTextField: {
        defaultProps: {
          variant: 'outlined',
          size: 'small',
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            backgroundImage: 'none',
          },
        },
      },
    },
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem(THEME_KEY, mode);
  }, [mode]);

  const theme = useMemo(() => createAppTheme(mode), [mode]);

  function toggleTheme() {
    setModeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  function setMode(newMode: ThemeMode) {
    setModeState(newMode);
  }

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme, setMode }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
