# 🧠 AI-Diary — Codebase RAG-DB
> Generated: 2026-06-12T01:07:07.317541 | Total Files: 106 | Communities: 36

## 📜 Historical Context & Instructions
> For historical design decisions, latest major changes, or developer context, ALWAYS refer to:
> `DOCS/Chris' Instructions.md` or git history. This markdown contains the most recent application states and intentions.

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
- `hooks/useAppLlm.ts` (hook, 43KB)
- `hooks/useInteractiveVoice.ts` (hook, 19KB)
- `hooks/useSafeState.ts` (hook, 0KB)
- `hooks/useVoice.ts` (hook, 29KB)
- `lib/CPUSemaphore.ts` (service, 1KB)
- `lib/MemoryManager.ts` (service, 3KB)
- `lib/SpeechFilter.ts` (service, 8KB)
- `lib/UnifiedMicService.ts` (service, 11KB)
- `lib/hardware.ts` (service, 4KB)
- `src/config/ModelConfig.ts` (file, 5KB)
- `src/features/ai-vision/hooks/useAIVisionAttachment.ts` (hook, 4KB)

### Internal Dependencies
- `hooks/useAppLlm.ts` → `lib/CPUSemaphore.ts`
- `hooks/useAppLlm.ts` → `lib/MemoryManager.ts`
- `hooks/useAppLlm.ts` → `lib/hardware.ts`
- `hooks/useAppLlm.ts` → `src/config/ModelConfig.ts`
- `hooks/useInteractiveVoice.ts` → `hooks/useSafeState.ts`
- `hooks/useInteractiveVoice.ts` → `hooks/useVoice.ts`
- `hooks/useInteractiveVoice.ts` → `lib/CPUSemaphore.ts`
- `hooks/useInteractiveVoice.ts` → `lib/SpeechFilter.ts`
- `hooks/useInteractiveVoice.ts` → `lib/UnifiedMicService.ts`
- `hooks/useInteractiveVoice.ts` → `lib/hardware.ts`
- `hooks/useVoice.ts` → `hooks/useSafeState.ts`
- `hooks/useVoice.ts` → `lib/SpeechFilter.ts`
- `hooks/useVoice.ts` → `lib/UnifiedMicService.ts`
- `hooks/useVoice.ts` → `lib/hardware.ts`
- `lib/MemoryManager.ts` → `lib/hardware.ts`
- `src/features/ai-vision/hooks/useAIVisionAttachment.ts` → `lib/MemoryManager.ts`
- `src/features/ai-vision/hooks/useAIVisionAttachment.ts` → `src/config/ModelConfig.ts`

---

## Community 17
### Files
- `components/haptic-tab.tsx` (component, 0KB)

### Internal Dependencies
- None

---

## Community 18
### Files
- `components/MemoryProvider.web.tsx` (component, 0KB)

### Internal Dependencies
- None

---

## Community 19
### Files
- `app/(tabs)/_layout.tsx` (file, 1KB)
- `app/(tabs)/settings.tsx` (file, 63KB)
- `app/(tabs)/tools.tsx` (file, 46KB)
- `app/(tabs)/zengarden.tsx` (file, 8KB)
- `app/_layout.tsx` (file, 4KB)
- `components/GlobalDownloadBanner.tsx` (component, 6KB)
- `components/KebabMenuOverlay.tsx` (component, 4KB)
- `components/MatrixRain.tsx` (component, 4KB)
- `components/SanctuaryHeader.tsx` (component, 9KB)
- `components/SanctuaryUI.tsx` (component, 4KB)
- `components/ui/ZenGarden.tsx` (component, 27KB)
- `constants/Themes.ts` (file, 1KB)
- `contexts/LanguageContext.tsx` (context, 9KB)
- `contexts/LlmContext.tsx` (context, 0KB)
- `contexts/ThemeContext.tsx` (context, 1KB)
- `contexts/VoiceContext.tsx` (context, 1KB)
- `hooks/useCircadianCycle.ts` (hook, 0KB)

