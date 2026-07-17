import 'react-native-get-random-values';

// ─── Initialization Breadcrumbs Tracer ───
if (typeof (global as any).__init_breadcrumbs === 'undefined') {
  (global as any).__init_breadcrumbs = [];
}
export function addBreadcrumb(msg: string) {
  const ts = new Date().toLocaleTimeString();
  (global as any).__init_breadcrumbs.push(`[${ts}] ${msg}`);
  console.log(`[INIT_TRACE] ${msg}`);
}
addBreadcrumb('app/_layout.tsx module evaluated');

import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, StyleSheet, Text as RNText, BackHandler } from 'react-native';
import { useEffect, useMemo } from 'react';
import React from 'react';
import 'react-native-reanimated';

// ─── Global Error Boundary ────────────────────────────────────────────────────
// Prevents uncaught JS exceptions from reaching Hermes's C++ terminate handler
// (which calls abort() → EXC_CRASH / SIGABRT on iOS). Apple requires the app
// NOT to crash silently — this boundary catches the exception and renders a
// recoverable error screen instead.
interface ErrorBoundaryState { hasError: boolean; errorMessage: string; errorStack: string; }
class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '', errorStack: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { 
      hasError: true, 
      errorMessage: error?.message ?? 'Unknown error',
      errorStack: error?.stack ?? ''
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log for debugging — do NOT re-throw (that would reach abort())
    console.error('[AppErrorBoundary] Caught exception:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <RNText style={{ color: '#B026FF', fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>AI Diary</RNText>
          <RNText style={{ color: '#ffffff', fontSize: 15, textAlign: 'center', marginBottom: 8 }}>
            The app encountered an issue on startup.
          </RNText>
          <RNText style={{ color: '#888', fontSize: 12, textAlign: 'center', marginBottom: 16 }}>
            Please close and reopen the app. If the issue persists, check your connection settings.
          </RNText>
          <RNText style={{ color: '#ff4444', fontSize: 11, textAlign: 'center', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginBottom: 8 }}>
            Error details: {this.state.errorMessage}
          </RNText>
          {this.state.errorStack ? (
            <RNText style={{ color: '#aaaaaa', fontSize: 9, textAlign: 'left', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', padding: 8, backgroundColor: '#111111', borderRadius: 4, width: '100%', maxHeight: 150, marginBottom: 8 }}>
              {this.state.errorStack.split('\n').slice(0, 15).join('\n')}
            </RNText>
          ) : null}
          {(global as any).__init_breadcrumbs && (global as any).__init_breadcrumbs.length > 0 ? (
            <RNText style={{ color: '#00FF41', fontSize: 9, textAlign: 'left', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', padding: 8, backgroundColor: '#051105', borderRadius: 4, width: '100%', maxHeight: 150 }}>
              Trace:\n{(global as any).__init_breadcrumbs.join('\n')}
            </RNText>
          ) : null}
        </View>
      );
    }
    return this.props.children;
  }
}
// ─────────────────────────────────────────────────────────────────────────────

// Prevent splash screen from auto-hiding until database is ready
SplashScreen.preventAutoHideAsync().catch(() => { });

// Safety timeout: force hide splash screen after 5 seconds to prevent getting stuck
// if any provider initialization blocks or throws before RootThemeContainer mounts.
if (Platform.OS !== 'web') {
  setTimeout(() => {
    console.log('[DEBUG] Safety timeout triggered: hiding splash screen');
    SplashScreen.hideAsync().catch(() => { });
  }, 5000);
}

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

function TraceAppTheme() { addBreadcrumb('AppThemeProvider rendered'); return null; }
function TraceLanguage() { addBreadcrumb('LanguageProvider rendered'); return null; }
function TraceVoice() { addBreadcrumb('VoiceProvider rendered'); return null; }
function TraceMemory() { addBreadcrumb('MemoryProvider rendered'); return null; }
function TraceProfile() { addBreadcrumb('ProfileProvider rendered'); return null; }
function TraceLlm() { addBreadcrumb('LlmProvider rendered'); return null; }
function TraceRootThemeContainer() { addBreadcrumb('RootThemeContainer rendering'); return null; }

export default function RootLayout() {
  addBreadcrumb('RootLayout rendering');
  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppThemeProvider>
          <TraceAppTheme />
          <LanguageProvider>
            <TraceLanguage />
            <AppErrorBoundary>
              <VoiceProvider>
                <TraceVoice />
                <MemoryProvider>
                  <TraceMemory />
                  <ProfileProvider>
                    <TraceProfile />
                    <LlmProvider>
                      <TraceLlm />
                      <TraceRootThemeContainer />
                      <RootThemeContainer />
                      <GlobalDownloadBanner />
                    </LlmProvider>
                  </ProfileProvider>
                </MemoryProvider>
              </VoiceProvider>
            </AppErrorBoundary>
          </LanguageProvider>
        </AppThemeProvider>
      </GestureHandlerRootView>
    </AppErrorBoundary>
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

