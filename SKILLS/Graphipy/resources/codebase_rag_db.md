# 🧠 AI-Diary — Codebase RAG-DB
> Generated: 2026-07-10T00:34:51.527048 | Total Files: 119 | Communities: 34

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
- `metro.config.js` (file, 0KB)

### Internal Dependencies
- None

---

## Community 4
### Files
- `react-native.config.js` (file, 0KB)

### Internal Dependencies
- None

---

## Community 5
### Files
- `android/app/src/main/java/com/christeck/aidiary/LlmForegroundService.kt` (service, 2KB)

### Internal Dependencies
- None

---

## Community 6
### Files
- `android/app/src/main/java/com/christeck/aidiary/LlmProtectionModule.kt` (native, 1KB)

### Internal Dependencies
- None

---

## Community 7
### Files
- `android/app/src/main/java/com/christeck/aidiary/LlmProtectionPackage.kt` (native, 0KB)

### Internal Dependencies
- None

---

## Community 8
### Files
- `android/app/src/main/java/com/christeck/aidiary/MainActivity.kt` (native, 2KB)

### Internal Dependencies
- None

---

## Community 9
### Files
- `android/app/src/main/java/com/christeck/aidiary/MainApplication.kt` (native, 2KB)

### Internal Dependencies
- None

---

## Community 10
### Files
- `android/app/src/main/java/com/christeck/aidiary/PdfToImageModule.kt` (native, 7KB)

### Internal Dependencies
- None

---

## Community 11
### Files
- `android/app/src/main/java/com/christeck/aidiary/PdfToImagePackage.kt` (native, 0KB)

### Internal Dependencies
- None

---

## Community 12
### Files
- `android/react-settings-plugin/bin/main/expo/plugins/ReactSettingsPlugin.kt` (native, 0KB)

### Internal Dependencies
- None

---

## Community 13
### Files
- `android/react-settings-plugin/src/main/kotlin/expo/plugins/ReactSettingsPlugin.kt` (native, 0KB)

### Internal Dependencies
- None

---

## Community 14
### Files
- `app/(tabs)/_layout.tsx` (file, 2KB)
- `app/(tabs)/projects.tsx` (file, 71KB)
- `app/(tabs)/self-know.tsx` (file, 42KB)
- `app/(tabs)/settings.tsx` (file, 89KB)
- `app/(tabs)/tools.tsx` (file, 76KB)
- `app/_layout.tsx` (file, 4KB)
- `components/GlobalDownloadBanner.tsx` (component, 7KB)
- `components/MemoryProvider.tsx` (component, 2KB)
- `components/SanctuaryHeader.tsx` (component, 7KB)
- `components/SentinelTraceBuffer.tsx` (component, 4KB)
- `components/haptic-tab.tsx` (component, 0KB)
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
- `app/(tabs)/self-know.tsx` → `components/ui/PsiIcon.tsx`
- `app/(tabs)/self-know.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/self-know.tsx` → `contexts/LlmContext.tsx`
- `app/(tabs)/self-know.tsx` → `contexts/ProfileContext.tsx`
- `app/(tabs)/self-know.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/self-know.tsx` → `hooks/useBadgeTracker.ts`
- `app/(tabs)/settings.tsx` → `components/MemoryProvider.tsx`
- `app/(tabs)/settings.tsx` → `components/SanctuaryHeader.tsx`
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
- `components/SanctuaryHeader.tsx` → `contexts/LanguageContext.tsx`
- `components/SanctuaryHeader.tsx` → `contexts/LlmContext.tsx`
- `components/SanctuaryHeader.tsx` → `contexts/ThemeContext.tsx`
- `components/SentinelTraceBuffer.tsx` → `components/MemoryProvider.tsx`
- `contexts/LlmContext.tsx` → `contexts/LanguageContext.tsx`
- `contexts/ProfileContext.tsx` → `components/MemoryProvider.tsx`
- `contexts/ThemeContext.tsx` → `constants/Themes.ts`
- `contexts/VoiceContext.tsx` → `contexts/LanguageContext.tsx`
- `hooks/useBadgeTracker.ts` → `contexts/LanguageContext.tsx`
- `hooks/useBadgeTracker.ts` → `contexts/VoiceContext.tsx`

---

