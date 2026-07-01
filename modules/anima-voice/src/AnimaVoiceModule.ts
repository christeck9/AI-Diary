import { NativeModule, requireNativeModule } from 'expo-modules-core';

declare class AnimaVoiceModule extends NativeModule<{}> {
  synthesizeNativeToPCM(text: string, lang: string): Promise<Uint8Array>;
}

export default requireNativeModule<AnimaVoiceModule>('AnimaVoice');
