import 'react-native-get-random-values';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, StyleSheet, Text as RNText, BackHandler } from 'react-native';
import { useEffect, useMemo } from 'react';
import 'react-native-reanimated';

// Prevent splash screen from auto-hiding until database is ready
SplashScreen.preventAutoHideAsync().catch(() => { });

// Compatibility shim for React 19 + RN 0.81 + Reanimated 3
// Ensures Text component is treated correctly by createAnimatedComponent
if ((RNText as any).defaultProps == null) {
  (RNText as any).defaultProps = {};
}
import { AppThemeProvider, useAppTheme } from '../contexts/ThemeContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootThemeContainer() {
  const { colors, activeTheme } = useAppTheme();
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    // Hide splash screen when database is ready and RootThemeContainer mounts
    SplashScreen.hideAsync().catch(() => { });

    if (Platform.OS === 'android') {
      const backAction = () => {
        // Bloqueamos la acción por defecto para evitar cierres accidentales
        // por clic derecho en el emulador.
        // return true;
        // Permitimos la acción por defecto para que Android pueda retroceder o cerrar la app
        return false;
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction
      );

      return () => backHandler.remove();
    }
  }, []);

  const NavigationTheme = useMemo(() => ({
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      primary: colors.primary,
    },
  }), [colors]);

  // Set glow color based on active theme
  const wrapperGlowColor = activeTheme === 'matrix' ? 'rgba(0, 255, 65, 0.15)' :
    (activeTheme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(176, 38, 255, 0.15)');

  const content = (
    <ThemeProvider value={NavigationTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={activeTheme === 'light' ? 'dark' : 'light'} />
    </ThemeProvider>
  );

  if (isWeb) {
    return (
      <View style={[styles.webWrapper, { backgroundColor: activeTheme === 'light' ? '#E5E5E5' : '#050505' }]}>
        <View style={[styles.mobileContainer, { borderColor: colors.border, boxShadow: `0px 0px 50px ${wrapperGlowColor}` } as any]}>
          {content}
        </View>
      </View>
    );
  }

  return content;
}

import { MemoryProvider } from '../components/MemoryProvider';
import { LanguageProvider } from '../contexts/LanguageContext';
import { VoiceProvider } from '../contexts/VoiceContext';
import { LlmProvider } from '../contexts/LlmContext';
import { GlobalDownloadBanner } from '../components/GlobalDownloadBanner';
import { ProfileProvider } from '../contexts/ProfileContext';


import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <LanguageProvider>
          <VoiceProvider>
            <MemoryProvider>
              <ProfileProvider>
                <LlmProvider>
                  <RootThemeContainer />
                  <GlobalDownloadBanner />
                </LlmProvider>
              </ProfileProvider>
            </MemoryProvider>
          </VoiceProvider>
        </LanguageProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}



const styles = StyleSheet.create({
  webWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileContainer: {
    width: '100%',
    maxWidth: 480,
    height: '100%',
    maxHeight: 1000,
    overflow: 'hidden',
    borderLeftWidth: 1,
    borderRightWidth: 1,
  }
});

