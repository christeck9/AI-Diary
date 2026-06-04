import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppThemeType, ThemeColors, Themes } from '../constants/Themes';
import * as SecureStore from 'expo-secure-store';

interface ThemeContextType {
  activeTheme: AppThemeType;
  colors: ThemeColors;
  setTheme: (theme: AppThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  activeTheme: 'light',
  colors: Themes.light,
  setTheme: () => {},
});

export const useAppTheme = () => useContext(ThemeContext);

export const AppThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [activeTheme, setActiveTheme] = useState<AppThemeType>('light');

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await SecureStore.getItemAsync('app_theme');
        if (savedTheme && Themes[savedTheme as AppThemeType]) {
          setActiveTheme(savedTheme as AppThemeType);
        }
      } catch (e) {
        console.error('Failed to load theme.', e);
      }
    };
    loadTheme();
  }, []);

  const handleSetTheme = async (theme: AppThemeType) => {
    setActiveTheme(theme);
    try {
      await SecureStore.setItemAsync('app_theme', theme);
    } catch (e) {
      console.error('Failed to save theme.', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ activeTheme, colors: Themes[activeTheme], setTheme: handleSetTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
