# 🧠 AI-Diary — Codebase RAG-DB
> Generated: 2026-07-20T22:59:06.044149 | Total Files: 142 | Communities: 36

## 📜 Historical Context & Instructions
> For historical design decisions, latest major changes, or developer context, ALWAYS refer to:
> `DOCS/Chris' Instructions.md` or git history. This markdown contains the most recent application states and intentions.

## 🚀 Recommended Architectural Improvements
> **1. Split High-Frequency States in LlmContext:** Separate streaming/download progress (high-frequency) from active model/configuration states (stable) to prevent global app re-renders during active downloads/generation.
> **2. SQLite Batch Transaction:** Wrap multiple inserts/updates in `KnowledgeGraphService.ts` within a transaction to boost writing performance and prevent file-locking delay on mobile devices.

## 🏆 Native Voice Acceleration Architecture
- **JSI Bridge:** Direct injection via `global.animaFeedAudioChunk(arrayBuffer)` and `global.animaInterruptAudio()`.
- **Oboe Audio Engine (C++):** Writes 24kHz float32 PCM straight to the Android audio hardware bypassing Expo AV.
- **Gapless Native TTS:** Android `TextToSpeech` API generates WAV locally, we strip the 44-byte header and stream the pure Uint8Array directly into the C++ `LockFreeRingBuffer`.
- **Zero-Latency:** Translates base64 chunks directly to Float32Array in JS memory and pushes them instantly via JSI.

## Community 0
### Files
- `babel.config.js` (file, 0KB)

### Internal Dependencies
- None

---

## Community 1
### Files
- `eslint.config.js` (file, 0KB)

### Internal Dependencies
- None

---

## Community 2
### Files
- `index.js` (file, 2KB)

### Internal Dependencies
- None

---

## Community 3
### Files
- `NATIVE_MODULE_BugReporting` (native_bridge, 0KB)
- `NATIVE_MODULE_EXDevLauncher` (native_bridge, 0KB)
- `NATIVE_MODULE_EXReactNativeEventEmitter` (native_bridge, 0KB)
- `NATIVE_MODULE_ExpoModulesCore` (native_bridge, 0KB)
- `NATIVE_MODULE_ExpoRandom` (native_bridge, 0KB)
- `NATIVE_MODULE_ExponentKernel` (native_bridge, 0KB)
- `NATIVE_MODULE_NativeUnimoduleProxy` (native_bridge, 0KB)
- `NATIVE_MODULE_PdfToImageModule` (native_bridge, 0KB)
- `NATIVE_MODULE_PlatformConstants` (native_bridge, 0KB)
- `NATIVE_MODULE_RNDeviceInfo` (native_bridge, 0KB)
- `NATIVE_MODULE_RNGetRandomValues` (native_bridge, 0KB)
- `NATIVE_MODULE_RNLiveAudioStream` (native_bridge, 0KB)
- `NATIVE_MODULE_RNVectorIconsManager` (native_bridge, 0KB)
- `NATIVE_MODULE_RNVectorIconsModule` (native_bridge, 0KB)
- `NATIVE_MODULE_UIManager` (native_bridge, 0KB)
- `NATIVE_MODULE_push` (native_bridge, 0KB)
- `ios-bundle-minified.js` (file, 4202KB)
- `ios-bundle-readable-fresh.js` (file, 9362KB)
- `ios-bundle-readable.js` (file, 9362KB)

