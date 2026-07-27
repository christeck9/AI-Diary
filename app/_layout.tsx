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

import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Platform, View, StyleSheet, Text as RNText, BackHandler, Alert, TouchableOpacity } from 'react-native';
import { useEffect, useMemo, useState } from 'react';
import React from 'react';
import 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';

// ─── Global Error Handler (Hermes Native Stack Catcher) ───
if (typeof ErrorUtils !== 'undefined') {
  const defaultHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
    const errorMsg = error?.message ?? 'Unknown Error';
    const errorStack = error?.stack ?? '';
    const logText = `Error: ${errorMsg}\nStack:\n${errorStack}`;
    console.error('[CRITICAL_BOOT_CRASH]', logText);

    try {
      const logPath = `${FileSystem.documentDirectory}boot_crash_log.txt`;
      FileSystem.writeAsStringAsync(logPath, logText, { encoding: FileSystem.EncodingType.UTF8 }).catch(e => {
        console.warn('Failed to write boot crash log file async:', e);
      });
    } catch (e) {
      console.warn('Failed to write boot crash log file:', e);
    }

    Alert.alert(
      "Critical App Error",
      `The app has crashed during boot:\n\n${errorMsg.slice(0, 300)}\n\nPlease take a screenshot of this alert and send it to Chris.`,
      [{ 
        text: "OK", 
        onPress: () => {
          if (defaultHandler) {
            defaultHandler(error, isFatal);
          }
        } 
      }]
    );
  });
}

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
            <RNText style={{ color: '#aaaaaa', fontSize: 8, textAlign: 'left', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', padding: 8, backgroundColor: '#111111', borderRadius: 4, width: '100%', maxHeight: 200, marginBottom: 8 }}>
              {this.state.errorStack.split('\n').slice(0, 20).join('\n')}
            </RNText>
          ) : null}
          {(global as any).__init_breadcrumbs && (global as any).__init_breadcrumbs.length > 0 ? (
            <RNText style={{ color: '#00FF41', fontSize: 8, textAlign: 'left', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', padding: 8, backgroundColor: '#051105', borderRadius: 4, width: '100%', maxHeight: 300 }}>
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
import { useLanguage } from '../contexts/LanguageContext';
import { securityScanner } from '../lib/SecurityScanner';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootThemeContainer() {
  const { colors, activeTheme } = useAppTheme();
  const { lang } = useLanguage();
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

  useEffect(() => {
    if (isWeb) return;

    // Periodo de gracia para que la app inicialice y la UI esté estable antes de iniciar el reporte de voz Sentinel
    const timer = setTimeout(() => {
      securityScanner.runDailyVoiceReport(lang).catch((err) => {
        console.warn('[RootThemeContainer] Security daily report error:', err);
      });
    }, 8000);

    return () => clearTimeout(timer);
  }, [lang, isWeb]);

  // CRITICAL FIX (2026-07-18): Do NOT spread DarkTheme here.
  // In Hermes iOS production builds, @react-navigation/native exports DarkTheme
  // via a lazy Object.defineProperty getter. Spreading it inside useMemo triggers
  // an infinite recursive getter call → Maximum call stack size exceeded.
  // Solution: build the NavigationTheme object with literal values only.
  const NavigationTheme = useMemo(() => ({
    dark: true,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border,
      notification: colors.primary,
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

// ─── DIAGNOSTIC: Per-Provider Error Boundary ───────────────────────────────
// Each provider is wrapped in its own error boundary so we can pinpoint
// EXACTLY which provider crashes and capture the full native stack trace.
interface SafeProviderState { error: Error | null; }
class SafeProviderBoundary extends React.Component<
  { name: string; children: React.ReactNode },
  SafeProviderState
> {
  constructor(props: { name: string; children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): SafeProviderState {
    return { error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    addBreadcrumb(`💀 CRASH in <${this.props.name}>: ${error.message}`);
    if (info.componentStack) {
      addBreadcrumb(`Component stack: ${info.componentStack.split('\n').slice(0, 5).join(' > ')}`);
    }
  }
  render() {
    if (this.state.error) {
      // Re-throw so the outer AppErrorBoundary catches it with full diagnostics
      throw this.state.error;
    }
    return this.props.children;
  }
}

// ─── DIAGNOSTIC: Native Module Probe ───────────────────────────────────────
// This component runs BEFORE any heavy provider and reports what native
// modules are actually available in the runtime.
function NativeModuleProbe() {
  try {
    addBreadcrumb('NativeModuleProbe: starting');
    
    // Check TurboModuleRegistry availability
    const TurboModuleRegistry = require('react-native').TurboModuleRegistry;
    addBreadcrumb(`TurboModuleRegistry exists: ${!!TurboModuleRegistry}`);
    
    // Probe if RNLlama TurboModule is registered
    let rnllamaModule = null;
    try {
      rnllamaModule = TurboModuleRegistry.get('RNLlama');
      addBreadcrumb(`RNLlama TurboModule: ${rnllamaModule ? 'FOUND' : 'null'}`);
      if (rnllamaModule) {
        addBreadcrumb(`RNLlama keys: ${Object.keys(rnllamaModule).slice(0, 8).join(',')}`);
      }
    } catch (e: any) {
      addBreadcrumb(`RNLlama TurboModule ERROR: ${e.message}`);
    }

    // Probe if whisper TurboModule is registered
    try {
      const rnwhisper = TurboModuleRegistry.get('RNWhisper');
      addBreadcrumb(`RNWhisper TurboModule: ${rnwhisper ? 'FOUND' : 'null'}`);
    } catch (e: any) {
      addBreadcrumb(`RNWhisper TurboModule ERROR: ${e.message}`);
    }

    // Check for JSI bindings on global
    const jsiKeys = ['llamaInitContext', 'whisperInitContext'].filter(
      k => typeof (global as any)[k] === 'function'
    );
    addBreadcrumb(`JSI globals found: ${jsiKeys.length > 0 ? jsiKeys.join(',') : 'NONE'}`);

    // Check Platform and arch info
    addBreadcrumb(`Platform: ${Platform.OS} ${Platform.Version}`);
    
    addBreadcrumb('NativeModuleProbe: complete');
  } catch (e: any) {
    addBreadcrumb(`NativeModuleProbe FATAL: ${e.message}`);
  }
  return null;
}
// ───────────────────────────────────────────────────────────────────────────

function TraceAppTheme() { addBreadcrumb('AppThemeProvider rendered'); return null; }
function TraceLanguage() { addBreadcrumb('LanguageProvider rendered'); return null; }
function TraceVoice() { addBreadcrumb('VoiceProvider rendered'); return null; }
function TraceMemory() { addBreadcrumb('MemoryProvider rendered'); return null; }
function TraceProfile() { addBreadcrumb('ProfileProvider rendered'); return null; }
function TraceLlm() { addBreadcrumb('LlmProvider rendered'); return null; }
function TraceRootThemeContainer() { addBreadcrumb('RootThemeContainer rendering'); return null; }

export default function RootLayout() {
  addBreadcrumb('RootLayout rendering');
  const [bootCrashLog, setBootCrashLog] = useState<string | null>(null);

  useEffect(() => {
    const checkCrashLog = async () => {
      try {
        const logPath = `${FileSystem.documentDirectory}boot_crash_log.txt`;
        const info = await FileSystem.getInfoAsync(logPath);
        if (info.exists) {
          const content = await FileSystem.readAsStringAsync(logPath, { encoding: FileSystem.EncodingType.UTF8 });
          setBootCrashLog(content);
        }
      } catch (e) {
        console.warn('Failed to check or read boot crash log:', e);
      }
    };
    checkCrashLog();
  }, []);

  const handleClearCrashLog = async () => {
    try {
      const logPath = `${FileSystem.documentDirectory}boot_crash_log.txt`;
      await FileSystem.deleteAsync(logPath, { idempotent: true });
      setBootCrashLog(null);
    } catch (e) {
      console.warn('Failed to clear boot crash log:', e);
      setBootCrashLog(null);
    }
  };

  if (bootCrashLog) {
    return (
      <View style={{ flex: 1, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <RNText style={{ color: '#B026FF', fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>AI Diary — Diagnostic Dashboard</RNText>
        <RNText style={{ color: '#ffffff', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
          The application crashed on the previous launch. Here is the debug log:
        </RNText>
        <RNText style={{ color: '#ff4444', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', padding: 12, backgroundColor: '#150505', borderRadius: 4, width: '100%', maxHeight: 350, overflow: 'scroll', marginBottom: 24 }}>
          {bootCrashLog}
        </RNText>
        <TouchableOpacity 
          onPress={handleClearCrashLog}
          style={{ backgroundColor: '#B026FF', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 }}
        >
          <RNText style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold' }}>Clear Log & Restart App</RNText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppThemeProvider>
          <TraceAppTheme />
          <SafeProviderBoundary name="LanguageProvider">
            <LanguageProvider>
              <TraceLanguage />
              <NativeModuleProbe />
              <AppErrorBoundary>
                <SafeProviderBoundary name="VoiceProvider">
                  <VoiceProvider>
                    <TraceVoice />
                    <SafeProviderBoundary name="MemoryProvider">
                      <MemoryProvider>
                        <TraceMemory />
                        <SafeProviderBoundary name="ProfileProvider">
                          <ProfileProvider>
                            <TraceProfile />
                            <SafeProviderBoundary name="LlmProvider">
                              <LlmProvider>
                                <TraceLlm />
                                <TraceRootThemeContainer />
                                <RootThemeContainer />
                                <GlobalDownloadBanner />
                              </LlmProvider>
                            </SafeProviderBoundary>
                          </ProfileProvider>
                        </SafeProviderBoundary>
                      </MemoryProvider>
                    </SafeProviderBoundary>
                  </VoiceProvider>
                </SafeProviderBoundary>
              </AppErrorBoundary>
            </LanguageProvider>
          </SafeProviderBoundary>
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

