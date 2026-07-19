// 🚨 MANDATORY: CHECK DESIGN_PROTOCOL_v1.8.0.md BEFORE MODIFYING UI OR LOGIC.
const MatrixRain = React.lazy(() => import('@/components/MatrixRain').then(m => ({ default: m.MatrixRain })));
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FlashList } from '@shopify/flash-list';
import * as Battery from 'expo-battery';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Keyboard, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Dimensions } from 'react-native';
import * as ExpoClipboard from 'expo-clipboard';
import { Directions, Gesture, GestureDetector, Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInDown, FadeOutUp, interpolate, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSQLiteContext } from '../../components/MemoryProvider';
const OnboardingModal = React.lazy(() => import('../../components/modals/OnboardingModal').then(m => ({ default: m.OnboardingModal })));
import { VoiceOverlay } from '../../components/modals/VoiceOverlay';
import { SanctuaryHeader } from '../../components/SanctuaryHeader';
import { WhispAvatar } from '../../components/ui/WhispAvatar';

import { useTodos } from '../../hooks/useTodos';
import { MarqueeText } from '../../components/ui/MarqueeText';

import { useLanguage } from '../../contexts/LanguageContext';
import { useAppTheme } from '../../contexts/ThemeContext';
import { useLlmState, useLlmProgress, useLlmDownload, useLlmActions } from '../../contexts/LlmContext';
import { useVoiceContext } from '../../contexts/VoiceContext';
import { useProfile } from '../../contexts/ProfileContext';
import { useAgentEngine } from '../../hooks/useAgentEngine';
import { useAnimaScanner } from '../../hooks/useAnimaScanner';
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
import { chatBridge } from '../../lib/chatBridge';

const VisionDownloadModal = React.lazy(() => import('../../components/VisionDownloadModal').then(m => ({ default: m.VisionDownloadModal })));

