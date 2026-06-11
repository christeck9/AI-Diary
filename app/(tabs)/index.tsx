// 🚨 MANDATORY: CHECK DESIGN_PROTOCOL_v1.8.0.md BEFORE MODIFYING UI OR LOGIC.
import { MatrixRain } from '@/components/MatrixRain';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FlashList } from '@shopify/flash-list';
import * as Battery from 'expo-battery';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Keyboard, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { Directions, Gesture, GestureDetector, Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInDown, FadeOutUp, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSQLiteContext } from '../../components/MemoryProvider';
import { IntroModal } from '../../components/modals/IntroModal';
import { OnboardingModal } from '../../components/modals/OnboardingModal';
import { ProfileModal } from '../../components/modals/ProfileModal';
import { PsyTestModal, MBTI_QUESTIONS, PSY_QUESTIONS } from '../../components/modals/PsyTestModal';
import { TestsMenuModal } from '../../components/modals/TestsMenuModal';
import { VaultExplorerModal } from '../../components/modals/VaultExplorerModal';
import { VoiceSettingsModal } from '../../components/modals/VoiceSettingsModal';
import { VoiceOverlay } from '../../components/modals/VoiceOverlay';
import { SanctuaryHeader } from '../../components/SanctuaryHeader';
import { WhispAvatar } from '../../components/ui/WhispAvatar';
import { getAnimaMessage } from '../../db/zenGardenSchema';
import { useTodos } from '../../hooks/useTodos';
import { MarqueeText } from '../../components/ui/MarqueeText';

import { useLanguage } from '../../contexts/LanguageContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useLlm } from '../../contexts/LlmContext';
import { useVoiceContext } from '../../contexts/VoiceContext';
import { useAgentEngine } from '../../hooks/useAgentEngine';
import type { ModelInfo } from '../../hooks/useAppLlm';
import { settingsService } from '../../lib/SettingsService';

import { useFileAttachment } from '../../hooks/useFileAttachment';
import { useInteractiveVoice } from '../../hooks/useInteractiveVoice';
import { useVoice } from '../../hooks/useVoice';
import { VAULT_DIR, ensureVaultDir } from '../../lib/vault';
import { CompactDownloadOverlay } from '../../components/SanctuaryUI';
import { micService } from '../../lib/UnifiedMicService';
import { CONSCIOUSNESS_CONFIG, WAIT_PHRASES_ES, WAIT_PHRASES_EN } from '../../constants/NeuralConstants';
import { Message, MessageItem } from '../../components/ui/MessageItem';
import { CognitiveNode } from '../../components/ui/CognitiveNode';

