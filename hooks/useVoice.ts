/**
 * 🛡️ ARCHITECTURAL SHIELD - VOICE SYSTEM SEGREGATION POLICY:
 * This file implements standard dictation/TTS components. Do NOT mix its state
 * with Walkie-Talkie (Modo A) speech queue pipelining in useInteractiveVoice.ts.
 * Keep their lifecycles and variables completely decoupled.
 */
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as Speech from 'expo-speech';
import * as FileSystem from 'expo-file-system';
import AnimaVoice from '../modules/anima-voice/src/AnimaVoiceModule';
import { initWhisper } from 'whisper.rn';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { PermissionsAndroid, Platform } from 'react-native';
import { getHardwareConfig } from '../lib/hardware';
import { micService } from '../lib/UnifiedMicService';
import { Asset } from 'expo-asset';
import { SpeechFilter } from '../lib/SpeechFilter';
import { settingsService } from '../lib/SettingsService';
import { cloudTTSService } from '../lib/CloudTTSService';
import { sanitizeForNativeTTS } from '../lib/TTSSanitizer';

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

const promiseWithTimeout = <T>(promise: Promise<T>, ms: number, errorMsg = 'Timeout'): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(errorMsg)), ms))
  ]);
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
  const soundRef = useRef<Audio.Sound | null>(null);
  const currentPlayUriRef = useRef<string | null>(null);
  const currentSessionIdRef = useRef(0);
  const fullTextRef = useRef('');
  const lastCharIndexRef = useRef(0);
  const charIndexOffsetRef = useRef(0);
  const activeParamsRef = useRef<{ dynamicPsyProfile?: any, onDone?: () => void, preloadedData?: any }>({});
  const [isPaused, setIsPaused] = useSafeState(false);

  // ── Mutex & Debounce Refs for VAD Sensitivity Changes ──
  const vadDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRestartingVadRef = useRef<boolean>(false);
  const pendingVadLevelRef = useRef<number | null>(null);
  const lastTranscriptUpdateRef = useRef<number>(0);

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
        console.log(`[VOICE] Loaded ${voices.length} native TTS voices. Languages:`, Array.from(new Set(voices.map(v => v.language))).slice(0, 10));
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
      micService.stopListening('USE_VOICE_HOOK');
      if (vadDebounceTimeoutRef.current) clearTimeout(vadDebounceTimeoutRef.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
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
  const preloadSpeech = useCallback(async (text: string): Promise<string | Float32Array | Int16Array | ArrayBuffer | { uri: string, sound: any } | null> => {
    if (isMuted || !ttsEnabled || !(text || "").trim()) {
      return null;
    }

    const cleanText = sanitizeForNativeTTS(text);

    if (!cleanText) return null;

    try {
      const settings = await getSettings();
      if (!isMuted) {
        if (typeof (global as any).animaFeedAudioChunk === 'function') {
          if (settings.useCloudTTS) {
            return await cloudTTSService.synthesizeJSI(cleanText, lang, settings as any);
          } else {
            try {
              // Wrap native synthesis in a timeout race to prevent infinite hangs
              const uint8Array = await promiseWithTimeout(
                AnimaVoice.synthesizeNativeToPCM(cleanText, lang),
                2500,
                'Native TTS pre-synthesis timeout'
              );
              return new Int16Array(uint8Array.buffer, uint8Array.byteOffset, uint8Array.length / 2);
            } catch (nativeErr) {
               console.warn('[VOICE] Preload native PCM synthesis failed or timed out:', nativeErr);
               // Fallthrough to null and classic playback
            }
          }
        }
        const uri = await cloudTTSService.synthesize(cleanText, lang, settings as any, 'speech_preload');
        if (uri) {
          try {
            const { sound } = await Audio.Sound.createAsync({ uri });
            return { uri, sound };
          } catch (e) {
            console.warn('[VOICE] Failed to preload Audio.Sound, returning uri:', e);
            return uri;
          }
        }
      }
    } catch (e) {
      console.error('[VOICE] preloadSpeech Error:', e);
    }
    return null;
  }, [lang, ttsEnabled, isMuted]);

  const speak = useCallback((
    text: string,
    dynamicPsyProfile?: typeof psyProfile,
    onDone?: () => void,
    preloadedData?: string | Float32Array | Int16Array | ArrayBuffer | { uri: string, sound: any } | null,
    isResume = false
  ) => {
    const sessionId = ++currentSessionIdRef.current;
    let onDoneCalled = false;
    let fallbackTimeoutId: NodeJS.Timeout | null = null;
 
    if (!isResume) {
      fullTextRef.current = text;
      lastCharIndexRef.current = 0;
      charIndexOffsetRef.current = 0;
      activeParamsRef.current = { dynamicPsyProfile, onDone, preloadedData };
    }
    setIsPaused(false);

    const safeOnDone = () => {
      if (sessionId !== currentSessionIdRef.current) {
        console.log(`[VOICE] safeOnDone bypassed for session ${sessionId} (current: ${currentSessionIdRef.current})`);
        return;
      }
      if (onDoneCalled) return;
      onDoneCalled = true;
      if (fallbackTimeoutId) {
        clearTimeout(fallbackTimeoutId);
        fallbackTimeoutId = null;
      }
      setIsSpeaking(false);
      setIsPaused(false);
      if (onDone) onDone();
    };

    if (isMuted || !ttsEnabled || !(text || "").trim()) {
      safeOnDone();
      return;
    }

    const cleanText = sanitizeForNativeTTS(text);

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
      fallbackTimeoutId = setTimeout(async () => {
        console.warn(`[VOICE_ROBUSTNESS] Speech fallback timeout reached (${timeoutMs}ms) for: "${cleanText.substring(0, 30)}...". Forcing safeOnDone.`);
        try {
          const settings = await getSettings();
          if (!settings.useCloudTTS && selectedVoiceId) {
            console.warn('[VOICE_ROBUSTNESS] Native TTS timed out. The selected voice might be corrupted. Reverting to default system voice.');
            setSelectedVoiceId('');
          }
        } catch (e) { }
        safeOnDone();
      }, timeoutMs);
    }

    const performSpeak = async () => {
      // ✅ Always switch audio mode to playback BEFORE feeding any audio,
      // whether through the JSI fast path or the expo-speech fallback.
      // Without this, if the mic was active, audio is silently routed to
      // the recording session and nothing is heard through the speakers.
      if (micService.lastAudioMode !== 'playback') {
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
            interruptionModeIOS: InterruptionModeIOS.DuckOthers,
            playThroughEarpieceAndroid: false,
          });
          micService.lastAudioMode = 'playback';
          console.log('[VOICE] Audio mode set to playback speaker (pre-JSI).');
        } catch (modeErr) {
          console.warn('[VOICE] setAudioModeAsync error before speak:', modeErr);
        }
      }

      // 🚀 ZERO LATENCY FAST PATH (JSI + Oboe C++)
      if (typeof (global as any).animaFeedAudioChunk === 'function') {
        try {
          let audioBuffer: Float32Array | Int16Array | ArrayBuffer | null = null;
          if (preloadedData && (preloadedData instanceof Float32Array || preloadedData instanceof Int16Array || preloadedData instanceof ArrayBuffer)) {
            audioBuffer = preloadedData as any;
          } else {
            const settings = await getSettings();
            if (settings.useCloudTTS && !isMuted) {
              audioBuffer = await cloudTTSService.synthesizeJSI(cleanText, lang, settings as any);
            } else if (!isMuted) {
              // 🚀 NATIVE TTS JSI FAST PATH (GAPLESS)
              try {
                console.log('[VOICE] ⚡ Synthesizing Native TTS to PCM...');
                const uint8Array = await promiseWithTimeout(
                  AnimaVoice.synthesizeNativeToPCM(cleanText, lang),
                  3000,
                  'Native TTS synthesis timeout'
                );
                audioBuffer = new Int16Array(uint8Array.buffer, uint8Array.byteOffset, uint8Array.length / 2);
              } catch (nativeErr) {
                console.warn('[VOICE] Native PCM synthesis failed or timed out, falling back to expo-speech:', nativeErr);
              }
            }
          }

          const hasData = audioBuffer && (
            (audioBuffer instanceof ArrayBuffer && audioBuffer.byteLength > 0) ||
            ((audioBuffer instanceof Float32Array || audioBuffer instanceof Int16Array) && audioBuffer.length > 0)
          );

          if (hasData) {
            console.log('[VOICE] ⚡ Pushing audio buffer via zero-latency JSI bridge.');
            let durationMs = 0;
            
            if (audioBuffer instanceof Float32Array) {
               (global as any).animaFeedAudioChunk(audioBuffer.buffer);
               durationMs = (audioBuffer.length / 24000) * 1000;
            } else if (audioBuffer instanceof Int16Array) {
               if (typeof (global as any).animaFeedAudioChunkInt16 === 'function') {
                   (global as any).animaFeedAudioChunkInt16(audioBuffer.buffer);
               } else {
                   const floats = new Float32Array(audioBuffer.length);
                   for (let i = 0; i < audioBuffer.length; i++) floats[i] = audioBuffer[i] / 32768.0;
                   (global as any).animaFeedAudioChunk(floats.buffer);
               }
               durationMs = (audioBuffer.length / 24000) * 1000;
            } else if (audioBuffer instanceof ArrayBuffer) {
               if (typeof (global as any).animaFeedAudioChunkInt16 === 'function') {
                   (global as any).animaFeedAudioChunkInt16(audioBuffer);
               } else {
                   const int16 = new Int16Array(audioBuffer);
                   const floats = new Float32Array(int16.length);
                   for (let i = 0; i < int16.length; i++) floats[i] = int16[i] / 32768.0;
                   (global as any).animaFeedAudioChunk(floats.buffer);
               }
               durationMs = (audioBuffer.byteLength / 2 / 24000) * 1000;
            }

            setTimeout(() => {
              safeOnDone();
            }, durationMs);
            return;
          } else {
            console.warn('[VOICE] Resolved audio buffer was empty or null. Falling back to next TTS path.');
          }
        } catch (e) {
          console.error('[VOICE] JSI Pipeline Error:', e);
        }
      }

      if (micService.lastAudioMode !== 'playback') {
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
            interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
            interruptionModeIOS: InterruptionModeIOS.DuckOthers,
            playThroughEarpieceAndroid: false,
          });
          micService.lastAudioMode = 'playback';
          console.log('[VOICE] Audio mode reset to playback speaker.');
        } catch (modeErr) {
          console.warn('[VOICE] setAudioModeAsync error before speak:', modeErr);
        }
      }

      const playAudio = async (uri: string, preloadedSound?: any) => {
        try {
          const sound = preloadedSound || (await Audio.Sound.createAsync({ uri }, { shouldPlay: true })).sound;
          
          const oldSound = soundRef.current;
          const oldUri = currentPlayUriRef.current;
          
          soundRef.current = sound;
          currentPlayUriRef.current = uri;
          
          if (oldSound) {
            // Unload the old sound asynchronously after a short overlap to prevent audio cut-off
            setTimeout(async () => {
              try {
                await oldSound.unloadAsync();
                if (oldUri) {
                  await cloudTTSService.cleanupAudioFile(oldUri);
                }
              } catch (e) {
                console.warn('[VOICE] Async oldSound unload error:', e);
              }
            }, 250);
          }

          let earlyTriggered = false;

          sound.setOnPlaybackStatusUpdate(async (status: any) => {
            if (status.isLoaded) {
              // Early trigger: call safeOnDone() slightly before current audio finishes
              // so the next audio starts loading in parallel, matching the loading time perfectly
              if (status.durationMillis && status.positionMillis) {
                const remaining = status.durationMillis - status.positionMillis;
                if (remaining <= 150 && !earlyTriggered) {
                  earlyTriggered = true;
                  safeOnDone();
                }
              }

              if (status.didJustFinish) {
                earlyTriggered = true;
                safeOnDone();
                try {
                  if (soundRef.current === sound) {
                     soundRef.current = null;
                     currentPlayUriRef.current = null;
                  }
                  await sound.unloadAsync();
                  await cloudTTSService.cleanupAudioFile(uri);
                } catch (e) {
                  console.warn('[VOICE] Auto-cleanup error:', e);
                }
              }
            } else if (status.error) {
              console.error('[VOICE] Playback error:', status.error);
              earlyTriggered = true;
              safeOnDone();
            }
          });
          
          if (preloadedSound) {
            await sound.playAsync();
          }
        } catch (err) {
          console.error('[VOICE] playAudio creation error:', err);
          safeOnDone();
        }
      };

      if (preloadedData && typeof preloadedData === 'object' && !(preloadedData instanceof Float32Array) && !(preloadedData instanceof Int16Array) && !(preloadedData instanceof ArrayBuffer)) {
        const preloaded = preloadedData as { uri: string, sound: any };
        if (preloaded.uri && preloaded.sound) {
          await playAudio(preloaded.uri, preloaded.sound);
          return;
        }
      }

      if (typeof preloadedData === 'string') {
        try {
          await playAudio(preloadedData);
        } catch (e) {
          safeOnDone();
        }
        return;
      }

      try {
        const settings = await getSettings();
        if (settings.useCloudTTS && !isMuted) {
          const uri = await cloudTTSService.synthesize(cleanText, lang, settings as any, 'speech_live');
          if (uri) {
            await playAudio(uri);
            return;
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

      let targetLanguage = lang === 'es' ? 'es-MX' : 'en-US';
      if (availableVoices && availableVoices.length > 0) {
        const matchingVoice = availableVoices.find(v => v.language.toLowerCase().startsWith(lang.toLowerCase()));
        if (matchingVoice) {
          targetLanguage = matchingVoice.language;
          console.log(`[VOICE] Dynamic local language fallback selected: "${targetLanguage}"`);
        }
      }

      const speechOptions: Speech.SpeechOptions = {
        language: targetLanguage,
        rate: speechOptionsLocal.rate,
        pitch: speechOptionsLocal.pitch,
        volume: 1.0,
        onBoundary: (e: any) => {
          lastCharIndexRef.current = e.charIndex;
        },
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

      let targetVoiceId: string | undefined = undefined;
      if (selectedVoiceId && availableVoices.length > 0) {
        const voiceExists = availableVoices.some(v => v.identifier === selectedVoiceId);
        if (voiceExists) {
          targetVoiceId = selectedVoiceId;
        } else {
          console.warn(`[VOICE] Selected voice ID "${selectedVoiceId}" is not available locally. Falling back to default.`);
        }
      }

      if (targetVoiceId) {
        speechOptions.voice = targetVoiceId;
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
    currentSessionIdRef.current++; // Invalidate any active speech session callbacks immediately
    fullTextRef.current = '';
    lastCharIndexRef.current = 0;
    charIndexOffsetRef.current = 0;
    activeParamsRef.current = {};
    setIsPaused(false);

    // Interrupt JSI Audio Queue instantly
    if (typeof (global as any).animaInterruptAudio === 'function') {
      (global as any).animaInterruptAudio();
    }

    try {
      await Speech.stop();
      if (Platform.OS === 'android') {
        // Android TTS engines sometimes ignore Speech.stop() during active long utterances.
        // Speaking a single silent space immediately overrides/interrupts the active speech.
        try {
          Speech.speak(' ');
          await Speech.stop();
        } catch (innerErr) {}
      }
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
    if (currentPlayUriRef.current) {
      cloudTTSService.cleanupAudioFile(currentPlayUriRef.current).catch(() => {});
      currentPlayUriRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const pauseSpeaking = useCallback(async () => {
    setIsPaused(true);
    setIsSpeaking(false);
    currentSessionIdRef.current++; // Invalidate active async callbacks

    // Accumulate the character offset from the last boundary
    charIndexOffsetRef.current += lastCharIndexRef.current;

    // Interrupt native audio JSI
    if (typeof (global as any).animaInterruptAudio === 'function') {
      (global as any).animaInterruptAudio();
    }

    try {
      await Speech.stop();
      if (Platform.OS === 'android') {
        try {
          Speech.speak(' ');
          await Speech.stop();
        } catch (innerErr) {}
      }
    } catch (e) {
      console.warn('[VOICE] Speech.stop error during pause:', e);
    }

    if (soundRef.current) {
      try {
        await soundRef.current.pauseAsync();
      } catch (e) {
        console.log('[VOICE] sound pauseAsync error:', e);
      }
    }
  }, []);

  const resumeSpeaking = useCallback(async () => {
    if (!isPaused) return;

    setIsPaused(false);
    setIsSpeaking(true);

    if (soundRef.current) {
      try {
        await soundRef.current.playAsync();
        return;
      } catch (e) {
        console.log('[VOICE] sound playAsync error during resume:', e);
      }
    }

    const remainingText = fullTextRef.current.substring(charIndexOffsetRef.current);
    if (remainingText.trim()) {
      const params = activeParamsRef.current;
      speak(remainingText, params.dynamicPsyProfile, params.onDone, params.preloadedData, true);
    } else {
      setIsSpeaking(false);
      setIsPaused(false);
      if (activeParamsRef.current.onDone) activeParamsRef.current.onDone();
    }
  }, [isPaused, speak]);

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
  const warmupModels = useCallback(async (): Promise<boolean> => {
    try {
      const ok = await initModels();
      console.log('[VOICE] warmupModels: Whisper pre-loaded in background.');
      return ok;
    } catch (e) {
      console.log('[VOICE] warmupModels: silent fail, will retry on demand.', e);
      return false;
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
          const cleanText = SpeechFilter.cleanWhisperText(text);

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

          const now = Date.now();
          if (!isCapturing || now - lastTranscriptUpdateRef.current > 150) {
            setTranscript(concatenated);
            lastTranscriptUpdateRef.current = now;
          }

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
        while (true) {
          try {
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
              // vadLevelRef is already updated synchronously in setVadLevel, so next loop will pick it up.
            } else {
              // Clean exit, release the lock
              isRestartingVadRef.current = false;
              break;
            }
          } catch (e) {
            console.error('[USE_VOICE] Error inside VAD restart loop:', e);
            isRestartingVadRef.current = false;
            setIsInitializing(false);
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
      if (currentPlayUriRef.current) {
        cloudTTSService.cleanupAudioFile(currentPlayUriRef.current).catch(() => {});
        currentPlayUriRef.current = null;
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
      await AnimaVoice.uninstallJSI();
    } catch (e) {
      console.warn('[VOICE] Error uninstalling JSI:', e);
    }

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
      if (currentPlayUriRef.current) {
        await cloudTTSService.cleanupAudioFile(currentPlayUriRef.current).catch(() => {});
        currentPlayUriRef.current = null;
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

  // 🛡️ Cleanup: Liberar todos los recursos nativos de voz al desmontar (KiloAuditC-JSI)
  useEffect(() => {
    return () => {
      releaseResources();
    };
  }, [releaseResources]);

  return useMemo(() => ({
    isListening,
    transcript,
    startListening,
    stopListening,
    warmupModels,
    voiceError,
    isSpeaking,
    isPaused,
    ttsEnabled,
    speak,
    preloadSpeech,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
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
  }), [
    isListening,
    transcript,
    startListening,
    stopListening,
    warmupModels,
    voiceError,
    isSpeaking,
    isPaused,
    ttsEnabled,
    speak,
    preloadSpeech,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    toggleTts,
    isInitializing,
    isWhisperReady,
    availableVoices,
    selectedVoiceId,
    isMuted,
    toggleMute,
    releaseResources,
    transcribeFile,
    selectedOfflineVoiceId,
    selectedOfflineSpeakerId,
    vadLevel,
    changeVadLevel,
    isVadCapturing,
  ]);
}
