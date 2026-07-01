# 🧠 AI-Diary — Codebase RAG-DB
> Generated: 2026-06-29T14:15:19.381212 | Total Files: 123 | Communities: 31

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
- `app/(tabs)/self-know.tsx` (file, 37KB)
- `app/(tabs)/settings.tsx` (file, 86KB)
- `app/(tabs)/tools.tsx` (file, 77KB)
- `app/_layout.tsx` (file, 4KB)
- `components/GlobalDownloadBanner.tsx` (component, 7KB)
- `components/KebabMenuOverlay.tsx` (component, 4KB)
- `components/MatrixRain.tsx` (component, 4KB)
- `components/SanctuaryHeader.tsx` (component, 9KB)
- `components/SanctuaryUI.tsx` (component, 4KB)
- `components/haptic-tab.tsx` (component, 0KB)
- `components/ui/PsiIcon.tsx` (component, 0KB)
- `components/ui/SnowflakeChart.tsx` (component, 3KB)
- `constants/Themes.ts` (file, 1KB)
- `contexts/LanguageContext.tsx` (context, 9KB)
- `contexts/LlmContext.tsx` (context, 5KB)
- `contexts/ThemeContext.tsx` (context, 1KB)
- `contexts/VoiceContext.tsx` (context, 1KB)
- `hooks/useCircadianCycle.ts` (hook, 0KB)

### Internal Dependencies
- `app/(tabs)/_layout.tsx` → `components/haptic-tab.tsx`
- `app/(tabs)/_layout.tsx` → `components/ui/PsiIcon.tsx`
- `app/(tabs)/_layout.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/_layout.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/self-know.tsx` → `components/KebabMenuOverlay.tsx`
- `app/(tabs)/self-know.tsx` → `components/SanctuaryHeader.tsx`
- `app/(tabs)/self-know.tsx` → `components/ui/PsiIcon.tsx`
- `app/(tabs)/self-know.tsx` → `components/ui/SnowflakeChart.tsx`
- `app/(tabs)/self-know.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/self-know.tsx` → `contexts/LlmContext.tsx`
- `app/(tabs)/self-know.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/settings.tsx` → `components/KebabMenuOverlay.tsx`
- `app/(tabs)/settings.tsx` → `components/MatrixRain.tsx`
- `app/(tabs)/settings.tsx` → `components/SanctuaryHeader.tsx`
- `app/(tabs)/settings.tsx` → `components/SanctuaryUI.tsx`
- `app/(tabs)/settings.tsx` → `constants/Themes.ts`
- `app/(tabs)/settings.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/settings.tsx` → `contexts/LlmContext.tsx`
- `app/(tabs)/settings.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/tools.tsx` → `components/KebabMenuOverlay.tsx`
- `app/(tabs)/tools.tsx` → `components/MatrixRain.tsx`
- `app/(tabs)/tools.tsx` → `components/SanctuaryHeader.tsx`
- `app/(tabs)/tools.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/tools.tsx` → `contexts/LlmContext.tsx`
- `app/(tabs)/tools.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/tools.tsx` → `contexts/VoiceContext.tsx`
- `app/_layout.tsx` → `components/GlobalDownloadBanner.tsx`
- `app/_layout.tsx` → `contexts/LanguageContext.tsx`
- `app/_layout.tsx` → `contexts/LlmContext.tsx`
- `app/_layout.tsx` → `contexts/ThemeContext.tsx`
- `app/_layout.tsx` → `contexts/VoiceContext.tsx`
- `components/GlobalDownloadBanner.tsx` → `contexts/LanguageContext.tsx`
- `components/GlobalDownloadBanner.tsx` → `contexts/LlmContext.tsx`
- `components/GlobalDownloadBanner.tsx` → `contexts/ThemeContext.tsx`
- `components/KebabMenuOverlay.tsx` → `contexts/LanguageContext.tsx`
- `components/MatrixRain.tsx` → `hooks/useCircadianCycle.ts`
- `components/SanctuaryHeader.tsx` → `contexts/LanguageContext.tsx`
- `components/SanctuaryHeader.tsx` → `contexts/LlmContext.tsx`
- `components/SanctuaryHeader.tsx` → `contexts/ThemeContext.tsx`
- `components/SanctuaryUI.tsx` → `constants/Themes.ts`
- `components/SanctuaryUI.tsx` → `contexts/LanguageContext.tsx`
- `contexts/LlmContext.tsx` → `contexts/LanguageContext.tsx`
- `contexts/ThemeContext.tsx` → `constants/Themes.ts`
- `contexts/VoiceContext.tsx` → `contexts/LanguageContext.tsx`

---

