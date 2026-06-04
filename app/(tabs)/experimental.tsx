import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Switch, Alert, Platform, KeyboardAvoidingView } from 'react-native';

import { useAppTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { SanctuaryHeader } from '../../components/SanctuaryHeader';
import { MatrixRain } from '@/components/MatrixRain';
import { IconSymbol } from '../../components/ui/icon-symbol';
import { consultCodex } from '../../lib/openlibrary';
import * as FileSystem from 'expo-file-system';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useVoiceContext } from '../../contexts/VoiceContext';
import { useLlm } from '../../contexts/LlmContext';

// Offline Voice Lab dependencies
import { Audio } from 'expo-av';
import { ModelCategory, isModelDownloadedByCategory, deleteModelByCategory, ensureModelByCategory, refreshModelsByCategory, type DownloadProgress } from 'react-native-sherpa-onnx/download';
import { sherpaSpeechService } from '../../lib/SherpaSpeechService';
import * as Speech from 'expo-speech';
import { convertAudioToWav16k } from 'react-native-sherpa-onnx/audio';
import { SpeechFilter } from '../../lib/SpeechFilter';
import { micService } from '../../lib/UnifiedMicService';
import { settingsService } from '../../lib/SettingsService';

const OFF_MODELS = [
  {
    id: 'sherpa-onnx-supertonic-3-tts-int8-2026-05-11',
    name: 'Voces en Español (Supertonic-3, 122.8 MB)',
    category: ModelCategory.Tts,
    lang: 'es',
    speakersCount: 10,
    defaultSpeakerId: 4,
  },
  {
    id: 'vits-piper-en_US-arctic-medium',
    name: 'Voces en Ingles (Arctic Medium, 76.5 MB)',
    category: ModelCategory.Tts,
    lang: 'en',
    speakersCount: 18,
    defaultSpeakerId: 4,
  },
  {
    id: 'sherpa-onnx-whisper-tiny',
    name: 'Modelo TinyWhi de Grabacion Local (110.8 MB)',
    category: ModelCategory.Stt,
    lang: 'multilingual',
  }
];