## Community 15
### Files
- `components/MatrixRain.tsx` (component, 4KB)
- `components/ModelLoaderPanel.tsx` (component, 9KB)
- `components/SanctuaryUI.tsx` (component, 4KB)
- `components/modals/OnboardingModal.tsx` (component, 27KB)
- `hooks/useAgentEngine.ts` (hook, 38KB)
- `hooks/useAppLlm.ts` (hook, 52KB)
- `hooks/useCircadianCycle.ts` (hook, 0KB)
- `hooks/useDocumentProcessor.ts` (hook, 10KB)
- `lib/CPUSemaphore.ts` (service, 2KB)
- `lib/DatabaseService.ts` (service, 1KB)
- `lib/Logger.ts` (service, 0KB)
- `lib/MemoryManager.ts` (service, 3KB)
- `lib/PromptService.ts` (service, 8KB)
- `lib/RAMGuard.ts` (service, 6KB)
- `lib/SemanticService.ts` (service, 2KB)
- `lib/hardware.ts` (service, 2KB)
- `lib/systemPrompt.ts` (service, 14KB)
- `src/config/ModelConfig.ts` (file, 5KB)
- `types/index.ts` (file, 0KB)

### Internal Dependencies
- `components/MatrixRain.tsx` → `hooks/useCircadianCycle.ts`
- `components/MatrixRain.tsx` → `lib/MemoryManager.ts`
- `components/ModelLoaderPanel.tsx` → `components/SanctuaryUI.tsx`
- `components/ModelLoaderPanel.tsx` → `hooks/useAppLlm.ts`
- `components/ModelLoaderPanel.tsx` → `src/config/ModelConfig.ts`
- `components/modals/OnboardingModal.tsx` → `components/SanctuaryUI.tsx`
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

## Community 16
### Files
- `components/VisionDownloadModal.tsx` (component, 3KB)
- `components/VoiceNoteOverlay.tsx` (component, 7KB)
- `components/modals/IntroModal.tsx` (component, 15KB)
- `components/modals/ProfileModal.tsx` (component, 9KB)
- `components/modals/PsyTestModal.tsx` (component, 60KB)
- `components/modals/VaultExplorerModal.tsx` (component, 11KB)
- `components/modals/VoiceOverlay.tsx` (component, 14KB)
- `components/ui/CognitiveNode.tsx` (component, 3KB)
- `components/ui/MessageItem.tsx` (component, 12KB)
- `components/ui/icon-symbol.tsx` (component, 3KB)
- `lib/vault.ts` (service, 8KB)

### Internal Dependencies
- `components/VisionDownloadModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/VoiceNoteOverlay.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/IntroModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/ProfileModal.tsx` → `components/modals/PsyTestModal.tsx`
- `components/modals/ProfileModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/PsyTestModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/VaultExplorerModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/VaultExplorerModal.tsx` → `lib/vault.ts`
- `components/modals/VoiceOverlay.tsx` → `components/ui/icon-symbol.tsx`
- `components/ui/CognitiveNode.tsx` → `components/ui/icon-symbol.tsx`
- `components/ui/MessageItem.tsx` → `components/ui/CognitiveNode.tsx`
- `components/ui/MessageItem.tsx` → `components/ui/icon-symbol.tsx`

---

## Community 17
### Files
- `components/ui/SnowflakeChart.tsx` (component, 3KB)

### Internal Dependencies
- None

---

## Community 18
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

## Community 19
### Files
- `hooks/use-color-scheme.ts` (hook, 0KB)

### Internal Dependencies
- None

---

## Community 20
### Files
- `app/(tabs)/index.tsx` (file, 68KB)
- `components/ChatInputBar.tsx` (component, 17KB)
- `components/modals/BookReaderModal.tsx` (component, 20KB)
- `components/ui/MarqueeText.tsx` (component, 1KB)
- `components/ui/WhispAvatar.tsx` (component, 14KB)
- `constants/NeuralConstants.ts` (file, 2KB)
- `hooks/useInteractiveVoice.ts` (hook, 23KB)
- `hooks/useSafeState.ts` (hook, 0KB)
- `hooks/useVoice.ts` (hook, 41KB)
- `lib/CloudTTSService.ts` (service, 10KB)
- `lib/SettingsService.ts` (service, 3KB)
- `lib/SpeechFilter.ts` (service, 8KB)
- `lib/TTSSanitizer.ts` (service, 4KB)
- `lib/UnifiedMicService.ts` (service, 11KB)
- `lib/WisdomService.ts` (service, 4KB)
- `modules/anima-voice/src/AnimaVoiceModule.ts` (file, 0KB)

