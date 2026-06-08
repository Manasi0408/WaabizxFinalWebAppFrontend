import React, { createContext, useCallback, useContext, useLayoutEffect, useState } from 'react';
import { applyThemeClass, getStoredTheme } from '../theme/themeStorage';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getStoredTheme);

  useLayoutEffect(() => {
    applyThemeClass(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark';
      applyThemeClass(next);
      return next;
    });
  }, []);

  const setThemeMode = useCallback((mode) => {
    const next = mode === 'dark' ? 'dark' : 'light';
    applyThemeClass(next);
    setTheme(next);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return value;
}
