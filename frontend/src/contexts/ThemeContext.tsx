import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ThemeProvider as StyledThemeProvider } from 'styled-components';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const lightTheme = {
  background: '#f5f5f5',
  surface: '#ffffff',
  surfaceSecondary: '#f9fafb',
  text: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  border: '#e5e5e5',
  borderHover: '#d1d5db',
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  success: '#10b981',
  error: '#ef4444',
  shadow: 'rgba(0, 0, 0, 0.05)',
  shadowHover: 'rgba(0, 0, 0, 0.1)',
};

const darkTheme = {
  background: '#121212',
  surface: '#1e1e1e',
  surfaceSecondary: '#2a2a2a',
  text: '#ffffff',
  textSecondary: '#a0a0a0',
  textTertiary: '#6b7280',
  border: '#2a2a2a',
  borderHover: '#3a3a3a',
  primary: '#3b82f6',
  primaryHover: '#60a5fa',
  success: '#4ade80',
  error: '#ef4444',
  shadow: 'rgba(0, 0, 0, 0.3)',
  shadowHover: 'rgba(0, 0, 0, 0.5)',
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) {
      return stored;
    }
    // Verificar preferência do sistema
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const currentTheme = theme === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <StyledThemeProvider theme={currentTheme}>{children}</StyledThemeProvider>
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