### Internal Dependencies
- `app/(tabs)/index.tsx` → `components/ChatInputBar.tsx`
- `app/(tabs)/index.tsx` → `components/ui/MarqueeText.tsx`
- `app/(tabs)/index.tsx` → `components/ui/WhispAvatar.tsx`
- `app/(tabs)/index.tsx` → `constants/NeuralConstants.ts`
- `app/(tabs)/index.tsx` → `hooks/useInteractiveVoice.ts`
- `app/(tabs)/index.tsx` → `hooks/useVoice.ts`
- `app/(tabs)/index.tsx` → `lib/SettingsService.ts`
- `app/(tabs)/index.tsx` → `lib/SpeechFilter.ts`
- `app/(tabs)/index.tsx` → `lib/UnifiedMicService.ts`
- `components/ChatInputBar.tsx` → `constants/NeuralConstants.ts`
- `components/modals/BookReaderModal.tsx` → `lib/CloudTTSService.ts`
- `components/modals/BookReaderModal.tsx` → `lib/SettingsService.ts`
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

## Community 21
### Files
- `lib/ContextFoldingService.ts` (service, 4KB)

### Internal Dependencies
- None

---

## Community 22
### Files
- `lib/FactExtractionService.ts` (service, 5KB)
- `lib/KnowledgeGraphService.ts` (service, 5KB)
- `lib/KnowledgeManager.ts` (service, 2KB)
- `lib/LouvainCommunity.ts` (service, 4KB)
- `lib/grammars.ts` (service, 2KB)

### Internal Dependencies
- `lib/FactExtractionService.ts` → `lib/KnowledgeGraphService.ts`
- `lib/FactExtractionService.ts` → `lib/KnowledgeManager.ts`
- `lib/FactExtractionService.ts` → `lib/grammars.ts`
- `lib/KnowledgeGraphService.ts` → `lib/LouvainCommunity.ts`

---

## Community 23
### Files
- `hooks/useFileAttachment.ts` (hook, 22KB)
- `lib/BraveLlmSearch.ts` (service, 5KB)
- `lib/IdentityRotator.ts` (service, 2KB)
- `lib/LibraryManagerService.ts` (service, 16KB)
- `lib/PdfToImage.ts` (service, 2KB)
- `lib/SentinelService.ts` (service, 14KB)
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
- `modules/anima-voice/android/src/main/cpp/AudioPlayer.cpp` (native, 2KB)

### Internal Dependencies
- None

---

## Community 25
### Files
- `modules/anima-voice/android/src/main/cpp/AudioPlayer.h` (native, 2KB)

### Internal Dependencies
- None

---

## Community 26
### Files
- `modules/anima-voice/android/src/main/cpp/cpp-adapter.cpp` (native, 3KB)

### Internal Dependencies
- None

---

## Community 27
### Files
- `modules/anima-voice/android/src/main/cpp/VadProcessor.cpp` (native, 0KB)

### Internal Dependencies
- None

---

## Community 28
### Files
- `modules/anima-voice/android/src/main/cpp/VadProcessor.h` (native, 0KB)

### Internal Dependencies
- None

---

## Community 29
### Files
- `modules/anima-voice/android/src/main/java/com/christeck/animavoice/AnimaVoiceModule.kt` (native, 6KB)

### Internal Dependencies
- None

---

## Community 30
### Files
- `modules/anima-voice/src/AnimaVoice.types.ts` (file, 0KB)

### Internal Dependencies
- None

---

## Community 31
### Files
- `plugins/withIosCxxStandard.js` (file, 2KB)

### Internal Dependencies
- None

---

## Community 32
### Files
- `plugins/withIosEntitlements.js` (file, 1KB)

### Internal Dependencies
- None

---

## Community 33
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
- 🔴 `components/ui/SnowflakeChart.tsx` — 0 connections
- 🔴 `hooks/use-color-scheme.ts` — 0 connections
- 🔴 `lib/ContextFoldingService.ts` — 0 connections