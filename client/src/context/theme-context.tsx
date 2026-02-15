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
  const isDark = mode === 'dark';
  
  return createTheme({
    palette: {
      mode,
      primary: {
        main: isDark ? '#a78bfa' : '#7c3aed', // Soft violet for dark, deeper for light
        light: '#c4b5fd',
        dark: '#6d28d9',
        contrastText: '#ffffff',
      },
      secondary: {
        main: '#fbbf24', // Gold/Amber for secondary (Mythic-like)
        light: '#fcd34d',
        dark: '#d97706',
        contrastText: '#000000',
      },
      error: {
        main: '#ef4444',
      },
      warning: {
        main: '#f59e0b',
      },
      success: {
        main: '#10b981',
      },
      background: {
        default: isDark ? '#0a0a0f' : '#f8fafc', 
        paper: isDark ? 'rgba(30, 30, 45, 0.7)' : '#ffffff',
      },
      text: {
        primary: isDark ? '#f8fafc' : '#0f172a',
        secondary: isDark ? '#94a3b8' : '#64748b',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    typography: {
      fontFamily: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        'sans-serif',
      ].join(','),
      h1: {
        fontFamily: "'Planewalker', serif",
        fontSize: '3rem',
        fontWeight: 400,
        letterSpacing: '0.02em',
      },
      h2: {
        fontFamily: "'Planewalker', serif",
        fontSize: '2.25rem',
        fontWeight: 400,
        letterSpacing: '0.02em',
      },
      h3: {
        fontFamily: "'Planewalker', serif",
        fontSize: '1.75rem',
        fontWeight: 400,
      },
      h4: {
        fontFamily: "'Planewalker', serif",
        fontSize: '1.5rem',
        fontWeight: 400,
      },
      h5: {
        fontFamily: "'Planewalker', serif",
        fontSize: '1.25rem',
        fontWeight: 400,
      },
      h6: {
        fontFamily: "'Planewalker', serif",
        fontSize: '1.1rem',
        fontWeight: 400,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.02em',
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            scrollbarColor: isDark ? '#334155 #0f172a' : '#cbd5e1 #f1f5f9',
            backgroundImage: isDark 
              ? 'radial-gradient(circle at 50% -20%, #1e1b4b 0%, #0a0a0f 80%)'
              : 'none',
            backgroundAttachment: 'fixed',
            '&::-webkit-scrollbar': {
              width: '8px',
              height: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: isDark ? '#0a0a0f' : '#f1f5f9',
            },
            '&::-webkit-scrollbar-thumb': {
              background: isDark ? '#334155' : '#cbd5e1',
              borderRadius: '10px',
              '&:hover': {
                background: isDark ? '#475569' : '#94a3b8',
              },
            },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            ...(isDark && {
              backgroundColor: 'rgba(30, 30, 45, 0.7)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            }),
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 16,
            transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
            '&:hover': {
              ...(isDark && {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 48px 0 rgba(0, 0, 0, 0.5)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
              }),
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '10px 20px',
            transition: 'all 0.2s ease-in-out',
          },
          containedPrimary: {
            background: isDark 
              ? 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)'
              : undefined,
            boxShadow: isDark ? '0 4px 14px 0 rgba(124, 58, 237, 0.39)' : undefined,
            '&:hover': {
              background: isDark 
                ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                : undefined,
              transform: 'translateY(-1px)',
              boxShadow: isDark ? '0 6px 20px rgba(124, 58, 237, 0.45)' : undefined,
            },
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? 'rgba(10, 10, 15, 0.8)' : '#ffffff',
            backdropFilter: 'blur(12px)',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: 'none',
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
