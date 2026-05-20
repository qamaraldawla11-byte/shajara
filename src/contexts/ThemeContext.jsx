import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'shajara-theme';
const THEME_OPTIONS = ['dark', 'light', 'system'];

function getSystemTheme() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return 'dark';
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function getStoredTheme() {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  return THEME_OPTIONS.includes(storedTheme) ? storedTheme : 'dark';
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState(getSystemTheme);

  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolvedTheme;
    root.dataset.themePreference = theme;
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme, theme]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!window.matchMedia) {
      return undefined;
    }

    const query = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = () => setSystemTheme(getSystemTheme());

    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  const value = useMemo(() => {
    function setTheme(nextTheme) {
      if (THEME_OPTIONS.includes(nextTheme)) {
        setThemeState(nextTheme);
      }
    }

    function cycleTheme() {
      setThemeState((currentTheme) => {
        const currentIndex = THEME_OPTIONS.indexOf(currentTheme);
        return THEME_OPTIONS[(currentIndex + 1) % THEME_OPTIONS.length];
      });
    }

    return {
      theme,
      resolvedTheme,
      setTheme,
      cycleTheme,
      options: THEME_OPTIONS
    };
  }, [theme, resolvedTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
