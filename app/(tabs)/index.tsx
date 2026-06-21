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
import { OnboardingModal } from '../../components/modals/OnboardingModal';
import { VoiceOverlay } from '../../components/modals/VoiceOverlay';
import { SanctuaryHeader } from '../../components/SanctuaryHeader';
import { KebabMenuOverlay } from '../../components/KebabMenuOverlay';
import { WhispAvatar } from '../../components/ui/WhispAvatar';
import { getAnimaMessage } from '../../db/zenGardenSchema';
import { useTodos } from '../../hooks/useTodos';
import { MarqueeText } from '../../components/ui/MarqueeText';

import { useLanguage } from '../../contexts/LanguageContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useLlmState, useLlmActions } from '../../contexts/LlmContext';
import { useVoiceContext } from '../../contexts/VoiceContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useGlobalModals } from '../../contexts/GlobalModalsContext';
import { useAgentEngine } from '../../hooks/useAgentEngine';
import type { ModelInfo } from '../../hooks/useAppLlm';
import { settingsService } from '../../lib/SettingsService';
import { SpeechFilter } from '../../lib/SpeechFilter';
import { DatabaseService } from '../../lib/DatabaseService';

import { useFileAttachment } from '../../hooks/useFileAttachment';
import { useInteractiveVoice } from '../../hooks/useInteractiveVoice';
import { useVoice } from '../../hooks/useVoice';
import { VAULT_DIR, ensureVaultDir } from '../../lib/vault';
import { CompactDownloadOverlay } from '../../components/SanctuaryUI';
import { micService } from '../../lib/UnifiedMicService';
import { CONSCIOUSNESS_CONFIG, WAIT_PHRASES_ES, WAIT_PHRASES_EN } from '../../constants/NeuralConstants';
import { Message, MessageItem } from '../../components/ui/MessageItem';
import { CognitiveNode } from '../../components/ui/CognitiveNode';
import { VoiceNoteOverlay } from '../../components/VoiceNoteOverlay';
import { ModelLoaderPanel } from '../../components/ModelLoaderPanel';
import { ChatInputBar } from '../../components/ChatInputBar';
import { MessageContextMenu } from '../../components/MessageContextMenu';
import { VisionDownloadModal } from '../../components/VisionDownloadModal';

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
    downloadingType,
    activeModel,
    AVAILABLE_MODELS,
    downloadedMB,
    downloadSpeed,
    downloadPercent,
    currentContextSize,
    deviceRAM } = useLlmState();

  const { selectModel,
    downloadModel,
    downloadVisionModel,
    checkVisionModelExists,
    pauseDownload,
    cancelDownload,
    loadModel,
    resetToHome,
    llamaContextRef,
    generateStreamingResponse,
    abortGeneration,
    prefillContextLlm,
    generateEmbeddings } = useLlmActions();
  const status = statusRaw as any;

  const { attachedFile, setAttachedFile, isProcessing: isFileProcessing, pickDocument, clearAttachment, buildFileContext, extractTextInChunks } = useFileAttachment(lang);

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
  const kebabTimerRef = useRef<NodeJS.Timeout | null>(null);
  const modelReadyNotifiedRef = useRef(false);
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
  const { userProfile, setUserProfile, psyProfile, setPsyProfile, psyCompleted, setPsyCompleted } = useProfile();
  const { openModal } = useGlobalModals();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [consciousnessLevel, setConsciousnessLevel] = useState(1); // Default: Zen
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [manualEcoMode, setManualEcoMode] = useState(false);
  const [isEcoMode, setIsEcoMode] = useState(false);
  const [animaMessage, setAnimaMessage] = useState('');
  const [initNotification, setInitNotification] = useState<string | null>(null);

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
  }, [fetchAnimaMessage, messages.length]);

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
    let isMounted = true;
    const checkBattery = async () => {
      const level = await Battery.getBatteryLevelAsync();
      if (isMounted) {
        setBatteryLevel(level);
        const batteryTrigger = level > 0 && level <= 0.20;
        setIsEcoMode(manualEcoMode || batteryTrigger);
      }
    };
    checkBattery();
    const sub = Battery.addBatteryLevelListener(({ batteryLevel: b }) => {
      if (isMounted) {
        setBatteryLevel(b);
        const batteryTrigger = b > 0 && b <= 0.20;
        setIsEcoMode(manualEcoMode || batteryTrigger);
      }
    });
    return () => { isMounted = false; sub.remove(); };
  }, [manualEcoMode]);

  useEffect(() => {
    if (status === 'loading') {
      setInitNotification(`${t('model.system')}: ${t('model.loading')}`);
    } else if (status === 'downloading') {
      const totalSize = selectedModel.sizeMB + (selectedModel.mmprojSizeMB || 0);
      setInitNotification(prev => prev || `${t('model.system')}: ${t('model.startDownload')} ${selectedModel[lang === 'es' ? 'labelEs' : 'labelEn']} (${totalSize} MB)...`);
    } else if (status === 'ready') {
      setInitNotification(null);
    }
  }, [status, t, selectedModel, lang]);

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
        if (status === 'ready') {
          setMessages([{ id: `welcome-${Date.now()}`, role: 'ai', text: t('chat.welcome'), created_at: Date.now() }]);
        } else {
          setMessages([]);
        }
      } else {
        setMessages(results);
      }
    } catch (e) {
      console.error('[LOAD_MESSAGES] Error:', e);
    }
  }, [db, t, messagesLimit, status]);

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
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

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
      DatabaseService.insertMessageAsync(db, userMsg.id, userMsg.role, userMsg.text);

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

  // params.openModal has been removed, handled via GlobalModalsContext

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

  const [showVisionModal, setShowVisionModal] = useState(false);
  const visionPromiseResolveRef = useRef<((value: boolean) => void) | null>(null);

  const handleBeforeProcessImage = useCallback(async (): Promise<boolean> => {
    if (!activeModel || !activeModel.mmprojFileName) return true;
    const exists = await checkVisionModelExists(activeModel);
    if (exists) return true;

    return new Promise<boolean>((resolve) => {
      visionPromiseResolveRef.current = resolve;
      setShowVisionModal(true);
    });
  }, [activeModel, checkVisionModelExists]);

  const handleConfirmVisionDownload = async () => {
    setShowVisionModal(false);
    if (visionPromiseResolveRef.current) {
      visionPromiseResolveRef.current(false);
      visionPromiseResolveRef.current = null;
    }

    setAttachedFile({
      name: activeModel?.mmprojFileName || 'vision.gguf',
      type: 'image',
      uri: '',
      sizeKB: activeModel?.mmprojSizeMB || 940,
      extractedText: 'PENDING_VISION_DOWNLOAD'
    });

    try {
      if (activeModel) {
        await downloadVisionModel(activeModel);
        clearAttachment();
        Alert.alert(
          lang === 'es' ? 'Descarga Completa' : 'Download Complete',
          lang === 'es'
            ? 'El soporte visual ya está listo. Puedes volver a seleccionar tu imagen.'
            : 'Vision support is ready. You can select your image again.'
        );
      }
    } catch (err: any) {
      clearAttachment();
      Alert.alert(
        lang === 'es' ? 'Error de Descarga' : 'Download Error',
        lang === 'es'
          ? `No se pudo descargar el módulo de visión: ${err.message}`
          : `Failed to download vision module: ${err.message}`
      );
    }
  };

  const handleCloseVisionModal = () => {
    setShowVisionModal(false);
    if (visionPromiseResolveRef.current) {
      visionPromiseResolveRef.current(false);
      visionPromiseResolveRef.current = null;
    }
  };

  const handleClearAttachment = useCallback(async () => {
    clearAttachment();
    if (downloadingType === 'vision') {
      await cancelDownload();
    }
  }, [clearAttachment, downloadingType, cancelDownload]);

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
    await pickDocument(handleBeforeProcessImage);
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
    if (initNotification) {
      return initNotification;
    }
    if (whispStatus === 'thinking') {
      if (processingPhase === 'reading_file') return lang === 'es' ? 'Leyendo\narchivo...' : 'Reading\nfile...';
      if (processingPhase === 'indexing') return lang === 'es' ? 'Indexando\ncontenido...' : 'Indexing\ncontent...';
      if (isSearchingWeb) return lang === 'es' ? 'Buscando\nen la web...' : 'Searching\nthe web...';
      return '';
    }
    if (whispStatus === 'listening') {
      return lang === 'es' ? 'Escuchando\naudio...' : 'Listening\nto audio...';
    }
    if (whispStatus === 'speaking') {
      return '';
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
  }, [initNotification, whispStatus, processingPhase, isSearchingWeb, batteryLevel, activeModel, lang, activeTodo]);

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
        // Profile fetching has been moved to ProfileContext

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
      loadMessages('');
    }
  }, [status, activeModel, loadMessages, selectedModel]);

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
      if (selectedModel.id !== activeModel?.id) {
        selectModel(selectedModel);
      }
      // Si estamos en Eco-Mode, forzamos menos hilos para cuidar la batería
      // const loadOptions = isEcoMode ? { n_threads: 2 } : undefined;
      await loadModel();
    } catch (e: any) {
      addSystemMessage(`[SYSTEM ERROR]: ${e.message}`);
    }
  }, [isDownloading, lang, selectedModel, activeModel, selectModel, isEcoMode, loadModel, addSystemMessage]);

  const handleDownload = useCallback(async () => {
    const totalSize = selectedModel.sizeMB + (selectedModel.mmprojSizeMB || 0);
    const startText = `${t('model.system')}: ${t('model.startDownload')} ${selectedModel[lang === 'es' ? 'labelEs' : 'labelEn']} (${totalSize} MB)...`;
    setInitNotification(startText);

    try {
      await downloadModel(selectedModel);
      const doneText = `${t('model.system')}: ${selectedModel[lang === 'es' ? 'labelEs' : 'labelEn']} ${t('model.downloaded')}`;
      setInitNotification(doneText);
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

      const errorText = `${t('model.system')}: ⚠️ ${friendlyMessage}`;
      setInitNotification(errorText);
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
      await DatabaseService.insertMessage(db, msg.id, msg.role, msg.text);
    } catch (e) {
      console.error('[DATABASE PERSISTENCE ERROR]:', e);
    }
  }, [db]);

  const handleSend = useCallback(async (overrideText?: string) => {
    if (isTypingRef.current || isSendingRef.current) return;
    isSendingRef.current = true;

    // Dismiss keyboard on send button press
    Keyboard.dismiss();

    // Clear speech queue and stop any ongoing TTS speech
    clearSpeechQueue();

    const textToProcess = (overrideText ?? inputText).trim();
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

  // ── Home Reset ──
  const handleHomeReset = useCallback(async () => {
    await resetToHome();
    if (db) {
      await db.runAsync('DELETE FROM messages');
      await db.runAsync('DELETE FROM memory_fts');
    }
    setMessages([]);
    setInputText('');
    setSelectedModel(AVAILABLE_MODELS[0]);
    setShowModelPicker(false);
    setShowKebabMenu(false);
    setInitNotification(null);
  }, [resetToHome, db, AVAILABLE_MODELS]);

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

  const filteredMessages = useMemo(() => {
    return messages.filter(m => m.text.trim() !== '' || (m.role === 'ai' && isTyping && m === messages[messages.length - 1]));
  }, [messages, isTyping]);

  const handleDeleteMessage = useCallback(async (msgId: string) => {
    try {
      if (db) {
        await db.runAsync('DELETE FROM messages WHERE id = ?', [msgId]);
        await db.runAsync('DELETE FROM memory_fts WHERE id = ?', [msgId]);
      }
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (e) { console.error('Delete error:', e); }
  }, [db]);

  const renderMessage = useCallback(({ item, index }: { item: Message, index: number }) => {
    const isLatest = index === filteredMessages.length - 1;
    return (
      <MessageItem
        item={item}
        colors={colors}
        isAi={item.role === 'ai'}
        isLatest={isLatest}
        isTyping={isTyping}
        processingPhase={processingPhase}
        lang={lang}
        onAction={(action, msg) => {
          if (action === 'copy') {
             ExpoClipboard.setStringAsync(msg.text);
             Alert.alert(lang === 'es' ? "Copiado" : "Copied", lang === 'es' ? "Texto copiado al portapapeles." : "Text copied to clipboard.");
          } else if (action === 'analyze') {
             if (isTypingRef.current) {
               addSystemMessage(lang === 'es' ? '⏳ Espera a que termine la respuesta actual.' : '⏳ Wait for the current response to finish.');
               return;
             }
             const prompt = lang === 'es'
               ? `Haz un análisis profundo y explícame mejor esto que dijiste: "${msg.text}"`
               : `Do a deep analysis and explain better what you said here: "${msg.text}"`;
             handleSend(prompt);
          } else if (action === 'report') {
             handleReportMessage(msg.id);
          } else if (action === 'delete') {
             handleDeleteMessage(msg.id);
          }
        }}
        onImagePress={handleImagePress}
      />
    );
  }, [filteredMessages.length, colors, isTyping, processingPhase, lang, handleReportMessage, handleImagePress, isTypingRef, addSystemMessage, handleSend, handleDeleteMessage]);

  const onKebabAction = useCallback(async (action: string) => {
    if (action === 'intro') openModal('intro');
    if (action === 'profile') openModal('profile');
    if (action === 'vault') openModal('vault');
    if (action === 'psy') openModal('tests_menu');
    if (action === 'voice_settings') openModal('voice_settings');
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
    <>
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
            {(whispStatus === 'idle' && activeTodo) || initNotification ? (
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

        <ModelLoaderPanel
          status={status}
          isOnboardingComplete={isOnboardingComplete}
          colors={colors}
          lang={lang}
          t={t}
          showModelPicker={showModelPicker}
          setShowModelPicker={setShowModelPicker}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          AVAILABLE_MODELS={AVAILABLE_MODELS}
          deviceRAM={deviceRAM}
          selectModel={selectModel}
          modelExists={modelExists}
          handleDownload={handleDownload}
          canResume={canResume}
          handleLoad={handleLoad}
          downloadPercent={downloadPercent}
          downloadedMB={downloadedMB}
          downloadingModel={downloadingModel}
          activeModel={activeModel}
          downloadSpeed={downloadSpeed}
          waitPhrase={waitPhrase}
        />

        <View style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }}>
          <View style={{ flex: 1, display: voiceState !== 'IDLE' ? 'none' : 'flex' }}>
            <FlashList
              ref={flashListRef}
              estimatedItemSize={120}
              data={filteredMessages}
              keyExtractor={(item) => String(item.id ?? `msg_${item.created_at}`)}
              renderItem={renderMessage}
              contentContainerStyle={styles.chatContainer}
              overScrollMode="never"
              bounces={false}
              extraData={{ isTyping, colors, activeTheme }}
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
          <VoiceNoteOverlay
            show={showVoiceNoteModal}
            lang={lang}
            dictation={dictation}
            uiIsCapturing={uiIsCapturing}
            micPhase={micPhase}
            onClose={() => {
              dictation.stopListening();
              setShowVoiceNoteModal(false);
              setMicPhase('idle');
            }}
            onSendAudio={async (transcript) => {
              const textToSend = transcript;
              await dictation.stopListening();
              setShowVoiceNoteModal(false);
              setMicPhase('idle');
              if (!textToSend.trim()) return;

              const cleaned = SpeechFilter.cleanWhisperText(textToSend);
              if (!cleaned) return;

              const userMsgId = `voice-note-${Date.now()}-${Math.random().toString(36).substring(7)}`;
              const userMsg: Message = { id: userMsgId, role: 'user', text: '🎙️ ' + cleaned, created_at: Date.now(), status: 'sent' };
              setMessages(prev => [...prev, userMsg]);
              DatabaseService.insertMessageAsync(db, userMsg.id, userMsg.role, userMsg.text);
              startSpeechSession();
              try {
                await processMessage(
                  cleaned,
                  userMsgId,
                  setMessages,
                  undefined,
                  true,
                  consciousnessLevel,
                  queueSpeech,
                  clearSpeechQueue
                );
              } catch (e: any) {
                console.error('[VoiceNote] processMessage error:', e);
              } finally {
                endSpeechSession();
              }
            }}
          />

          {/* 🛡️ SENTINEL v3.0 — Indicador Dinámico de Fase */}
          <ChatInputBar
            isTyping={isTyping}
            processingAttachedFile={processingAttachedFile}
            colors={colors}
            lang={lang}
            activeModel={activeModel}
            handlePickDocument={handlePickDocument}
            inputText={inputText}
            handleInputChange={handleInputChange}
            t={t}
            handleSend={handleSend}
            stopGeneration={stopGeneration}
            attachedFile={attachedFile}
            status={status}
            voiceState={voiceState}
            toggleInteractiveMode={toggleInteractiveMode}
            setMicPhase={setMicPhase}
            setShowVoiceNoteModal={setShowVoiceNoteModal}
            dictation={dictation}
            consciousnessLevel={consciousnessLevel}
            setConsciousnessLevel={setConsciousnessLevel}
            clearAttachment={handleClearAttachment}
            isSearchingWeb={isSearchingWeb}
            searchingStep={searchingStep}
            isThinking={isThinking}
            downloadPercent={downloadPercent}
            downloadedMB={downloadedMB}
            downloadSpeed={downloadSpeed}
          />
          <VisionDownloadModal
            visible={showVisionModal}
            onClose={handleCloseVisionModal}
            onConfirm={handleConfirmVisionDownload}
            modelName={activeModel?.label || 'Anima AI'}
            sizeMB={activeModel?.mmprojSizeMB || 940}
            colors={colors}
            lang={lang}
          />
        </View>

        {/* Modales extracted to GlobalModalsContext */}

        {/* CONTEXT MENU MODAL HAS BEEN REMOVED IN FAVOR OF SWIPEABLE */}

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

      </SafeAreaView>

      {/* --- GLOBAL APP MENUS OVERLAY --- */}
      <KebabMenuOverlay
        visible={showKebabMenu}
        anchorTop={kebabMenuTop}
        onClose={() => {
          setShowKebabMenu(false);
          stopKebabTimer();
        }}
        colors={colors}
        lang={lang}
        isDownloading={isDownloading}
        downloadingModel={downloadingModel}
        downloadPercent={downloadPercent}
        downloadedMB={downloadedMB}
        downloadSpeed={downloadSpeed}
        menuItems={[
          { emoji: '👤', labelEs: 'Perfil del Usuario', labelEn: 'User Profile', onPress: () => { setShowKebabMenu(false); onKebabAction('profile'); } },
          { emoji: '👓', labelEs: 'Introducción', labelEn: 'Introduction', onPress: () => { setShowKebabMenu(false); onKebabAction('intro'); } },
          { emoji: '🔊', labelEs: 'Configuración Voz Android', labelEn: 'Android Voice Settings', onPress: () => { setShowKebabMenu(false); onKebabAction('voice_settings'); } },
          { emoji: '🔒', labelEs: 'Encriptación de Datos', labelEn: 'Data Encryption', onPress: () => { setShowKebabMenu(false); onKebabAction('vault'); } },
          { emoji: 'Ψ', labelEs: 'Test de Personalidad', labelEn: 'Personality Test', onPress: () => { setShowKebabMenu(false); onKebabAction('psy'); } },
          { emoji: '🗑️', labelEs: 'Borrar Historial', labelEn: 'Clear History', onPress: () => { setShowKebabMenu(false); onKebabAction('clear'); } },
        ]}
      />
    </>
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
