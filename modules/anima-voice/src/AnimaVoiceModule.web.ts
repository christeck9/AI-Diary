import { createWebModule, NativeModule } from 'expo-modules-core';

// AnimaVoiceModule is not available on the web platform.
class AnimaVoiceModule extends NativeModule<{}> {}

export default createWebModule(AnimaVoiceModule);
