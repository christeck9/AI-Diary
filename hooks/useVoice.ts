/**
 * 🛡️ ARCHITECTURAL SHIELD - VOICE SYSTEM SEGREGATION POLICY:
 * This file implements standard dictation/TTS components. Do NOT mix its state
 * with Walkie-Talkie (Modo A) speech queue pipelining in useInteractiveVoice.ts.
 * Keep their lifecycles and variables completely decoupled.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import { initWhisper } from 'whisper.rn';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { PermissionsAndroid, Platform } from 'react-native';
import { getHardwareConfig } from '../lib/hardware';
import { micService } from '../lib/UnifiedMicService';
import { Asset } from 'expo-asset';
import { SpeechFilter } from '../lib/SpeechFilter';
import { settingsService } from '../lib/SettingsService';

// ── Model URLs ──
const WHISPER_MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin';
const WHISPER_MODEL_FILENAME = 'ggml-tiny.bin';

// ── VAD Sensitivity Configuration ──
export const getVadConfigForLevel = (level: number) => {
  const base = { realtimeAudioSliceSec: 6 }; // Restored to 6s for better context accuracy (V1.9.1)
  switch (level) {
    case 1: return { ...base, vadPreset: 'sensitive', vadThrottleMs: 1500 }; // Cleanest
    case 2: return { ...base, vadPreset: 'sensitive', vadThrottleMs: 1500 }; // Clean
    case 3: return { ...base, vadPreset: 'noisy', vadThrottleMs: 1500 };     // Balanced (Default)
    case 4: return { ...base, vadPreset: 'noisy', vadThrottleMs: 1500 };     // Noisy
    case 5: return { ...base, vadPreset: 'noisy', vadThrottleMs: 1500 };     // Extreme Noise
    default: return { ...base, vadPreset: 'noisy', vadThrottleMs: 1500 };
  }
};

import { useSafeState } from './useSafeState';

export function useVoice(lang: string = 'en', psyProfile?: { O: number, C: number, E: number, A: number, N: number, D: number, L: number }) {
  const [vadLevel, setVadLevelInternal] = useSafeState(3);
  const vadLevelRef = useRef(3);
  const [isVadCapturing, setIsVadCapturing] = useSafeState(false);

  const setVadLevel = useCallback((level: number) => {
    setVadLevelInternal(level);
    vadLevelRef.current = level;
  }, []);

  const [isListening, setIsListening] = useSafeState(false);
  const [transcript, setTranscriptInternal] = useSafeState('');
  const transcriptRef = useRef('');
  const setTranscript = useCallback((val: string) => {
    setTranscriptInternal(val);
    transcriptRef.current = val;
  }, []);
  const [isSpeaking, setIsSpeaking] = useSafeState(false);
  const [ttsEnabled, setTtsEnabled] = useSafeState(true);
  const [voiceError, setVoiceError] = useSafeState('');
  const [isInitializing, setIsInitializing] = useSafeState(false);
  const [isWhisperReady, setIsWhisperReady] = useSafeState(false);
  const [availableVoices, setAvailableVoices] = useSafeState<Speech.Voice[]>([]);
  const [isMuted, setIsMuted] = useSafeState(false); // Master Switch
  const [selectedVoiceId, setSelectedVoiceId] = useSafeState<string | null>(null);
  const [selectedOfflineVoiceId, setSelectedOfflineVoiceId] = useSafeState<string | null>('default');
  const [selectedOfflineSpeakerId, setSelectedOfflineSpeakerId] = useSafeState<number>(0);
  const whisperContextRef = useRef<any>(null);
  const stopFnRef = useRef<(() => void) | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  // ── Mutex & Debounce Refs for VAD Sensitivity Changes ──
  const vadDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRestartingVadRef = useRef<boolean>(false);
  const pendingVadLevelRef = useRef<number | null>(null);

  // ── Dictation Callbacks Refs for Safe Restart ──
  const dictationCallbacksRef = useRef<{
    onSpeechStart?: () => void;
    onSpeechEnd?: (text: string) => void;
    onProgress?: (phase: 'permission' | 'init' | 'ready') => void;
  }>({});
  
  // Expose whisperContextRef for external access (needed by useInteractiveVoice)
  const getWhisperContext = useCallback(() => whisperContextRef.current, []);

  // getSettings delegado al SettingsService singleton
  const getSettings = useCallback(async () => {
    return await settingsService.get();
  }, []);

  // Effect to Persist Voice Settings via SettingsService
  useEffect(() => {
    settingsService.set({
      voice: {
        selectedVoiceId,
        isMuted,
        selectedOfflineVoiceId,
        selectedOfflineSpeakerId,
      },
    }).catch((e) => console.log('[VOICE] Save failed', e));
  }, [selectedVoiceId, isMuted, selectedOfflineVoiceId, selectedOfflineSpeakerId]);

  // ── Check if Whisper model already exists on startup ──
  useEffect(() => {
    const checkModelExists = async () => {
      try {
        const modelPath = `${FileSystem.documentDirectory}${WHISPER_MODEL_FILENAME}`;
        const fileInfo = await FileSystem.getInfoAsync(modelPath);
        if (fileInfo.exists) {
          setIsWhisperReady(true);
        }
      } catch (e) {
        console.log('[VOICE] Error checking model:', e);
      }
    };
    checkModelExists();

    // Cargar voces de forma segura (Previene crash si el motor TTS no está listo)
    const loadVoices = async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        setAvailableVoices(voices);
      } catch (e) {
        console.warn('[VOICE] Speech.getAvailableVoicesAsync failed:', e);
        setAvailableVoices([]);
      }
    };
    loadVoices();

    // Cargar preferencias guardadas via SettingsService
    const loadSettings = async () => {
      try {
        const settings = await settingsService.get();
        if (settings.voice) {
          if (settings.voice.selectedVoiceId) setSelectedVoiceId(settings.voice.selectedVoiceId);
          if (settings.voice.isMuted !== undefined) setIsMuted(settings.voice.isMuted);
          if (settings.voice.selectedOfflineVoiceId !== undefined) {
            setSelectedOfflineVoiceId(settings.voice.selectedOfflineVoiceId || 'default');
          }
          if (settings.voice.selectedOfflineSpeakerId !== undefined) setSelectedOfflineSpeakerId(settings.voice.selectedOfflineSpeakerId);
          console.log('[VOICE] Preferences loaded from SettingsService.');
        }
      } catch (e) { console.log('[VOICE] Settings load failed'); }
    };
    loadSettings();

    return () => {
      if (stopFnRef.current) stopFnRef.current();
    };
  }, []);

  // Validate and sync selectedVoiceId with active language (prevent cross-language speaking accent issues)
  useEffect(() => {
    if (selectedVoiceId && availableVoices.length > 0) {
      const voiceObj = availableVoices.find(v => v.identifier === selectedVoiceId);
      if (voiceObj && voiceObj.language) {
        const voiceLang = voiceObj.language.toLowerCase();
        const prefix = lang.toLowerCase();
        if (!voiceLang.startsWith(prefix)) {
          console.log(`[VOICE] Resetting selectedVoiceId (${selectedVoiceId}, lang: ${voiceObj.language}) because it doesn't match active language: ${lang}`);
          setSelectedVoiceId(null);
        }
      }
    }
  }, [lang, availableVoices, selectedVoiceId]);

  // ── TTS Controls ──
  const preloadSpeech = useCallback(async (text: string): Promise<string | null> => {
    if (isMuted || !ttsEnabled || !(text || "").trim()) {
      return null;
    }

    const cleanText = text
      .replace(/\[SISTEMA\].*$/gm, '')
      .replace(/\[SYSTEM\].*$/gm, '')
      .replace(/█/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();

    if (!cleanText) return null;

    try {
      const settings = await getSettings();
      let useCloud = settings.useCloudTTS || false;
      let gKey = settings.cloudTTSKey || '';
      let oKey = settings.openAIKey || '';
      let cloudProvider = settings.cloudProvider || 'openai';

      if (useCloud && !isMuted) {
        if (cloudProvider === 'openai' && oKey) {
          const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${oKey}`
            },
            body: JSON.stringify({
              model: 'tts-1',
              input: cleanText,
              voice: 'alloy'
            })
          });

          const blob = await response.blob();
          const reader = new FileReader();
          const base64: string = await new Promise((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          const base64Data = base64.split(',')[1];
          const uri = `${FileSystem.cacheDirectory}speech_preload_${Date.now()}.mp3`;
          await FileSystem.writeAsStringAsync(uri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
          return uri;
        }

        if (cloudProvider === 'google' && gKey) {
          const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${gKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text: cleanText },
              voice: {
                languageCode: lang === 'es' ? 'es-MX' : 'en-US',
                name: lang === 'es' ? 'es-MX-Neural2-A' : 'en-US-Neural2-F'
              },
              audioConfig: { audioEncoding: 'MP3' }
            })
          });
          const data = await response.json();
          if (data.audioContent) {
            const uri = `${FileSystem.cacheDirectory}speech_preload_${Date.now()}.mp3`;
            await FileSystem.writeAsStringAsync(uri, data.audioContent, { encoding: FileSystem.EncodingType.Base64 });
            return uri;
          }
        }
      }
    } catch (e) {
      console.error('[VOICE] preloadSpeech Error:', e);
    }
    return null;
  }, [lang, ttsEnabled, isMuted]);

  const speak = useCallback((text: string, dynamicPsyProfile?: typeof psyProfile, onDone?: () => void, preloadedUri?: string | null) => {
    let onDoneCalled = false;
    let fallbackTimeoutId: NodeJS.Timeout | null = null;

    const safeOnDone = () => {
      if (onDoneCalled) return;
      onDoneCalled = true;
      if (fallbackTimeoutId) {
        clearTimeout(fallbackTimeoutId);
        fallbackTimeoutId = null;
      }
      setIsSpeaking(false);
      if (onDone) onDone();
    };

    if (isMuted || !ttsEnabled || !(text || "").trim()) {
      safeOnDone();
      return;
    }

    const cleanText = text
      .replace(/\[SISTEMA\].*$/gm, '')
      .replace(/\[SYSTEM\].*$/gm, '')
      .replace(/█/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();

    if (!cleanText) {
      safeOnDone();
      return;
    }

    let speechRate = 0.95;
    let speechPitch = 1.0;

    const activePsy = dynamicPsyProfile !== undefined ? dynamicPsyProfile : psyProfile;

    if (activePsy) {
      if (activePsy.E > 0.6) speechRate = 1.05;
      if (activePsy.C > 0.6) speechRate = 1.08;
      if (activePsy.A > 0.6) {
        speechRate = 0.85;
        speechPitch = 0.9;
      }
    }

    const speechOptionsLocal = {
      rate: speechRate,
      pitch: speechPitch,
    };

    setIsSpeaking(true);

    if (onDone) {
      const wordsCount = cleanText.split(/\s+/).length;
      const timeoutMs = Math.max(3500, wordsCount * 600 + 3000);
      fallbackTimeoutId = setTimeout(() => {
        console.warn(`[VOICE_ROBUSTNESS] Speech fallback timeout reached (${timeoutMs}ms) for: "${cleanText.substring(0, 30)}...". Forcing safeOnDone.`);
        safeOnDone();
      }, timeoutMs);
    }

    const performSpeak = async () => {
      const playAudio = async (uri: string) => {
        try {
          if (soundRef.current) {
            const soundToUnload = soundRef.current;
            soundRef.current = null;
            try {
              await soundToUnload.unloadAsync();
            } catch (e) {
              console.warn('[VOICE] playAudio unloadAsync error:', e);
            }
          }
          const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
          soundRef.current = sound;
          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.didJustFinish) {
              safeOnDone();
            }
          });
        } catch (err) {
          console.error('[VOICE] playAudio creation error:', err);
          safeOnDone();
        }
      };

      if (preloadedUri) {
        try {
          await playAudio(preloadedUri);
        } catch (e) {
          safeOnDone();
        }
        return;
      }

      try {
        const settings = await getSettings();

        let useCloud = settings.useCloudTTS || false;
        let gKey = settings.cloudTTSKey || '';
        let oKey = settings.openAIKey || '';
        let cloudProvider = settings.cloudProvider || 'openai';

        if (useCloud) {
          if (isMuted) {
            safeOnDone();
            return;
          }

          // --- OPENAI ENGINE ---
          if (cloudProvider === 'openai' && oKey) {
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${oKey}`
              },
              body: JSON.stringify({
                model: 'tts-1',
                input: cleanText,
                voice: 'alloy'
              })
            });

            const blob = await response.blob();
            const reader = new FileReader();
            const base64: string = await new Promise((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            const base64Data = base64.split(',')[1];
            const uri = `${FileSystem.cacheDirectory}speech_o.mp3`;
            await FileSystem.writeAsStringAsync(uri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
            await playAudio(uri);
            return;
          }

          // --- GOOGLE CLOUD ENGINE ---
          if (cloudProvider === 'google' && gKey) {
            const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${gKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                input: { text: cleanText },
                voice: {
                  languageCode: lang === 'es' ? 'es-MX' : 'en-US',
                  name: lang === 'es' ? 'es-MX-Neural2-A' : 'en-US-Neural2-F'
                },
                audioConfig: { audioEncoding: 'MP3' }
              })
            });
            const data = await response.json();
            if (data.audioContent) {
              const uri = `${FileSystem.cacheDirectory}speech_g.mp3`;
              await FileSystem.writeAsStringAsync(uri, data.audioContent, { encoding: FileSystem.EncodingType.Base64 });
              await playAudio(uri);
              return;
            }
          }
        }
      } catch (e) {
        console.error('[VOICE] Cloud TTS Error:', e);
      }

      // --- LOCAL FALLBACK ---
      if (isMuted) {
        console.log('[VOICE] Silence Mode Active. Skipping TTS.');
        safeOnDone();
        return;
      }

      console.log('[VOICE] Using native TTS.');

      const speechOptions: Speech.SpeechOptions = {
        language: lang === 'es' ? 'es-MX' : 'en-US',
        rate: speechOptionsLocal.rate,
        pitch: speechOptionsLocal.pitch,
        onDone: () => {
          safeOnDone();
        },
        onStopped: () => {
          safeOnDone();
        },
        onError: (err: any) => {
          console.error('[VOICE] Speech.speak onError callback:', err);
          setVoiceError(lang === 'es' ? `Error en TTS: ${err.message || err}` : `TTS Error: ${err.message || err}`);
          safeOnDone();
        },
      };

      if (selectedVoiceId) {
        speechOptions.voice = selectedVoiceId;
      }

      try {
        Speech.speak(cleanText, speechOptions);
      } catch (err: any) {
        console.warn('[VOICE] Speech.speak failed with selected voice, falling back to default voice:', err);
        try {
          const fallbackOptions = { ...speechOptions };
          delete fallbackOptions.voice;
          Speech.speak(cleanText, fallbackOptions);
        } catch (innerErr: any) {
          console.error('[VOICE] Native Speech.speak failed completely:', innerErr);
          setVoiceError(lang === 'es' ? `Fallo total de TTS: ${innerErr.message || innerErr}` : `Total TTS failure: ${innerErr.message || innerErr}`);
          safeOnDone();
        }
      }
    };

    performSpeak();
  }, [lang, ttsEnabled, psyProfile, selectedVoiceId, isMuted, selectedOfflineVoiceId, selectedOfflineSpeakerId]);

  const stopSpeaking = useCallback(async () => {
    try {
      await Speech.stop();
    } catch (e) {
      console.warn('[VOICE] Speech.stop error:', e);
    }
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
      } catch (e) {
        console.log('[VOICE] sound stopAsync error:', e);
      }
      try {
        await soundRef.current.unloadAsync();
      } catch (e) {
        console.log('[VOICE] sound unloadAsync error:', e);
      }
      soundRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const toggleTts = useCallback(() => {
    setTtsEnabled(prev => !prev);
    if (isSpeaking) {
      Speech.stop();
      setIsSpeaking(false);
    }
  }, [isSpeaking]);

  const initModels = async (): Promise<boolean> => {
    if (whisperContextRef.current) return true;

    setIsInitializing(true);
    try {
      const modelPath = `${FileSystem.documentDirectory}${WHISPER_MODEL_FILENAME}`;
      const fileInfo = await FileSystem.getInfoAsync(modelPath);

      if (!fileInfo.exists || (fileInfo.size && fileInfo.size < 70000000)) {
        setVoiceError(lang === 'es' ? 'Cargando STT offline...' : 'Loading STT offline...');
        const asset = Asset.fromModule(require('../assets/ggml-tiny.bin'));
        await asset.downloadAsync();
        if (asset.localUri) {
          await FileSystem.copyAsync({
            from: asset.localUri,
            to: modelPath
          });
        } else {
          throw new Error('Failed to resolve offline asset path');
        }
      }

      try {
        const context = await initWhisper({
          filePath: modelPath,
          useGpu: Platform.OS === 'ios',
          useCoreMLIos: Platform.OS === 'ios'
        });
        if (context && context.reasonNoGPU === 'Mock') {
          throw new Error(lang === 'es'
            ? 'STT no disponible en Expo Go/Web. Compila la app de forma nativa para habilitar el micrófono.'
            : 'STT not available in Expo Go/Web. Compile the app natively to enable the microphone.');
        }
        whisperContextRef.current = context;
      } catch (initErr: any) {
        console.log('[VOICE] Whisper init failed:', initErr);
        if (initErr.message && initErr.message.includes('STT')) {
          whisperContextRef.current = null;
          throw initErr;
        }
        await FileSystem.deleteAsync(modelPath, { idempotent: true });
        whisperContextRef.current = null;
        throw new Error(lang === 'es'
          ? 'Modelo corrupto, eliminado. Presiona de nuevo para re-descargar.'
          : 'Corrupted model deleted. Press again to re-download.');
      }

      setVoiceError('');
      setIsInitializing(false);
      setIsWhisperReady(true);
      return true;
    } catch (e: any) {
      console.error('[VOICE] Init error:', e);
      let errMsg = e.message || '';
      if (errMsg.includes('Unable to resolve host') || errMsg.includes('huggingface.co') || errMsg.includes('network') || errMsg.includes('Failed to connect')) {
        errMsg = lang === 'es'
          ? 'Error de red: No se pudo conectar a HuggingFace. Configura "Private DNS" en los ajustes de red del emulador a "dns.google" o sube el modelo usando adb push.'
          : 'Network error: Cannot resolve HuggingFace. Set "Private DNS" to "dns.google" in the emulator network settings or sideload the model via adb push.';
      } else {
        errMsg = errMsg || (lang === 'es' ? 'Error al iniciar STT.' : 'Failed to init STT.');
      }
      setVoiceError(errMsg);
      setIsInitializing(false);
      return false;
    }
  };

  // ── Warm-up: Pre-inicializa Whisper en background (sin bloquear UI) ──
  // Llamar al montar la pantalla para que la primera vez el modelo ya esté en RAM.
  const warmupModels = useCallback(async (): Promise<void> => {
    try {
      await initModels();
      console.log('[VOICE] warmupModels: Whisper pre-loaded in background.');
    } catch (e) {
      console.log('[VOICE] warmupModels: silent fail, will retry on demand.', e);
    }
  }, [lang]);

  // ── Start Listening (via UnifiedMicService) ──
  const startListening = useCallback(async (
    onSpeechStart?: () => void,
    onSpeechEnd?: (text: string) => void,
    onProgress?: (phase: 'permission' | 'init' | 'ready') => void
  ): Promise<boolean> => {
    // Save callbacks for safe restart
    if (onSpeechStart || onSpeechEnd || onProgress) {
      dictationCallbacksRef.current = { onSpeechStart, onSpeechEnd, onProgress };
    }

    Speech.stop();
    setIsSpeaking(false);
    setVoiceError('');
    setTranscript('');

    onProgress?.('permission');
    const hasPermission = await micService.requestMicPermission(lang);
    if (!hasPermission) {
      setVoiceError(lang === 'es' ? '🎙️ Permiso de micrófono denegado.' : '🎙️ Mic permission denied.');
      return false;
    }

    onProgress?.('init');
    const isReady = await initModels();
    if (!isReady || !whisperContextRef.current) return false;
    onProgress?.('ready');

    try {
      const hw = await getHardwareConfig();
      const whisperThreads = Math.max(2, Math.floor(hw.threads / 2));

      // Using Silero VAD configured via dynamic vadLevel
      // VAD is lightweight and processes in small increments - optimized for low-end CPU
      const vadConfig = getVadConfigForLevel(vadLevelRef.current);
      const options = {
        language: lang === 'es' ? 'es' : 'en',
        realtimeAudioSec: 30,
        realtimeAudioSliceSec: vadConfig.realtimeAudioSliceSec,
        maxThreads: whisperThreads,
        useVad: true,
        vadPreset: vadConfig.vadPreset as any, 
        vadThrottleMs: vadConfig.vadThrottleMs,
        vadSkipRatio: 0,     // Skip every Nth slice (0 = no skipping)
      };

      const transcribedSlices: string[] = [];

      // Solicitamos acceso al Singleton
      const success = await micService.startListening(
        'USE_VOICE_HOOK',
        whisperContextRef.current,
        options,
        (text, isCapturing, detectedLang, sliceIndex) => {
          // Always update capturing state for UI indicator
          setIsVadCapturing(isCapturing);

          if (!text) return;

          // Filter out typical Whisper silence/noise tags and repeating silence hallucinations
          const cleanText = text
            .replace(/\[BLANK_AUDIO\]/gi, '')
            .replace(/\[silence\]/gi, '')
            .replace(/\[\s*SILENCE\s*\]/gi, '')
            .replace(/\(silence\)/gi, '')
            .replace(/\b(silence)\b/gi, '')
            .replace(/\b(blank_audio)\b/gi, '')
            .replace(/pauses\s*\(silence\.?\s*microphone\s*is\s*waiting\.?\s*speak\s*to\s*start\.?/gi, '')
            .replace(/microphone\s*is\s*waiting/gi, '')
            .replace(/speak\s*to\s*start/gi, '')
            .replace(/\bpauses\b/gi, '')
            .replace(/\s+/g, ' ')
            .trim();

          if (!cleanText) return;

          // Apply SpeechFilter ASR Gate to filter out noise, hallucinations, and language mismatches
          if (SpeechFilter.isNoiseOrHallucination(cleanText, lang, detectedLang)) {
            console.log(`[useVoice] ASR Gate blocked noise/hallucination: "${cleanText}" (detected lang: ${detectedLang})`);
            return;
          }

          const currentSlice = typeof sliceIndex === 'number' ? sliceIndex : transcribedSlices.length;
          transcribedSlices[currentSlice] = cleanText;

          // Concatenate all slices in order of their index
          const concatenated = transcribedSlices.filter(Boolean).join(' ').trim();

          setTranscript(concatenated);

          if (!isCapturing && onSpeechEnd) {
            onSpeechEnd(concatenated);
          }
        }
      );

      if (success) {
        setIsListening(true);
        if (onSpeechStart) onSpeechStart();
        return true;
      } else {
        setVoiceError(lang === 'es' ? '🎙️ Micrófono ocupado por otro proceso.' : '🎙️ Mic is busy.');
        setIsListening(false);
        return false;
      }

    } catch (e: any) {
      console.error('[VOICE] startListening error:', e);
      setVoiceError(lang === 'es' ? '🎙️ Error al escuchar.' : '🎙️ Error while listening.');
      setIsListening(false);
      setIsVadCapturing(false);
      return false;
    }
  }, [lang]);

  // ── Stop Listening ──
  const stopListening = useCallback(async () => {
    setIsVadCapturing(false);
    await micService.stopListening('USE_VOICE_HOOK');
    // 🛡️ Hardware Cooldown: Let native audio session fully release before
    // next consumer (TTS/LLM) acquires audio focus.
    await new Promise((resolve) => setTimeout(resolve, 150));
    setIsListening(false);
  }, []);

  const changeVadLevel = useCallback((level: number) => {
    setVadLevel(level);

    if (isListening) {
      if (vadDebounceTimeoutRef.current) {
        clearTimeout(vadDebounceTimeoutRef.current);
      }

      vadDebounceTimeoutRef.current = setTimeout(async () => {
        if (isRestartingVadRef.current) {
          // Mutex: If a hardware restart is already in progress, just save the latest requested level
          pendingVadLevelRef.current = level;
          return;
        }

        // Mutex Loop: Safely process the hardware restart and apply any pending levels that came in during the restart
        let currentLevelToApply = level;

        while (true) {
          isRestartingVadRef.current = true;
          pendingVadLevelRef.current = null; // Clear pending state before starting the cycle

          setIsInitializing(true);
          await stopListening();
          // Ensure native audio session fully unbinds
          await new Promise(resolve => setTimeout(resolve, 300));
          await startListening(
            dictationCallbacksRef.current.onSpeechStart,
            dictationCallbacksRef.current.onSpeechEnd,
            dictationCallbacksRef.current.onProgress
          );
          setIsInitializing(false);

          if (pendingVadLevelRef.current !== null) {
            // Another change arrived while we were restarting. Repeat the cycle with the new level.
            currentLevelToApply = pendingVadLevelRef.current;
          } else {
            // Clean exit, release the lock
            isRestartingVadRef.current = false;
            break;
          }
        }
      }, 800); // 800ms debounce
    }
  }, [isListening, stopListening, startListening, setVadLevel, setIsInitializing]);

  // ── Mute Logic ──
  const toggleMute = useCallback(() => {
    const newState = !isMuted;
    setIsMuted(newState);
    if (newState) {
      Speech.stop();
      if (soundRef.current) {
        soundRef.current.stopAsync().catch(() => { });
        soundRef.current.unloadAsync().catch(() => { });
        soundRef.current = null;
      }
      setIsSpeaking(false);
    }
    console.log(`[VOICE] Master Switch: ${newState ? 'MUTED' : 'ACTIVE'}`);
  }, [isMuted]);

  // ── Release Resources ──
  const releaseResources = useCallback(async () => {
    console.log('[VOICE] Releasing voice resources...');
    // Unregister any microphone sessions in UnifiedMicService
    micService.unregisterSession('WALKIE_TALKIE');
    micService.unregisterSession('USE_VOICE_HOOK');

    try {
      if (whisperContextRef.current) {
        await whisperContextRef.current.release();
        whisperContextRef.current = null;
        setIsWhisperReady(false);
      }
    } catch (e) {
      console.error('[VOICE] Error releasing Whisper context:', e);
    }

    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync().catch(() => { });
        soundRef.current = null;
      }
    } catch (e) {
      console.error('[VOICE] Error releasing Sound:', e);
    }

  }, []);

  const transcribeFile = useCallback(async (uri: string): Promise<string> => {
    const isReady = await initModels();
    if (!isReady || !whisperContextRef.current) {
      throw new Error(lang === 'es' ? 'Whisper no inicializado' : 'Whisper not initialized');
    }
    const cleanUri = Platform.OS === 'android' ? uri.replace(/^file:\/\//, '') : uri;
    const { promise } = whisperContextRef.current.transcribe(cleanUri, {
      language: lang === 'es' ? 'es' : 'en',
    });
    const result = await promise;
    return result.text;
  }, [lang]);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    warmupModels,
    voiceError,
    isSpeaking,
    ttsEnabled,
    speak,
    preloadSpeech,
    stopSpeaking,
    toggleTts,
    isInitializing,
    isWhisperReady,
    availableVoices,
    selectedVoiceId,
    setSelectedVoiceId,
    isMuted,
    toggleMute,
    releaseResources,
    transcribeFile,
    selectedOfflineVoiceId,
    setSelectedOfflineVoiceId,
    selectedOfflineSpeakerId,
    setSelectedOfflineSpeakerId,
    getLatestTranscript: () => transcriptRef.current,
    // Expose whisperContextRef for useInteractiveVoice
    whisperContextRef,
    vadLevel,
    changeVadLevel,
    isVadCapturing,
  };
}