### Internal Dependencies
- `app/(tabs)/_layout.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/_layout.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/settings.tsx` → `components/KebabMenuOverlay.tsx`
- `app/(tabs)/settings.tsx` → `components/SanctuaryHeader.tsx`
- `app/(tabs)/settings.tsx` → `components/SanctuaryUI.tsx`
- `app/(tabs)/settings.tsx` → `constants/Themes.ts`
- `app/(tabs)/settings.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/settings.tsx` → `contexts/LlmContext.tsx`
- `app/(tabs)/settings.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/tools.tsx` → `components/KebabMenuOverlay.tsx`
- `app/(tabs)/tools.tsx` → `components/SanctuaryHeader.tsx`
- `app/(tabs)/tools.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/tools.tsx` → `contexts/LlmContext.tsx`
- `app/(tabs)/tools.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/tools.tsx` → `contexts/VoiceContext.tsx`
- `app/(tabs)/zengarden.tsx` → `components/KebabMenuOverlay.tsx`
- `app/(tabs)/zengarden.tsx` → `components/MatrixRain.tsx`
- `app/(tabs)/zengarden.tsx` → `components/SanctuaryHeader.tsx`
- `app/(tabs)/zengarden.tsx` → `components/ui/ZenGarden.tsx`
- `app/(tabs)/zengarden.tsx` → `contexts/LanguageContext.tsx`
- `app/(tabs)/zengarden.tsx` → `contexts/LlmContext.tsx`
- `app/(tabs)/zengarden.tsx` → `contexts/ThemeContext.tsx`
- `app/(tabs)/zengarden.tsx` → `hooks/useCircadianCycle.ts`
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
- `components/ui/ZenGarden.tsx` → `contexts/ThemeContext.tsx`
- `components/ui/ZenGarden.tsx` → `hooks/useCircadianCycle.ts`
- `contexts/LlmContext.tsx` → `contexts/LanguageContext.tsx`
- `contexts/ThemeContext.tsx` → `constants/Themes.ts`
- `contexts/VoiceContext.tsx` → `contexts/LanguageContext.tsx`

---

## Community 20
### Files
- `app/(tabs)/index.tsx` (file, 98KB)
- `components/MemoryProvider.tsx` (component, 2KB)
- `components/SentinelTraceBuffer.tsx` (component, 4KB)
- `components/modals/IntroModal.tsx` (component, 11KB)
- `components/modals/OnboardingModal.tsx` (component, 17KB)
- `components/modals/ProfileModal.tsx` (component, 10KB)
- `components/modals/PsyTestModal.tsx` (component, 60KB)
- `components/modals/TestsMenuModal.tsx` (component, 6KB)
- `components/modals/VaultExplorerModal.tsx` (component, 10KB)
- `components/modals/VoiceOverlay.tsx` (component, 14KB)
- `components/modals/VoicePickerModal.tsx` (component, 8KB)
- `components/modals/VoiceSettingsModal.tsx` (component, 9KB)
- `components/ui/CognitiveNode.tsx` (component, 3KB)
- `components/ui/MarqueeText.tsx` (component, 1KB)
- `components/ui/MessageItem.tsx` (component, 5KB)
- `components/ui/SnowflakeChart.tsx` (component, 3KB)
- `components/ui/WhispAvatar.tsx` (component, 13KB)
- `components/ui/icon-symbol.tsx` (component, 2KB)
- `constants/NeuralConstants.ts` (file, 2KB)
- `contexts/GlobalModalsContext.tsx` (context, 7KB)
- `contexts/ProfileContext.tsx` (context, 3KB)
- `lib/vault.ts` (service, 8KB)

