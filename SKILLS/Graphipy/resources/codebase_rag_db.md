# 🧠 AI-Diary — Codebase RAG-DB
> Generated: 2026-06-12T19:45:31.493639 | Total Files: 105 | Communities: 26

## 📜 Historical Context & Instructions
> For historical design decisions, latest major changes, or developer context, ALWAYS refer to:
> `DOCS/Chris' Instructions.md` or git history. This markdown contains the most recent application states and intentions.

## 🚀 Recommended Architectural Improvements
> **1. Split High-Frequency States in LlmContext:** Separate streaming/download progress (high-frequency) from active model/configuration states (stable) to prevent global app re-renders during active downloads/generation.
> **2. SQLite Batch Transaction:** Wrap multiple inserts/updates in `KnowledgeGraphService.ts` within a transaction to boost writing performance and prevent file-locking delay on mobile devices.

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
- `android/app/src/main/cpp/vision_bridge.cpp` (native, 3KB)

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
- `android/app/src/main/java/com/christeck/aidiary/MainApplication.kt` (native, 1KB)

### Internal Dependencies
- None

---

## Community 11
### Files
- `android/app/src/main/java/com/christeck/aidiary/PdfToImageModule.kt` (native, 3KB)

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
- `android/app/src/main/java/com/christeck/aidiary/VisionBridge.kt` (native, 1KB)

### Internal Dependencies
- None

---

## Community 14
### Files
- `android/react-settings-plugin/bin/main/expo/plugins/ReactSettingsPlugin.kt` (native, 0KB)

### Internal Dependencies
- None

---

## Community 15
### Files
- `android/react-settings-plugin/src/main/kotlin/expo/plugins/ReactSettingsPlugin.kt` (native, 0KB)

### Internal Dependencies
- None

---

## Community 16
### Files
- `app/(tabs)/_layout.tsx` (file, 1KB)
- `app/(tabs)/settings.tsx` (file, 63KB)
- `app/(tabs)/tools.tsx` (file, 46KB)
- `app/(tabs)/zengarden.tsx` (file, 9KB)
- `app/_layout.tsx` (file, 4KB)
- `components/GlobalDownloadBanner.tsx` (component, 7KB)
- `components/KebabMenuOverlay.tsx` (component, 4KB)
- `components/MatrixRain.tsx` (component, 4KB)
- `components/MemoryProvider.tsx` (component, 2KB)
- `components/SanctuaryHeader.tsx` (component, 9KB)
- `components/SanctuaryUI.tsx` (component, 4KB)
- `components/SentinelTraceBuffer.tsx` (component, 4KB)
- `components/haptic-tab.tsx` (component, 0KB)
- `components/modals/TestsMenuModal.tsx` (component, 6KB)
- `components/ui/ZenGarden.tsx` (component, 27KB)
- `constants/Themes.ts` (file, 1KB)
- `contexts/GlobalModalsContext.tsx` (context, 7KB)
- `contexts/LanguageContext.tsx` (context, 9KB)
- `contexts/LlmContext.tsx` (context, 4KB)
- `contexts/ProfileContext.tsx` (context, 3KB)
- `contexts/ThemeContext.tsx` (context, 1KB)
- `contexts/VoiceContext.tsx` (context, 1KB)
- `hooks/useCircadianCycle.ts` (hook, 0KB)

