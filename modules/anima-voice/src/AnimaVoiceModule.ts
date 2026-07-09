import { NativeModule, requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

declare class AnimaVoiceModule extends NativeModule<{}> {
  synthesizeNativeToPCM(text: string, lang: string): Promise<Uint8Array>;
  uninstallJSI(): Promise<void>;
}

// Escudo para iOS: Retornamos un mock si la plataforma es iOS para evitar crashes
export default Platform.OS === 'ios'
  ? {
      synthesizeNativeToPCM: async () => new Uint8Array(),
      uninstallJSI: async () => {},
    } as unknown as AnimaVoiceModule
  : requireNativeModule<AnimaVoiceModule>('AnimaVoice');