### Internal Dependencies
- `app/(tabs)/index.tsx` → `components/MemoryProvider.tsx`
- `app/(tabs)/index.tsx` → `components/modals/OnboardingModal.tsx`
- `app/(tabs)/index.tsx` → `components/modals/VoiceOverlay.tsx`
- `app/(tabs)/index.tsx` → `components/ui/CognitiveNode.tsx`
- `app/(tabs)/index.tsx` → `components/ui/MarqueeText.tsx`
- `app/(tabs)/index.tsx` → `components/ui/MessageItem.tsx`
- `app/(tabs)/index.tsx` → `components/ui/WhispAvatar.tsx`
- `app/(tabs)/index.tsx` → `constants/NeuralConstants.ts`
- `app/(tabs)/index.tsx` → `contexts/GlobalModalsContext.tsx`
- `app/(tabs)/index.tsx` → `contexts/ProfileContext.tsx`
- `app/(tabs)/index.tsx` → `lib/vault.ts`
- `components/SentinelTraceBuffer.tsx` → `components/MemoryProvider.tsx`
- `components/modals/IntroModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/OnboardingModal.tsx` → `components/modals/PsyTestModal.tsx`
- `components/modals/OnboardingModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/ProfileModal.tsx` → `components/modals/PsyTestModal.tsx`
- `components/modals/ProfileModal.tsx` → `components/ui/SnowflakeChart.tsx`
- `components/modals/ProfileModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/PsyTestModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/VaultExplorerModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/VaultExplorerModal.tsx` → `lib/vault.ts`
- `components/modals/VoicePickerModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/modals/VoiceSettingsModal.tsx` → `components/ui/icon-symbol.tsx`
- `components/ui/CognitiveNode.tsx` → `components/ui/icon-symbol.tsx`
- `components/ui/MessageItem.tsx` → `components/ui/CognitiveNode.tsx`
- `components/ui/MessageItem.tsx` → `components/ui/icon-symbol.tsx`
- `contexts/GlobalModalsContext.tsx` → `components/MemoryProvider.tsx`
- `contexts/GlobalModalsContext.tsx` → `components/modals/IntroModal.tsx`
- `contexts/GlobalModalsContext.tsx` → `components/modals/ProfileModal.tsx`
- `contexts/GlobalModalsContext.tsx` → `components/modals/PsyTestModal.tsx`
- `contexts/GlobalModalsContext.tsx` → `components/modals/TestsMenuModal.tsx`
- `contexts/GlobalModalsContext.tsx` → `components/modals/VaultExplorerModal.tsx`
- `contexts/GlobalModalsContext.tsx` → `components/modals/VoiceSettingsModal.tsx`
- `contexts/GlobalModalsContext.tsx` → `contexts/ProfileContext.tsx`
- `contexts/ProfileContext.tsx` → `components/MemoryProvider.tsx`

---

## Community 21
### Files
- `components/ui/icon-symbol.ios.tsx` (component, 0KB)

### Internal Dependencies
- None

---

## Community 22
### Files
- `hooks/use-color-scheme.ts` (hook, 0KB)

### Internal Dependencies
- None

---

## Community 23
### Files
- `hooks/use-color-scheme.web.ts` (hook, 0KB)

### Internal Dependencies
- None

---

## Community 24
### Files
- `hooks/useAppLlm.web.ts` (hook, 2KB)

### Internal Dependencies
- None

---

## Community 25
### Files
- `hooks/useExperimentalWalkieTalkie.ts` (hook, 0KB)

### Internal Dependencies
- None

---

## Community 26
### Files
- `hooks/useVoiceMetrics.ts` (hook, 2KB)

### Internal Dependencies
- None

---

## Community 27
### Files
- `lib/PdfToImage.ts` (service, 1KB)

### Internal Dependencies
- None

---

## Community 28
### Files
- `lib/SemanticService.ts` (service, 2KB)

### Internal Dependencies
- None

---

## Community 29
### Files
- `lib/SherpaSpeechService.ts` (service, 0KB)

### Internal Dependencies
- None

---

## Community 30
### Files
- `lib/BraveLlmSearch.ts` (service, 4KB)
- `lib/IdentityRotator.ts` (service, 1KB)
- `lib/SentinelService.ts` (service, 13KB)
- `lib/SettingsService.ts` (service, 3KB)
- `lib/TaskRouter.ts` (service, 1KB)
- `lib/TextUtils.ts` (service, 3KB)
- `lib/openlibrary.ts` (service, 2KB)
- `lib/tools.ts` (service, 1KB)
- `lib/wikidata.ts` (service, 3KB)
- `lib/wikipedia.ts` (service, 9KB)

### Internal Dependencies
- `lib/BraveLlmSearch.ts` → `lib/IdentityRotator.ts`
- `lib/BraveLlmSearch.ts` → `lib/SettingsService.ts`
- `lib/BraveLlmSearch.ts` → `lib/TextUtils.ts`
- `lib/SentinelService.ts` → `lib/TextUtils.ts`
- `lib/TaskRouter.ts` → `lib/tools.ts`
- `lib/openlibrary.ts` → `lib/IdentityRotator.ts`
- `lib/tools.ts` → `lib/BraveLlmSearch.ts`
- `lib/tools.ts` → `lib/SentinelService.ts`
- `lib/tools.ts` → `lib/TextUtils.ts`
- `lib/tools.ts` → `lib/openlibrary.ts`
- `lib/tools.ts` → `lib/wikipedia.ts`
- `lib/wikidata.ts` → `lib/IdentityRotator.ts`
- `lib/wikipedia.ts` → `lib/IdentityRotator.ts`