export default function NeuralLinkScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, activeTheme, setTheme } = useAppTheme();
  const db = useSQLiteContext();
  const { lang, setLang, t } = useLanguage();

  const { todos, refreshTodos } = useTodos();
  const [currentTodoIndex, setCurrentTodoIndex] = useState(0);

  useFocusEffect(
    useCallback(() => {
      refreshTodos();
    }, [refreshTodos])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      refreshTodos();
      setCurrentTodoIndex((prev) => prev + 1);
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshTodos]);

  const activeTodo = todos.length > 0 ? todos[currentTodoIndex % todos.length] : null;

  const { status: statusRaw,
    isDownloading,
    downloadingModel,
    activeModel,
    selectModel,
    downloadModel,
    loadModel,
    resetToHome,
    llamaContextRef,
    generateStreamingResponse,
    abortGeneration,
    AVAILABLE_MODELS,
    downloadedMB,
    downloadSpeed,
    downloadPercent,
    currentContextSize,
    deviceRAM,
    prefillContextLlm,
    generateEmbeddings } = useLlm();
  const status = statusRaw as any;

  const { attachedFile, isProcessing: isFileProcessing, pickDocument, clearAttachment, buildFileContext, extractTextInChunks } = useFileAttachment(lang);

  const [processingAttachedFile, setProcessingAttachedFile] = useState<any>(null);
  const [messagesLimit, setMessagesLimit] = useState(50);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [modelExists, setModelExists] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelInfo>(AVAILABLE_MODELS[0]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [canResume, setCanResume] = useState(false);
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const [kebabMenuTop, setKebabMenuTop] = useState(Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 70 : 85);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(false);
  const [showPsyTestModal, setShowPsyTestModal] = useState(false);
  const [showTestsMenuModal, setShowTestsMenuModal] = useState(false);
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showVoiceSettingsModal, setShowVoiceSettingsModal] = useState(false);
  const kebabTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flashListRef = useRef<any>(null);

  const scrollToBottom = useCallback((animated = true) => {
    if (flashListRef.current) {
      setTimeout(() => {
        try {
          flashListRef.current.scrollToEnd({ animated });
        } catch (e) {
          // Avoid scroll crashes
        }
      }, 120);
    }
  }, []);


  const stopKebabTimer = () => {
    if (kebabTimerRef.current) {
      clearTimeout(kebabTimerRef.current);
      kebabTimerRef.current = null;
    }
  };

  const startKebabTimer = () => {
    stopKebabTimer();
    kebabTimerRef.current = setTimeout(() => {
      setShowKebabMenu(false);
    }, 5000);
  };
  const [showVoiceNoteModal, setShowVoiceNoteModal] = useState(false);
  const [micPhase, setMicPhase] = useState<'idle' | 'permission' | 'init' | 'warming_up' | 'ready'>('idle');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [selectedContextMsg, setSelectedContextMsg] = useState<Message | null>(null);
  const [psyStep, setPsyStep] = useState(0);
  const [psyAnswers, setPsyAnswers] = useState<number[]>([]);
  const [activeTest, setActiveTest] = useState<'ocean' | 'aptitude' | 'vocational' | 'anxiety' | 'mood' | 'mbti'>('ocean');
  const [psyProfile, setPsyProfile] = useState({ O: 0, C: 0, E: 0, A: 0, N: 0, D: 0, L: 0, moodBalance: 0, mbtiType: '' });
  const [psyCompleted, setPsyCompleted] = useState(false);
  const [userProfile, setUserProfile] = useState<any>({ name: '', nickname: '', work: '', likes: '', values: [], shortTermGoal: '', longTermGoal: '', responseStyle: [] });
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [consciousnessLevel, setConsciousnessLevel] = useState(1); // Default: Zen
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [manualEcoMode, setManualEcoMode] = useState(false);
  const [isEcoMode, setIsEcoMode] = useState(false);
  const [animaMessage, setAnimaMessage] = useState('');

  const fetchAnimaMessage = useCallback(async () => {
    if (db) {
      try {
        const msg = await getAnimaMessage(db, lang);
        setAnimaMessage(msg);
      } catch (e) {
        console.error('Error fetching anima message:', e);
      }
    }
  }, [db, lang]);

  useEffect(() => {
    fetchAnimaMessage();
  }, [fetchAnimaMessage, messages]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAnimaMessage();
    });
    return unsubscribe;
  }, [navigation, fetchAnimaMessage]);

  // 🔍 Sanctuary SEARCH STATES
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsService.get();
        if (settings.manualEcoMode) setManualEcoMode(true);
      } catch (e) { console.log('Error loading settings', e); }

    };
    loadSettings();
  }, []);

  useEffect(() => {
    const checkBattery = async () => {
      const level = await Battery.getBatteryLevelAsync();
      setBatteryLevel(level);
      const batteryTrigger = level > 0 && level <= 0.20;
      setIsEcoMode(manualEcoMode || batteryTrigger);
    };
    checkBattery();
    const sub = Battery.addBatteryLevelListener(({ batteryLevel: b }) => {
      setBatteryLevel(b);
      const batteryTrigger = b > 0 && b <= 0.20;
      setIsEcoMode(manualEcoMode || batteryTrigger);
    });
    return () => sub.remove();
  }, [manualEcoMode]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const addSystemMessage = useCallback((text: string) => {
    const msgId = `sys-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    setMessages(prev => [...prev, { id: msgId, role: 'ai', text, created_at: Date.now() }]);
  }, []);

  // 🛡️ FORENSIC SCANNER LOGIC (FTS5)
  const loadMessages = useCallback(async (query: string = '') => {
    if (!db) return;
    try {
      let results: Message[] = [];
      if (query.trim()) {
        setIsFiltering(true);
        // Búsqueda Forense con FTS5 (Sintaxis válida: "query"*)
        results = await db.getAllAsync<Message>(
          'SELECT * FROM messages WHERE id IN (SELECT id FROM memory_fts WHERE text MATCH ?) ORDER BY created_at ASC',
          [`"${query}"*`]
        );
      } else {
        setIsFiltering(false);
        results = await db.getAllAsync<Message>(
          'SELECT * FROM messages ORDER BY created_at DESC LIMIT ?',
          [messagesLimit]
        );
        results.reverse();
      }

      if (results.length === 0 && !query) {
        setMessages([{ id: `welcome-${Date.now()}`, role: 'ai', text: t('chat.welcome'), created_at: Date.now() }]);
      } else {
        setMessages(results);
      }
    } catch (e) {
      console.error('[LOAD_MESSAGES] Error:', e);
    }
  }, [db, t, messagesLimit]);

  // Debounced Search Logic
  useEffect(() => {
    if (isSearching) {
      const timer = setTimeout(() => {
        loadMessages(searchQuery);
      }, 400);
      return () => clearTimeout(timer);
    } else {
      loadMessages('');
    }
  }, [searchQuery, isSearching, messagesLimit, loadMessages]);

  const { voice, isInteractiveRequested, setIsInteractiveRequested } = useVoiceContext();
  const dictation = voice;

  // --- UI DEBOUNCE LOGIC FOR DICTATION ---
  const [uiIsCapturing, setUiIsCapturing] = useState(false);
  const [isWarmupActive, setIsWarmupActive] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (dictation.isListening) {
      setIsWarmupActive(true);
      const timer = setTimeout(() => {
        setIsWarmupActive(false);
      }, 5000); // 5 seconds of forced green state at startup
      return () => clearTimeout(timer);
    } else {
      setIsWarmupActive(false);
    }
  }, [dictation.isListening]);

  useEffect(() => {
    if (!dictation.isListening) {
      setUiIsCapturing(false);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      return;
    }

    if (isWarmupActive) {
      setUiIsCapturing(true);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      return;
    }

    if (dictation.isVadCapturing) {
      // Voice detected: instant green, clear any pending turn-grey timers
      setUiIsCapturing(true);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    } else {
      // Silence detected: wait 2000ms before turning grey to prevent flickering
      if (uiIsCapturing) {
        // Only start timeout if one isn't already running
        if (!debounceTimeoutRef.current) {
          debounceTimeoutRef.current = setTimeout(() => {
            setUiIsCapturing(false);
            debounceTimeoutRef.current = null;
          }, 2000);
        }
      }
    }
  }, [dictation.isVadCapturing, dictation.isListening, isWarmupActive, uiIsCapturing]);

  // When mic becomes ready, start it in "Green" state (with the 2s grace period)
  useEffect(() => {
    if (micPhase === 'ready' && dictation.isListening) {
      setUiIsCapturing(true);
    }
  }, [micPhase, dictation.isListening]);

  // 🛡️ Guard: si la app vuelve al frente y el modal está abierto pero el mic no está activo, cierra el modal para evitar estado huérfano.
  useEffect(() => {
    const handleAppStateChange = (nextState: string) => {
      if (nextState === 'active' && showVoiceNoteModal) {
        if (!dictation.isListening || !micService.isActive) {
          console.log('[MIC] Stale modal or inactive mic detected on foreground. Force closing.');
          dictation.stopListening().catch(() => {});
          setShowVoiceNoteModal(false);
          setMicPhase('idle');
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [showVoiceNoteModal, dictation.isListening]);

  const {
    voiceState,
    toggleInteractiveMode,
    toggleMute,
    isWhisperReady,
    isInitializing: isVoiceInitializing,
    transcript,
    voiceError,
    availableVoices,
    selectedVoiceId,
    setSelectedVoiceId,
    speak,
    isSpeaking: isVoiceSpeaking,
    queueSpeech,
    clearSpeechQueue,
    startSpeechSession,
    endSpeechSession,
    handleTalkStart,
    handleTalkEnd,
    processingMessage,
    handleInterruptSpeech
  } = useInteractiveVoice(
    lang,
    psyProfile,
    async (text: string, onSentenceGenerated?: (sentence: string) => void, onClearSpeechQueue?: () => void) => {
      const userMsgId = `voice-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const userMsg: Message = { id: userMsgId, role: 'user', text, created_at: Date.now(), status: 'sent' };
      setMessages(prev => [...prev, userMsg]);

      // Run database inserts in parallel without awaiting to minimize latency on starting inference
      db.runAsync('INSERT INTO messages (id, role, text, created_at) VALUES (?, ?, ?, ?)', [userMsg.id, userMsg.role, userMsg.text, userMsg.created_at ?? Date.now()])
        .catch(e => console.error('DB Insert Error (messages):', e));
      db.runAsync('INSERT INTO memory_fts (id, role, text) VALUES (?, ?, ?)', [userMsg.id, userMsg.role, userMsg.text])
        .catch(e => console.error('DB Insert Error (memory_fts):', e));

      const aiResponse = await processMessage(
        text,
        userMsgId,
        setMessages,
        undefined,
        true,
        consciousnessLevel,
        onSentenceGenerated,
        onClearSpeechQueue
      );
      return aiResponse || '';
    },
    () => {
      console.log('[VOICE] User interrupted or muted. Halting LLM engine.');
      abortGeneration();
    },
    voice
  );
  const isMuted = voiceState === 'MUTED';

  // Synchronize interactive mode request from Tools Tab
  useEffect(() => {
    if (isInteractiveRequested) {
      const timer = setTimeout(() => {
        setIsInteractiveRequested(false);
        if (voiceState === 'IDLE') {
          toggleInteractiveMode();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isInteractiveRequested, voiceState]);

  // 🔥 Warm-up Whisper en background al montar la pantalla
  // Esto garantiza latencia ~0 en el primer uso del micrófono de dictado.
  useEffect(() => {
    dictation.warmupModels();
  }, []);

  // Handle openModal deep-linking / redirection from Tools tab
  useEffect(() => {
    if (params.openModal) {
      const modalAction = params.openModal as string;
      console.log('[INDEX] Redirected to open modal:', modalAction);

      // Clean up param so it doesn't trigger again on subsequent renders
      router.setParams({ openModal: '' as any });

      if (modalAction === 'intro') setShowIntroModal(true);
      else if (modalAction === 'profile') setShowProfileModal(true);
      else if (modalAction === 'vault') setShowVaultModal(true);
      else if (modalAction === 'psy') setShowTestsMenuModal(true);
      else if (modalAction === 'voice_settings') setShowVoiceSettingsModal(true);
      else if (modalAction === 'toggle_tts_mute') dictation.toggleTts();
    }
  }, [params.openModal]);

  // 🎤 AUTO-START VOICE
  useEffect(() => {
    if (params.startVoice === 'true' && status === 'ready') {
      setTimeout(() => {
        if (voiceState === 'IDLE') {
          toggleInteractiveMode();
        }
      }, 500);
    }
  }, [params.startVoice, status]);

  const handlePickDocument = async () => {
    try {
      if (voiceState !== 'IDLE') {
        console.log('[CHAT] Stopping active voice/interactive session before launching document picker');
        await toggleInteractiveMode();
      } else if (dictation.isListening) {
        console.log('[CHAT] Stopping active voice note listening before launching document picker');
        await dictation.stopListening();
      }
    } catch (e) {
      console.warn('[CHAT] Error stopping voice session before file pick:', e);
    }
    await pickDocument();
  };

  const {
    isTyping,
    isSearchingWeb,
    searchingStep,
    processingPhase,
    isThinking,
    processMessage,
    isTypingRef,
    queueRef,
    stopGeneration,
    registerInterruption
  } = useAgentEngine(
    lang,
    db,
    activeModel,
    generateStreamingResponse,
    userProfile,
    psyProfile,
    psyCompleted,
    buildFileContext,
    extractTextInChunks,
    speak,
    voiceState,
    abortGeneration,
    currentContextSize,
    llamaContextRef,
    prefillContextLlm,
    generateEmbeddings
  );

  const whispStatus = useMemo((): 'idle' | 'thinking' | 'tired' | 'happy' | 'listening' | 'speaking' => {
    if (voiceState === 'RECORDING' || dictation.isListening) return 'listening';
    if (isVoiceSpeaking || voiceState === 'SPEAKING') return 'speaking';
    if (isTyping || isThinking || processingPhase !== 'idle') return 'thinking';
    if (isEcoMode || batteryLevel <= 0.20) return 'tired';
    if (batteryLevel > 0.70) return 'happy';
    return 'idle';
  }, [voiceState, dictation.isListening, isVoiceSpeaking, isTyping, isThinking, processingPhase, isEcoMode, batteryLevel]);

  const whispStatusLabel = useMemo(() => {
    if (whispStatus === 'listening') return lang === 'es' ? '🎙️ Estoy escuchando...' : "🎙️ I'm listening...";
    if (whispStatus === 'speaking') return lang === 'es' ? '🔊 Estoy hablando...' : "🔊 I'm speaking...";
    if (whispStatus === 'thinking') return lang === 'es' ? '💭 Estoy pensando...' : "💭 I'm thinking...";
    if (whispStatus === 'tired') return lang === 'es' ? '🔋 Tengo poca batería...' : "🔋 My battery is low...";
    if (whispStatus === 'happy') return lang === 'es' ? '✨ ¡Estoy feliz!' : "✨ I'm happy!";
    return animaMessage || (lang === 'es' ? 'Hola, soy IA Diary' : "Hi, I'm AI Diary");
  }, [whispStatus, animaMessage, lang]);

  const whispRightLabel = useMemo(() => {
    if (whispStatus === 'thinking') {
      if (processingPhase === 'reading_file') return lang === 'es' ? 'Leyendo\narchivo...' : 'Reading\nfile...';
      if (processingPhase === 'indexing') return lang === 'es' ? 'Indexando\ncontenido...' : 'Indexing\ncontent...';
      if (isSearchingWeb) return lang === 'es' ? 'Buscando\nen la web...' : 'Searching\nthe web...';
      return lang === 'es' ? 'Pensando...' : 'Thinking...';
    }
    if (whispStatus === 'listening') {
      return lang === 'es' ? 'Escuchando\naudio...' : 'Listening\nto audio...';
    }
    if (whispStatus === 'speaking') {
      return lang === 'es' ? 'Hablando...' : 'Speaking...';
    }
    if (whispStatus === 'tired') {
      return (lang === 'es' ? 'Batería: ' : 'Battery: ') + `${Math.round(batteryLevel * 100)}%`;
    }
    if (whispStatus === 'happy') {
      return (lang === 'es' ? 'Batería: ' : 'Battery: ') + `${Math.round(batteryLevel * 100)}%`;
    }
    if (activeModel) {
      return activeModel[lang === 'es' ? 'labelEs' : 'labelEn'] || 'AI Diary';
    }
    if (whispStatus === 'idle' && activeTodo) {
      const dateTimeStr = activeTodo.target_date || activeTodo.target_time 
        ? ` (${activeTodo.target_date || ''} ${activeTodo.target_time || ''})` 
        : '';
      return `${activeTodo.text}${dateTimeStr}`;
    }
    return lang === 'es' ? 'Sistema\nListo' : 'System\nReady';
  }, [whispStatus, processingPhase, isSearchingWeb, batteryLevel, activeModel, lang, activeTodo]);

  const isSendingRef = useRef(false);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(true);
    }
  }, [messages.length, isTyping, scrollToBottom]);

  useEffect(() => {
    if (keyboardHeight > 0) {
      scrollToBottom(true);
    }
  }, [keyboardHeight, scrollToBottom]);

  // 🛡️ User Input Logic
  const handleInputChange = (text: string) => {
    setInputText(text);
  };

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('tabPress', (e: any) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Removed resetToHome() and setMessages() to avoid clearing chat state when switching tabs
    });

    return () => {
      unsubscribe();
      stopKebabTimer();
    };
  }, [navigation]);

  const voiceStateRef = useRef(voiceState);
  voiceStateRef.current = voiceState;
  const toggleInteractiveModeRef = useRef(toggleInteractiveMode);
  toggleInteractiveModeRef.current = toggleInteractiveMode;
  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  useEffect(() => {
    const unsubscribeBlur = navigation.addListener('blur', () => {
      console.log('[INDEX] Tab blurred. Cleaning up voice resources...');
      // Stop interactive voice if active
      if (voiceStateRef.current !== 'IDLE') {
        toggleInteractiveModeRef.current();
      }
      // 🛡️ Force release all mic sessions including native audio layer
      voiceRef.current.stopListening().catch(() => { });
      voiceRef.current.stopSpeaking().catch(() => { });
      voiceRef.current.releaseResources().catch(() => { });
    });

    const appStateSub = AppState.addEventListener('change', nextOnState => {
      if (nextOnState.match(/inactive|background/)) {
        console.log('[INDEX] App went to background. Cleaning up voice resources...');
        setShowVoiceNoteModal(false);
        setMicPhase('idle');
        if (voiceStateRef.current !== 'IDLE') {
          toggleInteractiveModeRef.current();
        }
        voiceRef.current.stopListening().catch(() => { });
        voiceRef.current.stopSpeaking().catch(() => { });
        // Release mic service to fully free the microphone for other apps
        micService.releaseAllAudioSessions().catch(() => { });
      }
    });

    return () => {
      unsubscribeBlur();
      appStateSub.remove();
    };
  }, [navigation]);



  useEffect(() => {
    let isMounted = true;
    const checkFile = async () => {
      const baseDir = FileSystem.documentDirectory?.replace(/\/+$/, '') + '/llm_models';
      const path = `${baseDir}/${selectedModel.fileName}`;
      const info = await FileSystem.getInfoAsync(path);

      let existsAndValid = false;
      if (info.exists) {
        const size = (info as any).size;
        const expectedBytes = selectedModel.sizeMB * 1024 * 1024 * 0.9;
        let modelValid = typeof size === 'number' ? size > expectedBytes : Number(size) > expectedBytes;

        if (modelValid && selectedModel.mmprojFileName && selectedModel.mmprojSizeMB) {
          const mmprojPath = `${baseDir}/${selectedModel.mmprojFileName}`;
          const mmprojInfo = await FileSystem.getInfoAsync(mmprojPath);
          if (mmprojInfo.exists) {
            const mmprojSize = (mmprojInfo as any).size;
            const expectedMmprojBytes = selectedModel.mmprojSizeMB * 1024 * 1024 * 0.9;
            modelValid = typeof mmprojSize === 'number' ? mmprojSize > expectedMmprojBytes : Number(mmprojSize) > expectedMmprojBytes;
            console.log(`[CHECK_FILE] Model valid: ${modelValid}, Main: ${size}, Mmproj: ${mmprojSize}`);
          } else {
            modelValid = false;
            console.log(`[CHECK_FILE] Mmproj file missing at ${mmprojPath}`);
          }
        } else {
          console.log(`[CHECK_FILE] Size: ${size}, Expected: ${expectedBytes}, Valid: ${modelValid}`);
        }
        existsAndValid = modelValid;
      } else {
        console.log(`[CHECK_FILE] File does not exist at ${path}`);
      }

      let canResumeDownload = false;
      if (!existsAndValid) {
        const resumeStatePath = `${baseDir}/download_resume_${selectedModel.fileName}.json`;
        const resumeInfo = await FileSystem.getInfoAsync(resumeStatePath);
        canResumeDownload = resumeInfo.exists;

        if (Platform.OS === 'android') {
          try {
            const mainFileInfo = await FileSystem.getInfoAsync(path);
            const expectedBytes = selectedModel.sizeMB * 1024 * 1024 * 0.9;
            if (mainFileInfo.exists && (mainFileInfo as any).size > 0 && (mainFileInfo as any).size < expectedBytes) {
              if (!canResumeDownload) {
                // Reconstruct main file resume JSON
                const manualState = {
                  url: selectedModel.url,
                  fileUri: `file://${path}`,
                  options: { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)' } },
                  resumeData: String((mainFileInfo as any).size)
                };
                await FileSystem.writeAsStringAsync(resumeStatePath, JSON.stringify(manualState));
                console.log(`[CHECK_FILE] Reconstructed manual resume JSON for main model at size ${(mainFileInfo as any).size}`);
                canResumeDownload = true;
              }
            } else if (mainFileInfo.exists && (mainFileInfo as any).size >= expectedBytes && selectedModel.mmprojFileName && selectedModel.mmprojUrl && selectedModel.mmprojSizeMB) {
              // Main file is fully downloaded, check mmproj
              const mmprojPath = `${baseDir}/${selectedModel.mmprojFileName}`;
              const mmprojInfo = await FileSystem.getInfoAsync(mmprojPath);
              const mmprojResumePath = `${baseDir}/download_resume_${selectedModel.mmprojFileName}.json`;
              const mmprojResumeInfo = await FileSystem.getInfoAsync(mmprojResumePath);
              const expectedMmprojBytes = selectedModel.mmprojSizeMB * 1024 * 1024 * 0.9;

              let mmprojCanResume = mmprojResumeInfo.exists;
              if (mmprojInfo.exists && (mmprojInfo as any).size > 0 && (mmprojInfo as any).size < expectedMmprojBytes) {
                if (!mmprojCanResume) {
                  // Reconstruct mmproj resume JSON
                  const manualState = {
                    url: selectedModel.mmprojUrl,
                    fileUri: `file://${mmprojPath}`,
                    options: { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)' } },
                    resumeData: String((mmprojInfo as any).size)
                  };
                  await FileSystem.writeAsStringAsync(mmprojResumePath, JSON.stringify(manualState));
                  console.log(`[CHECK_FILE] Reconstructed manual resume JSON for mmproj at size ${(mmprojInfo as any).size}`);
                  mmprojCanResume = true;
                }
              }
              canResumeDownload = mmprojCanResume;
            }
          } catch (reconErr) {
            console.warn('[CHECK_FILE] Error reconstructing resume JSON:', reconErr);
          }
        }
      }

      if (isMounted) {
        setModelExists(existsAndValid);
        setCanResume(canResumeDownload);
      }
    };
    checkFile();

    return () => { isMounted = false; };
  }, [selectedModel, status]);

  const heartbeatAnim = useSharedValue(0); // For Neuronal Heartbeat
  const hasSentSystemPromptRef = useRef(false);

  useEffect(() => {
    isTypingRef.current = isTyping;
    // Neuronal Heartbeat Logic (Reanimated)
    if (isTyping) {
      heartbeatAnim.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 800 }),
          withTiming(0, { duration: 800 })
        ),
        -1, // infinite
        true // reverse
      );
    } else {
      heartbeatAnim.value = withTiming(0, { duration: 300 });
    }
  }, [isTyping]);

  const [waitPhrase, setWaitPhrase] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const phrases = lang === 'es' ? WAIT_PHRASES_ES : WAIT_PHRASES_EN;
    if (status === 'downloading' || status === 'loading') {
      setWaitPhrase(phrases[0]);
      interval = setInterval(() => {
        setWaitPhrase(prev => {
          const idx = phrases.indexOf(prev);
          return phrases[(idx + 1) % phrases.length];
        });
      }, 6500);
    }
    return () => clearInterval(interval);
  }, [status, lang]);

  useEffect(() => {
    const loadInitialData = async () => {
      if (!db) return;
      try {
        // Load User Profile
        const profileRes: any[] = await db.getAllAsync('SELECT * FROM user_profile LIMIT 1');
        if (profileRes && profileRes.length > 0) {
          setUserProfile({
            name: profileRes[0].name || '',
            nickname: profileRes[0].nickname || '',
            work: profileRes[0].work || '',
            likes: profileRes[0].likes || '',
            values: profileRes[0].values_tags ? JSON.parse(profileRes[0].values_tags) : [],
            shortTermGoal: profileRes[0].short_term_goal || '',
            longTermGoal: profileRes[0].long_term_goal || '',
            responseStyle: profileRes[0].response_style_tags ? JSON.parse(profileRes[0].response_style_tags) : []
          });
        }

        // Load Psy Profile
        const psyRes: any[] = await db.getAllAsync('SELECT * FROM psy_profile LIMIT 1');
        if (psyRes && psyRes.length > 0) {
          setPsyProfile({ O: psyRes[0].O, C: psyRes[0].C, E: psyRes[0].E, A: psyRes[0].A, N: psyRes[0].N, D: psyRes[0].D, L: psyRes[0].L, moodBalance: psyRes[0].mood_balance ?? 0, mbtiType: psyRes[0].mbti_type ?? '' });
          setPsyCompleted(true);
        }

        // Check Onboarding Status
        const onboardRes: any[] = await db.getAllAsync('SELECT * FROM onboarding_status WHERE id = 1 LIMIT 1');
        const onboardingDone = onboardRes && onboardRes.length > 0 && onboardRes[0].completed === 1;
        if (!onboardingDone) {
          setIsOnboardingComplete(false);
        }

        // 🛡️ SANITIZE SESSION: Clean up garbage, empty, or unclosed thought AI messages in the database
        try {
          const garbage = await db.getAllAsync<{ id: string }>(
            `SELECT id FROM messages WHERE role = 'ai' AND (
              text IS NULL OR
              TRIM(text) = '' OR
              LENGTH(TRIM(text)) < 3 OR
              (text LIKE '%<thought>%' AND text NOT LIKE '%</thought>%') OR
              (text LIKE '%<|thought|%' AND text NOT LIKE '%</|thought|%') OR
              (text LIKE '%<think>%' AND text NOT LIKE '%</think>%') OR
              (text LIKE '%<|think|%' AND text NOT LIKE '%</|think|%') OR
              (text LIKE '%<sentinel>%' AND text NOT LIKE '%</sentinel>%') OR
              (text LIKE '%<tool_call>%' AND text NOT LIKE '%</tool_call>%') OR
              (text LIKE '%<tool_query>%' AND text NOT LIKE '%</tool_query>%') OR
              (text LIKE '%Thinking Process%' AND LENGTH(text) < 50)
            )`
          );
          if (garbage && garbage.length > 0) {
            const ids = garbage.map(g => g.id);
            for (const id of ids) {
              await db.runAsync('DELETE FROM messages WHERE id = ?', [id]);
              await db.runAsync('DELETE FROM memory_fts WHERE id = ?', [id]);
            }
            console.log(`[SANITIZE] Purged ${ids.length} garbage/corrupted AI messages from history.`);
          }
        } catch (e) {
          console.warn('[SANITIZE] Error cleaning database history:', e);
        }

        // 🛡️ ROBUSTNESS: Load history from DB instead of resetting it
        await loadMessages();
      } catch (error) {
        console.error('Initial data load error:', error);
        setMessages([]);
      }
    };
    loadInitialData();
  }, [db, loadMessages]);

  // System notification when model becomes ready
  useEffect(() => {
    if (status === 'ready' && selectedModel) {
      const totalSize = selectedModel.sizeMB + (selectedModel.mmprojSizeMB || 0);
      addSystemMessage(`${t('model.system')}: ${(selectedModel[lang === 'es' ? 'labelEs' : 'labelEn'] || '').toUpperCase()} (${totalSize} MB) ${t('model.ready')}`);
      loadMessages('');
    }
  }, [status, activeModel, loadMessages, selectedModel, t, lang]);

  const handleLoad = useCallback(async () => {
    // 🛡️ Guard: never interrupt an active background download
    if (isDownloading) {
      if (Platform.OS === 'android') {
        const ToastAndroid = require('react-native').ToastAndroid;
        ToastAndroid.show(
          lang === 'es'
            ? 'Descarga en progreso. Espera a que finalice.'
            : 'Download in progress. Please wait for it to finish.',
          ToastAndroid.LONG
        );
      }
      return;
    }
    try {
      if (Platform.OS === 'android') {
        const ToastAndroid = require('react-native').ToastAndroid;
        ToastAndroid.show(lang === 'es' ? 'Activando AI Diary...' : 'Activating AI Diary...', ToastAndroid.SHORT);
      }
      if (selectedModel.id !== activeModel.id) {
        selectModel(selectedModel);
      }
      // Si estamos en Eco-Mode, forzamos menos hilos para cuidar la batería
      const loadOptions = isEcoMode ? { n_threads: 2 } : undefined;
      await loadModel(selectedModel, loadOptions);
    } catch (e: any) {
      addSystemMessage(`[SYSTEM ERROR]: ${e.message}`);
    }
  }, [isDownloading, lang, selectedModel, activeModel, selectModel, isEcoMode, loadModel, addSystemMessage]);

  const handleDownload = useCallback(async () => {
    const totalSize = selectedModel.sizeMB + (selectedModel.mmprojSizeMB || 0);
    const dlMsg: Message = {
      id: Date.now().toString(),
      role: 'ai',
      text: `${t('model.system')}: ${t('model.startDownload')} ${selectedModel[lang === 'es' ? 'labelEs' : 'labelEn']} (${totalSize} MB)...`,
      created_at: Date.now()
    };
    setMessages(prev => [...prev, dlMsg]);

    try {
      await downloadModel(selectedModel);
      const doneMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: `${t('model.system')}: ${selectedModel[lang === 'es' ? 'labelEs' : 'labelEn']} ${t('model.downloaded')}`,
        created_at: Date.now() + 1
      };
      setMessages(prev => [...prev, doneMsg]);
    } catch (e: any) {
      const errorStr = String(e?.message || e);
      let friendlyMessage = '';

      if (
        errorStr.toLowerCase().includes('abort') ||
        errorStr.toLowerCase().includes('connection') ||
        errorStr.toLowerCase().includes('network') ||
        errorStr.toLowerCase().includes('timeout')
      ) {
        friendlyMessage = lang === 'es'
          ? 'La descarga se pausó temporalmente (por inactividad o cambio de red). No te preocupes, puedes reanudarla tocando el botón de descarga nuevamente.'
          : 'The download was temporarily paused (due to inactivity or network change). Do not worry, you can resume it by tapping the download button again.';
      } else if (errorStr.toLowerCase().includes('space') || errorStr.toLowerCase().includes('disk')) {
        friendlyMessage = lang === 'es'
          ? 'Espacio de almacenamiento insuficiente. Por favor, libera algo de espacio en tu dispositivo e inténtalo de nuevo.'
          : 'Insufficient storage space. Please free up some space on your device and try again.';
      } else {
        friendlyMessage = lang === 'es'
          ? `La descarga se interrumpió: ${errorStr}. Puedes intentar reanudarla.`
          : `The download was interrupted: ${errorStr}. You can try to resume it.`;
      }

      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        text: `${t('model.system')}: ⚠️ ${friendlyMessage}`,
        created_at: Date.now() + 1
      };
      setMessages(prev => [...prev, errorMsg]);
    }
  }, [t, selectedModel, lang, downloadModel]);

  // Helper 1: Assemble user message payload
  const assembleMessagePayload = useCallback((text: string, file: any): {
    displayText: string;
    promptText: string;
    userMsg: Message;
  } => {
    const isImage = file?.type === 'image' || file?.name.match(/\.(jpg|jpeg|png|webp)$/i);
    const fileLabel = file ? `${isImage ? '📸' : '📄'} ${file.name}\n` : '';
    const visionTag = isImage ? '[VISIÓN] ' : '';
    const displayText = fileLabel + (text || (lang === 'es' ? 'Analiza este archivo' : 'Analyze this file'));
    const promptText = visionTag + (text || (lang === 'es' ? 'Analiza el archivo adjunto y dime un resumen.' : 'Analyze the attached file and give me a summary.'));
    
    const userMsgId = `user-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      text: displayText,
      imageUri: file?.type === 'image' ? file.uri : undefined,
      created_at: Date.now(),
      status: isTypingRef.current ? 'pending' : 'sent'
    };

    return { displayText, promptText, userMsg };
  }, [lang]);

  // Helper 2: Persist user message to SQLite database
  const persistUserMessage = useCallback(async (msg: Message) => {
    if (!db) return;
    try {
      await db.runAsync('INSERT INTO messages (id, role, text, created_at) VALUES (?, ?, ?, ?)', [msg.id, msg.role, msg.text, msg.created_at ?? Date.now()]);
      await db.runAsync('INSERT INTO memory_fts (id, role, text) VALUES (?, ?, ?)', [msg.id, msg.role, msg.text]);
    } catch (e) {
      console.error('[DATABASE PERSISTENCE ERROR]:', e);
    }
  }, [db]);

  const handleSend = useCallback(async () => {
    if (isTypingRef.current || isSendingRef.current) return;
    isSendingRef.current = true;

    // Dismiss keyboard on send button press
    Keyboard.dismiss();

    // Clear speech queue and stop any ongoing TTS speech
    clearSpeechQueue();

    const textToProcess = inputText.trim();
    if (!textToProcess && !attachedFile) {
      isSendingRef.current = false;
      return;
    }

    if (status !== 'ready') {
      addSystemMessage(lang === 'es' ? '⚠️ El modelo aún no está listo. Por favor, cárgalo primero.' : '⚠️ Model is not ready yet. Please load it first.');
      isSendingRef.current = false;
      return;
    }

    const { promptText, userMsg } = assembleMessagePayload(textToProcess, attachedFile);

    setInputText('');
    setMessages(prev => [...prev, userMsg]);

    await persistUserMessage(userMsg);

    const localFile = attachedFile;
    if (attachedFile) {
      setProcessingAttachedFile(attachedFile);
    }
    clearAttachment();

    startSpeechSession();

    try {
      await processMessage(
        promptText,
        userMsg.id,
        setMessages,
        localFile,
        false,
        consciousnessLevel,
        queueSpeech,
        clearSpeechQueue
      );
    } catch (e: any) {
      addSystemMessage(`[PROCESS ERROR]: ${e.message}`);
    } finally {
      endSpeechSession();
      setProcessingAttachedFile(null);
      isSendingRef.current = false;
    }
  }, [inputText, attachedFile, status, lang, addSystemMessage, assembleMessagePayload, persistUserMessage, processMessage, consciousnessLevel, queueSpeech, clearSpeechQueue, startSpeechSession, endSpeechSession]);

  const triggerProfile = useCallback((type: 'ocean' | 'aptitude' | 'vocational' | 'anxiety' | 'mood' | 'mbti' | 'basic') => {
    if (type !== 'basic') {
      setActiveTest(type);
      setPsyStep(0);
      setPsyAnswers([]);
      setShowPsyTestModal(true);
      return;
    }

    const userMsgId = `psy-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const prompt = lang === 'es' ? "Quiero que me hagas unas preguntas básicas para conocerme mejor (cómo llamarme, mi trabajo, y mi propósito para ti). Sé amigable." : "I want you to ask me some basic profiling questions to get to know me (how to address me, my job, and my purpose for you). Be friendly.";

    const userMsg: Message = {
      id: userMsgId, role: 'user', text: prompt, created_at: Date.now(), status: 'sent'
    };

    setMessages(prev => [...prev, userMsg]);
    db?.runAsync('INSERT INTO messages (id, role, text, created_at) VALUES (?, ?, ?, ?)', [userMsg.id, userMsg.role, userMsg.text, userMsg.created_at ?? Date.now()]).catch(() => { });

    processMessage(prompt, userMsgId, setMessages);
  }, [lang, db, processMessage]);

  // ── Home Reset ──
  const handleHomeReset = useCallback(async () => {
    await resetToHome();
    if (db) {
      await db.runAsync('DELETE FROM messages');
      await db.runAsync('DELETE FROM memory_fts');
    }
    setMessages([{ id: `welcome-${Date.now()}`, role: 'ai', text: t('chat.welcome'), created_at: Date.now() }]);
    setInputText('');
    setSelectedModel(AVAILABLE_MODELS[0]);
    setShowModelPicker(false);
    setShowKebabMenu(false);
  }, [resetToHome, db, t, AVAILABLE_MODELS]);

  const getModelDesc = (model: ModelInfo) => {
    if (model.id === 'gemma4-2b') return t('model.2b.desc');
    if (model.id === 'gemma4-4b') return t('model.4b.desc');
    return (model as any).description || (lang === 'es' ? model.descEs : model.descEn);
  };

  const handleReportMessage = useCallback((msgId: string) => {
    Alert.alert(
      lang === 'es' ? 'Reportar Contenido' : 'Report Content',
      lang === 'es' ? '¿Consideras este contenido inapropiado o dañino? Se eliminará permanentemente de tu dispositivo.'
        : 'Do you consider this content inappropriate or harmful? It will be permanently removed from your device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: lang === 'es' ? 'ELIMINAR' : 'DELETE',
          style: 'destructive',
          onPress: async () => {
            try {
              // Borrar de la DB
              if (db) {
                await db.runAsync('DELETE FROM messages WHERE id = ?', [msgId]);
                await db.runAsync('DELETE FROM memory_fts WHERE id = ?', [msgId]);
              }
              // Borrar del estado
              setMessages(prev => prev.filter(m => m.id !== msgId));
              // Notificar al sistema
              addSystemMessage(lang === 'es' ? 'Contenido eliminado por seguridad local.' : 'Content removed for local safety.');
            } catch (e) { console.error(e); }
          }
        }
      ]
    );
  }, [lang, db, addSystemMessage]);

  // ── Pinch to Zoom Logic for Full Screen Viewer (Reanimated Native) ──
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = e.scale;
    })
    .onEnd(() => {
      scale.value = withTiming(1, { duration: 300 });
    });

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      translateX.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });
    });

  const composedGestures = Gesture.Race(pinchGesture, panGesture);

  const handleImagePress = useCallback((uri: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFullScreenImage(uri);
  }, []);

  const renderMessage = useCallback(({ item, index }: { item: Message, index: number }) => {
    const isLatest = index === messages.length - 1;
    return (
      <MessageItem
        item={item}
        colors={colors}
        isAi={item.role === 'ai'}
        isLatest={isLatest}
        isTyping={isTyping}
        processingPhase={processingPhase}
        lang={lang}
        onReport={handleReportMessage}
        onLongPress={setSelectedContextMsg}
        onImagePress={handleImagePress}
      />
    );
  }, [messages.length, colors, isTyping, processingPhase, lang, handleReportMessage, handleImagePress]);

  const onKebabAction = useCallback(async (action: string) => {
    if (action === 'intro') setShowIntroModal(true);
    if (action === 'profile') setShowProfileModal(true);
    if (action === 'vault') setShowVaultModal(true);
    if (action === 'psy') setShowTestsMenuModal(true);
    if (action === 'voice_settings') setShowVoiceSettingsModal(true);
    if (action === 'toggle_tts_mute') {
      dictation.toggleTts();
    }
    if (action === 'clear') {
      Alert.alert(
        lang === 'es' ? '¿Borrar Historial?' : 'Clear History?',
        lang === 'es' ? 'Se eliminarán todos los mensajes. Esta acción es irreversible.' : 'All messages will be deleted. This action is permanent.',
        [
          { text: lang === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
          {
            text: lang === 'es' ? 'Borrar Todo' : 'Clear All',
            style: 'destructive',
            onPress: async () => {
              if (db) {
                await db.runAsync('DELETE FROM messages');
                await db.runAsync('DELETE FROM memory_fts');
              }
              const welcomeId = `welcome-${Date.now()}`;
              setMessages([{ id: welcomeId, role: 'ai', text: t('chat.welcome'), created_at: Date.now() }]);
            }
          }
        ]
      );
    }
  }, [lang, db, t]);

  const handleHeaderHomePress = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await resetToHome();
  }, [resetToHome]);

  const handleModelPress = useCallback(() => {
    if (status === 'ready') {
      setShowModelPicker(prev => !prev);
    }
  }, [status]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: activeTheme === 'matrix' ? '#000000' : colors.background }]}>
        {activeTheme === 'matrix' && <MatrixRain paused={isTyping} />}
        <SanctuaryHeader
          onVoicePress={() => {
            // CHAT VOICE: prende / apaga la voz de la IA (TTS)
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            dictation.toggleTts();
          }}
          isMuted={voiceState === 'MUTED' || (voiceState === 'IDLE' && dictation.isMuted)}
          chatTtsEnabled={dictation.ttsEnabled}
          onKebabAction={onKebabAction}
          onHomePress={handleHeaderHomePress}
          onModelPress={handleModelPress}
          activeModelLabel={status === 'ready' && activeModel ? activeModel[lang === 'es' ? 'labelEs' : 'labelEn'] : undefined}
          showKebabMenu={showKebabMenu}
          onKebabPress={(calculatedTop) => {
            if (calculatedTop !== undefined) {
              setKebabMenuTop(calculatedTop);
            }
            const next = !showKebabMenu;
            setShowKebabMenu(next);
            if (next) startKebabTimer();
            else stopKebabTimer();
          }}
          isStreaming={isTyping}
        />
        
        {/* Fila 2: Sub-Barra de Diary Anima (Blob interactivo) - Solo en el Home/Diary */}
        <View style={{
          flexDirection: 'row',
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderTopColor: colors.border,
          borderBottomColor: colors.border,
          backgroundColor: activeTheme === 'matrix' ? 'transparent' : colors.surfaceSecondary,
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: 2,
          paddingHorizontal: 15,
          zIndex: 100, // Menor que el header para que los dropdowns lo cubran
        }}>
          {/* Izquierda: Mensajes simples o saludo */}
          <View style={{ flex: 1, alignItems: 'flex-start' }}>
            <Text style={{ 
              fontSize: 12, 
              fontWeight: 'bold', 
              color: colors.primary, 
              letterSpacing: 0.5,
              fontStyle: 'italic',
            }}>
              {whispStatusLabel}
            </Text>
          </View>

          {/* Centro: Avatar */}
          <View style={{ flex: 1, alignItems: 'center' }}>
            <WhispAvatar status={whispStatus} size={90} />
          </View>

          {/* Derecha: Estados complejos u otros */}
          <View style={{ flex: 1, alignItems: 'flex-end', overflow: 'hidden' }}>
            {whispStatus === 'idle' && activeTodo ? (
              <MarqueeText 
                text={whispRightLabel} 
                style={{ fontSize: 10, color: colors.primary, opacity: 0.8 }} 
                duration={10000} 
                gap={20}
              />
            ) : (
              <Text style={{ 
                fontSize: 10, 
                color: colors.primary, 
                textAlign: 'right',
                opacity: 0.8
              }}>
                {whispRightLabel}
              </Text>
            )}
          </View>
        </View>


        {isEcoMode && (
          <View style={{ backgroundColor: '#d96c6c', padding: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <IconSymbol name="battery.25" size={16} color="#FFF" />
              <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>
                {lang === 'es'
                  ? '🔋 RESERVA DE ENERGÍA: Modo Ecológico activo.'
                  : '🔋 POWER RESERVE: Eco-Mode active.'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={async () => {
                setManualEcoMode(false);
                setIsEcoMode(batteryLevel > 0 && batteryLevel <= 0.20);
                // Persistir preferencia de forma segura (sin sobreescribir otros datos)
                try {
                  await settingsService.set({ manualEcoMode: false });
                } catch (e) { }
              }}
              style={{ padding: 4 }}
            >
              <IconSymbol name="xmark.circle.fill" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        <OnboardingModal
          visible={!isOnboardingComplete}
          lang={lang}
          setLang={setLang}
          colors={colors}
          onboardingStep={onboardingStep}
          setOnboardingStep={setOnboardingStep}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          psyStep={psyStep}
          setPsyStep={setPsyStep}
          psyAnswers={psyAnswers}
          setPsyAnswers={setPsyAnswers}
          setPsyProfile={(p) => setPsyProfile({
            O: p.O,
            C: p.C,
            E: p.E,
            A: p.A,
            N: p.N,
            D: p.D,
            L: p.L,
            moodBalance: p.moodBalance ?? 0,
            mbtiType: p.mbtiType ?? ''
          })}
          setIsOnboardingComplete={setIsOnboardingComplete}
          setPsyCompleted={setPsyCompleted}
          db={db}
        />

        {status !== 'ready' && isOnboardingComplete && (
          <View style={[styles.statusOverlay, { backgroundColor: colors.surfaceSecondary, borderColor: colors.secondary }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '90%', justifyContent: 'center' }}>
              <IconSymbol name="cpu" size={28} color={colors.secondary} style={{ marginRight: 10 }} />
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: 'bold', letterSpacing: 1 }}>
                {t('model.status').toUpperCase()}: {
                  status === 'loading' ? (lang === 'es' ? 'CARGANDO...' : 'LOADING...') :
                    status === 'ready' ? (lang === 'es' ? 'ACTIVO' : 'READY') :
                      status.toUpperCase()
                }
              </Text>
            </View>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: colors.surface,
                paddingHorizontal: 15,
                paddingVertical: 10,
                borderRadius: 12,
                marginTop: 8,
                borderWidth: 1,
                borderColor: colors.border,
                width: '90%'
              }}
              onPress={() => setShowModelPicker(!showModelPicker)}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 'bold' }}>
                  {selectedModel[lang === 'es' ? 'labelEs' : 'labelEn']}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                  {selectedModel.sizeMB + (selectedModel.mmprojSizeMB || 0)} MB — {lang === 'es' ? 'Local' : 'Local'}
                </Text>
              </View>
              <IconSymbol name="chevron.up.chevron.down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Mini Picker Modal para Modelos */}
            {showModelPicker && (
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 12,
                  width: '90%',
                  marginTop: 5,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: 'hidden',
                  elevation: 5,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 4
                }}>
                {AVAILABLE_MODELS.filter(m => !(m as any).experimental).map((model) => {
                  let isDisabled = false;
                  if (model.id === 'gemma4-e2b-q3' && deviceRAM < 8000) isDisabled = true;
                  if (model.id === 'gemma3-4b-q4' && deviceRAM < 6000) isDisabled = true;

                  return (
                  <TouchableOpacity
                    key={model.id}
                    disabled={isDisabled}
                    style={{
                      padding: 15,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                      backgroundColor: selectedModel.id === model.id ? colors.surfaceSecondary : 'transparent',
                      opacity: isDisabled ? 0.4 : 1
                    }}
                    onPress={async () => {
                      setSelectedModel(model);
                      // Si el modelo ya existe, lo seleccionamos en el hook para cargar
                      // Si no existe, solo lo seleccionamos localmente para mostrar el botón de descarga
                      const baseDir = FileSystem.documentDirectory?.replace(/\/+$/, '') + '/llm_models';
                      const modelPath = `${baseDir}/${model.fileName}`;
                      const info = await FileSystem.getInfoAsync(modelPath);

                      if (info.exists) {
                        selectModel(model);
                      }

                      setShowModelPicker(false);
                      try {
                        await settingsService.set({ preferredModel: model.id });
                      } catch (e) { }
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.textPrimary, fontWeight: selectedModel.id === model.id ? 'bold' : 'normal' }}>
                        {model.label}
                      </Text>
                      {isDisabled && (
                        <IconSymbol name="lock.fill" size={14} color={colors.textSecondary} />
                      )}
                    </View>
                    {isDisabled && (
                      <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 4 }}>
                        {lang === 'es' ? 'Requiere más memoria RAM' : 'Requires more RAM'}
                      </Text>
                    )}
                  </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {(status === 'idle' || status === 'downloading') && (
              <View style={{ width: '100%', marginTop: 5, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10, justifyContent: 'center' }}>
                  <Animated.View style={[{ opacity: !modelExists ? 1 : 0.6 }]}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {
                          borderColor: modelExists ? colors.border : (status === 'downloading' ? '#424242' : colors.primary),
                          backgroundColor: modelExists ? 'transparent' : (status === 'downloading' ? '#424242' : colors.primary),
                          borderWidth: modelExists ? 1 : 2,
                          paddingHorizontal: 25,
                          borderRadius: 24
                        }
                      ]}
                      onPress={handleDownload}
                      disabled={modelExists || status === 'downloading'}
                    >
                      <Text style={{ color: modelExists ? colors.textSecondary : (status === 'downloading' ? '#888888' : '#FFF'), fontWeight: 'bold', fontSize: 13 }}>
                        {modelExists ? t('model.download') : (status === 'downloading' || canResume ? t('model.continueDownload') : t('model.download'))}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>

                  <Animated.View style={[{ opacity: (modelExists && status !== 'downloading') ? 1 : 0.6 }]}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        {
                          borderColor: (modelExists && status !== 'downloading') ? colors.secondary : colors.border,
                          backgroundColor: (modelExists && status !== 'downloading') ? colors.secondary : 'transparent',
                          borderWidth: (modelExists && status !== 'downloading') ? 2 : 1,
                          paddingHorizontal: 25,
                          borderRadius: 24
                        }
                      ]}
                      onPress={handleLoad}
                      disabled={!modelExists || status === 'downloading'}
                    >
                      <Text style={{ color: (modelExists && status !== 'downloading') ? '#FFF' : colors.textSecondary, fontWeight: 'bold', fontSize: 13 }}>
                        {lang === 'es' ? 'ACTIVAR AI' : 'ACTIVATE AI'}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
            )}

            {(status === 'downloading' || status === 'loading') && (
              <View style={{ alignItems: 'center', marginTop: 8, width: '90%' }}>
                <CompactDownloadOverlay
                  downloadPercent={downloadPercent}
                  downloadedMB={downloadedMB}
                  totalMB={
                    downloadingModel
                      ? (downloadingModel.sizeMB + (downloadingModel.mmprojSizeMB || 0))
                      : (activeModel ? (activeModel.sizeMB + (activeModel.mmprojSizeMB || 0)) : 0)
                  }
                  downloadSpeed={downloadSpeed}
                  waitPhrase={waitPhrase}
                  colors={colors}
                />
              </View>
            )}
          </View>
        )}

        <View style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }}>
          <View style={{ flex: 1, display: voiceState !== 'IDLE' ? 'none' : 'flex' }}>
            <FlashList
              ref={flashListRef}
              estimatedItemSize={120}
              data={messages.filter(m => m.text.trim() !== '' || (m.role === 'ai' && isTyping && m === messages[messages.length - 1]))}
              keyExtractor={(item) => String(item.id ?? `msg_${item.created_at}`)}
              renderItem={renderMessage}
              contentContainerStyle={styles.chatContainer}
              overScrollMode="never"
              bounces={false}
              extraData={{ isTyping }}
              ListHeaderComponent={
                (!isFiltering && messages.length >= messagesLimit) ? (
                  <TouchableOpacity
                    style={{
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      alignItems: 'center',
                      backgroundColor: colors.surfaceSecondary,
                      marginVertical: 10,
                      borderRadius: 20,
                      alignSelf: 'center',
                      borderWidth: 1,
                      borderColor: colors.border,
                      flexDirection: 'row',
                      gap: 6
                    }}
                    onPress={() => {
                      setMessagesLimit(prev => prev + 50);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={lang === 'es' ? 'Cargar mensajes anteriores' : 'Load older messages'}
                    accessibilityHint={lang === 'es' ? 'Carga 50 mensajes más del historial de conversación' : 'Loads 50 more messages from the conversation history'}
                  >
                    <IconSymbol name="chevron.up" size={14} color={colors.primary} />
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>
                      {lang === 'es' ? 'Cargar mensajes anteriores' : 'Load older messages'}
                    </Text>
                  </TouchableOpacity>
                ) : null
              }
              ListEmptyComponent={
                isSearching ? (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 30, gap: 12 }}>
                    <IconSymbol name="eyeglasses" size={48} color={colors.textSecondary} />
                    <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center', fontWeight: 'bold' }}>
                      {lang === 'es' ? 'No se encontraron memorias...' : 'No matching memories found...'}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center', fontStyle: 'italic' }}>
                      {lang === 'es' ? 'Intenta buscar con palabras clave más generales.' : 'Try searching with more general keywords.'}
                    </Text>
                  </View>
                ) : null
              }
            />
          </View>

          <VoiceOverlay
            voiceState={voiceState}
            isVoiceInitializing={isVoiceInitializing}
            lang={lang}
            colors={colors}
            messages={messages}
            transcript={transcript}
            voiceError={voiceError}
            toggleInteractiveMode={toggleInteractiveMode}
            toggleMute={toggleMute}
            onPressIn={handleTalkStart}
            onPressOut={handleTalkEnd}
            processingMessage={processingMessage}
            onInterrupt={() => {
              handleInterruptSpeech();
              if (registerInterruption) registerInterruption();
            }}
          />

          {/* 🎙 Modal de Dictado — Pipeline asíncrono */}
          {showVoiceNoteModal && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.88)', zIndex: 1000, justifyContent: 'center', alignItems: 'center' }}>
              {/* Botón cerrar */}
              <TouchableOpacity
                style={{ position: 'absolute', top: 50, right: 20, padding: 10, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 }}
                onPress={() => {
                  dictation.stopListening();
                  setShowVoiceNoteModal(false);
                  setMicPhase('idle');
                }}
              >
                <IconSymbol name="xmark" size={24} color="white" />
              </TouchableOpacity>

              {/* Fase: Solicitando permisos */}
              {micPhase === 'permission' && (
                <View style={{ alignItems: 'center', gap: 16, paddingHorizontal: 30 }}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>
                    {lang === 'es' ? '🔐 Verificando permisos...' : '🔐 Checking permissions...'}
                  </Text>
                </View>
              )}

              {/* Fase: Cargando modelo Whisper */}
              {micPhase === 'init' && (
                <View style={{ alignItems: 'center', gap: 16, paddingHorizontal: 30 }}>
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>
                    {lang === 'es' ? '⚡ Iniciando motor de voz...' : '⚡ Starting voice engine...'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, textAlign: 'center' }}>
                    {lang === 'es' ? 'Solo la primera vez tarda un momento.' : 'First time only — takes a moment.'}
                  </Text>
                </View>
              )}

              {/* Fase: Escuchando / Error */}
              {(micPhase === 'ready' || micPhase === 'idle') && (
                  <View style={{ alignItems: 'center', paddingHorizontal: 30, width: '100%' }}>
                    {dictation.voiceError ? (
                      <View style={{ alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 40 }}>⚠️</Text>
                        <Text style={{ color: '#ff6b6b', fontSize: 14, fontWeight: 'bold', textAlign: 'center' }}>
                          {dictation.voiceError}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <IconSymbol
                          name={dictation.isInitializing ? 'waveform' : (uiIsCapturing ? 'waveform' : 'waveform.slash')}
                          size={126}
                          color={uiIsCapturing && !dictation.isInitializing ? '#4cd137' : 'rgba(255,255,255,0.3)'}
                        />
                        <Text style={{ color: 'white', fontSize: 14, marginTop: 18, fontWeight: 'bold', textAlign: 'center' }}>
                          {dictation.isInitializing || !uiIsCapturing
                            ? (lang === 'es' ? 'Iniciando micrófono...' : 'Microphone is starting...')
                            : (lang === 'es' ? 'Listo' : 'Ready')
                          }
                        </Text>

                        {dictation.transcript && !dictation.isInitializing ? (
                          <View style={{ alignItems: 'center', width: '100%' }}>
                            <ScrollView 
                               style={{ maxHeight: 150, width: '100%', marginVertical: 10 }}
                               contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 10 }}
                               showsVerticalScrollIndicator={true}
                            >
                              <Text style={{ color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center', lineHeight: 20 }}>
                                {dictation.transcript}
                              </Text>
                            </ScrollView>

                            <TouchableOpacity
                              style={{
                                backgroundColor: 'white',
                                paddingVertical: 10,
                                paddingHorizontal: 24,
                                borderRadius: 20,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                shadowColor: '#000',
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 4,
                                elevation: 4,
                                marginTop: 10
                              }}
                              onPress={async () => {
                                const textToSend = dictation.transcript;
                                await dictation.stopListening();
                                setShowVoiceNoteModal(false);
                                setMicPhase('idle');
                                if (!textToSend.trim()) return;

                                const cleaned = textToSend.replace(/\[BLANK_AUDIO\]/g, '').replace(/\[ SILENCE \]/g, '').trim();
                                if (!cleaned) return;

                                const userMsgId = `voice-note-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                                const userMsg: Message = { id: userMsgId, role: 'user', text: '🎙️ ' + cleaned, created_at: Date.now(), status: 'sent' };
                                setMessages(prev => [...prev, userMsg]);
                                db.runAsync('INSERT INTO messages (id, role, text, created_at) VALUES (?, ?, ?, ?)', [userMsg.id, userMsg.role, userMsg.text, userMsg.created_at ?? Date.now()]).catch(e => console.error('DB Insert:', e));
                                db.runAsync('INSERT INTO memory_fts (id, role, text) VALUES (?, ?, ?)', [userMsg.id, userMsg.role, userMsg.text]).catch(e => console.error('DB FTS:', e));
                                processMessage(cleaned, userMsgId, setMessages, undefined, true);
                              }}
                            >
                              <IconSymbol name="arrow.up.circle.fill" size={18} color="black" />
                              <Text style={{ color: 'black', fontSize: 12, fontWeight: 'bold' }}>
                                {lang === 'es' ? 'Enviar Audio' : 'Send Audio'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <Text style={{ color: 'white', fontSize: 12, marginTop: 10, textAlign: 'center', fontStyle: 'italic' }}>
                            {dictation.isInitializing || !uiIsCapturing
                              ? (lang === 'es' ? 'Iniciando micrófono...' : 'Microphone is starting...')
                              : (lang === 'es' ? 'Esperando tu voz...' : 'Waiting for your voice...')
                            }
                          </Text>
                        )}
                      </>
                    )}
                  </View>
              )}

              {/* Environment Control Panel (Always visible when listening and not initializing) */}
              {(micPhase === 'ready' || micPhase === 'idle') && !dictation.isInitializing && !dictation.voiceError && (
                <View style={{ position: 'absolute', bottom: 40, left: 30, right: 30, alignItems: 'center' }}>
                  <Text style={{ color: 'white', fontSize: 10, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {lang === 'es' ? 'Entorno (Ruido)' : 'Environment (Noise)'}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 15 }}>
                    <TouchableOpacity 
                      onPress={() => dictation.changeVadLevel?.(Math.max(1, (dictation.vadLevel || 3) - 1))}
                      style={{ padding: 8 }}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: (dictation.vadLevel || 3) > 1 ? 'bold' : 'normal' }}>
                        {lang === 'es' ? 'Silencio' : 'Clean'}
                      </Text>
                    </TouchableOpacity>
                    
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      {[1, 2, 3, 4, 5].map(lvl => (
                        <View 
                          key={lvl} 
                          style={{ 
                            width: 10, 
                            height: lvl === (dictation.vadLevel || 3) ? 14 : 6, 
                            borderRadius: 5, 
                            backgroundColor: lvl === (dictation.vadLevel || 3) ? 'white' : 'rgba(255,255,255,0.25)',
                            borderWidth: 1,
                            borderColor: 'white'
                          }} 
                        />
                      ))}
                    </View>

                    <TouchableOpacity 
                      onPress={() => dictation.changeVadLevel?.(Math.min(5, (dictation.vadLevel || 3) + 1))}
                      style={{ padding: 8 }}
                    >
                      <Text style={{ color: 'white', fontSize: 12, fontWeight: (dictation.vadLevel || 3) < 5 ? 'bold' : 'normal' }}>
                        {lang === 'es' ? 'Ruidoso' : 'Noisy'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* 🛡️ SENTINEL v3.0 — Indicador Dinámico de Fase */}
          {isSearchingWeb && (
            <Animated.View style={{ position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: colors.surfaceSecondary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', zIndex: 100, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 }}>
              <ActivityIndicator size="small" color={searchingStep === 'searching' ? colors.primary : '#00ffcc'} style={{ marginRight: 8 }} />
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 'bold' }}>
                {searchingStep === 'searching'
                  ? (lang === 'es' ? '🌐 Consultando Red de Búsqueda...' : '🌐 Querying Search Network...')
                  : (lang === 'es' ? '🧠 Sintetizando Verdad...' : '🧠 Synthesizing Truth...')}
              </Text>
            </Animated.View>
          )}

          {/* Gemma 4 Reasoning Indicator — visible during <|think|> block before first response token */}
          {isThinking && !isSearchingWeb && (
            <Animated.View
              entering={FadeInDown.duration(250)}
              exiting={FadeOutUp.duration(200)}
              style={{ position: 'absolute', bottom: 100, alignSelf: 'center', backgroundColor: colors.surfaceSecondary, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', zIndex: 100, elevation: 5, shadowColor: '#7B5EA7', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 4 }}
            >
              <ActivityIndicator size="small" color="#a78bfa" style={{ marginRight: 8 }} />
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 'bold' }}>
                {lang === 'es' ? '💭 Gemma está pensando...' : '💭 Gemma is thinking...'}
              </Text>
            </Animated.View>
          )}

          {/* 🔱 BACKGROUND FORGING — removed duplicate black bar; progress is shown in the model card CompactDownloadOverlay */}

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            enabled={Platform.OS === 'ios'}
          >
            {isTyping && processingAttachedFile && (
              <View style={{ backgroundColor: colors.surfaceSecondary, padding: 10, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  {lang === 'es' 
                    ? `Procesando ${processingAttachedFile.name}...` 
                    : `Processing ${processingAttachedFile.name}...`}
                </Text>
              </View>
            )}
            <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, paddingBottom: 5, paddingHorizontal: 10 }]}>
              <TouchableOpacity
                style={{ marginRight: 10, paddingBottom: 5, display: activeModel?.id === 'llama3.2-1b-q4' ? 'none' : 'flex' }}
                onPress={handlePickDocument}
                accessibilityRole="button"
                accessibilityLabel={lang === 'es' ? 'Adjuntar archivo' : 'Attach file'}
                accessibilityHint={lang === 'es' ? 'Permite seleccionar una imagen o documento para analizar' : 'Allows selecting an image or document to analyze'}
              >
                <IconSymbol name="doc.fill" size={28} color={colors.primary} />
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surface, flex: 1 }]}
                value={inputText}
                onChangeText={handleInputChange}
                placeholder={t('chat.placeholder.ready')}
                placeholderTextColor={colors.textSecondary}
                multiline={true}
                returnKeyType="send"
                blurOnSubmit={Platform.OS === 'ios' ? false : true}
                onSubmitEditing={() => {
                  if ((inputText || "").trim() || attachedFile) {
                    handleSend();
                  }
                }}
                onKeyPress={(e) => {
                  // Handle physical keyboard 'Enter' for multiline send
                  if (e.nativeEvent.key === 'Enter' && !(e.nativeEvent as any).shiftKey && Platform.OS !== 'web') {
                    handleSend();
                  }
                }}
              />
              <TouchableOpacity
                style={[styles.sendButton, (!(inputText || "").trim() && !attachedFile && !isTyping) && { opacity: 0.5 }]}
                onPress={isTyping ? stopGeneration : handleSend}
                disabled={(!(inputText || "").trim() && !attachedFile && !isTyping)}
                accessibilityRole="button"
                accessibilityLabel={isTyping ? (lang === 'es' ? 'Detener generación' : 'Stop generation') : (lang === 'es' ? 'Enviar mensaje' : 'Send message')}
                accessibilityHint={isTyping ? (lang === 'es' ? 'Detiene la escritura de la IA' : 'Stops the AI from writing') : (lang === 'es' ? 'Envía el mensaje al core de IA' : 'Sends the message to the AI core')}
              >
                <IconSymbol name={isTyping ? "stop.circle.fill" : "arrow.up.circle.fill"} size={32} color={isTyping ? colors.primary : (((inputText || "").trim() || attachedFile) ? colors.primary : colors.textSecondary)} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendButton, { marginLeft: 10 }]}
                onPress={async () => {
                  if (status !== 'ready') return;

                  // APAGADOR: Si el Walkie-Talkie está activo, apagarlo limpiamente antes de dictar
                  if (voiceState !== 'IDLE') {
                    console.log('[CHAT] Walkie-Talkie active. Turning it off before launching dictation.');
                    await toggleInteractiveMode();
                    // Cooldown limpio: dar tiempo al motor de voz de liberar recursos nativos
                    await new Promise<void>((resolve) => setTimeout(resolve, 200));
                  }

                  setMicPhase('idle');
                  setShowVoiceNoteModal(true);

                  // Pipeline asíncrono: en este modo manual el usuario presiona "Enviar Audio" en la UI.
                  const success = await dictation.startListening(
                    undefined,
                    undefined, // Desactivar auto-envío
                    (phase: 'permission' | 'init' | 'ready') => setMicPhase(phase)
                  );
                  if (!success) {
                    setMicPhase('idle');
                  }
                }}
                disabled={status !== 'ready'}
                accessibilityRole="button"
                accessibilityLabel={lang === 'es' ? 'Grabar nota de voz' : 'Record voice note'}
                accessibilityHint={lang === 'es' ? 'Abre la interfaz para dictar un mensaje con voz' : 'Opens the interface to dictate a voice message'}
              >
                <IconSymbol name="waveform" size={32} color={status === 'ready' ? '#4cd137' : colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: colors.surface,
              paddingHorizontal: 15,
              paddingVertical: 6,
              borderTopWidth: 1,
              borderTopColor: colors.border
            }}>
              {/* TALK: Walkie-Talkie button — estado dinámico */}
              {(() => {
                const isRecording = voiceState === 'RECORDING';
                const isProcessing = voiceState === 'PROCESSING';
                const isSpeakingNow = voiceState === 'SPEAKING';
                const isMutedWT = voiceState === 'MUTED';
                const isActive = voiceState !== 'IDLE';

                const btnColor = isRecording ? '#ff3b30'
                  : isProcessing ? (colors.secondary || '#D4A017')
                  : isSpeakingNow ? (colors.primary)
                  : isMutedWT ? colors.textSecondary
                  : isActive ? colors.primary
                  : colors.textSecondary;

                const btnBg = isRecording ? 'rgba(255,59,48,0.15)'
                  : isActive ? `${colors.primary}25`
                  : colors.surfaceSecondary;

                const btnBorder = isRecording ? '#ff3b30'
                  : isActive ? colors.primary
                  : colors.border;

                const iconName = isRecording ? 'waveform'
                  : isSpeakingNow ? 'waveform'
                  : isMutedWT ? 'waveform.slash'
                  : 'voice.active';

                const labelES = isRecording ? '● REC'
                  : isProcessing ? '⚙ PROC.'
                  : isSpeakingNow ? '🔊 HABLA'
                  : isMutedWT ? '🔇 MUTED'
                  : isActive ? '🎙 LISTO'
                  : 'TALK';

                const labelEN = isRecording ? '● REC'
                  : isProcessing ? '⚙ PROC.'
                  : isSpeakingNow ? '🔊 SPEAK'
                  : isMutedWT ? '🔇 MUTED'
                  : isActive ? '🎙 READY'
                  : 'TALK';

                 return (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: btnBg,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: btnBorder,
                      minWidth: 72,
                    }}
                    onPress={async () => {
                      if (status === 'ready') {
                        await toggleInteractiveMode();
                      } else {
                        Alert.alert(
                          lang === 'es' ? 'Núcleo inactivo' : 'Core inactive',
                          lang === 'es' ? 'Por favor activa el núcleo de IA primero.' : 'Please activate the AI Core first.'
                        );
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={lang === 'es' ? 'Modo Walkie Talkie' : 'Walkie Talkie Mode'}
                    accessibilityHint={lang === 'es' ? 'Activa o desactiva la conversación fluida por voz con la IA' : 'Toggles fluent voice conversation with the AI'}
                  >
                    <IconSymbol
                      name={iconName}
                      size={16}
                      color={btnColor}
                    />
                    <Text style={{
                      marginLeft: 6,
                      fontSize: 11,
                      fontWeight: 'bold',
                      color: btnColor,
                      textTransform: 'uppercase',
                      letterSpacing: 0.3,
                    }}>
                      {lang === 'es' ? labelES : labelEN}
                    </Text>
                  </TouchableOpacity>
                );
              })()}

              {/* Right side group */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* Descripción movida a la derecha */}
                <Text
                  numberOfLines={2}
                  style={{
                    fontSize: 12,
                    lineHeight: 14,
                    color: colors.textSecondary,
                    fontWeight: 'bold',
                    fontStyle: 'italic',
                    marginRight: 12,
                    textAlign: 'right'
                  }}
                >
                  {CONSCIOUSNESS_CONFIG[lang as 'es' | 'en'][consciousnessLevel as 1 | 2 | 3 | 4].desc}
                </Text>

                {/* Derecha: Botón Cabeza/Engrane */}
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: colors.surfaceSecondary,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: colors.border
                  }}
                  onPress={() => {
                    const nextLevel = consciousnessLevel >= 4 ? 1 : consciousnessLevel + 1;
                    setConsciousnessLevel(nextLevel);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={lang === 'es' ? `Nivel de consciencia: ${CONSCIOUSNESS_CONFIG[lang as 'es' | 'en'][consciousnessLevel as 1 | 2 | 3 | 4].label}` : `Consciousness level: ${CONSCIOUSNESS_CONFIG[lang as 'es' | 'en'][consciousnessLevel as 1 | 2 | 3 | 4].label}`}
                  accessibilityHint={lang === 'es' ? 'Cambia el nivel de profundidad cognitiva del modelo' : 'Changes the cognitive depth of the model'}
                >
                  <IconSymbol
                    name="brain.head.profile"
                    size={18}
                    color={
                      consciousnessLevel === 1 ? colors.textSecondary :
                        consciousnessLevel === 2 ? '#4A90D9' : '#D4A017'
                    }
                  />
                  <Text style={{
                    marginLeft: 6,
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: consciousnessLevel === 1 ? colors.textSecondary :
                      consciousnessLevel === 2 ? '#4A90D9' : '#D4A017',
                    textTransform: 'uppercase'
                  }}>
                    {CONSCIOUSNESS_CONFIG[lang as 'es' | 'en'][consciousnessLevel as 1 | 2 | 3 | 4].label}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {attachedFile && (
              <View style={{ backgroundColor: colors.surfaceSecondary, padding: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                {attachedFile.type === 'image' ? (
                  <View style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', position: 'relative', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 1.41 }}>
                    <Image
                      source={{ uri: attachedFile.uri }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={{ position: 'absolute', top: 2, right: 2, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}
                      onPress={clearAttachment}
                    >
                      <Text style={{ color: '#FFF', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, marginRight: 8 }}>{attachedFile.type === 'pdf' ? '📄' : attachedFile.type === 'doc' ? '📝' : '📋'}</Text>
                      <Text numberOfLines={1} style={{ color: colors.textPrimary, fontSize: 13, flex: 1, fontWeight: 'bold' }}>{attachedFile.name}</Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11, marginLeft: 8 }}>{attachedFile.sizeKB}KB</Text>
                    </View>
                    <TouchableOpacity style={{ marginLeft: 12, padding: 4 }} onPress={clearAttachment}>
                      <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </KeyboardAvoidingView>
        </View>

        <ProfileModal
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          lang={lang}
          colors={colors}
          userProfile={userProfile}
          setUserProfile={setUserProfile}
          psyProfile={psyProfile}
          db={db}
        />

        <IntroModal
          visible={showIntroModal}
          onClose={() => setShowIntroModal(false)}
          lang={lang}
          colors={colors}
        />

        <TestsMenuModal
          visible={showTestsMenuModal}
          onClose={() => setShowTestsMenuModal(false)}
          lang={lang}
          colors={colors}
          onSelectTest={(type) => {
            setShowTestsMenuModal(false);
            triggerProfile(type);
          }}
        />


        <PsyTestModal
          visible={showPsyTestModal}
          onClose={() => setShowPsyTestModal(false)}
          lang={lang}
          colors={colors}
          psyProfile={psyProfile}
          psyStep={psyStep}
          setPsyStep={setPsyStep}
          psyAnswers={psyAnswers}
          setPsyAnswers={setPsyAnswers}
          activeTest={activeTest}
          scoreTest={async (type, answers) => {
            if (type === 'ocean') {
              const dims: Record<string, number[]> = { O: [], C: [], E: [], A: [], N: [], D: [], L: [] };
              answers.forEach((ansIdx, i) => {
                const q = PSY_QUESTIONS[i];
                const opt = q?.opts[ansIdx];
                if (opt && opt.dim) {
                  dims[opt.dim].push(opt.val);
                }
              });
              const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0.5;
              const scores = {
                O: avg(dims.O),
                C: avg(dims.C),
                E: avg(dims.E),
                A: avg(dims.A),
                N: avg(dims.N),
                D: avg(dims.D),
                L: avg(dims.L),
                moodBalance: psyProfile.moodBalance,
                mbtiType: psyProfile.mbtiType,
              };
              setPsyProfile(scores);
              setPsyCompleted(true);
              if (db) {
                await db.runAsync('INSERT OR REPLACE INTO psy_profile (id, O, C, E, A, N, D, L, mood_balance, mbti_type) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                  [scores.O, scores.C, scores.E, scores.A, scores.N, scores.D, scores.L, scores.moodBalance, scores.mbtiType]);
              }
            } else if (type === 'mbti') {
              const dims: Record<string, number> = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
              answers.forEach((ansIdx, i) => {
                const opt = MBTI_QUESTIONS[i]?.opts[ansIdx];
                if (opt && opt.dim) dims[opt.dim]++;
              });
              const res = (dims.E >= dims.I ? 'E' : 'I') +
                (dims.S >= dims.N ? 'S' : 'N') +
                (dims.T >= dims.F ? 'T' : 'F') +
                (dims.J >= dims.P ? 'J' : 'P');
              setPsyProfile(prev => {
                const newProfile = { ...prev, mbtiType: res };
                if (db) {
                  db.runAsync('INSERT OR REPLACE INTO psy_profile (id, O, C, E, A, N, D, L, mood_balance, mbti_type) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [newProfile.O, newProfile.C, newProfile.E, newProfile.A, newProfile.N, newProfile.D, newProfile.L, newProfile.moodBalance, newProfile.mbtiType]).catch(err => console.log('[DB_ERROR]', err));
                }
                return newProfile;
              });
            } else if (type === 'mood') {
              const sum = answers.reduce((a, b) => a + b, 0);
              const normalized = sum / (answers.length * 3); // 25 questions * max 3 = 75
              setPsyProfile(prev => {
                const newProfile = { ...prev, moodBalance: normalized };
                if (db) {
                  db.runAsync('INSERT OR REPLACE INTO psy_profile (id, O, C, E, A, N, D, L, mood_balance, mbti_type) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [newProfile.O, newProfile.C, newProfile.E, newProfile.A, newProfile.N, newProfile.D, newProfile.L, newProfile.moodBalance, newProfile.mbtiType]).catch(err => console.log('[DB_ERROR]', err));
                }
                return newProfile;
              });
            }
            console.log(`[TEST_COMPLETE] ${type} scored with ${answers.length} answers.`);
          }}
        />

        <VaultExplorerModal
          visible={showVaultModal}
          onClose={() => setShowVaultModal(false)}
          colors={colors}
          lang={lang}
        />

        <VoiceSettingsModal
          visible={showVoiceSettingsModal}
          onClose={() => setShowVoiceSettingsModal(false)}
          lang={lang}
          colors={colors}
        />

        {/* CONTEXT MENU MODAL */}
        <Modal visible={!!selectedContextMsg} transparent={true} animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              onPress={() => setSelectedContextMsg(null)}
              activeOpacity={1}
            />
            <View style={{ backgroundColor: colors.surface, borderRadius: 20, width: '85%', overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 6.68 }}>
              <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16 }}>{lang === 'es' ? 'Acciones de Mensaje' : 'Message Actions'}</Text>
              </View>

              {selectedContextMsg && (
                <View style={{ padding: 15, borderBottomWidth: 1, borderBottomColor: colors.border, maxHeight: 180, backgroundColor: colors.surfaceSecondary }}>
                  <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled={true}>
                    <Text selectable={true} style={{ color: colors.textPrimary, fontSize: 14, lineHeight: 20 }}>
                      {selectedContextMsg.text}
                    </Text>
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity
                style={{ padding: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}
                onPress={() => {
                  if (selectedContextMsg) {
                    ExpoClipboard.setStringAsync(selectedContextMsg.text);
                    Alert.alert(lang === 'es' ? "Copiado" : "Copied", lang === 'es' ? "Texto copiado al portapapeles." : "Text copied to clipboard.");
                  }
                  setSelectedContextMsg(null);
                }}
              >
                <IconSymbol name="doc.on.doc" size={22} color={colors.primary} style={{ marginRight: 15 }} />
                <Text style={{ color: colors.textPrimary, fontSize: 15 }}>{lang === 'es' ? 'Copiar Texto' : 'Copy Text'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ padding: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}
                onPress={() => {
                  if (selectedContextMsg) {
                    const originalText = selectedContextMsg.text;
                    setSelectedContextMsg(null);
                    if (isTypingRef.current) {
                      addSystemMessage(lang === 'es' ? '⏳ Espera a que termine la respuesta actual.' : '⏳ Wait for the current response to finish.');
                      return;
                    }
                    const prompt = lang === 'es'
                      ? `Haz un análisis profundo y explícame mejor esto que dijiste: "${originalText}"`
                      : `Do a deep analysis and explain better what you said here: "${originalText}"`;
                    setInputText(prompt);
                    // Trigger send
                    setTimeout(() => handleSend(), 100);
                  }
                }}
              >
                <IconSymbol name="brain.head.profile" size={22} color={colors.secondary} style={{ marginRight: 15 }} />
                <Text style={{ color: colors.textPrimary, fontSize: 15 }}>{lang === 'es' ? 'Análisis Profundo' : 'Deep Analysis'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ padding: 18, flexDirection: 'row', alignItems: 'center' }}
                onPress={() => {
                  if (selectedContextMsg) {
                    const idToDel = selectedContextMsg.id;
                    setSelectedContextMsg(null);
                    handleReportMessage(idToDel);
                  }
                }}
              >
                <IconSymbol name="trash" size={22} color="red" style={{ marginRight: 15 }} />
                <Text style={{ color: 'red', fontSize: 15 }}>{lang === 'es' ? 'Eliminar Mensaje' : 'Delete Message'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* FULL SCREEN IMAGE VIEWER WITH PINCH TO ZOOM */}
        <Modal visible={!!fullScreenImage} transparent={true} animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity
              style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 10 }}
              onPress={() => setFullScreenImage(null)}
            >
              <IconSymbol name="xmark" size={30} color="white" />
            </TouchableOpacity>

            <GestureDetector gesture={composedGestures}>
              <Animated.Image
                source={{ uri: fullScreenImage || '' }}
                style={[
                  {
                    width: '100%',
                    height: '80%',
                  },
                  useAnimatedStyle(() => ({
                    transform: [
                      { scale: scale.value },
                      { translateX: translateX.value },
                      { translateY: translateY.value }
                    ]
                  }))
                ]}
                resizeMode="contain"
              />
            </GestureDetector>

            <Text style={{ color: 'white', position: 'absolute', bottom: 50, opacity: 0.6, fontSize: 12 }}>
              {lang === 'es' ? 'Usa dos dedos para hacer zoom' : 'Use two fingers to zoom'}
            </Text>
          </View>
        </Modal>

        {/* --- GLOBAL APP MENUS OVERLAY --- */}
        <Modal visible={showKebabMenu} transparent={true} animationType="fade">
          <View style={{ flex: 1, zIndex: 9999, elevation: 999 }}>
            {/* Backdrop: toca fuera del menú para cerrarlo */}
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => {
                if (showKebabMenu) {
                  setShowKebabMenu(false);
                  stopKebabTimer();
                }
              }}
            />

            {/* Kebab Menu Dropdown */}
            <View
              style={{
                position: 'absolute',
                top: kebabMenuTop,
                right: 10,
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  minWidth: 220,
                  elevation: 10,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  overflow: 'hidden',
                }}
              >
                {isDownloading && downloadingModel && (
                  <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: `${colors.primary}15` }}>
                    <Text style={{ color: colors.primary, fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 4 }}>
                      {lang === 'es' ? 'DESCARGANDO NÚCLEO...' : 'DOWNLOADING CORE...'}
                    </Text>
                    <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: 'bold' }} numberOfLines={1}>
                      {lang === 'es' ? downloadingModel.labelEs : downloadingModel.labelEn}
                    </Text>
                    <View style={{ height: 4, backgroundColor: `${colors.primary}20`, borderRadius: 2, marginVertical: 6, overflow: 'hidden' }}>
                      <View style={{ width: `${downloadPercent}%`, height: '100%', backgroundColor: colors.primary }} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 9 }}>{downloadPercent}% ({downloadedMB}MB)</Text>
                      {downloadSpeed > 0 && <Text style={{ color: colors.textSecondary, fontSize: 9 }}>🚀 {downloadSpeed} MB/s</Text>}
                    </View>
                  </View>
                )}
                <TouchableOpacity
                  style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => { setShowKebabMenu(false); onKebabAction('profile'); }}
                >
                  <Text style={{ fontSize: 18, marginRight: 10 }}>👤</Text>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Perfil del Usuario' : 'User Profile'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => { setShowKebabMenu(false); onKebabAction('intro'); }}
                >
                  <Text style={{ fontSize: 18, marginRight: 10 }}>👓</Text>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Introducción' : 'Introduction'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => { setShowKebabMenu(false); onKebabAction('voice_settings'); }}
                >
                  <Text style={{ fontSize: 18, marginRight: 10 }}>🔊</Text>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Configuración Voz Android' : 'Android Voice Settings'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => { setShowKebabMenu(false); onKebabAction('vault'); }}
                >
                  <Text style={{ fontSize: 18, marginRight: 10 }}>🔒</Text>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Encriptación de Datos' : 'Data Encryption'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => { setShowKebabMenu(false); onKebabAction('psy'); }}
                >
                  <Text style={{ fontSize: 18, marginRight: 10 }}>Ψ</Text>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Test de Personalidad' : 'Personality Test'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ padding: 12, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => { setShowKebabMenu(false); onKebabAction('clear'); }}
                >
                  <Text style={{ fontSize: 18, marginRight: 10 }}>🗑️</Text>
                  <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Borrar Historial' : 'Clear History'}</Text>
                </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statusOverlay: {
    margin: 5, padding: 8, borderWidth: 1, borderRadius: 12, alignItems: 'center',
  },
  actionBtn: {
    borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 5
  },
  chatContainer: { padding: 15, paddingBottom: 20 },
  messageWrapper: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  messageWrapperAi: { justifyContent: 'flex-start', alignItems: 'flex-start' },
  messageWrapperUser: { justifyContent: 'flex-end' },
  avatarAi: {
    marginRight: 10, padding: 8, borderRadius: 0, borderWidth: 1,
  },
  avatarUser: {
    marginLeft: 10, padding: 8, borderRadius: 0, borderWidth: 1,
  },
  messageBubble: { maxWidth: '75%', padding: 15, borderRadius: 0 },
  messageText: { fontSize: 16, lineHeight: 24 },
  inputContainer: {
    flexDirection: 'row', padding: 15, borderTopWidth: 1, alignItems: 'flex-end',
  },
  input: {
    flex: 1, fontSize: 16, maxHeight: 120, minHeight: 40,
    borderBottomWidth: 1, paddingHorizontal: 10, paddingVertical: 10,
    marginRight: 15, fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
  },
  sendButton: { paddingBottom: 5 },
  mbCounter: {
    fontSize: 20,
    fontFamily: Platform.select({ ios: 'Courier', android: 'monospace' }),
    fontWeight: 'bold',
    marginTop: 5,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalContent: {
    width: '100%', borderRadius: 10, padding: 20, borderWidth: 1, borderColor: '#ccc'
  },
  modalTitle: {
    fontSize: 18, fontWeight: 'bold', marginBottom: 15
  },
  saveBtn: {
    padding: 12, borderRadius: 5, alignItems: 'center', marginTop: 10
  },
  saveBtnText: {
    color: '#fff', fontWeight: 'bold', fontSize: 16
  },
  introSection: {
    marginBottom: 20,
  },
  introTitle: {
    fontSize: 18, fontWeight: 'bold', marginBottom: 5,
  },
  introText: {
    fontSize: 14, lineHeight: 20,
  }
});