### Internal Dependencies
- `app/(tabs)/_layout.tsx` → `components/haptic-tab.tsx`
- `app/(tabs)/_layout.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/_layout.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/settings.tsx` → `components/KebabMenuOverlay.tsx`
- `app/(tabs)/settings.tsx` → `components/MatrixRain.tsx`
- `app/(tabs)/settings.tsx` → `components/MemoryProvider.tsx`
- `app/(tabs)/settings.tsx` → `components/SanctuaryHeader.tsx`
- `app/(tabs)/settings.tsx` → `components/SanctuaryUI.tsx`
- `app/(tabs)/settings.tsx` → `constants/Themes.ts`
- `app/(tabs)/settings.tsx` → `contexts/GlobalModalsContext.tsx`
- `app/(tabs)/settings.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/settings.tsx` → `contexts/LlmContext.tsx`
- `app/(tabs)/settings.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/tools.tsx` → `components/KebabMenuOverlay.tsx`
- `app/(tabs)/tools.tsx` → `components/MatrixRain.tsx`
- `app/(tabs)/tools.tsx` → `components/SanctuaryHeader.tsx`
- `app/(tabs)/tools.tsx` → `contexts/GlobalModalsContext.tsx`
- `app/(tabs)/tools.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/tools.tsx` → `contexts/LlmContext.tsx`
- `app/(tabs)/tools.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/tools.tsx` → `contexts/VoiceContext.tsx`
- `app/(tabs)/zengarden.tsx` → `components/KebabMenuOverlay.tsx`
- `app/(tabs)/zengarden.tsx` → `components/MatrixRain.tsx`
- `app/(tabs)/zengarden.tsx` → `components/SanctuaryHeader.tsx`
- `app/(tabs)/zengarden.tsx` → `components/ui/ZenGarden.tsx`
- `app/(tabs)/zengarden.tsx` → `contexts/GlobalModalsContext.tsx`
- `app/(tabs)/zengarden.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/zengarden.tsx` → `contexts/LlmContext.tsx`
- `app/(tabs)/zengarden.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/zengarden.tsx` → `hooks/useCircadianCycle.ts`
- `app/_layout.tsx` → `components/GlobalDownloadBanner.tsx`
- `app/_layout.tsx` → `components/MemoryProvider.tsx`
- `app/_layout.tsx` → `contexts/GlobalModalsContext.tsx`
- `app/_layout.tsx` → `contexts/LanguageContext.tsx`
- `app/_layout.tsx` → `contexts/LlmContext.tsx`
- `app/_layout.tsx` → `contexts/ProfileContext.tsx`
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
- `components/SentinelTraceBuffer.tsx` → `components/MemoryProvider.tsx`
- `components/ui/ZenGarden.tsx` → `contexts/ThemeContext.tsx`
- `components/ui/ZenGarden.tsx` → `hooks/useCircadianCycle.ts`
- `contexts/GlobalModalsContext.tsx` → `components/MemoryProvider.tsx`
- `contexts/GlobalModalsContext.tsx` → `components/modals/TestsMenuModal.tsx`
- `contexts/GlobalModalsContext.tsx` → `contexts/LanguageContext.tsx`
- `contexts/GlobalModalsContext.tsx` → `contexts/ProfileContext.tsx`
- `contexts/GlobalModalsContext.tsx` → `contexts/ThemeContext.tsx`
- `contexts/LlmContext.tsx` → `contexts/LanguageContext.tsx`
- `contexts/ProfileContext.tsx` → `components/MemoryProvider.tsx`
- `contexts/ThemeContext.tsx` → `constants/Themes.ts`
- `contexts/VoiceContext.tsx` → `contexts/LanguageContext.tsx`

---

## Community 17
### Files
- `app/(tabs)/index.tsx` (file, 62KB)
- `components/ChatInputBar.tsx` (component, 15KB)
- `components/MessageContextMenu.tsx` (component, 5KB)
- `components/VoiceNoteOverlay.tsx` (component, 7KB)
- `components/modals/IntroModal.tsx` (component, 11KB)
- `components/modals/OnboardingModal.tsx` (component, 17KB)
- `components/modals/ProfileModal.tsx` (component, 10KB)
- `components/modals/PsyTestModal.tsx` (component, 60KB)
- `components/modals/VaultExplorerModal.tsx` (component, 10KB)
- `components/modals/VoiceOverlay.tsx` (component, 14KB)
- `components/modals/VoicePickerModal.tsx` (component, 8KB)
- `components/modals/VoiceSettingsModal.tsx` (component, 9KB)
- `components/ui/CognitiveNode.tsx` (component, 3KB)
- `components/ui/MarqueeText.tsx` (component, 1KB)
- `components/ui/MessageItem.tsx` (component, 6KB)
- `components/ui/SnowflakeChart.tsx` (component, 3KB)
- `components/ui/WhispAvatar.tsx` (component, 13KB)
- `components/ui/icon-symbol.tsx` (component, 2KB)
- `constants/NeuralConstants.ts` (file, 2KB)
- `lib/MemoryManager.ts` (service, 3KB)
- `lib/vault.ts` (service, 8KB)