### Internal Dependencies
- `ios-bundle-minified.js` → `NATIVE_MODULE_EXDevLauncher`
- `ios-bundle-minified.js` → `NATIVE_MODULE_EXReactNativeEventEmitter`
- `ios-bundle-minified.js` → `NATIVE_MODULE_ExpoModulesCore`
- `ios-bundle-minified.js` → `NATIVE_MODULE_ExponentKernel`
- `ios-bundle-minified.js` → `NATIVE_MODULE_NativeUnimoduleProxy`
- `ios-bundle-minified.js` → `NATIVE_MODULE_PdfToImageModule`
- `ios-bundle-minified.js` → `NATIVE_MODULE_PlatformConstants`
- `ios-bundle-minified.js` → `NATIVE_MODULE_RNDeviceInfo`
- `ios-bundle-minified.js` → `NATIVE_MODULE_RNLiveAudioStream`
- `ios-bundle-minified.js` → `NATIVE_MODULE_RNVectorIconsManager`
- `ios-bundle-minified.js` → `NATIVE_MODULE_RNVectorIconsModule`
- `ios-bundle-minified.js` → `NATIVE_MODULE_push`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_BugReporting`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_EXDevLauncher`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_EXReactNativeEventEmitter`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_ExpoModulesCore`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_ExpoRandom`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_ExponentKernel`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_NativeUnimoduleProxy`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_PdfToImageModule`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_PlatformConstants`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_RNDeviceInfo`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_RNGetRandomValues`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_RNLiveAudioStream`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_RNVectorIconsManager`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_RNVectorIconsModule`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_UIManager`
- `ios-bundle-readable-fresh.js` → `NATIVE_MODULE_push`
- `ios-bundle-readable.js` → `NATIVE_MODULE_BugReporting`
- `ios-bundle-readable.js` → `NATIVE_MODULE_EXDevLauncher`
- `ios-bundle-readable.js` → `NATIVE_MODULE_EXReactNativeEventEmitter`
- `ios-bundle-readable.js` → `NATIVE_MODULE_ExpoModulesCore`
- `ios-bundle-readable.js` → `NATIVE_MODULE_ExpoRandom`
- `ios-bundle-readable.js` → `NATIVE_MODULE_ExponentKernel`
- `ios-bundle-readable.js` → `NATIVE_MODULE_NativeUnimoduleProxy`
- `ios-bundle-readable.js` → `NATIVE_MODULE_PdfToImageModule`
- `ios-bundle-readable.js` → `NATIVE_MODULE_PlatformConstants`
- `ios-bundle-readable.js` → `NATIVE_MODULE_RNDeviceInfo`
- `ios-bundle-readable.js` → `NATIVE_MODULE_RNGetRandomValues`
- `ios-bundle-readable.js` → `NATIVE_MODULE_RNLiveAudioStream`
- `ios-bundle-readable.js` → `NATIVE_MODULE_RNVectorIconsManager`
- `ios-bundle-readable.js` → `NATIVE_MODULE_RNVectorIconsModule`
- `ios-bundle-readable.js` → `NATIVE_MODULE_UIManager`
- `ios-bundle-readable.js` → `NATIVE_MODULE_push`

---

## Community 4
### Files
- `metro.config.js` (file, 0KB)

### Internal Dependencies
- None

---

## Community 5
### Files
- `react-native.config.js` (file, 0KB)

### Internal Dependencies
- None

---

## Community 6
### Files
- `android/app/src/main/java/com/christeck/aidiary/LlmForegroundService.kt` (service, 2KB)

### Internal Dependencies
- None

---

## Community 7
### Files
- `android/app/src/main/java/com/christeck/aidiary/LlmProtectionModule.kt` (native, 1KB)

### Internal Dependencies
- None

---

## Community 8
### Files
- `android/app/src/main/java/com/christeck/aidiary/LlmProtectionPackage.kt` (native, 0KB)

### Internal Dependencies
- None

---

## Community 9
### Files
- `android/app/src/main/java/com/christeck/aidiary/MainActivity.kt` (native, 2KB)

### Internal Dependencies
- None

---

## Community 10
### Files
- `android/app/src/main/java/com/christeck/aidiary/MainApplication.kt` (native, 2KB)

### Internal Dependencies
- None

---

## Community 11
### Files
- `android/app/src/main/java/com/christeck/aidiary/PdfToImageModule.kt` (native, 7KB)

### Internal Dependencies
- None

---

## Community 12
### Files
- `android/app/src/main/java/com/christeck/aidiary/PdfToImagePackage.kt` (native, 0KB)

### Internal Dependencies
- None

---

## Community 13
### Files
- `android/react-settings-plugin/bin/main/expo/plugins/ReactSettingsPlugin.kt` (native, 0KB)

### Internal Dependencies
- None

---

## Community 14
### Files
- `android/react-settings-plugin/src/main/kotlin/expo/plugins/ReactSettingsPlugin.kt` (native, 0KB)

### Internal Dependencies
- None

---

## Community 15
### Files
- `app/(tabs)/_layout.tsx` (file, 2KB)
- `app/(tabs)/projects.tsx` (file, 78KB)
- `app/(tabs)/self-know.tsx` (file, 55KB)
- `app/(tabs)/settings.tsx` (file, 90KB)
- `app/(tabs)/tools.tsx` (file, 76KB)
- `app/_layout.tsx` (file, 16KB)
- `components/GlobalDownloadBanner.tsx` (component, 7KB)
- `components/MemoryProvider.tsx` (component, 2KB)
- `components/SanctuaryHeader.tsx` (component, 9KB)
- `components/SanctuaryUI.tsx` (component, 4KB)
- `components/SentinelTraceBuffer.tsx` (component, 4KB)
- `components/haptic-tab.tsx` (component, 0KB)
- `components/modals/ProfileModal.tsx` (component, 9KB)
- `components/modals/PsyTestContent.ts` (component, 38KB)
- `components/modals/PsyTestModal.tsx` (component, 125KB)
- `components/ui/PsiIcon.tsx` (component, 0KB)
- `constants/Themes.ts` (file, 1KB)
- `contexts/LanguageContext.tsx` (context, 10KB)
- `contexts/LlmContext.tsx` (context, 6KB)
- `contexts/ProfileContext.tsx` (context, 3KB)
- `contexts/ThemeContext.tsx` (context, 1KB)
- `contexts/VoiceContext.tsx` (context, 1KB)
- `hooks/useBadgeTracker.ts` (hook, 1KB)

### Internal Dependencies
- `app/(tabs)/_layout.tsx` → `components/haptic-tab.tsx`
- `app/(tabs)/_layout.tsx` → `components/ui/PsiIcon.tsx`
- `app/(tabs)/_layout.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/_layout.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/projects.tsx` → `components/SanctuaryHeader.tsx`
- `app/(tabs)/projects.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/projects.tsx` → `contexts/LlmContext.tsx`
- `app/(tabs)/projects.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/projects.tsx` → `hooks/useBadgeTracker.ts`
- `app/(tabs)/self-know.tsx` → `components/SanctuaryHeader.tsx`
- `app/(tabs)/self-know.tsx` → `components/modals/PsyTestContent.ts`
- `app/(tabs)/self-know.tsx` → `components/modals/PsyTestModal.tsx`
- `app/(tabs)/self-know.tsx` → `components/ui/PsiIcon.tsx`
- `app/(tabs)/self-know.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/self-know.tsx` → `contexts/LlmContext.tsx`
- `app/(tabs)/self-know.tsx` → `contexts/ProfileContext.tsx`
- `app/(tabs)/self-know.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/self-know.tsx` → `hooks/useBadgeTracker.ts`
- `app/(tabs)/settings.tsx` → `components/MemoryProvider.tsx`
- `app/(tabs)/settings.tsx` → `components/SanctuaryHeader.tsx`
- `app/(tabs)/settings.tsx` → `components/SanctuaryUI.tsx`
- `app/(tabs)/settings.tsx` → `constants/Themes.ts`
- `app/(tabs)/settings.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/settings.tsx` → `contexts/LlmContext.tsx`
- `app/(tabs)/settings.tsx` → `contexts/ProfileContext.tsx`
- `app/(tabs)/settings.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/settings.tsx` → `contexts/VoiceContext.tsx`
- `app/(tabs)/settings.tsx` → `hooks/useBadgeTracker.ts`
- `app/(tabs)/tools.tsx` → `components/SanctuaryHeader.tsx`
- `app/(tabs)/tools.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/tools.tsx` → `contexts/LlmContext.tsx`
- `app/(tabs)/tools.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/tools.tsx` → `contexts/VoiceContext.tsx`
- `app/(tabs)/tools.tsx` → `hooks/useBadgeTracker.ts`
- `app/_layout.tsx` → `components/GlobalDownloadBanner.tsx`
- `app/_layout.tsx` → `components/MemoryProvider.tsx`
- `app/_layout.tsx` → `contexts/LanguageContext.tsx`
- `app/_layout.tsx` → `contexts/LlmContext.tsx`
- `app/_layout.tsx` → `contexts/ProfileContext.tsx`
- `app/_layout.tsx` → `contexts/ThemeContext.tsx`
- `app/_layout.tsx` → `contexts/VoiceContext.tsx`
- `components/GlobalDownloadBanner.tsx` → `contexts/LanguageContext.tsx`
- `components/GlobalDownloadBanner.tsx` → `contexts/LlmContext.tsx`
- `components/GlobalDownloadBanner.tsx` → `contexts/ThemeContext.tsx`
- `components/SanctuaryHeader.tsx` → `components/MemoryProvider.tsx`
- `components/SanctuaryHeader.tsx` → `contexts/LanguageContext.tsx`
- `components/SanctuaryHeader.tsx` → `contexts/LlmContext.tsx`
- `components/SanctuaryHeader.tsx` → `contexts/ThemeContext.tsx`
- `components/SanctuaryUI.tsx` → `constants/Themes.ts`
- `components/SanctuaryUI.tsx` → `contexts/LanguageContext.tsx`
- `components/SentinelTraceBuffer.tsx` → `components/MemoryProvider.tsx`
- `components/modals/ProfileModal.tsx` → `components/modals/PsyTestModal.tsx`
- `components/modals/ProfileModal.tsx` → `contexts/ProfileContext.tsx`
- `components/modals/PsyTestModal.tsx` → `components/modals/PsyTestContent.ts`
- `contexts/LlmContext.tsx` → `contexts/LanguageContext.tsx`
- `contexts/ProfileContext.tsx` → `components/MemoryProvider.tsx`
- `contexts/ThemeContext.tsx` → `constants/Themes.ts`
- `contexts/VoiceContext.tsx` → `contexts/LanguageContext.tsx`
- `hooks/useBadgeTracker.ts` → `contexts/LanguageContext.tsx`
- `hooks/useBadgeTracker.ts` → `contexts/VoiceContext.tsx`

---

## Community 16
### Files
- `components/modals/mbtiData.ts` (component, 56KB)

### Internal Dependencies
- None

---

## Community 17
### Files
- `app/(tabs)/index.tsx` (file, 69KB)
- `components/ChatInputBar.tsx` (component, 18KB)
- `components/VisionDownloadModal.tsx` (component, 3KB)
- `components/VoiceNoteOverlay.tsx` (component, 7KB)
- `components/modals/BookReaderModal.tsx` (component, 21KB)
- `components/modals/IntroModal.tsx` (component, 15KB)
- `components/modals/VaultExplorerModal.tsx` (component, 11KB)
- `components/modals/VoiceOverlay.tsx` (component, 14KB)
- `components/ui/CognitiveNode.tsx` (component, 3KB)
- `components/ui/MarqueeText.tsx` (component, 1KB)
- `components/ui/MessageItem.tsx` (component, 13KB)
- `components/ui/WhispAvatar.tsx` (component, 16KB)
- `components/ui/icon-symbol.tsx` (component, 3KB)
- `constants/NeuralConstants.ts` (file, 2KB)
- `hooks/useInteractiveVoice.ts` (hook, 23KB)
- `hooks/useSafeState.ts` (hook, 0KB)
- `hooks/useVoice.ts` (hook, 45KB)
- `lib/CloudTTSService.ts` (service, 10KB)
- `lib/SettingsService.ts` (service, 3KB)
- `lib/SpeechFilter.ts` (service, 8KB)
- `lib/TTSSanitizer.ts` (service, 4KB)
- `lib/UnifiedMicService.ts` (service, 12KB)
- `lib/WisdomService.ts` (service, 4KB)
- `lib/chatBridge.ts` (service, 0KB)
- `lib/vault.ts` (service, 8KB)
- `modules/anima-voice/src/AnimaVoiceModule.ts` (file, 0KB)

### Internal Dependencies
- `app/(tabs)/index.tsx` → `components/ChatInputBar.tsx`
- `app/(tabs)/index.tsx` → `components/VoiceNoteOverlay.tsx`
- `app/(tabs)/index.tsx` → `components/modals/VoiceOverlay.tsx`
- `app/(tabs)/index.tsx` → `components/ui/CognitiveNode.tsx`
- `app/(tabs)/index.tsx` → `components/ui/MarqueeText.tsx`
- `app/(tabs)/index.tsx` → `components/ui/MessageItem.tsx`
- `app/(tabs)/index.tsx` → `components/ui/WhispAvatar.tsx`
- `app/(tabs)/index.tsx` → `components/ui/icon-symbol.tsx`
- `app/(tabs)/index.tsx` → `constants/NeuralConstants.ts`
- `app/(tabs)/index.tsx` → `hooks/useInteractiveVoice.ts`
- `app/(tabs)/index.tsx` → `hooks/useVoice.ts`
- `app/(tabs)/index.tsx` → `lib/SettingsService.ts`
- `app/(tabs)/index.tsx` → `lib/SpeechFilter.ts`
- `app/(tabs)/index.tsx` → `lib/UnifiedMicService.ts`
- `app/(tabs)/index.tsx` → `lib/chatBridge.ts`
- `app/(tabs)/index.tsx` → `lib/vault.ts`
- `components/ChatInputBar.tsx` → `components/ui/icon-symbol.tsx`
- `components/ChatInputBar.tsx` → `constants/NeuralConstants.ts`
- `components/VisionDownloadModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/VoiceNoteOverlay.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/BookReaderModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/BookReaderModal.tsx` → `lib/CloudTTSService.ts`
- `components/modals/BookReaderModal.tsx` → `lib/SettingsService.ts`
- `components/modals/IntroModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/VaultExplorerModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/VaultExplorerModal.tsx` → `lib/vault.ts`
- `components/modals/VoiceOverlay.tsx` → `components/ui/icon-symbol.tsx`
- `components/ui/CognitiveNode.tsx` → `components/ui/icon-symbol.tsx`
- `components/ui/MessageItem.tsx` → `components/ui/CognitiveNode.tsx`
- `components/ui/MessageItem.tsx` → `components/ui/icon-symbol.tsx`
- `hooks/useInteractiveVoice.ts` → `hooks/useSafeState.ts`
- `hooks/useInteractiveVoice.ts` → `hooks/useVoice.ts`
- `hooks/useInteractiveVoice.ts` → `lib/SettingsService.ts`
- `hooks/useInteractiveVoice.ts` → `lib/SpeechFilter.ts`
- `hooks/useInteractiveVoice.ts` → `lib/UnifiedMicService.ts`
- `hooks/useVoice.ts` → `hooks/useSafeState.ts`
- `hooks/useVoice.ts` → `lib/CloudTTSService.ts`
- `hooks/useVoice.ts` → `lib/SettingsService.ts`
- `hooks/useVoice.ts` → `lib/SpeechFilter.ts`
- `hooks/useVoice.ts` → `lib/TTSSanitizer.ts`
- `hooks/useVoice.ts` → `lib/UnifiedMicService.ts`
- `hooks/useVoice.ts` → `modules/anima-voice/src/AnimaVoiceModule.ts`
- `lib/CloudTTSService.ts` → `lib/TTSSanitizer.ts`
- `lib/WisdomService.ts` → `lib/SettingsService.ts`

---

## Community 18
### Files
- `components/ui/SnowflakeChart.tsx` (component, 3KB)

### Internal Dependencies
- None

---

## Community 19
### Files
- `hooks/use-color-scheme.ts` (hook, 0KB)

### Internal Dependencies
- None

---

## Community 20
### Files
- `components/MatrixRain.tsx` (component, 4KB)
- `components/ModelLoaderPanel.tsx` (component, 10KB)
- `components/modals/OnboardingModal.tsx` (component, 28KB)
- `hooks/useAgentEngine.ts` (hook, 40KB)
- `hooks/useAppLlm.ts` (hook, 53KB)
- `hooks/useCircadianCycle.ts` (hook, 0KB)
- `hooks/useDocumentProcessor.ts` (hook, 10KB)
- `lib/CPUSemaphore.ts` (service, 2KB)
- `lib/DatabaseService.ts` (service, 1KB)
- `lib/Logger.ts` (service, 0KB)
- `lib/MemoryManager.ts` (service, 3KB)
- `lib/PromptService.ts` (service, 9KB)
- `lib/RAMGuard.ts` (service, 6KB)
- `lib/SemanticService.ts` (service, 2KB)
- `lib/hardware.ts` (service, 2KB)
- `lib/systemPrompt.ts` (service, 14KB)
- `src/config/ModelConfig.ts` (file, 5KB)
- `types/index.ts` (file, 0KB)

### Internal Dependencies
- `components/MatrixRain.tsx` → `hooks/useCircadianCycle.ts`
- `components/MatrixRain.tsx` → `lib/MemoryManager.ts`
- `components/ModelLoaderPanel.tsx` → `hooks/useAppLlm.ts`
- `components/ModelLoaderPanel.tsx` → `src/config/ModelConfig.ts`
- `components/modals/OnboardingModal.tsx` → `hooks/useAppLlm.ts`
- `components/modals/OnboardingModal.tsx` → `lib/PromptService.ts`
- `components/modals/OnboardingModal.tsx` → `lib/RAMGuard.ts`
- `components/modals/OnboardingModal.tsx` → `lib/hardware.ts`
- `components/modals/OnboardingModal.tsx` → `src/config/ModelConfig.ts`
- `hooks/useAgentEngine.ts` → `hooks/useAppLlm.ts`
- `hooks/useAgentEngine.ts` → `hooks/useDocumentProcessor.ts`
- `hooks/useAgentEngine.ts` → `lib/DatabaseService.ts`
- `hooks/useAgentEngine.ts` → `lib/Logger.ts`
- `hooks/useAgentEngine.ts` → `lib/PromptService.ts`
- `hooks/useAgentEngine.ts` → `lib/SemanticService.ts`
- `hooks/useAgentEngine.ts` → `lib/hardware.ts`
- `hooks/useAgentEngine.ts` → `lib/systemPrompt.ts`
- `hooks/useAgentEngine.ts` → `src/config/ModelConfig.ts`
- `hooks/useAgentEngine.ts` → `types/index.ts`
- `hooks/useAppLlm.ts` → `lib/CPUSemaphore.ts`
- `hooks/useAppLlm.ts` → `lib/MemoryManager.ts`
- `hooks/useAppLlm.ts` → `lib/RAMGuard.ts`
- `hooks/useAppLlm.ts` → `lib/hardware.ts`
- `hooks/useAppLlm.ts` → `src/config/ModelConfig.ts`
- `hooks/useDocumentProcessor.ts` → `lib/PromptService.ts`
- `hooks/useDocumentProcessor.ts` → `lib/hardware.ts`
- `lib/MemoryManager.ts` → `lib/hardware.ts`
- `lib/PromptService.ts` → `hooks/useAppLlm.ts`
- `lib/PromptService.ts` → `lib/systemPrompt.ts`
- `lib/PromptService.ts` → `types/index.ts`

---

## Community 21
### Files
- `lib/ContextFoldingService.ts` (service, 4KB)

### Internal Dependencies
- None

---

## Community 22
### Files
- `components/ui/InteractiveCalendar.tsx` (component, 21KB)
- `db/badgeSchema.ts` (schema, 2KB)
- `db/calendarSchema.ts` (schema, 0KB)
- `db/knowledgeGraphSchema.ts` (schema, 3KB)
- `db/recurringTasksSchema.ts` (schema, 1KB)
- `db/syntacticMemorySchema.ts` (schema, 5KB)
- `db/todoSchema.ts` (schema, 0KB)
- `hooks/useAnimaScanner.ts` (hook, 3KB)
- `hooks/useCalendar.ts` (hook, 1KB)
- `hooks/useTodos.ts` (hook, 1KB)
- `lib/BadgeService.ts` (service, 3KB)
- `lib/db.ts` (service, 7KB)

### Internal Dependencies
- `components/ui/InteractiveCalendar.tsx` → `hooks/useCalendar.ts`
- `hooks/useAnimaScanner.ts` → `hooks/useTodos.ts`
- `hooks/useCalendar.ts` → `db/calendarSchema.ts`
- `hooks/useTodos.ts` → `db/todoSchema.ts`
- `lib/BadgeService.ts` → `db/badgeSchema.ts`
- `lib/db.ts` → `db/badgeSchema.ts`
- `lib/db.ts` → `db/calendarSchema.ts`
- `lib/db.ts` → `db/knowledgeGraphSchema.ts`
- `lib/db.ts` → `db/recurringTasksSchema.ts`
- `lib/db.ts` → `db/syntacticMemorySchema.ts`
- `lib/db.ts` → `db/todoSchema.ts`

---

## Community 23
### Files
- `hooks/useFileAttachment.ts` (hook, 22KB)
- `lib/BraveLlmSearch.ts` (service, 5KB)
- `lib/IdentityRotator.ts` (service, 2KB)
- `lib/LibraryManagerService.ts` (service, 16KB)
- `lib/PdfToImage.ts` (service, 2KB)
- `lib/SentinelService.ts` (service, 16KB)
- `lib/TextUtils.ts` (service, 3KB)
- `lib/openlibrary.ts` (service, 1KB)
- `lib/tools.ts` (service, 2KB)
- `lib/wikipedia.ts` (service, 8KB)

### Internal Dependencies
- `hooks/useFileAttachment.ts` → `lib/PdfToImage.ts`
- `lib/BraveLlmSearch.ts` → `lib/IdentityRotator.ts`
- `lib/BraveLlmSearch.ts` → `lib/TextUtils.ts`
- `lib/LibraryManagerService.ts` → `lib/IdentityRotator.ts`
- `lib/LibraryManagerService.ts` → `lib/PdfToImage.ts`
- `lib/LibraryManagerService.ts` → `lib/TextUtils.ts`
- `lib/SentinelService.ts` → `lib/TextUtils.ts`
- `lib/openlibrary.ts` → `lib/IdentityRotator.ts`
- `lib/openlibrary.ts` → `lib/TextUtils.ts`
- `lib/tools.ts` → `lib/BraveLlmSearch.ts`
- `lib/tools.ts` → `lib/SentinelService.ts`
- `lib/tools.ts` → `lib/TextUtils.ts`
- `lib/tools.ts` → `lib/openlibrary.ts`
- `lib/tools.ts` → `lib/wikipedia.ts`
- `lib/wikipedia.ts` → `lib/IdentityRotator.ts`

---

## Community 24
### Files
- `lib/FactExtractionService.ts` (service, 5KB)
- `lib/KnowledgeGraphService.ts` (service, 8KB)
- `lib/KnowledgeManager.ts` (service, 3KB)
- `lib/LouvainCommunity.ts` (service, 4KB)
- `lib/grammars.ts` (service, 2KB)

### Internal Dependencies
- `lib/FactExtractionService.ts` → `lib/KnowledgeGraphService.ts`
- `lib/FactExtractionService.ts` → `lib/KnowledgeManager.ts`
- `lib/FactExtractionService.ts` → `lib/grammars.ts`
- `lib/KnowledgeGraphService.ts` → `lib/LouvainCommunity.ts`

---

## Community 25
### Files
- `modules/anima-voice/android/src/main/cpp/AudioPlayer.cpp` (native, 2KB)

### Internal Dependencies
- None

---

## Community 26
### Files
- `modules/anima-voice/android/src/main/cpp/AudioPlayer.h` (native, 2KB)

### Internal Dependencies
- None

---

## Community 27
### Files
- `modules/anima-voice/android/src/main/cpp/cpp-adapter.cpp` (native, 4KB)

### Internal Dependencies
- None

---

## Community 28
### Files
- `modules/anima-voice/android/src/main/cpp/VadProcessor.cpp` (native, 0KB)

### Internal Dependencies
- None

---

## Community 29
### Files
- `modules/anima-voice/android/src/main/cpp/VadProcessor.h` (native, 0KB)

### Internal Dependencies
- None

---

## Community 30
### Files
- `modules/anima-voice/android/src/main/java/com/christeck/animavoice/AnimaVoiceModule.kt` (native, 9KB)

### Internal Dependencies
- None

---

## Community 31
### Files
- `modules/anima-voice/src/AnimaVoice.types.ts` (file, 0KB)

### Internal Dependencies
- None

---

## Community 32
### Files
- `plugins/withIosCxxStandard.js` (file, 2KB)

### Internal Dependencies
- None

---

## Community 33
### Files
- `plugins/withIosEntitlements.js` (file, 1KB)

### Internal Dependencies
- None

---

## Community 34
### Files
- `plugins/withLlamaBuildFromSource.js` (file, 2KB)

### Internal Dependencies
- None

---

## Community 35
### Files
- `scripts/reset-project.js` (file, 3KB)

### Internal Dependencies
- None

---

## ⚠️ Integrity Alerts (Orphaned / Unconnected Nodes)
- 🔴 `android/app/src/main/java/com/christeck/aidiary/LlmForegroundService.kt` — 0 connections
- 🔴 `android/app/src/main/java/com/christeck/aidiary/LlmProtectionModule.kt` — 0 connections
- 🔴 `android/app/src/main/java/com/christeck/aidiary/LlmProtectionPackage.kt` — 0 connections
- 🔴 `android/app/src/main/java/com/christeck/aidiary/PdfToImageModule.kt` — 0 connections
- 🔴 `android/app/src/main/java/com/christeck/aidiary/PdfToImagePackage.kt` — 0 connections
- 🔴 `android/react-settings-plugin/bin/main/expo/plugins/ReactSettingsPlugin.kt` — 0 connections
- 🔴 `android/react-settings-plugin/src/main/kotlin/expo/plugins/ReactSettingsPlugin.kt` — 0 connections
- 🔴 `components/modals/mbtiData.ts` — 0 connections
- 🔴 `components/ui/SnowflakeChart.tsx` — 0 connections
- 🔴 `hooks/use-color-scheme.ts` — 0 connections
- 🔴 `lib/ContextFoldingService.ts` — 0 connections