## Community 15
### Files
- `components/MemoryProvider.tsx` (component, 2KB)
- `components/SentinelTraceBuffer.tsx` (component, 4KB)
- `components/modals/IntroModal.tsx` (component, 14KB)
- `components/modals/ProfileModal.tsx` (component, 8KB)
- `components/modals/PsyTestModal.tsx` (component, 60KB)
- `components/modals/TestsMenuModal.tsx` (component, 6KB)
- `components/modals/VoiceSettingsModal.tsx` (component, 11KB)
- `contexts/GlobalModalsContext.tsx` (context, 7KB)
- `contexts/ProfileContext.tsx` (context, 3KB)

### Internal Dependencies
- `components/SentinelTraceBuffer.tsx` → `components/MemoryProvider.tsx`
- `components/modals/ProfileModal.tsx` → `components/modals/PsyTestModal.tsx`
- `components/modals/ProfileModal.tsx` → `contexts/ProfileContext.tsx`
- `contexts/GlobalModalsContext.tsx` → `components/MemoryProvider.tsx`
- `contexts/GlobalModalsContext.tsx` → `components/modals/IntroModal.tsx`
- `contexts/GlobalModalsContext.tsx` → `components/modals/ProfileModal.tsx`
- `contexts/GlobalModalsContext.tsx` → `components/modals/PsyTestModal.tsx`
- `contexts/GlobalModalsContext.tsx` → `components/modals/TestsMenuModal.tsx`
- `contexts/GlobalModalsContext.tsx` → `components/modals/VoiceSettingsModal.tsx`
- `contexts/GlobalModalsContext.tsx` → `contexts/ProfileContext.tsx`
- `contexts/ProfileContext.tsx` → `components/MemoryProvider.tsx`

---

## Community 16
### Files
- `hooks/use-color-scheme.ts` (hook, 0KB)

### Internal Dependencies
- None

---

## Community 17
### Files
- `app/(tabs)/index.tsx` (file, 67KB)
- `app/(tabs)/projects.tsx` (file, 60KB)
- `components/ChatInputBar.tsx` (component, 17KB)
- `components/MessageContextMenu.tsx` (component, 5KB)
- `components/VisionDownloadModal.tsx` (component, 3KB)
- `components/VoiceNoteOverlay.tsx` (component, 7KB)
- `components/modals/BookReaderModal.tsx` (component, 20KB)
- `components/modals/VoiceOverlay.tsx` (component, 14KB)
- `components/modals/VoicePickerModal.tsx` (component, 8KB)
- `components/ui/CognitiveNode.tsx` (component, 3KB)
- `components/ui/MarqueeText.tsx` (component, 1KB)
- `components/ui/MessageItem.tsx` (component, 9KB)
- `components/ui/WhispAvatar.tsx` (component, 14KB)
- `components/ui/icon-symbol.tsx` (component, 3KB)
- `constants/NeuralConstants.ts` (file, 2KB)
- `hooks/useFileAttachment.ts` (hook, 22KB)
- `hooks/useInteractiveVoice.ts` (hook, 22KB)
- `hooks/useSafeState.ts` (hook, 0KB)
- `hooks/useVoice.ts` (hook, 32KB)
- `lib/CloudTTSService.ts` (service, 9KB)
- `lib/PdfToImage.ts` (service, 2KB)
- `lib/SettingsService.ts` (service, 3KB)
- `lib/SpeechFilter.ts` (service, 8KB)
- `lib/TTSSanitizer.ts` (service, 4KB)
- `lib/UnifiedMicService.ts` (service, 11KB)
- `lib/WisdomService.ts` (service, 4KB)
- `modules/anima-voice/src/AnimaVoiceModule.ts` (file, 0KB)