### Internal Dependencies
- `app/(tabs)/index.tsx` → `components/ChatInputBar.tsx`
- `app/(tabs)/index.tsx` → `components/MessageContextMenu.tsx`
- `app/(tabs)/index.tsx` → `components/VoiceNoteOverlay.tsx`
- `app/(tabs)/index.tsx` → `components/modals/OnboardingModal.tsx`
- `app/(tabs)/index.tsx` → `components/modals/VoiceOverlay.tsx`
- `app/(tabs)/index.tsx` → `components/ui/CognitiveNode.tsx`
- `app/(tabs)/index.tsx` → `components/ui/MarqueeText.tsx`
- `app/(tabs)/index.tsx` → `components/ui/MessageItem.tsx`
- `app/(tabs)/index.tsx` → `components/ui/WhispAvatar.tsx`
- `app/(tabs)/index.tsx` → `components/ui/icon-symbol.tsx`
- `app/(tabs)/index.tsx` → `constants/NeuralConstants.ts`
- `app/(tabs)/index.tsx` → `lib/vault.ts`
- `components/ChatInputBar.tsx` → `components/ui/icon-symbol.tsx`
- `components/ChatInputBar.tsx` → `constants/NeuralConstants.ts`
- `components/MessageContextMenu.tsx` → `components/ui/icon-symbol.tsx`
- `components/VoiceNoteOverlay.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/IntroModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/OnboardingModal.tsx` → `components/modals/PsyTestModal.tsx`
- `components/modals/OnboardingModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/OnboardingModal.tsx` → `lib/MemoryManager.ts`
- `components/modals/ProfileModal.tsx` → `components/modals/PsyTestModal.tsx`
- `components/modals/ProfileModal.tsx` → `components/ui/SnowflakeChart.tsx`
- `components/modals/ProfileModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/PsyTestModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/VaultExplorerModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/VaultExplorerModal.tsx` → `lib/vault.ts`
- `components/modals/VoiceOverlay.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/VoicePickerModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/VoiceSettingsModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/ui/CognitiveNode.tsx` → `components/ui/icon-symbol.tsx`
- `components/ui/MessageItem.tsx` → `components/ui/CognitiveNode.tsx`
- `components/ui/MessageItem.tsx` → `components/ui/icon-symbol.tsx`

---

## Community 18
### Files
- `hooks/use-color-scheme.ts` (hook, 0KB)

### Internal Dependencies
- None

---

## Community 19
### Files
- `components/ModelLoaderPanel.tsx` (component, 8KB)
- `hooks/useAppLlm.ts` (hook, 48KB)
- `hooks/useInteractiveVoice.ts` (hook, 20KB)
- `hooks/useSafeState.ts` (hook, 0KB)
- `hooks/useVoice.ts` (hook, 25KB)
- `lib/CPUSemaphore.ts` (service, 2KB)
- `lib/CloudTTSService.ts` (service, 4KB)
- `lib/SettingsService.ts` (service, 3KB)
- `lib/SpeechFilter.ts` (service, 8KB)
- `lib/UnifiedMicService.ts` (service, 11KB)
- `lib/hardware.ts` (service, 4KB)
- `src/config/ModelConfig.ts` (file, 5KB)

### Internal Dependencies
- `components/ModelLoaderPanel.tsx` → `hooks/useAppLlm.ts`
- `components/ModelLoaderPanel.tsx` → `lib/SettingsService.ts`
- `hooks/useAppLlm.ts` → `lib/CPUSemaphore.ts`
- `hooks/useAppLlm.ts` → `lib/SettingsService.ts`
- `hooks/useAppLlm.ts` → `lib/hardware.ts`
- `hooks/useAppLlm.ts` → `src/config/ModelConfig.ts`
- `hooks/useInteractiveVoice.ts` → `hooks/useSafeState.ts`
- `hooks/useInteractiveVoice.ts` → `hooks/useVoice.ts`
- `hooks/useInteractiveVoice.ts` → `lib/CPUSemaphore.ts`
- `hooks/useInteractiveVoice.ts` → `lib/SpeechFilter.ts`
- `hooks/useInteractiveVoice.ts` → `lib/UnifiedMicService.ts`
- `hooks/useInteractiveVoice.ts` → `lib/hardware.ts`
- `hooks/useVoice.ts` → `hooks/useSafeState.ts`
- `hooks/useVoice.ts` → `lib/CloudTTSService.ts`
- `hooks/useVoice.ts` → `lib/SettingsService.ts`
- `hooks/useVoice.ts` → `lib/SpeechFilter.ts`
- `hooks/useVoice.ts` → `lib/UnifiedMicService.ts`
- `hooks/useVoice.ts` → `lib/hardware.ts`

---