export default function ExperimentalScreen() {
  const { colors, activeTheme } = useAppTheme();
  const { lang, t, setLang } = useLanguage();
  const router = useRouter();
  const { voice } = useVoiceContext();
  const { status, activeModel } = useLlm();

  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showKebabMenu, setShowKebabMenu] = useState(false);
  const kebabTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const [query, setQuery] = useState('');
  const [results, setResults] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [experimentalTurbo, setExperimentalTurbo] = useState(false);

  // Offline Voice Lab States
  const [modelStatuses, setModelStatuses] = useState<Record<string, 'download' | 'downloading' | 'extracting' | 'ready'>>({});
  const [downloadProgress, setDownloadProgress] = useState<Record<string, { percent: number; phase: string }>>({});
  const [selectedTtsModel, setSelectedTtsModel] = useState('sherpa-onnx-supertonic-3-tts-int8-2026-05-11');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState(4);
  const defaultTextEn = "Hello, I'm testing reading this text to see how my voice sounds. You can change the voice of the chat if you want, just keep the button on the voice you'd like to listen to. If you'd like to listen to the original one, click on Default.";
  const defaultTextEs = "Hola, estoy probando la lectura de este texto para ver cómo se escucha mi voz. ¿Te gusta cómo suena?";
  const [ttsText, setTtsText] = useState(lang === 'es' ? defaultTextEs : defaultTextEn);
  const [isTtsSynthesizing, setIsTtsSynthesizing] = useState(false);
  const [useSherpaSTT, setUseSherpaSTTState] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [sttResultText, setSttResultText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPreparingRecording, setIsPreparingRecording] = useState(false);

  // Experimental Walkie-Talkie States
  const [expWalkieTranscript, setExpWalkieTranscript] = useState('');
  const [expWalkieResponse, setExpWalkieResponse] = useState('');
  const [isExpWalkieProcessing, setIsExpWalkieProcessing] = useState(false);
  const [isExpWalkieSpeaking, setIsExpWalkieSpeaking] = useState(false);
  const [expWalkieError, setExpWalkieError] = useState('');

  const soundRef = useRef<Audio.Sound | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const expWalkieSoundRef = useRef<Audio.Sound | null>(null);
  const expWalkieRecordingRef = useRef<Audio.Recording | null>(null);

  /**
   * Deep validation: checks that the .ready marker exists AND that actual
   * model files (.onnx / .bin) are present inside the model directory.
   * If the marker is stale (files missing), it cleans up and returns 'download'.
   */
  const checkModelsStatus = async () => {
    const SHERPA_BASE = `${FileSystem.documentDirectory}sherpa-onnx/models`;

    const deepCheckModel = async (category: string, modelId: string): Promise<'ready' | 'download'> => {
      try {
        // Quick marker check first
        const markerUri = `${SHERPA_BASE}/${category}/${modelId}/.ready`;
        const markerInfo = await FileSystem.getInfoAsync(markerUri);
        if (!markerInfo.exists) return 'download';

        // Deep check: look for actual model files
        const modelDirUri = `${SHERPA_BASE}/${category}/${modelId}`;
        const dirInfo = await FileSystem.getInfoAsync(modelDirUri);
        if (!dirInfo.exists) {
          // Stale marker with no directory — clean up
          await FileSystem.deleteAsync(markerUri, { idempotent: true }).catch(() => { });
          return 'download';
        }

        // Read directory contents recursively (up to 2 levels)
        const hasModelFiles = async (dirPath: string, depth = 0): Promise<boolean> => {
          if (depth > 2) return false;
          try {
            const items = await FileSystem.readDirectoryAsync(dirPath);
            for (const item of items) {
              const lower = item.toLowerCase();
              if (lower.endsWith('.onnx') || lower.endsWith('.bin')) return true;
              if (!lower.includes('.')) {
                // Likely a subdirectory — recurse
                const subDir = `${dirPath}/${item}`;
                const info = await FileSystem.getInfoAsync(subDir);
                if (info.exists && info.isDirectory) {
                  if (await hasModelFiles(subDir, depth + 1)) return true;
                }
              }
            }
          } catch {
            // ignore unreadable dirs
          }
          return false;
        };

        const hasFiles = await hasModelFiles(modelDirUri);
        if (!hasFiles) {
          // Stale state: marker present but model files missing — clean up so re-download is offered
          console.warn(`[OfflineLab] Stale .ready marker for ${modelId} — no model files found. Cleaning up.`);
          try {
            await deleteModelByCategory(category as any, modelId);
          } catch {
            await FileSystem.deleteAsync(markerUri, { idempotent: true }).catch(() => { });
          }
          return 'download';
        }

        return 'ready';
      } catch (e) {
        console.warn(`Error deep-checking model ${modelId}`, e);
        return 'download';
      }
    };

    const categoryDir: Record<string, string> = {
      [ModelCategory.Tts]: 'tts',
      [ModelCategory.Stt]: 'stt',
    };

    const statusMap: Record<string, 'download' | 'ready'> = {};
    for (const m of OFF_MODELS) {
      const catFolder = categoryDir[m.category] ?? m.category;
      statusMap[m.id] = await deepCheckModel(catFolder, m.id);
    }

    setModelStatuses(prev => {
      const updated = { ...prev };
      for (const key of Object.keys(statusMap)) {
        if (updated[key] !== 'downloading' && updated[key] !== 'extracting') {
          updated[key] = statusMap[key];
        }
      }
      return updated;
    });
  };

  const initRegistry = async () => {
    try {
      await refreshModelsByCategory(ModelCategory.Tts);
      await refreshModelsByCategory(ModelCategory.Stt);
    } catch (e) {
      console.error("Failed to refresh models registry", e);
    }
    await checkModelsStatus();
  };

  const voiceRef = useRef(voice);
  voiceRef.current = voice;

  useFocusEffect(
    useCallback(() => {
      let isCurrent = true;

      const handleFocus = async () => {
        console.log('[EXPERIMENTAL] Tab focused. Releasing main voice resources...');
        if (voiceRef.current) {
          try { await voiceRef.current.stopSpeaking(); } catch (_) {}
          try { await voiceRef.current.stopListening(); } catch (_) {}
          // Pause to let native threads release mic
          await new Promise(resolve => setTimeout(resolve, 300));
          try { await voiceRef.current.releaseResources(); } catch (_) {}
        }
        if (isCurrent) {
          await initRegistry();
        }
      };

      handleFocus();

      return () => {
        isCurrent = false;
        console.log('[EXPERIMENTAL] Tab blurred. Releasing speech resources...');
        sherpaSpeechService.releaseAll();
        if (soundRef.current) {
          soundRef.current.unloadAsync().catch(() => { });
          soundRef.current = null;
        }
        if (recordingRef.current) {
          recordingRef.current.stopAndUnloadAsync().catch(() => { });
          recordingRef.current = null;
        }
      };
    }, [])
  );

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      try {
        const settings = await settingsService.get();
        if (isMounted) {
          if (settings.experimentalTurbo) setExperimentalTurbo(true);
          if (settings.useSherpaSTT !== undefined) setUseSherpaSTTState(settings.useSherpaSTT);
          if (settings.voice) {
            if (settings.voice.selectedOfflineVoiceId) {
              setSelectedTtsModel(settings.voice.selectedOfflineVoiceId);
            } else {
              setSelectedTtsModel('default');
            }
            if (settings.voice.selectedOfflineSpeakerId !== undefined) {
              setSelectedSpeakerId(settings.voice.selectedOfflineSpeakerId);
            }
          }
        }
      } catch (e) { console.log('Error loading settings', e); }
    };
    loadSettings();
    return () => { isMounted = false; };
  }, []);

  // Update TTS test text when language changes
  useEffect(() => {
    setTtsText(lang === 'es' ? defaultTextEs : defaultTextEn);
  }, [lang]);

  useEffect(() => {
    settingsService.set({
      voice: {
        selectedOfflineVoiceId: selectedTtsModel === 'default' ? null : selectedTtsModel,
        selectedOfflineSpeakerId: selectedSpeakerId,
      },
    }).catch((e) => console.error('Error saving voice settings in experimental lab', e));
  }, [selectedTtsModel, selectedSpeakerId]);

  const saveSettings = async (updates: any) => {
    try {
      await settingsService.set(updates);
    } catch (e) { console.error('Save error', e); }
  };

  const handleConsult = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResults('');
    try {
      const data = await consultCodex(query);
      if (data) {
        setResults(data);
      } else {
        setResults(lang === 'es' ? 'No se hallaron registros en la Bóveda para este término.' : 'No records found in the Vault for this term.');
      }
    } catch (e) {
      setResults(lang === 'es' ? 'Error en la conexión con la Gran Biblioteca.' : 'Error connecting to the Grand Library.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (model: typeof OFF_MODELS[0]) => {
    try {
      setModelStatuses(prev => ({ ...prev, [model.id]: 'downloading' }));
      setDownloadProgress(prev => ({ ...prev, [model.id]: { percent: 0, phase: 'downloading' } }));

      await refreshModelsByCategory(model.category);

      await ensureModelByCategory(model.category, model.id, {
        onProgress: (p: DownloadProgress) => {
          const percent = Math.round(p.percent);
          const phase = p.phase || 'downloading';
          setModelStatuses(prev => ({
            ...prev,
            [model.id]: phase === 'extracting' ? 'extracting' : 'downloading'
          }));
          setDownloadProgress(prev => ({
            ...prev,
            [model.id]: { percent, phase }
          }));
        }
      });

      setModelStatuses(prev => ({ ...prev, [model.id]: 'ready' }));
    } catch (e: any) {
      console.error(`Download failed for ${model.id}`, e);
      const isNetworkError = String(e?.message || e).toLowerCase().includes('resolve host') || String(e?.message || e).toLowerCase().includes('no address') || String(e?.message || e).toLowerCase().includes('network');
      const errTitle = lang === 'es' ? 'Error de Descarga' : 'Download Error';
      const errBody = isNetworkError
        ? (lang === 'es'
          ? 'No se puede alcanzar GitHub. Verifica la conexión a internet del dispositivo o emulador.'
          : 'Cannot reach GitHub. Check the internet connection on your device or emulator.')
        : (lang === 'es'
          ? `No se pudo descargar el modelo: ${e.message || e}`
          : `Could not download model: ${e.message || e}`);
      Alert.alert(errTitle, errBody);
      setModelStatuses(prev => ({ ...prev, [model.id]: 'download' }));
    } finally {
      checkModelsStatus();
    }
  };

  const handleTestTTS = async () => {
    if (isTtsSynthesizing) return;
    setIsTtsSynthesizing(true);
    try {
      if (selectedTtsModel === 'default' || selectedTtsModel === null) {
        const timeoutId = setTimeout(() => {
          setIsTtsSynthesizing(false);
        }, 8000);

        const clearAndReset = () => {
          clearTimeout(timeoutId);
          setIsTtsSynthesizing(false);
        };

        const speechOptions = {
          language: lang === 'es' ? 'es-MX' : 'en-US',
          onDone: clearAndReset,
          onStopped: clearAndReset,
          onError: clearAndReset,
        };
        Speech.speak(ttsText, speechOptions);
        return;
      }

      const isDownloaded = await isModelDownloadedByCategory(ModelCategory.Tts, selectedTtsModel);
      if (!isDownloaded) {
        Alert.alert('Error', lang === 'es' ? 'El modelo de voz seleccionado no está descargado.' : 'Selected voice model is not downloaded.');
        setIsTtsSynthesizing(false);
        return;
      }

      const langCode = selectedTtsModel.includes('es_') || selectedTtsModel.includes('spanish') || selectedTtsModel.includes('supertonic') ? 'es' : 'en';
      await sherpaSpeechService.initializeTTS(langCode, selectedTtsModel);

      const ttsUri = await sherpaSpeechService.speakOffline(ttsText, selectedSpeakerId);
      console.log(`TTS generated at: ${ttsUri}`);

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: ttsUri },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
          soundRef.current = null;
          setIsTtsSynthesizing(false);
        }
      });
    } catch (e: any) {
      console.error('TTS Test failed', e);
      Alert.alert('Error', lang === 'es' ? `Fallo en la síntesis TTS: ${e.message || e}` : `TTS synthesis failed: ${e.message || e}`);
      setIsTtsSynthesizing(false);
    }
  };

  const handleStartRecording = async () => {
    if (isRecording || isTranscribing || isPreparingRecording) return;
    setIsPreparingRecording(true);
    setSttResultText(lang === 'es' ? 'Inicializando micrófono...' : 'Initializing microphone...');

    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert(
          lang === 'es' ? 'Permiso Denegado' : 'Permission Denied',
          lang === 'es' ? 'Se requiere acceso al micrófono para grabar audio.' : 'Microphone access is required to record audio.'
        );
        setIsPreparingRecording(false);
        setSttResultText('');
        return;
      }

      // Cleanup any active sound playback
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => { });
        soundRef.current = null;
      }

      // Cleanup any legacy recording objects defensively
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (_) { }
        recordingRef.current = null;
      }

      // Ensure any main voice context is stopped & released to free mic
      if (voice) {
        try { await voice.stopListening(); } catch (_) {}
        try { await voice.releaseResources(); } catch (_) {}
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Atomic recording configuration using native high quality standard format (.m4a)
      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: {},
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
      recordingRef.current = newRecording;

      setIsRecording(true);
      setSttResultText(lang === 'es' ? 'Grabando...' : 'Recording...');
    } catch (e: any) {
      console.error('Failed to start recording', e);
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch (_) { }
      }
      recordingRef.current = null;
      setIsRecording(false);
      setSttResultText('');
      Alert.alert('Error', lang === 'es' ? `No se pudo iniciar la grabación: ${e.message || e}` : `Could not start recording: ${e.message || e}`);
    } finally {
      setIsPreparingRecording(false);
    }
  };

  // STT Stop Recording Function
  const handleStopRecording = async () => {
    if (!recordingRef.current) return;
    setIsRecording(false);
    setIsTranscribing(true);
    setSttResultText(lang === 'es' ? 'Procesando transcripción local...' : 'Processing local transcription...');
    
    let tempWavUri: string | null = null;
    try {
      const recording = recordingRef.current;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      if (uri) {
        console.log(`[Offline STT] Audio recorded at: ${uri}`);
        
        // 1. Convert the M4A/AAC file to 16kHz WAV format (required by sherpa-onnx)
        const baseDir = FileSystem.cacheDirectory;
        tempWavUri = `${baseDir}stt_transcribe_${Date.now()}.wav`;
        const inputPath = uri.replace(/^file:\/\//, '');
        const outputPath = tempWavUri.replace(/^file:\/\//, '');

        console.log(`[Offline STT] Converting ${inputPath} to WAV 16k mono PCM...`);
        await convertAudioToWav16k(inputPath, outputPath);

        // 2. Initialize and run Sherpa-Onnx STT transcription
        console.log('[Offline STT] Initializing STT model...');
        await sherpaSpeechService.initializeSTT('sherpa-onnx-whisper-tiny');
        
        console.log('[Offline STT] Transcribing converted file...');
        const text = await sherpaSpeechService.transcribeOffline(tempWavUri);
        setSttResultText(text || (lang === 'es' ? '[Silencio o no reconocido]' : '[Silence or unrecognized]'));
      } else {
        setSttResultText(lang === 'es' ? 'Error: Ruta de audio inválida.' : 'Error: Invalid audio path.');
      }
    } catch (e: any) {
      console.error('STT Transcription failed', e);
      Alert.alert('Error', lang === 'es' ? `Fallo en transcripción Whisper: ${e.message || e}` : `Whisper transcription failed: ${e.message || e}`);
      setSttResultText('');
    } finally {
      setIsTranscribing(false);
      // Clean up the temporary WAV file to save space
      if (tempWavUri) {
        await FileSystem.deleteAsync(tempWavUri, { idempotent: true }).catch(() => {});
      }
    }
  };

  // Experimental Walkie-Talkie Functions
  const handleExpWalkieStart = async () => {
    if (isExpWalkieProcessing || isExpWalkieSpeaking) return;
    
    try {
      // Ensure main voice is stopped
      if (voice) {
        try { await voice.stopListening(); } catch (_) {}
        try { await voice.releaseResources(); } catch (_) {}
      }
      
      // Register session
      await micService.registerSession('EXPERIMENTAL_WALKIE', async () => {
        console.log('[EXPERIMENTAL_WALKIE] Force-stopping');
        if (expWalkieRecordingRef.current) {
          const rec = expWalkieRecordingRef.current;
          expWalkieRecordingRef.current = null;
          try { await rec.stopAndUnloadAsync(); } catch (e) {}
        }
        setExpWalkieTranscript('');
        setExpWalkieResponse('');
      });

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const recordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: {},
      };

      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      expWalkieRecordingRef.current = recording;
      setExpWalkieTranscript('');
      setExpWalkieResponse('');
    } catch (e: any) {
      console.error('[EXPERIMENTAL_WALKIE] Start failed:', e);
      setExpWalkieError(lang === 'es' ? 'Error al iniciar grabación' : 'Failed to start recording');
    }
  };

  const handleExpWalkieStop = async () => {
    if (!expWalkieRecordingRef.current) return;
    
    setIsExpWalkieProcessing(true);
    let tempWavUri: string | null = null;
    
    try {
      const recording = expWalkieRecordingRef.current;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      expWalkieRecordingRef.current = null;
      micService.unregisterSession('EXPERIMENTAL_WALKIE');

      if (!uri) {
        setExpWalkieError(lang === 'es' ? 'No se obtuvo audio' : 'No audio captured');
        return;
      }

      // Convert to WAV
      tempWavUri = `${FileSystem.cacheDirectory}exp_walkie_${Date.now()}.wav`;
      const inputPath = uri.replace(/^file:\/\//, '');
      const outputPath = tempWavUri.replace(/^file:\/\//, '');
      await convertAudioToWav16k(inputPath, outputPath);

      // File validity check
      const isValid = await SpeechFilter.isAudioFileValid(tempWavUri);
      if (!isValid) {
        setExpWalkieError(lang === 'es' ? 'Audio vacío o corrupto' : 'Audio empty or corrupt');
        return;
      }

      // Transcribe
      await sherpaSpeechService.initializeSTT('sherpa-onnx-whisper-tiny');
      const text = await sherpaSpeechService.transcribeOffline(tempWavUri);
      
      // Clean up
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        await FileSystem.deleteAsync(tempWavUri, { idempotent: true });
      } catch (e) {}

      // Filter
      let cleaned = text.replace(/\[BLANK_AUDIO\]/gi, '').replace(/\[silence\]/gi, '').trim();
      if (!cleaned || SpeechFilter.isNoiseOrHallucination(cleaned, lang)) {
        setExpWalkieError(lang === 'es' ? 'No se detectó habla válida' : 'No valid speech detected');
        return;
      }

      // Word count (1-12)
      const words = cleaned.split(/\s+/).filter(w => w.length > 0);
      if (words.length > 12) {
        cleaned = words.slice(0, 12).join(' ');
      }

      setExpWalkieTranscript(cleaned);

      // Get LLM response (using a simple prompt)
      const response = await fetch('http://localhost:1234/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma-3-4b-it',
          messages: [{ role: 'user', content: cleaned }],
          max_tokens: 100,
          stream: false
        })
      });
      
      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || '';
      setExpWalkieResponse(aiResponse);

      // TTS
      if (aiResponse && modelStatuses[selectedTtsModel] === 'ready') {
        setIsExpWalkieSpeaking(true);
        const langCode = selectedTtsModel.includes('es_') || selectedTtsModel.includes('supertonic') ? 'es' : 'en';
        await sherpaSpeechService.initializeTTS(langCode, selectedTtsModel);
        const ttsUri = await sherpaSpeechService.speakOffline(aiResponse, selectedSpeakerId);
        
        if (expWalkieSoundRef.current) {
          await expWalkieSoundRef.current.unloadAsync().catch(() => {});
        }
        
        const { sound } = await Audio.Sound.createAsync({ uri: ttsUri }, { shouldPlay: true });
        expWalkieSoundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
            expWalkieSoundRef.current = null;
            setIsExpWalkieSpeaking(false);
          }
        });
      }
    } catch (e: any) {
      console.error('[EXPERIMENTAL_WALKIE] Process failed:', e);
      setExpWalkieError(lang === 'es' ? 'Error en el proceso' : 'Processing error');
    } finally {
      setIsExpWalkieProcessing(false);
    }
  };

  const handleExpWalkieToggleMute = () => {
    if (isExpWalkieSpeaking) {
      if (expWalkieSoundRef.current) {
        expWalkieSoundRef.current.stopAsync().catch(() => {});
      }
      setIsExpWalkieSpeaking(false);
    }
    setExpWalkieTranscript('');
    setExpWalkieResponse('');
  };



  return (
      <SafeAreaView style={[styles.container, { backgroundColor: activeTheme === 'matrix' ? '#000000' : colors.background }]}>
        {activeTheme === 'matrix' && <MatrixRain />}

        <View style={{ zIndex: 100 }}>
          <SanctuaryHeader
            showVoiceIcon={false}
            activeModelLabel={status === 'ready' && activeModel ? activeModel[lang === 'es' ? 'labelEs' : 'labelEn'] : undefined}
            showLangPicker={showLangPicker}
            onLangPress={() => setShowLangPicker(!showLangPicker)}
            onLangSelect={(l) => { setLang(l as 'en' | 'es'); setShowLangPicker(false); }}
            showKebabMenu={showKebabMenu}
            onKebabPress={() => {
              const next = !showKebabMenu;
              setShowKebabMenu(next);
              if (next) startKebabTimer();
              else stopKebabTimer();
            }}
            onKebabAction={(action) => {
              if (action === 'clear') {
                Alert.alert(
                  lang === 'es' ? 'Acción no disponible' : 'Action not available',
                  lang === 'es'
                    ? 'El historial de chat solo se puede borrar desde la pestaña principal.'
                    : 'Chat history can only be cleared from the main tab.'
                );
              } else {
                router.replace({ pathname: '/', params: { openModal: action } });
              }
            }}
          />
          {/* Overlay for closing menus on outside tap */}
        {(showLangPicker || showKebabMenu) && (
          <TouchableOpacity
            style={[StyleSheet.absoluteFill, { zIndex: 9998, elevation: 998 }]}
            activeOpacity={1}
            onPress={() => {
              if (showLangPicker) setShowLangPicker(false);
              if (showKebabMenu) {
                setShowKebabMenu(false);
                stopKebabTimer();
              }
            }}
          />
        )}
        {/* Language Dropdown - rendered at top level for proper z-index */}
        {showLangPicker && (
            <View style={{
              position: 'absolute',
              top: 90,
              right: 60,
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: 5,
              zIndex: 9999,
              elevation: 999,
              minWidth: 80,
            }}>
              <TouchableOpacity style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }} onPress={() => { setLang('en'); setShowLangPicker(false); }}>
                <Text style={{ color: lang === 'en' ? colors.primary : colors.textPrimary }}>EN</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }} onPress={() => { setLang('es'); setShowLangPicker(false); }}>
                <Text style={{ color: lang === 'es' ? colors.primary : colors.textPrimary }}>ES</Text>
              </TouchableOpacity>
            </View>
          )}
          {/* Kebab Menu Dropdown - rendered at top level for proper z-index */}
          {showKebabMenu && (
            <View
              style={{
                position: 'absolute',
                top: 50,
                right: 10,
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 5,
                zIndex: 9999,
                elevation: 999,
                minWidth: 220,
              }}
            >
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'profile' } }); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>👤</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Perfil del Usuario' : 'User Profile'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'intro' } }); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>👓</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Introducción' : 'Introduction'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'voice_settings' } }); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>🔊</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Configuración Voz Android' : 'Android Voice Settings'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'vault' } }); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>🔒</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Encriptación de Datos' : 'Data Encryption'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center' }} onPress={() => { setShowKebabMenu(false); router.replace({ pathname: '/', params: { openModal: 'psy' } }); }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>Ψ</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Test de Personalidad' : 'Personality Test'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ padding: 12, borderBottomWidth: 0, flexDirection: 'row', alignItems: 'center' }} onPress={() => {
                setShowKebabMenu(false);
                Alert.alert(
                  lang === 'es' ? 'Acción no disponible' : 'Action not available',
                  lang === 'es'
                    ? 'El historial de chat solo se puede borrar desde la pestaña principal.'
                    : 'Chat history can only be cleared from the main tab.'
                );
              }}>
                <Text style={{ fontSize: 18, marginRight: 10 }}>🗑️</Text>
                <Text style={{ color: colors.textPrimary, flex: 1 }}>{lang === 'es' ? 'Borrar Historial' : 'Clear History'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, zIndex: 1 }}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent
            ]}
          >
            <View style={styles.content}>
              <Text style={[styles.title, { color: colors.primary }]}>EXPERIMENTAL LAB</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {lang === 'es' ? 'Cámara de investigación bibliográfica y voz offline.' : 'Bibliographic research and offline voice chamber.'}
              </Text>

              <View style={[styles.vaultCard, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="books.vertical.fill" size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.primary }]}>THE CODEX (v1.0)</Text>
                </View>

                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface }]}
                  placeholder={lang === 'es' ? 'Buscar tratado, libro o autor...' : 'Search for treaty, book or author...'}
                  placeholderTextColor={colors.textSecondary}
                  value={query}
                  onChangeText={setQuery}
                />

                <TouchableOpacity
                  style={[styles.button, { backgroundColor: colors.primary }]}
                  onPress={handleConsult}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.buttonText}>
                      {lang === 'es' ? 'CONSULTAR EL CÓDICE' : 'CONSULT THE CODEX'}
                    </Text>
                  )}
                </TouchableOpacity>

                {results !== '' && (
                  <View style={[styles.resultsContainer, { backgroundColor: '#000', borderColor: colors.secondary }]}>
                    <Text style={styles.resultsText}>{results}</Text>
                  </View>
                )}
              </View>

              {/* CORE HARDWARE (OPENCL GPU) CARD */}
              <View style={[styles.vaultCard, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="cpu" size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.primary }]}>CORE HARDWARE</Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>
                      {lang === 'es' ? 'Turbo Experimental (OpenCL GPU)' : 'Experimental Turbo (OpenCL GPU)'}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {lang === 'es' ? 'Desvía el LLM a la tarjeta gráfica. iPhone usa Metal por defecto. En Android (OpenCL) usa esto bajo tu propio riesgo, puede causar inestabilidad.' : 'Offloads LLM to the GPU. iPhone uses Metal by default. On Android (OpenCL) use at your own risk, may cause instability.'}
                    </Text>
                  </View>
                  <Switch
                    trackColor={{ false: colors.border, true: '#d96c6c' }}
                    thumbColor={experimentalTurbo ? '#FFF' : '#f4f3f4'}
                    onValueChange={async (val) => {
                      setExperimentalTurbo(val);
                      await saveSettings({ experimentalTurbo: val });
                    }}
                    value={experimentalTurbo}
                  />
                </View>

                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 15 }} />

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>
                      {lang === 'es' ? 'Transcripción Sherpa-ONNX (STT)' : 'Sherpa-ONNX Transcription (STT)'}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {lang === 'es' 
                        ? 'Usa el motor Sherpa-ONNX local para la transcripción de voz del chat en lugar de Whisper.rn. Requiere haber descargado el modelo local (Modelo TinyWhi de Grabación Local).' 
                        : 'Uses local Sherpa-ONNX engine for chat voice transcription instead of Whisper.rn. Requires downloading the local model (Local Recording TinyWhi Model).'}
                    </Text>
                  </View>
                  <Switch
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={useSherpaSTT ? '#FFF' : '#f4f3f4'}
                    onValueChange={async (val) => {
                      setUseSherpaSTTState(val);
                      await saveSettings({ useSherpaSTT: val });
                    }}
                    value={useSherpaSTT}
                  />
                </View>
              </View>

              {/* EXPERIMENTAL VOICE ENGINE CARD REMOVED (integrated directly in main chat tab header) */}

              {/* OFFLINE VOICE LAB (SHERPA-ONNX) CARD */}
              <View style={[styles.vaultCard, { borderColor: colors.border, backgroundColor: colors.surfaceSecondary, marginTop: 20 }]}>
                <View style={styles.cardHeader}>
                  <IconSymbol name="waveform" size={20} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.primary }]}>
                    {lang === 'es' ? 'SELECCION DE VOCES SHERPA-ONNX' : 'SHERPA-ONNX VOICE SELECTION'}
                  </Text>
                </View>

                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 15 }}>
                  {lang === 'es'
                    ? 'Laboratorio para probar síntesis Piper/Supertonic y transcripción Whisper local sin internet.'
                    : 'Sandbox to test local offline Piper/Supertonic synthesis and Whisper transcription.'}
                </Text>

                {/* Model List */}
                <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 14, marginBottom: 10 }}>
                  {lang === 'es' ? 'Modelos Locales:' : 'Local Models:'}
                </Text>
                {OFF_MODELS.map((model) => {
                  const status = modelStatuses[model.id] || 'download';
                  const progress = downloadProgress[model.id];

                  return (
                    <View key={model.id} style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border
                    }}>
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 'bold' }}>{model.name}</Text>
                        {status === 'downloading' && progress && (
                          <Text style={{ color: colors.secondary, fontSize: 11 }}>
                            {lang === 'es' ? `Descargando: ${progress.percent}%` : `Downloading: ${progress.percent}%`}
                          </Text>
                        )}
                        {status === 'extracting' && (
                          <Text style={{ color: '#E0A96D', fontSize: 11 }}>
                            {lang === 'es' ? 'Extrayendo archivos...' : 'Extracting files...'}
                          </Text>
                        )}
                      </View>

                      {status === 'ready' ? (
                        <Text style={{ color: '#00FFCC', fontWeight: 'bold', fontSize: 12 }}>✓ Ready</Text>
                      ) : status === 'downloading' || status === 'extracting' ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <TouchableOpacity
                          style={{
                            backgroundColor: colors.primary,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderRadius: 6
                          }}
                          onPress={() => handleDownload(model)}
                        >
                          <Text style={{ color: '#FFF', fontSize: 11, fontWeight: 'bold' }}>
                            {lang === 'es' ? 'DESCARGAR' : 'DOWNLOAD'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                {/* TTS Test Section */}
                <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 15, marginBottom: 10 }}>
                    {lang === 'es' ? 'Offline TTS Synthesis Voice:' : 'Offline TTS Synthesis Voice:'}
                  </Text>

                  {/* Voice selector */}
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 5 }}>
                      {lang === 'es' ? 'Seleccionar Voz:' : 'Select Voice:'}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
                      {/* Default native Android voice button */}
                      <TouchableOpacity
                        style={{
                          backgroundColor: selectedTtsModel === 'default' || selectedTtsModel === null ? colors.primary : colors.surface,
                          borderColor: colors.border,
                          borderWidth: 1,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                        }}
                        onPress={() => {
                          setSelectedTtsModel('default');
                          setSelectedSpeakerId(0);
                        }}
                      >
                        <Text style={{
                          color: selectedTtsModel === 'default' || selectedTtsModel === null ? '#FFF' : colors.textSecondary,
                          fontSize: 10,
                          fontWeight: 'bold'
                        }}>
                          {lang === 'es' ? 'Default (Voz de Android)' : 'Default (Android Voice)'}
                        </Text>
                      </TouchableOpacity>

                      {OFF_MODELS.filter(m => m.category === ModelCategory.Tts).map(m => {
                        const isSelected = selectedTtsModel === m.id;
                        const isDownloaded = modelStatuses[m.id] === 'ready';
                        return (
                          <TouchableOpacity
                            key={m.id}
                            style={{
                              backgroundColor: isSelected ? colors.primary : colors.surface,
                              borderColor: colors.border,
                              borderWidth: 1,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 6,
                              opacity: isDownloaded ? 1 : 0.5
                            }}
                            onPress={() => {
                              if (isDownloaded) {
                                setSelectedTtsModel(m.id);
                                setSelectedSpeakerId(m.defaultSpeakerId ?? 4);
                              } else {
                                Alert.alert('Info', lang === 'es' ? 'Descarga el modelo primero.' : 'Download the model first.');
                              }
                            }}
                          >
                            <Text style={{
                              color: isSelected ? '#FFF' : colors.textSecondary,
                              fontSize: 10,
                              fontWeight: 'bold'
                            }}>
                              {m.id.includes('supertonic-3') ? 'ES Supertonic-3' : m.id.includes('arctic-medium') ? 'EN Arctic' : m.id}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Dynamic Speaker Selector */}
                  {(() => {
                    const activeModelObj = OFF_MODELS.find(m => m.id === selectedTtsModel);
                    if (!activeModelObj || !activeModelObj.speakersCount) return null;
                    return (
                      <View style={{ marginBottom: 15, marginTop: 5 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 5 }}>
                          {lang === 'es'
                            ? `Seleccionar Altavoz (ID 0-${activeModelObj.speakersCount - 1}):`
                            : `Select Speaker (ID 0-${activeModelObj.speakersCount - 1}):`}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
                          {Array.from({ length: activeModelObj.speakersCount }).map((_, idx) => {
                            const isSelected = selectedSpeakerId === idx;
                            return (
                              <TouchableOpacity
                                key={idx}
                                style={{
                                  backgroundColor: isSelected ? colors.primary : colors.surface,
                                  borderColor: colors.border,
                                  borderWidth: 1,
                                  paddingHorizontal: 8,
                                  paddingVertical: 5,
                                  borderRadius: 6,
                                }}
                                onPress={() => setSelectedSpeakerId(idx)}
                              >
                                <Text style={{
                                  color: isSelected ? '#FFF' : colors.textSecondary,
                                  fontSize: 10,
                                  fontWeight: 'bold'
                                }}>
                                  {`Altavoz ${idx}`}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })()}

                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.surface, height: 40 }]}
                    placeholder={lang === 'es' ? 'Escribe algo para sintetizar...' : 'Type something to synthesize...'}
                    placeholderTextColor={colors.textSecondary}
                    value={ttsText}
                    onChangeText={setTtsText}
                  />

                  <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.primary }]}
                    onPress={handleTestTTS}
                    disabled={isTtsSynthesizing}
                  >
                    {isTtsSynthesizing ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.buttonText}>
                        {lang === 'es' ? 'Prueba la Voz' : 'Test the Voice'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* STT Test Section */}
                <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 15 }}>
                  <Text style={{ color: colors.textPrimary, fontWeight: 'bold', fontSize: 15, marginBottom: 10 }}>
                    {lang === 'es' ? 'Offline STT Transcription Tool' : 'Offline STT Transcription Tool'}
                  </Text>

                  {modelStatuses['sherpa-onnx-whisper-tiny'] === 'ready' ? (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.button,
                          { backgroundColor: isRecording ? '#FF5252' : colors.primary }
                        ]}
                        onPress={isRecording ? handleStopRecording : handleStartRecording}
                        disabled={isTranscribing || isPreparingRecording}
                      >
                        {isTranscribing || isPreparingRecording ? (
                          <ActivityIndicator color="#FFF" />
                        ) : (
                          <Text style={styles.buttonText}>
                            {isRecording
                              ? (lang === 'es' ? '⏹️ DETENER Y TRANSCRIBIR' : '⏹️ STOP & TRANSCRIBE')
                              : (lang === 'es' ? '🎙️ INICIAR GRABACIÓN LOCAL' : '🎙️ START LOCAL RECORDING')
                            }
                          </Text>
                        )}
                      </TouchableOpacity>

                      {sttResultText !== '' && (
                        <View style={[styles.resultsContainer, { backgroundColor: '#000', borderColor: colors.secondary, marginTop: 10 }]}>
                          <Text style={styles.resultsText}>{sttResultText}</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontStyle: 'italic' }}>
                      {lang === 'es'
                        ? 'Descarga el modelo Whisper STT para habilitar la transcripción offline.'
                        : 'Download the Whisper STT model to enable offline transcription.'}
                    </Text>
                  )}
                </View>

                {/* WALKIE-TALKIE MODE SECTION */}
                <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: colors.primary, paddingTop: 15 }}>
                  <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 15, marginBottom: 10 }}>
                    {lang === 'es' ? '🎙️ Walkie-Talkie Mode (Experimental)' : '🎙️ Walkie-Talkie Mode (Experimental)'}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 10 }}>
                    {lang === 'es' 
                      ? 'Grabación por pulsación: habla, suelta, y recibe respuesta de la IA con voz.'
                      : 'Press-to-talk: speak, release, and get AI response with voice.'}
                  </Text>

                  {modelStatuses['sherpa-onnx-whisper-tiny'] === 'ready' && modelStatuses[selectedTtsModel] === 'ready' ? (
                    <>
                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                        <TouchableOpacity
                          style={[
                            styles.button,
                            { 
                              backgroundColor: expWalkieRecordingRef.current ? '#FF5252' : colors.primary,
                              flex: 1,
                              height: 50
                            }
                          ]}
                          onPress={expWalkieRecordingRef.current ? handleExpWalkieStop : handleExpWalkieStart}
                          disabled={isExpWalkieProcessing || isExpWalkieSpeaking}
                        >
                          {isExpWalkieProcessing ? (
                            <ActivityIndicator color="#FFF" />
                          ) : (
                            <Text style={styles.buttonText}>
                              {expWalkieRecordingRef.current
                                ? (lang === 'es' ? '⏹️ SOLTAR PARA PROCESAR' : '⏹️ RELEASE TO PROCESS')
                                : (lang === 'es' ? '🎙️ MANTENER PARA HABLAR' : '🎙️ PRESS & HOLD TO TALK')
                              }
                            </Text>
                          )}
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={{
                            backgroundColor: isExpWalkieSpeaking ? colors.surface : colors.primary,
                            borderWidth: 1,
                            borderColor: colors.border,
                            borderRadius: 12,
                            width: 50,
                            height: 50,
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}
                          onPress={handleExpWalkieToggleMute}
                        >
                          <Text style={{ fontSize: 20, color: isExpWalkieSpeaking ? colors.textSecondary : '#FFF' }}>
                            {isExpWalkieSpeaking ? "🔇" : "🔊"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {expWalkieError ? (
                        <Text style={{ color: '#ff6b6b', fontSize: 12, marginBottom: 10 }}>{expWalkieError}</Text>
                      ) : null}

                      {expWalkieTranscript ? (
                        <View style={{ marginBottom: 10 }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 5 }}>
                            {lang === 'es' ? 'Tú dijiste:' : 'You said:'}
                          </Text>
                          <Text style={{ color: colors.primary, fontSize: 14, fontWeight: 'bold' }}>
                            {expWalkieTranscript}
                          </Text>
                        </View>
                      ) : null}

                      {expWalkieResponse ? (
                        <View style={{ marginBottom: 10 }}>
                          <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 5 }}>
                            {lang === 'es' ? 'IA responde:' : 'AI responds:'}
                          </Text>
                          <Text style={{ color: colors.secondary, fontSize: 14 }}>
                            {expWalkieResponse}
                          </Text>
                        </View>
                      ) : null}
                    </>
                  ) : (
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontStyle: 'italic' }}>
                      {lang === 'es'
                        ? 'Requiere modelos STT y TTS descargados.'
                        : 'Requires STT and TTS models downloaded.'}
                    </Text>
                  )}
                </View>
              </View>


            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  vaultCard: {
    width: '100%',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 14,
  },
  button: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    letterSpacing: 1,
    fontSize: 14,
  },
  resultsContainer: {
    marginTop: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  resultsText: {
    color: '#00FFCC',
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  }
});