### Internal Dependencies
- `app/(tabs)/index.tsx` → `components/ChatInputBar.tsx`
- `app/(tabs)/index.tsx` → `components/MessageContextMenu.tsx`
- `app/(tabs)/index.tsx` → `components/VisionDownloadModal.tsx`
- `app/(tabs)/index.tsx` → `components/VoiceNoteOverlay.tsx`
- `app/(tabs)/index.tsx` → `components/modals/VoiceOverlay.tsx`
- `app/(tabs)/index.tsx` → `components/ui/CognitiveNode.tsx`
- `app/(tabs)/index.tsx` → `components/ui/MarqueeText.tsx`
- `app/(tabs)/index.tsx` → `components/ui/MessageItem.tsx`
- `app/(tabs)/index.tsx` → `components/ui/WhispAvatar.tsx`
- `app/(tabs)/index.tsx` → `components/ui/icon-symbol.tsx`
- `app/(tabs)/index.tsx` → `constants/NeuralConstants.ts`
- `app/(tabs)/index.tsx` → `hooks/useFileAttachment.ts`
- `app/(tabs)/index.tsx` → `hooks/useInteractiveVoice.ts`
- `app/(tabs)/index.tsx` → `hooks/useVoice.ts`
- `app/(tabs)/index.tsx` → `lib/SettingsService.ts`
- `app/(tabs)/index.tsx` → `lib/SpeechFilter.ts`
- `app/(tabs)/index.tsx` → `lib/UnifiedMicService.ts`
- `app/(tabs)/projects.tsx` → `components/VisionDownloadModal.tsx`
- `app/(tabs)/projects.tsx` → `components/ui/icon-symbol.tsx`
- `app/(tabs)/projects.tsx` → `hooks/useFileAttachment.ts`
- `app/(tabs)/projects.tsx` → `hooks/useVoice.ts`
- `app/(tabs)/projects.tsx` → `lib/SettingsService.ts`
- `app/(tabs)/projects.tsx` → `lib/WisdomService.ts`
- `components/ChatInputBar.tsx` → `components/ui/icon-symbol.tsx`
- `components/ChatInputBar.tsx` → `constants/NeuralConstants.ts`
- `components/MessageContextMenu.tsx` → `components/ui/icon-symbol.tsx`
- `components/VisionDownloadModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/VoiceNoteOverlay.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/BookReaderModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/BookReaderModal.tsx` → `lib/CloudTTSService.ts`
- `components/modals/BookReaderModal.tsx` → `lib/SettingsService.ts`
- `components/modals/VoiceOverlay.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/VoicePickerModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/ui/CognitiveNode.tsx` → `components/ui/icon-symbol.tsx`
- `components/ui/MessageItem.tsx` → `components/ui/CognitiveNode.tsx`
- `components/ui/MessageItem.tsx` → `components/ui/icon-symbol.tsx`
- `hooks/useFileAttachment.ts` → `lib/PdfToImage.ts`
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
- `components/ModelLoaderPanel.tsx` (component, 9KB)
- `components/modals/VaultExplorerModal.tsx` (component, 10KB)
- `components/ui/InteractiveCalendar.tsx` (component, 21KB)
- `db/calendarSchema.ts` (schema, 0KB)
- `db/knowledgeGraphSchema.ts` (schema, 3KB)
- `db/recurringTasksSchema.ts` (schema, 1KB)
- `db/syntacticMemorySchema.ts` (schema, 5KB)
- `db/todoSchema.ts` (schema, 0KB)
- `hooks/useAnimaScanner.ts` (hook, 3KB)
- `hooks/useCalendar.ts` (hook, 1KB)
- `hooks/useTodos.ts` (hook, 1KB)
- `lib/db.ts` (service, 7KB)
- `lib/vault.ts` (service, 8KB)
- `src/config/ModelConfig.ts` (file, 5KB)

### Internal Dependencies
- `components/ModelLoaderPanel.tsx` → `src/config/ModelConfig.ts`
- `components/modals/VaultExplorerModal.tsx` → `lib/vault.ts`
- `components/ui/InteractiveCalendar.tsx` → `hooks/useCalendar.ts`
- `hooks/useAnimaScanner.ts` → `hooks/useTodos.ts`
- `hooks/useAnimaScanner.ts` → `lib/vault.ts`
- `hooks/useAnimaScanner.ts` → `src/config/ModelConfig.ts`
- `hooks/useCalendar.ts` → `db/calendarSchema.ts`
- `hooks/useTodos.ts` → `db/todoSchema.ts`
- `lib/db.ts` → `db/calendarSchema.ts`
- `lib/db.ts` → `db/knowledgeGraphSchema.ts`
- `lib/db.ts` → `db/recurringTasksSchema.ts`
- `lib/db.ts` → `db/syntacticMemorySchema.ts`
- `lib/db.ts` → `db/todoSchema.ts`

---

## Community 19
### Files
- `components/modals/OnboardingModal.tsx` (component, 18KB)
- `db/badgeSchema.ts` (schema, 2KB)
- `hooks/useAgentEngine.ts` (hook, 37KB)
- `hooks/useAppLlm.ts` (hook, 50KB)
- `hooks/useDocumentProcessor.ts` (hook, 10KB)
- `lib/BadgeService.ts` (service, 1KB)
- `lib/CPUSemaphore.ts` (service, 2KB)
- `lib/ContextFoldingService.ts` (service, 4KB)
- `lib/DatabaseService.ts` (service, 1KB)
- `lib/FactExtractionService.ts` (service, 5KB)
- `lib/KnowledgeGraphService.ts` (service, 5KB)
- `lib/KnowledgeManager.ts` (service, 2KB)
- `lib/Logger.ts` (service, 0KB)
- `lib/LouvainCommunity.ts` (service, 4KB)
- `lib/MemoryManager.ts` (service, 3KB)
- `lib/PromptService.ts` (service, 8KB)
- `lib/SemanticService.ts` (service, 2KB)
- `lib/grammars.ts` (service, 5KB)
- `lib/hardware.ts` (service, 4KB)
- `lib/systemPrompt.ts` (service, 14KB)
- `types/index.ts` (file, 0KB)

