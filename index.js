import 'react-native-get-random-values';
import { TurboModuleRegistry, LogBox } from 'react-native';
import Constants from 'expo-constants';

LogBox.ignoreLogs([
  'transcribeRealtime', 
  'Looks like you have configured linking in multiple places'
]);

// 🛡️ RNWhisper Safety Shim (Prevents app crashes in Expo Go or Web environments)
try {
  const originalGet = TurboModuleRegistry.get;
  TurboModuleRegistry.get = (name) => {
    if (name === 'RNWhisper') {
      const nativeMod = originalGet(name);
      if (!nativeMod) {
        console.log('[Shim] RNWhisper native module is missing. Injecting dummy mock.');
        return {
          getConstants: () => ({ useCoreML: false, coreMLAllowFallback: false }),
          toggleNativeLog: async () => {},
          installJSIBindings: async () => ({ success: false }),
          initContext: async () => ({ contextPtr: 0, contextId: 0, gpu: false, reasonNoGPU: 'Mock' }),
          releaseContext: async () => {},
          releaseAllContexts: async () => {},
          transcribeFile: async () => ({ result: '', language: '', segments: [], isAborted: false }),
          transcribeData: async () => ({ result: '', language: '', segments: [], isAborted: false }),
          startRealtimeTranscribe: async () => {},
          abortTranscribe: async () => {},
          bench: async () => '{}',
          initVadContext: async () => ({ contextId: 0, gpu: false, reasonNoGPU: 'Mock' }),
          releaseVadContext: async () => {},
          releaseAllVadContexts: async () => {},
          vadDetectSpeech: async () => [],
          vadDetectSpeechFile: async () => [],
        };
      }
      return nativeMod;
    }
    return originalGet(name);
  };
} catch (e) {
  console.warn('[Shim] Failed to install RNWhisper TurboModuleRegistry shim:', e);
}

// Runtime shim to prevent Expo Linking "scheme" missing crash on bare React Native builds
try {
  if (Constants && Object.isExtensible(Constants)) {
    if (!Constants.expoConfig) {
      Object.defineProperty(Constants, 'expoConfig', {
        value: { scheme: 'sanctuary' },
        writable: true,
        configurable: true,
        enumerable: true
      });
    } else if (Constants.expoConfig && !Constants.expoConfig.scheme && Object.isExtensible(Constants.expoConfig)) {
      Object.defineProperty(Constants.expoConfig, 'scheme', {
        value: 'sanctuary',
        writable: true,
        configurable: true,
        enumerable: true
      });
    }
  }
} catch (e) {
  console.warn('[Shim] Failed to inject scheme into expo-constants:', e);
}

// Proceed to official Expo Entry Point
import 'expo-router/entry';