---

## Community 31
### Files
- `db/syntacticMemorySchema.ts` (schema, 4KB)
- `db/todoSchema.ts` (schema, 0KB)
- `db/zenGardenSchema.ts` (schema, 6KB)
- `hooks/useTodos.ts` (hook, 2KB)
- `lib/db.ts` (service, 4KB)

### Internal Dependencies
- `hooks/useTodos.ts` → `db/todoSchema.ts`
- `lib/db.ts` → `db/syntacticMemorySchema.ts`
- `lib/db.ts` → `db/todoSchema.ts`
- `lib/db.ts` → `db/zenGardenSchema.ts`

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
- `scripts/reset-project.js` (file, 3KB)

### Internal Dependencies
- None

---

## Community 35
### Files
- `hooks/useAgentEngine.ts` (hook, 35KB)
- `hooks/useDocumentProcessor.ts` (hook, 10KB)
- `hooks/useFileAttachment.ts` (hook, 19KB)
- `lib/ContextFoldingService.ts` (service, 3KB)
- `lib/FactExtractionService.ts` (service, 3KB)
- `lib/KnowledgeManager.ts` (service, 2KB)
- `lib/PromptService.ts` (service, 6KB)
- `lib/WisdomService.ts` (service, 2KB)
- `lib/grammars.ts` (service, 1KB)
- `lib/systemPrompt.ts` (service, 14KB)
- `types/index.ts` (file, 0KB)

### Internal Dependencies
- `hooks/useAgentEngine.ts` → `hooks/useDocumentProcessor.ts`
- `hooks/useAgentEngine.ts` → `lib/ContextFoldingService.ts`
- `hooks/useAgentEngine.ts` → `lib/FactExtractionService.ts`
- `hooks/useAgentEngine.ts` → `lib/KnowledgeManager.ts`
- `hooks/useAgentEngine.ts` → `lib/PromptService.ts`
- `hooks/useAgentEngine.ts` → `lib/WisdomService.ts`
- `hooks/useAgentEngine.ts` → `lib/systemPrompt.ts`
- `hooks/useAgentEngine.ts` → `types/index.ts`
- `hooks/useDocumentProcessor.ts` → `hooks/useFileAttachment.ts`
- `hooks/useDocumentProcessor.ts` → `lib/PromptService.ts`
- `lib/FactExtractionService.ts` → `lib/KnowledgeManager.ts`
- `lib/FactExtractionService.ts` → `lib/grammars.ts`
- `lib/PromptService.ts` → `lib/systemPrompt.ts`
- `lib/PromptService.ts` → `types/index.ts`

---

## ⚠️ Integrity Alerts (Orphaned / Unconnected Nodes)
- 🔴 `android/app/src/main/java/com/christeck/aidiary/LlmForegroundService.kt` — 0 connections
- 🔴 `android/app/src/main/java/com/christeck/aidiary/LlmProtectionModule.kt` — 0 connections
- 🔴 `android/app/src/main/java/com/christeck/aidiary/LlmProtectionPackage.kt` — 0 connections
- 🔴 `android/app/src/main/java/com/christeck/aidiary/PdfToImageModule.kt` — 0 connections
- 🔴 `android/app/src/main/java/com/christeck/aidiary/PdfToImagePackage.kt` — 0 connections
- 🔴 `android/react-settings-plugin/bin/main/expo/plugins/ReactSettingsPlugin.kt` — 0 connections
- 🔴 `android/react-settings-plugin/src/main/kotlin/expo/plugins/ReactSettingsPlugin.kt` — 0 connections
- 🔴 `components/MemoryProvider.web.tsx` — 0 connections
- 🔴 `components/haptic-tab.tsx` — 0 connections
- 🔴 `components/ui/icon-symbol.ios.tsx` — 0 connections
- 🔴 `hooks/use-color-scheme.ts` — 0 connections
- 🔴 `hooks/use-color-scheme.web.ts` — 0 connections
- 🔴 `hooks/useAppLlm.web.ts` — 0 connections
- 🔴 `hooks/useExperimentalWalkieTalkie.ts` — 0 connections
- 🔴 `hooks/useVoiceMetrics.ts` — 0 connections
- 🔴 `lib/PdfToImage.ts` — 0 connections
- 🔴 `lib/SemanticService.ts` — 0 connections
- 🔴 `lib/SherpaSpeechService.ts` — 0 connections