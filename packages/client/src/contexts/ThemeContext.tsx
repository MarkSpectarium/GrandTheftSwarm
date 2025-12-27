import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useGame } from './GameContext';
import type { EraConfig } from '../config/types/eras';

interface ThemeContextValue {
  era: EraConfig;
  theme: EraConfig['theme'];
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { state, config } = useGame();

  const era = useMemo(() => {
    return config.eras.find(e => e.id === state.currentEra) ?? config.eras[0];
  }, [config.eras, state.currentEra]);

  const theme = era.theme;

  // Apply theme to document root
  useEffect(() => {
    const root = document.documentElement;

    // Set CSS variables
    root.style.setProperty('--primary-color', theme.primaryColor);
    root.style.setProperty('--secondary-color', theme.secondaryColor);
    root.style.setProperty('--accent-color', theme.accentColor);
    root.style.setProperty('--background-color', theme.background);
    root.style.setProperty('--text-color', theme.textColor);
    root.style.setProperty('--header-font', theme.headerFont);
    root.style.setProperty('--body-font', theme.bodyFont);

    // Update body styles
    document.body.style.backgroundColor = theme.background;
    document.body.style.color = theme.textColor;
    document.body.style.fontFamily = theme.bodyFont;

    // Set theme class
    root.className = theme.cssClass;
  }, [theme]);

  const value = useMemo<ThemeContextValue>(() => ({
    era,
    theme,
  }), [era, theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
