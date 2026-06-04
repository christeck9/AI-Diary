export type AppThemeType = 'neon' | 'matrix' | 'light' | 'sanctuary' | 'aura';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  primary: string; // High energy/User
  secondary: string; // AI/Soft focus
  textPrimary: string;
  textSecondary: string;
  border: string;
  error: string;
}

export const Themes: Record<AppThemeType, ThemeColors> = {
  neon: {
    background: '#050505',
    surface: '#0f0f12',
    surfaceSecondary: '#1a1a24',
    primary: '#bc00ff', // Electric Purple
    secondary: '#00f3ff', // Acid Cyan
    textPrimary: '#ffffff',
    textSecondary: '#6e6e80',
    border: '#2a2a35',
    error: '#ff2d55',
  },
  matrix: {
    background: '#0a0b0a', // Deep Digital Black
    surface: '#121412',
    surfaceSecondary: '#1a1e1a',
    primary: '#00ff41', // Matrix Green
    secondary: '#008f11', // Deep Forest Green
    textPrimary: '#d1ffd7',
    textSecondary: '#4b664b',
    border: '#1a2b1a',
    error: '#ff003c',
  },
  light: {
    background: '#fcfcfc', // Off-white
    surface: '#ffffff',
    surfaceSecondary: '#f0f0f5',
    primary: '#4338ca', // Indigo Zen
    secondary: '#64748b', // Slate Gray
    textPrimary: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
    error: '#ef4444',
  },
  sanctuary: {
    background: '#f4f5f0', // Soft Sage/Crema
    surface: '#ffffff',
    surfaceSecondary: '#e8ebe4',
    primary: '#7da885', // Calming Green
    secondary: '#5c84a8', // Soft Blue
    textPrimary: '#2d3730',
    textSecondary: '#6a786f',
    border: '#d0d6cc',
    error: '#d96c6c',
  },
  aura: {
    background: '#f3f4fa', // Very light lavender
    surface: '#ffffff',
    surfaceSecondary: '#e6e8f4',
    primary: '#8b84d9', // Lavender/Purple
    secondary: '#6ba3d6', // Sky Blue
    textPrimary: '#2b2a3b',
    textSecondary: '#6b6885',
    border: '#d1d4e8',
    error: '#e06e8c',
  }
};