## Community 20
### Files
- `db/knowledgeGraphSchema.ts` (schema, 2KB)
- `db/syntacticMemorySchema.ts` (schema, 5KB)
- `db/todoSchema.ts` (schema, 0KB)
- `hooks/useTodos.ts` (hook, 2KB)
- `lib/db.ts` (service, 5KB)

### Internal Dependencies
- `hooks/useTodos.ts` → `db/todoSchema.ts`
- `lib/db.ts` → `db/knowledgeGraphSchema.ts`
- `lib/db.ts` → `db/syntacticMemorySchema.ts`
- `lib/db.ts` → `db/todoSchema.ts`

---

## Community 21
### Files
- `db/zenGardenSchema.ts` (schema, 6KB)
- `hooks/useAgentEngine.ts` (hook, 34KB)
- `hooks/useDocumentProcessor.ts` (hook, 10KB)
- `hooks/useFileAttachment.ts` (hook, 19KB)
- `lib/ContextFoldingService.ts` (service, 4KB)
- `lib/FactExtractionService.ts` (service, 5KB)
- `lib/KnowledgeGraphService.ts` (service, 5KB)
- `lib/KnowledgeManager.ts` (service, 2KB)
- `lib/LouvainCommunity.ts` (service, 4KB)
- `lib/PdfToImage.ts` (service, 1KB)
- `lib/PromptService.ts` (service, 6KB)
- `lib/SemanticService.ts` (service, 2KB)
- `lib/WisdomService.ts` (service, 3KB)
- `lib/ZenPhilosophyService.ts` (service, 4KB)
- `lib/grammars.ts` (service, 1KB)
- `lib/systemPrompt.ts` (service, 13KB)
- `types/index.ts` (file, 0KB)

### Internal Dependencies
- `hooks/useAgentEngine.ts` → `db/zenGardenSchema.ts`
- `hooks/useAgentEngine.ts` → `hooks/useDocumentProcessor.ts`
- `hooks/useAgentEngine.ts` → `lib/ContextFoldingService.ts`
- `hooks/useAgentEngine.ts` → `lib/FactExtractionService.ts`
- `hooks/useAgentEngine.ts` → `lib/KnowledgeManager.ts`
- `hooks/useAgentEngine.ts` → `lib/PromptService.ts`
- `hooks/useAgentEngine.ts` → `lib/SemanticService.ts`
- `hooks/useAgentEngine.ts` → `lib/WisdomService.ts`
- `hooks/useAgentEngine.ts` → `lib/systemPrompt.ts`
- `hooks/useAgentEngine.ts` → `types/index.ts`
- `hooks/useDocumentProcessor.ts` → `hooks/useFileAttachment.ts`
- `hooks/useDocumentProcessor.ts` → `lib/PromptService.ts`
- `hooks/useFileAttachment.ts` → `lib/PdfToImage.ts`
- `lib/FactExtractionService.ts` → `lib/KnowledgeGraphService.ts`
- `lib/FactExtractionService.ts` → `lib/KnowledgeManager.ts`
- `lib/FactExtractionService.ts` → `lib/ZenPhilosophyService.ts`
- `lib/FactExtractionService.ts` → `lib/grammars.ts`
- `lib/KnowledgeGraphService.ts` → `lib/LouvainCommunity.ts`
- `lib/PromptService.ts` → `lib/systemPrompt.ts`
- `lib/PromptService.ts` → `types/index.ts`
- `lib/ZenPhilosophyService.ts` → `db/zenGardenSchema.ts`

---

## Community 22
### Files
- `lib/BraveLlmSearch.ts` (service, 5KB)
- `lib/IdentityRotator.ts` (service, 2KB)
- `lib/SentinelService.ts` (service, 13KB)
- `lib/TextUtils.ts` (service, 3KB)
- `lib/openlibrary.ts` (service, 1KB)
- `lib/tools.ts` (service, 2KB)
- `lib/wikipedia.ts` (service, 7KB)

### Internal Dependencies
- `lib/BraveLlmSearch.ts` → `lib/IdentityRotator.ts`
- `lib/BraveLlmSearch.ts` → `lib/TextUtils.ts`
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

## Community 23
### Files
- `plugins/withIosCxxStandard.js` (file, 2KB)

### Internal Dependencies
- None

---

## Community 24
### Files
- `plugins/withIosEntitlements.js` (file, 1KB)

### Internal Dependencies
- None

---

## Community 25
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