export default function NeuralLinkScreen() {
  const navigation = useNavigation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors, activeTheme, setTheme } = useAppTheme();
  const db = useSQLiteContext();
  const { lang, setLang, t } = useLanguage();
  const animaScannerText = useAnimaScanner();

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
    activeModel,
    AVAILABLE_MODELS,
    deviceRAM } = useLlmState();

  const {
    isDownloading,
    downloadingModel,
    downloadingType,
    downloadedMB,
    downloadSpeed,
    downloadPercent
  } = useLlmDownload();

  const {
    currentContextSize,
    tokensUsed
  } = useLlmProgress();

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
    checkModelVersion,
    generateEmbeddings } = useLlmActions();
  const status = statusRaw as any;

  const { attachedFile, setAttachedFile, isProcessing: isFileProcessing, pickDocument, clearAttachment, buildFileContext, extractTextInChunks } = useFileAttachment(lang);

  const [processingAttachedFile, setProcessingAttachedFile] = useState<any>(null);
  const [messagesLimit, setMessagesLimit] = useState(50);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [modelStatus, setModelStatus] = useState<'missing' | 'outdated' | 'current'>('missing');
  const [selectedModel, setSelectedModel] = useState<ModelInfo>(AVAILABLE_MODELS[0]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [canResume, setCanResume] = useState(false);
  const modelReadyNotifiedRef = useRef(false);
  const flashListRef = useRef<any>(null);

  const [showVoiceNoteModal, setShowVoiceNoteModal] = useState(false);
  const [micPhase, setMicPhase] = useState<'idle' | 'permission' | 'init' | 'warming_up' | 'ready'>('idle');
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [selectedContextMsg, setSelectedContextMsg] = useState<Message | null>(null);
  const [activeTest, setActiveTest] = useState<'ocean' | 'aptitude' | 'vocational' | 'anxiety' | 'mood' | 'mbti'>('ocean');
  const { userProfile, setUserProfile, psyProfile, setPsyProfile, psyCompleted, setPsyCompleted } = useProfile();
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [consciousnessLevel, setConsciousnessLevel] = useState(1); // Default: Zen
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState(1);
  const [manualEcoMode, setManualEcoMode] = useState(false);
  const [isEcoMode, setIsEcoMode] = useState(false);

  const [initNotification, setInitNotification] = useState<string | null>(null);


  // 🔍 Sanctuary SEARCH STATES
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);

  // --- RECURRING REPORTS STATE ---
  const [pendingReports, setPendingReports] = useState<any[]>([]);
  const [isProcessingReport, setIsProcessingReport] = useState(false);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);

  // useEffect relocated below useInteractiveVoice to fix block scoping

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await settingsService.get();
        if (settings.manualEcoMode) setManualEcoMode(true);
        if (settings.consciousnessLevel !== undefined) {
          setConsciousnessLevel(settings.consciousnessLevel);
        }
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
      const totalSize = downloadingType === 'vision' ? (selectedModel.mmprojSizeMB || 0) : selectedModel.sizeMB;
      setInitNotification(prev => prev || `${t('model.system')}: ${t('model.startDownload')} ${selectedModel[lang === 'es' ? 'labelEs' : 'labelEn']} (${totalSize} MB)...`);
    } else if (status === 'ready') {
      setInitNotification(null);
    }
  }, [status, t, selectedModel, lang, downloadingType]);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const changeConsciousnessLevel = useCallback(async (level: number) => {
    setConsciousnessLevel(level);
    try {
      await settingsService.set({ consciousnessLevel: level });
    } catch (e) {
      console.log('Error saving consciousness level', e);
    }
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
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
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
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    isSpeaking: isVoiceSpeaking,
    isPaused: isVoicePaused,
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
        {
          isVoice: true,
          onSentenceGenerated,
          onClearSpeechQueue
        }
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

  // activeSpeechId is now managed explicitly via callbacks in onPlayPress and onStopPress to avoid transition race conditions.

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

  const handleConfirmVisionDownload = async (modelOverride?: any) => {
    setShowVisionModal(false);
    if (visionPromiseResolveRef.current) {
      visionPromiseResolveRef.current(false);
      visionPromiseResolveRef.current = null;
    }

    const targetModel = modelOverride || activeModel;

    setAttachedFile({
      name: targetModel?.mmprojFileName || 'vision.gguf',
      type: 'image',
      uri: '',
      sizeKB: targetModel?.mmprojSizeMB || 940,
      extractedText: 'PENDING_VISION_DOWNLOAD'
    });

    try {
      if (targetModel) {
        await downloadVisionModel(targetModel);
        clearAttachment();
        
        // Auto-reload the model to initialize the newly downloaded vision projector in memory
        if (status === 'ready') {
          console.log('[LLM] Auto-reloading model to initialize the newly downloaded vision projector...');
          try {
            await loadModel();
          } catch (loadErr) {
            console.warn('[LLM] Failed to auto-reload model after vision download:', loadErr);
          }
        }

        Alert.alert(
          lang === 'es' ? 'Descarga Completa' : 'Download Complete',
          lang === 'es'
            ? 'El soporte visual ya está listo e inicializado. Puedes volver a seleccionar tu imagen.'
            : 'Vision support is ready and initialized. You can select your image again.'
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
    registerInterruption,
    earnedBadge
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

  useEffect(() => {
    chatBridge.registerHandler(async (request) => {
      const userMsgId = `ai-desc-${Date.now()}`;
      const userMsg = { id: userMsgId, role: 'user' as const, text: request.prompt, created_at: Date.now(), status: 'sent' as const };
      setMessages(prev => [...prev, userMsg]);
      const truncatedPrompt = request.prompt.length > 800 ? request.prompt.slice(0, 800) + '...' : request.prompt;
      await processMessage(truncatedPrompt, userMsgId, setMessages);
    });
  }, [processMessage, setMessages]);

  const reversedFilteredMessages = useMemo(() => {
    const filtered = messages.filter(m => 
      m.text.trim() !== '' || (m.role === 'ai' && m === messages[messages.length - 1])
    );
    return [...filtered].reverse();
  }, [messages]);

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
    if (whispStatus === 'happy') return lang === 'es' ? '✨ ¡Listo para escuchar!' : "✨ I'm ready to listen!";
    return (lang === 'es' ? 'Hola, soy Anima. Estoy lista.' : "Hi, I'm Anima. I'm ready.");
  }, [whispStatus, lang]);

  const whispRightLabel = useMemo(() => {
    if (initNotification) {
      return initNotification;
    }
    if (earnedBadge) {
      const displayEmoji = earnedBadge.emoji.endsWith('.png') ? '🧠' : earnedBadge.emoji;
      return `✨ ${displayEmoji} ${earnedBadge.name} (+${earnedBadge.count})`;
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
    if (whispStatus === 'idle' && pendingReports.length > 0) {
      return lang === 'es' 
        ? `✨ Tarea Pendiente: ${pendingReports[0].title}. Toca para procesar.` 
        : `✨ Pending Task: ${pendingReports[0].title}. Tap to process.`;
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
  }, [initNotification, earnedBadge, whispStatus, processingPhase, isSearchingWeb, batteryLevel, activeModel, lang, activeTodo, pendingReports]);

  const isSendingRef = useRef(false);
  const hasScrolledToBottomRef = useRef(false);

  useEffect(() => {
    if (earnedBadge) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [earnedBadge]);


  const checkPendingReports = useCallback(async () => {
    if (!db) return;
    try {
      const rows = await db.getAllAsync(`
        SELECT p.*, r.title FROM pending_reports p
        INNER JOIN recurring_tasks r ON p.task_id = r.id
        WHERE p.is_processed = 0
        ORDER BY p.created_at ASC
      `);
      setPendingReports(rows);
    } catch (e) {
      console.error('[INDEX] Error checking pending reports:', e);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      checkPendingReports();
    }, [checkPendingReports])
  );

  const handleProcessPendingReport = async () => {
    if (pendingReports.length === 0 || isProcessingReport || isTypingRef.current || isSendingRef.current) return;
    const report = pendingReports[0];
    
    setIsProcessingReport(true);
    isSendingRef.current = true;
    clearSpeechQueue();
    startSpeechSession();

    const userMsgId = `rep-user-${Date.now()}`;
    const promptText = lang === 'es' 
      ? `Por favor analiza este reporte y genera un resumen conciso y amigable en español:\n\n${report.raw_content}`
      : `Please analyze this report and generate a concise and friendly summary in English:\n\n${report.raw_content}`;
      
    const displayMsg = lang === 'es'
      ? `[Procesando reporte de automatización: ${report.title}]`
      : `[Processing automation report: ${report.title}]`;

    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      text: displayMsg,
      created_at: Date.now(),
      status: 'sent'
    };

    setMessages(prev => [...prev, userMsg]);
    try {
      if (db) {
        await DatabaseService.insertMessage(db, userMsg.id, userMsg.role, userMsg.text);
      }
    } catch (err) {
      console.error('[INDEX] Error saving automation message:', err);
    }

    try {
      await processMessage(
        promptText,
        userMsg.id,
        setMessages,
        {
          isVoice: false,
          consciousness: consciousnessLevel,
          onSentenceGenerated: queueSpeech,
          onClearSpeechQueue: clearSpeechQueue
        }
      );

      // Marcar reporte como procesado
      if (db) {
        await db.runAsync('UPDATE pending_reports SET is_processed = 1 WHERE id = ?', [report.id]);
      }
      
      await checkPendingReports();
    } catch (e: any) {
      addSystemMessage(`[AUTOMATION PROCESS ERROR]: ${e.message}`);
    } finally {
      endSpeechSession();
      setIsProcessingReport(false);
      isSendingRef.current = false;
    }
  };

  useEffect(() => {
    if (reversedFilteredMessages.length === 0) {
      hasScrolledToBottomRef.current = false;
    }
  }, [reversedFilteredMessages.length]);

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
      let canResumeDownload = false;
      const localDir = `${FileSystem.documentDirectory?.replace(/\/+$/, '')}/llm_models`;
      const localPath = `${localDir}/${selectedModel.fileName}`;

      const state = await checkModelVersion(selectedModel);
      const existsAndValid = (state === 'current' || state === 'outdated');

      if (!existsAndValid) {
        const resumeStatePath = `${localDir}/download_resume_${selectedModel.fileName}.json`;
        const resumeInfo = await FileSystem.getInfoAsync(resumeStatePath);
        canResumeDownload = resumeInfo.exists;

        if (Platform.OS === 'android') {
          try {
            const mainFileInfo = await FileSystem.getInfoAsync(localPath);
            const expectedBytes = selectedModel.sizeMB * 1024 * 1024 * 0.9;
            if (mainFileInfo.exists && (mainFileInfo as any).size > 0 && (mainFileInfo as any).size < expectedBytes) {
              if (!canResumeDownload) {
                // Reconstruct main file resume JSON
                const manualState = {
                  url: selectedModel.url,
                  fileUri: `file://${localPath}`,
                  options: { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)' } },
                  resumeData: String((mainFileInfo as any).size)
                };
                await FileSystem.writeAsStringAsync(resumeStatePath, JSON.stringify(manualState));
                console.log(`[CHECK_FILE] Reconstructed manual resume JSON for main model at size ${(mainFileInfo as any).size}`);
                canResumeDownload = true;
              }
            }
          } catch (reconErr) {
            console.warn('[CHECK_FILE] Error reconstructing resume JSON:', reconErr);
          }
        }
      }

      if (isMounted) {
        setModelStatus(state);
        setCanResume(canResumeDownload);
      }
    };
    checkFile();

    return () => { isMounted = false; };
  }, [selectedModel, status]);

  const checkSpecificModelExists = useCallback(async (model: any) => {
    try {
      const state = await checkModelVersion(model);
      return (state === 'current' || state === 'outdated');
    } catch (e) {
      console.warn('[CHECK_SPECIFIC] Error checking model:', e);
    }
    return false;
  }, [checkModelVersion]);

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
      const { Alert } = require('react-native');
      Alert.alert(lang === 'es' ? 'Memoria Insuficiente' : 'Insufficient Memory', e.message);
      addSystemMessage(`[SYSTEM ERROR]: ${e.message}`);
    }
  }, [isDownloading, lang, selectedModel, activeModel, selectModel, isEcoMode, loadModel, addSystemMessage]);

  const handleDownload = useCallback(async (modelOverride?: any) => {
    const modelToUse = modelOverride?.id ? modelOverride : selectedModel;
    const totalSize = modelToUse.sizeMB;
    const startText = `${t('model.system')}: ${t('model.startDownload')} ${modelToUse[lang === 'es' ? 'labelEs' : 'labelEn']} (${totalSize} MB)...`;
    setInitNotification(startText);

    try {
      await downloadModel(modelToUse);
      const doneText = `${t('model.system')}: ${modelToUse[lang === 'es' ? 'labelEs' : 'labelEn']} ${t('model.downloaded')}`;
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
        {
          attachedFile: localFile,
          isVoice: false,
          consciousness: consciousnessLevel,
          onSentenceGenerated: queueSpeech,
          onClearSpeechQueue: clearSpeechQueue
        }
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

  const handleDeleteMessage = useCallback(async (msgId: string) => {
    try {
      if (db) {
        await db.runAsync('DELETE FROM messages WHERE id = ?', [msgId]);
        await db.runAsync('DELETE FROM memory_fts WHERE id = ?', [msgId]);
      }
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (e) { console.error('Delete error:', e); }
  }, [db]);

  const getMessageItemType = useCallback((item: Message) => {
    if (item.role === 'user') return 'user';
    if (item.imageUri) return 'ai-image';
    if (item.thoughts || item.tool_query) return 'ai-thought';
    if (!item.text) return 'ai-typing';
    return 'ai-text';
  }, []);

  const overrideItemLayout = useCallback((layout: any, item: Message) => {
    if (item.role === 'user') {
      layout.size = 80;
    } else if (item.imageUri) {
      layout.size = 200;
    } else if (item.thoughts || item.tool_query) {
      layout.size = 180;
    } else if (!item.text) {
      layout.size = 60;
    } else {
      layout.size = 120;
    }
  }, []);

  const renderMessage = useCallback(({ item, index, extraData }: any) => {
    const isLatest = index === 0;
    return (
      <MessageItem
        item={item}
        colors={colors}
        isAi={item.role === 'ai'}
        isLatest={isLatest}
        isTyping={extraData?.isTyping || false}
        processingPhase={extraData?.processingPhase || 'idle'}
        lang={lang}
        activeModelId={activeModel?.id}
        onModelTierPress={() => setShowModelPicker(true)}
        onAction={(action, msg) => {
          if (action === 'copy') {
             ExpoClipboard.setStringAsync(msg.text);
             Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
        ttsEnabled={dictation.ttsEnabled}
        isSpeaking={(isLatest && isVoiceSpeaking) || (activeSpeechId === item.id && isVoiceSpeaking)}
        isPaused={activeSpeechId === item.id && isVoicePaused}
        onPlayPress={(msg) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setActiveSpeechId(msg.id);
          if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
          dictation.stopSpeaking().then(() => {
             // Add a small delay as requested to prevent collisions
             playTimeoutRef.current = setTimeout(() => {
               dictation.speak(msg.text, psyProfile, () => {
                 setActiveSpeechId(currentId => currentId === msg.id ? null : currentId);
               });
               playTimeoutRef.current = null;
             }, 300);
          });
        }}
        onPausePress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          dictation.pauseSpeaking();
        }}
        onResumePress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          dictation.resumeSpeaking();
        }}
        onStopPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setActiveSpeechId(null);
          if (playTimeoutRef.current) {
            clearTimeout(playTimeoutRef.current);
            playTimeoutRef.current = null;
          }
          dictation.stopSpeaking();
        }}
      />
    );
  }, [colors, lang, handleReportMessage, handleImagePress, isTypingRef, addSystemMessage, handleSend, handleDeleteMessage, dictation, isVoiceSpeaking, isVoicePaused, activeSpeechId]);

  const handleClearChat = useCallback(() => {
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
        {activeTheme === 'matrix' && (
          <React.Suspense fallback={null}>
            <MatrixRain paused={isTyping} />
          </React.Suspense>
        )}
        <SanctuaryHeader
          onHomePress={handleHeaderHomePress}
          onModelPress={handleModelPress}
          activeModelLabel={status === 'ready' && activeModel ? activeModel[lang === 'es' ? 'labelEs' : 'labelEn'] : undefined}
          isStreaming={isTyping}
          earnedBadge={earnedBadge}
        />
        
        {/* Fila 2: Sub-Barra de Diary Anima (Blob interactivo) - Solo en el Home/Diary */}
        <TouchableOpacity 
          activeOpacity={whispStatus === 'idle' && pendingReports.length > 0 ? 0.7 : 1}
          onPress={() => {
            if (whispStatus === 'idle' && pendingReports.length > 0) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              handleProcessPendingReport();
            }
          }}
          style={{
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
          }}
        >
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
            {whispStatus === 'idle' && !!animaScannerText && (
              <View
                style={{ marginTop: 2, overflow: 'hidden', width: '100%' }}
              >
                <MarqueeText 
                  text={animaScannerText} 
                  style={{
                    fontSize: 9,
                    color: colors.textSecondary,
                    fontStyle: 'italic'
                  }}
                  duration={15000} 
                  gap={20}
                />
              </View>
            )}
          </View>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <WhispAvatar status={whispStatus} size={90} activeModelId={activeModel?.id} />
          </View>

          {/* Derecha: Estados complejos u otros */}
          <View style={{ flex: 1, alignItems: 'flex-end', overflow: 'hidden' }}>
            {(whispStatus === 'idle' && (activeTodo || pendingReports.length > 0)) || initNotification ? (
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
        </TouchableOpacity>


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

        <React.Suspense fallback={null}>
          <OnboardingModal
            visible={!isOnboardingComplete}
            lang={lang}
            setLang={setLang}
            colors={colors}
            onboardingStep={onboardingStep}
            setOnboardingStep={setOnboardingStep}
            userProfile={userProfile}
            setUserProfile={setUserProfile}
            setIsOnboardingComplete={setIsOnboardingComplete}
            db={db}
            handleDownload={handleDownload}
            canResume={canResume}
            status={status}
            modelStatus={modelStatus}
            downloadPercent={downloadPercent}
            downloadedMB={downloadedMB}
            downloadingModel={downloadingModel as any}
            downloadingType={downloadingType as any}
            activeModel={activeModel}
            downloadSpeed={downloadSpeed}
            waitPhrase={waitPhrase}
            handleLoad={handleLoad}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            AVAILABLE_MODELS={AVAILABLE_MODELS}
            handleConfirmVisionDownload={handleConfirmVisionDownload}
            checkSpecificModelExists={checkSpecificModelExists}
            checkVisionModelExists={checkVisionModelExists}
          />
        </React.Suspense>

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
          modelStatus={modelStatus}
          handleDownload={handleDownload}
          canResume={canResume}
          handleLoad={handleLoad}
          downloadPercent={downloadPercent}
          downloadedMB={downloadedMB}
          downloadingModel={downloadingModel}
          downloadingType={downloadingType}
          activeModel={activeModel}
          downloadSpeed={downloadSpeed}
          waitPhrase={waitPhrase}
        />

        <View style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }}>
          <View style={{ flex: 1, display: voiceState !== 'IDLE' ? 'none' : 'flex' }}>
            <FlashList
              ref={flashListRef}
              estimatedItemSize={120}
              data={reversedFilteredMessages}
              keyExtractor={(item) => String(item.id ?? `msg_${item.created_at}`)}
              getItemType={getMessageItemType}
              overrideItemLayout={overrideItemLayout}
              renderItem={renderMessage}
              contentContainerStyle={styles.chatContainer}
              overScrollMode="never"
              bounces={false}
              extraData={{ isTyping, processingPhase }}
              ListHeaderComponent={null}
              ListFooterComponent={
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
                    <IconSymbol name="chevron.down" size={14} color={colors.primary} />
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
                  {
                    isVoice: true,
                    onSentenceGenerated: queueSpeech,
                    onClearSpeechQueue: clearSpeechQueue
                  }
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
            setConsciousnessLevel={changeConsciousnessLevel}
            clearAttachment={handleClearAttachment}
            isSearchingWeb={isSearchingWeb}
            searchingStep={searchingStep}
            isThinking={isThinking}
            downloadPercent={downloadPercent}
            downloadedMB={downloadedMB}
            downloadSpeed={downloadSpeed}
            onClearChat={handleClearChat}
          />
          <React.Suspense fallback={null}>
            <VisionDownloadModal
              visible={showVisionModal}
              onClose={handleCloseVisionModal}
              onConfirm={handleConfirmVisionDownload}
              modelName={activeModel?.label || 'Anima AI'}
              sizeMB={activeModel?.mmprojSizeMB || 940}
              colors={colors}
              lang={lang}
            />
          </React.Suspense>
        </View>

        {/* Modales extracted to GlobalModalsContext */}

        {/* CONTEXT MENU MODAL HAS BEEN REMOVED IN FAVOR OF SWIPEABLE */}

        {/* FULL SCREEN IMAGE VIEWER WITH PINCH TO ZOOM */}
        {/* 
          🛡️ FABRIC FIX: transparent={false} evita colapso WRAP_CONTENT en Android 14.
          No se usa layoutTicket hack (Directiva 11). Dimensiones con flex:1.
        */}
        <Modal visible={!!fullScreenImage} transparent={false} animationType="fade" statusBarTranslucent={false}>
          <View 
            style={{ 
              flex: 1, 
              width: '100%', 
              height: '100%', 
              backgroundColor: 'black', 
              justifyContent: 'center', 
              alignItems: 'center'
            }}
          >
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

      {/* KebabMenuOverlay removed in favor of direct header Clean Chat button */}
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