### Internal Dependencies
- `components/modals/OnboardingModal.tsx` → `lib/MemoryManager.ts`
- `components/modals/OnboardingModal.tsx` → `lib/PromptService.ts`
- `hooks/useAgentEngine.ts` → `hooks/useAppLlm.ts`
- `hooks/useAgentEngine.ts` → `hooks/useDocumentProcessor.ts`
- `hooks/useAgentEngine.ts` → `lib/BadgeService.ts`
- `hooks/useAgentEngine.ts` → `lib/ContextFoldingService.ts`
- `hooks/useAgentEngine.ts` → `lib/DatabaseService.ts`
- `hooks/useAgentEngine.ts` → `lib/FactExtractionService.ts`
- `hooks/useAgentEngine.ts` → `lib/KnowledgeManager.ts`
- `hooks/useAgentEngine.ts` → `lib/Logger.ts`
- `hooks/useAgentEngine.ts` → `lib/PromptService.ts`
- `hooks/useAgentEngine.ts` → `lib/SemanticService.ts`
- `hooks/useAgentEngine.ts` → `lib/hardware.ts`
- `hooks/useAgentEngine.ts` → `lib/systemPrompt.ts`
- `hooks/useAgentEngine.ts` → `types/index.ts`
- `hooks/useAppLlm.ts` → `lib/CPUSemaphore.ts`
- `hooks/useAppLlm.ts` → `lib/MemoryManager.ts`
- `hooks/useAppLlm.ts` → `lib/hardware.ts`
- `hooks/useDocumentProcessor.ts` → `lib/PromptService.ts`
- `hooks/useDocumentProcessor.ts` → `lib/hardware.ts`
- `lib/BadgeService.ts` → `db/badgeSchema.ts`
- `lib/BadgeService.ts` → `lib/grammars.ts`
- `lib/FactExtractionService.ts` → `lib/KnowledgeGraphService.ts`
- `lib/FactExtractionService.ts` → `lib/KnowledgeManager.ts`
- `lib/FactExtractionService.ts` → `lib/grammars.ts`
- `lib/KnowledgeGraphService.ts` → `lib/LouvainCommunity.ts`
- `lib/MemoryManager.ts` → `lib/hardware.ts`
- `lib/PromptService.ts` → `hooks/useAppLlm.ts`
- `lib/PromptService.ts` → `lib/systemPrompt.ts`
- `lib/PromptService.ts` → `types/index.ts`

---

## Community 20
### Files
- `lib/BraveLlmSearch.ts` (service, 5KB)
- `lib/IdentityRotator.ts` (service, 2KB)
- `lib/LibraryManagerService.ts` (service, 16KB)
- `lib/SentinelService.ts` (service, 14KB)
- `lib/TextUtils.ts` (service, 3KB)
- `lib/openlibrary.ts` (service, 1KB)
- `lib/tools.ts` (service, 2KB)
- `lib/wikipedia.ts` (service, 8KB)

### Internal Dependencies
- `lib/BraveLlmSearch.ts` → `lib/IdentityRotator.ts`
- `lib/BraveLlmSearch.ts` → `lib/TextUtils.ts`
- `lib/LibraryManagerService.ts` → `lib/IdentityRotator.ts`
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

## Community 21
### Files
- `modules/anima-voice/android/src/main/cpp/AudioPlayer.cpp` (native, 2KB)

### Internal Dependencies
- None

---

## Community 22
### Files
- `modules/anima-voice/android/src/main/cpp/AudioPlayer.h` (native, 2KB)

### Internal Dependencies
- None

---

## Community 23
### Files
- `modules/anima-voice/android/src/main/cpp/cpp-adapter.cpp` (native, 1KB)

### Internal Dependencies
- None

---

## Community 24
### Files
- `modules/anima-voice/android/src/main/cpp/VadProcessor.cpp` (native, 0KB)

### Internal Dependencies
- None

---

## Community 25
### Files
- `modules/anima-voice/android/src/main/cpp/VadProcessor.h` (native, 0KB)

### Internal Dependencies
- None

---

## Community 26
### Files
- `modules/anima-voice/android/src/main/java/com/christeck/animavoice/AnimaVoiceModule.kt` (native, 3KB)

### Internal Dependencies
- None

---

## Community 27
### Files
- `modules/anima-voice/src/AnimaVoice.types.ts` (file, 0KB)

### Internal Dependencies
- None

---

## Community 28
### Files
- `plugins/withIosCxxStandard.js` (file, 2KB)

### Internal Dependencies
- None

---

## Community 29
### Files
- `plugins/withIosEntitlements.js` (file, 1KB)

### Internal Dependencies
- None

---

## Community 30
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
- 🔴 `hooks/use-color-scheme.ts` — 0 connections