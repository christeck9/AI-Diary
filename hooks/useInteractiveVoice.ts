/**
 * 🛡️ ARCHITECTURAL SHIELD - VOICE SYSTEM SEGREGATION POLICY:
 * This file implements the interactive voice pipeline (Modo A / Walkie-Talkie).
 * Do NOT mix its state or sentence queue with standard dictation in useVoice.ts.
 * Keep their lifecycles and variables completely decoupled.
 * 
 * v4.4: Real-time streaming mode with VAD (like Voice Notes)
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { useVoice } from './useVoice';
import { cpuSemaphore } from '../lib/CPUSemaphore';
import { micService } from '../lib/UnifiedMicService';
import { SpeechFilter } from '../lib/SpeechFilter';
import { getHardwareConfig } from '../lib/hardware';
import { settingsService } from '../lib/SettingsService';

// ── Walkie-Talkie Voice & VAD Configuration ──
const WALKIE_TALKIE_CONFIG = {
  realtimeAudioSliceSec: 6,   // Increased to 6s for better context accuracy
  vadPreset: 'noisy',         // 'noisy' acts as a balanced medium preset for noise filtering
  vadThrottleMs: 1500         // Increased to 1500ms for stable CPU and context building
};

export type VoiceState = 'IDLE' | 'WAITING' | 'RECORDING' | 'PROCESSING' | 'SPEAKING' | 'MUTED';

// WAITING state: Ready to accept press-and-hold input (UI state for instructing user)
// RECORDING state: Actively listening with VAD
// PROCESSING state: LLM is generating response
// SPEAKING state: TTS is playing
// MUTED state: Microphone disabled

import { useSafeState } from './useSafeState';

/**
 * useInteractiveVoice — Orquestador del modo de conversación fluida (Walkie-Talkie).
 * Pipeline: Presionar (Grabar) → Transcripción en vivo → Soltar (LLM) → TTS.
 * v4.4: Real-time streaming with VAD for low latency.
 */
export function useInteractiveVoice(
  lang: string,
  psyProfile: { O: number, C: number, E: number, A: number, N: number, D: number, L: number } | undefined,
  sendMessageToLlm: (
    text: string,
    onSentenceGenerated?: (sentence: string) => void,
    onClearSpeechQueue?: () => void
  ) => Promise<string>,
  abortLlm: () => void,
  voice: ReturnType<typeof useVoice>
) {
  const [voiceState, setVoiceStateInternal] = useSafeState<VoiceState>('IDLE');
  const voiceStateRef = useRef<VoiceState>('IDLE');
  const isActiveRef = useRef(false);

  const isMutedRef = useRef(voice.isMuted);
  useEffect(() => {
    isMutedRef.current = voice.isMuted;
  }, [voice.isMuted]);

  const psyProfileRef = useRef(psyProfile);
  useEffect(() => {
    psyProfileRef.current = psyProfile;
  }, [psyProfile]);

  // Refs for the Speech Queue (Token-to-Sentence pipelining)
  const sentenceQueueRef = useRef<string[]>([]);
  const preloadedMapRef = useRef<Record<string, string>>({});
  const isPlayingQueueRef = useRef<boolean>(false);
  const isGeneratingRef = useRef<boolean>(false);

  const lastQueueActivityRef = useRef<number>(Date.now());
  const isFirstSentenceRef = useRef<boolean>(true);
  const sessionStartTimeRef = useRef<number>(0);
  const watchdogIdRef = useRef<any>(null);

  // Live transcript for real-time display
  const [liveTranscript, setLiveTranscript] = useSafeState('');
  const liveTranscriptRef = useRef('');
  const lastPrefillTextRef = useRef('');
  const prefillTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTranscriptUpdateRef = useRef<number>(0);
  const pressStartTimeRef = useRef<number>(0);

  // Processing Timer State
  const [processingTimeElapsed, setProcessingTimeElapsed] = useSafeState(0);

  // 🛡️ Wrapper de estado que acciona el Semáforo de CPU automáticamente
  const setVoiceState = useCallback((newState: VoiceState) => {
    voiceStateRef.current = newState;
    if (newState === 'RECORDING') {
      cpuSemaphore.pause('mic_recording');
    } else {
      cpuSemaphore.resume('mic_recording');
    }
    setVoiceStateInternal(newState);
  }, []);

  // 🛡️ Cleanup al desmontar para evitar deadlock del semáforo de CPU y leaks de memoria
  useEffect(() => {
    return () => {
      if (voiceStateRef.current === 'RECORDING') {
        cpuSemaphore.resume('mic_recording');
      }
      if (watchdogIdRef.current) {
        clearTimeout(watchdogIdRef.current);
        watchdogIdRef.current = null;
      }
      if (prefillTimeoutRef.current) {
        clearTimeout(prefillTimeoutRef.current);
        prefillTimeoutRef.current = null;
      }
    };
  }, []);

  // Interval hook to update processing timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (voiceState === 'PROCESSING') {
      setProcessingTimeElapsed(0);
      interval = setInterval(() => {
        setProcessingTimeElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [voiceState]);

  // Compute processing message with the local-hardware apology after 60s
  const getProcessingMessage = useCallback(() => {
    if (processingTimeElapsed < 60) {
      return lang === 'es'
        ? 'Procesando información...'
        : 'Processing Information...';
    } else {
      return lang === 'es'
        ? 'Disculpa, sé que es más de un momento, pero debido a las restricciones de correr una IA totalmente privada con los recursos de tu teléfono, se generan este tipo de demoras. Todos estamos trabajando para mejorar eso.'
        : "Sorry, I know it's taking longer than a moment, but running a fully private AI locally with your phone's resources causes these kinds of delays. Everyone is working to improve this.";
    }
  }, [processingTimeElapsed, lang]);

  const resetSpeechQueue = useCallback(() => {
    sentenceQueueRef.current = [];
    isPlayingQueueRef.current = false;
    isGeneratingRef.current = false;
    if (watchdogIdRef.current) {
      clearTimeout(watchdogIdRef.current);
      watchdogIdRef.current = null;
    }
  }, []);

  // Function to release microphone resources after Walkie-Talkie cycle completes
  const releaseMicResources = useCallback(async () => {
    try {
      await micService.releaseAllAudioSessions();
    } catch (e) {
      console.warn('[INTERACTIVE_VOICE] Error releasing mic resources:', e);
    }
    // Audio mode cooldown for Android native layer
    await new Promise((resolve) => setTimeout(resolve, 150));
  }, []);

  const processSpeechQueue = useCallback<() => Promise<void>>(async () => {
    if (isMutedRef.current) {
      isPlayingQueueRef.current = false;
      return;
    }
    if (voiceStateRef.current === 'MUTED') {
      isPlayingQueueRef.current = false;
      return;
    }

    if (isPlayingQueueRef.current) {
      // 🛡️ Stale lock recovery: if the queue has been "playing" for >10s
      // with no activity, the TTS onDone callback likely failed silently.
      const staleDuration = Date.now() - lastQueueActivityRef.current;
      if (staleDuration > 10000) {
        console.warn(`[SPEECH_QUEUE] ⚠️ Stale lock detected (${staleDuration}ms). Force-resetting.`);
        isPlayingQueueRef.current = false;
        // Fall through to process next sentence
      } else {
        return;
      }
    }

    if (sentenceQueueRef.current.length === 0) {
      if (!isGeneratingRef.current) {
        if (!voice.isSpeaking && (voiceStateRef.current === 'SPEAKING' || voiceStateRef.current === 'PROCESSING')) {
          if (isActiveRef.current) {
            setVoiceState('WAITING');
            releaseMicResources();
          } else {
            setVoiceState('IDLE');
          }
        }
      }
      return;
    }

    isPlayingQueueRef.current = true;
    const nextSentence = sentenceQueueRef.current.shift();
    if (nextSentence) {
      if (isActiveRef.current) {
        setVoiceState('SPEAKING');
      }

      // Skip preload lookup for first sentence — speak immediately to minimize TTFS
      const preloadedUri = isFirstSentenceRef.current
        ? null
        : (preloadedMapRef.current[nextSentence] || null);

      delete preloadedMapRef.current[nextSentence];

      // Diagnostic Timing Metrics
      if (isFirstSentenceRef.current && sessionStartTimeRef.current > 0) {
        console.log(`[SPEECH_METRICS] ⏱️ TTFS: ${Date.now() - sessionStartTimeRef.current}ms | Words: ${nextSentence.split(/\s+/).length}`);
      }
      isFirstSentenceRef.current = false;

      lastQueueActivityRef.current = Date.now();

      // 🛡️ Watchdog: if TTS onDone doesn't fire within expected time, force-recover
      const watchdogMs = Math.max(5000, nextSentence.split(/\s+/).length * 700 + 3000);
      watchdogIdRef.current = setTimeout(() => {
        if (isPlayingQueueRef.current) {
          console.warn(`[SPEECH_QUEUE] ⚠️ Watchdog fired after ${watchdogMs}ms. Force-recovering.`);
          isPlayingQueueRef.current = false;
          lastQueueActivityRef.current = Date.now();
          setTimeout(() => { processSpeechQueue(); }, 0);
        }
      }, watchdogMs);

      voice.speak(nextSentence, psyProfileRef.current, () => {
        if (watchdogIdRef.current) {
          clearTimeout(watchdogIdRef.current);
          watchdogIdRef.current = null;
        }
        lastQueueActivityRef.current = Date.now();
        isPlayingQueueRef.current = false;
        setTimeout(() => { processSpeechQueue(); }, 0);
      }, preloadedUri);

      // Preload next sentences while this one is playing
      // Check if Cloud TTS is active to determine prefetch depth
      settingsService.get().then((settings) => {
        const prefetchDepth = settings?.useCloudTTS ? 2 : 1;
        for (let i = 0; i < prefetchDepth; i++) {
          const upcoming = sentenceQueueRef.current[i];
          if (upcoming && !preloadedMapRef.current[upcoming]) {
            preloadedMapRef.current[upcoming] = "pending";
            if (voice.preloadSpeech) {
              voice.preloadSpeech(upcoming).then((uri: any) => {
                if (uri) {
                  preloadedMapRef.current[upcoming] = uri;
                } else {
                  delete preloadedMapRef.current[upcoming];
                }
              }).catch(() => {
                delete preloadedMapRef.current[upcoming];
              });
            }
          }
        }
      }).catch((e) => {
        console.warn('[INTERACTIVE_VOICE] Error getting settings for prefetch:', e);
      });
    } else {
      isPlayingQueueRef.current = false;
      setTimeout(() => { processSpeechQueue(); }, 0);
    }
  }, [voice, setVoiceState, releaseMicResources]);

  const handleTalkStart = useCallback(async () => {
    // Accept WAITING or IDLE state (WAITING is set when entering interactive mode)
    if (voiceStateRef.current !== 'WAITING' && voiceStateRef.current !== 'IDLE') return;
    
    pressStartTimeRef.current = Date.now();
    
    try {
      // 1. Request microphone permission
      const hasPermission = await micService.requestMicPermission(lang);
      if (!hasPermission) {
        console.warn('[WALKIE_TALKIE] Microphone permission denied.');
        setVoiceState('WAITING');
        return;
      }

      // 2. Initialize Whisper model if not ready
      if (!voice.isWhisperReady && !voice.isInitializing) {
        console.log('[WALKIE_TALKIE] Whisper not ready, initializing...');
        const success = await voice.warmupModels();
        if (!success) {
          console.warn('[WALKIE_TALKIE] Failed to warm up Whisper models.');
          setVoiceState('WAITING');
          return;
        }
      }

      // Wait if it's currently initializing
      let attempts = 0;
      while (voice.isInitializing && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!voice.whisperContextRef?.current) {
        console.warn('[WALKIE_TALKIE] Whisper context still null. Cannot start listening.');
        setVoiceState('WAITING');
        return;
      }

      setVoiceState('RECORDING');
      setLiveTranscript('');
      voice.stopSpeaking();
      
      // Start real-time listening with VAD
      // Thread allocation: VAD gets 1 thread, Whisper gets remaining threads
      const hw = await getHardwareConfig();
      const whisperThreads = Math.max(2, Math.floor(hw.threads / 2));
      
      // 🛡️ Post-await check to prevent race conditions
      if ((voiceStateRef.current as VoiceState) !== 'RECORDING') {
        console.warn('[WALKIE_TALKIE] State changed during initialization. Aborting mic start.');
        return;
      }
      
      // Using Silero VAD configured via WALKIE_TALKIE_CONFIG
      // VAD is lightweight and processes in small increments - assign 1 thread
      const options = {
        language: lang === 'es' ? 'es' : 'en',
        realtimeAudioSec: 30,
        realtimeAudioSliceSec: WALKIE_TALKIE_CONFIG.realtimeAudioSliceSec,
        maxThreads: whisperThreads,
        useVad: true,
        vadPreset: WALKIE_TALKIE_CONFIG.vadPreset, 
        vadThrottleMs: WALKIE_TALKIE_CONFIG.vadThrottleMs,
        vadSkipRatio: 0,     // Skip every Nth slice (0 = no skipping)
      };

      const transcribedSlices: string[] = [];

      const success = await micService.startListening(
        'WALKIE_TALKIE',
        voice.whisperContextRef?.current,
        options,
        (text, isCapturing, detectedLang, sliceIndex) => {
          if (!text) return;

          const cleanText = SpeechFilter.cleanWhisperText(text);

          if (!cleanText) return;

          // Apply SpeechFilter ASR Gate
          if (SpeechFilter.isNoiseOrHallucination(cleanText, lang, detectedLang)) {
            return;
          }

          const currentSlice = typeof sliceIndex === 'number' ? sliceIndex : transcribedSlices.length;
          transcribedSlices[currentSlice] = cleanText;

          const concatenated = transcribedSlices.filter(Boolean).join(' ').trim();

          const now = Date.now();
          if (!isCapturing || now - lastTranscriptUpdateRef.current > 150) {
            setLiveTranscript(concatenated);
            lastTranscriptUpdateRef.current = now;
          }
          liveTranscriptRef.current = concatenated;
        }
      );

      if (!success) {
        setVoiceState('WAITING');
      }
    } catch (e) {
      console.error('[WALKIE_TALKIE] startRecording error:', e);
      setVoiceState('WAITING');
    }
  }, [lang, voice, setVoiceState]);

  const handleTalkEnd = useCallback(async () => {
    if (voiceStateRef.current !== 'RECORDING') return;

    // Check if it's a tap gesture (duration less than 350ms)
    const pressDuration = Date.now() - pressStartTimeRef.current;
    if (pressDuration < 350) {
      console.log('[WALKIE_TALKIE] Ignored release gesture (detected as a tap). Keeping recording active.');
      return;
    }

    try {
      setVoiceState('PROCESSING');
      setProcessingTimeElapsed(0);
      
      // Stop listening
      await micService.stopListening('WALKIE_TALKIE');
      await new Promise((resolve) => setTimeout(resolve, 250));

      // Get the live transcript
      const text = liveTranscriptRef.current;
      
      if (!text) {
        // No speech detected - return to WAITING state for another attempt
        setVoiceState('WAITING');
        return;
      }

      // Check for music/noise patterns
      if (SpeechFilter.containsMusicOrNoise(text)) {
        setLiveTranscript('');
        liveTranscriptRef.current = '';
        setVoiceState('WAITING');
        return;
      }

      // Check for hallucinations
      if (SpeechFilter.isNoiseOrHallucination(text, lang)) {
        setLiveTranscript('');
        liveTranscriptRef.current = '';
        setVoiceState('WAITING');
        return;
      }

      // Word count check - minimum 3 words, maximum 12 words
      const words = text.split(/\s+/).filter(w => w.length > 0);
      if (words.length < 3) {
        // Too few words - likely noise or incomplete speech
        setLiveTranscript('');
        liveTranscriptRef.current = '';
        setVoiceState('WAITING');
        return;
      }
      if (words.length > 12) {
        const truncated = words.slice(0, 12).join(' ');
        setLiveTranscript(truncated);
        liveTranscriptRef.current = truncated;
      }

      // Send to LLM
      resetSpeechQueue();
      isGeneratingRef.current = true;
      isFirstSentenceRef.current = true;
      sessionStartTimeRef.current = Date.now();
      lastQueueActivityRef.current = Date.now();

      sendMessageToLlm(
        liveTranscriptRef.current,
        (sentence: string) => {
          if (!isActiveRef.current) return;
          const trimmed = sentence.trim();
          if (!trimmed) return;
          if (voice.isMuted || voiceStateRef.current === 'MUTED') return;
          if (sentenceQueueRef.current.includes(trimmed)) return;
          sentenceQueueRef.current.push(trimmed);
          processSpeechQueue();
        },
        () => {
          resetSpeechQueue();
          voice.stopSpeaking();
        }
      ).then(() => {
        isGeneratingRef.current = false;
        processSpeechQueue();
      }).catch((err) => {
        console.error('[WALKIE_TALKIE] LLM pipeline error:', err);
        resetSpeechQueue();
        if (isActiveRef.current && voiceStateRef.current !== 'MUTED') {
          setVoiceState('WAITING');
        }
      });
    } catch (e) {
      console.error('[WALKIE_TALKIE] handleTalkEnd error:', e);
      setVoiceState('WAITING');
    }
  }, [lang, voice, sendMessageToLlm, resetSpeechQueue, processSpeechQueue, setVoiceState]);

  const toggleMute = useCallback(async () => {
    resetSpeechQueue();
    voice.toggleMute();

    if (voiceState === 'MUTED') {
      if (isActiveRef.current) {
        setVoiceState('WAITING');
      } else {
        setVoiceState('IDLE');
      }
    } else if (voiceState === 'RECORDING') {
      setVoiceState('MUTED');
      await micService.stopListening('WALKIE_TALKIE');
    } else if (voiceState === 'SPEAKING' || voiceState === 'PROCESSING') {
      voice.stopSpeaking();
      abortLlm();
      setVoiceState('MUTED');
    }
  }, [voiceState, voice, abortLlm, resetSpeechQueue, setVoiceState]);

  const toggleInteractiveMode = useCallback(async () => {
    console.log('[INTERACTIVE_VOICE] toggleInteractiveMode called. Current state:', voiceState);
    
    // Reset speech queue and clear any pending TTS
    resetSpeechQueue();
    
    if (voiceState === 'WAITING' || voiceState === 'RECORDING' || voiceState === 'PROCESSING' || voiceState === 'SPEAKING' || voiceState === 'MUTED') {
      // Exiting Walkie-Talkie mode
      console.log('[INTERACTIVE_VOICE] Exiting Walkie-Talkie mode...');
      isActiveRef.current = false;
      
      // Stop any active listening/recording
      if (voiceState === 'RECORDING') {
        try { 
          await micService.stopListening('WALKIE_TALKIE'); 
          console.log('[INTERACTIVE_VOICE] Stopped mic listening');
        } catch (e) {
          console.warn('[WALKIE_TALKIE] Error stopping listening:', e);
        }
      }
      
      // Stop TTS and reset speaking state
      voice.stopSpeaking();
      abortLlm();
      
      // Release all mic resources
      await releaseMicResources();
      
      // Reset to IDLE state
      setVoiceState('IDLE');
      if (prefillTimeoutRef.current) clearTimeout(prefillTimeoutRef.current);
      lastPrefillTextRef.current = '';
      
      // Clear the transcript
      setLiveTranscript('');
      liveTranscriptRef.current = '';
      
      console.log('[INTERACTIVE_VOICE] Walkie-Talkie mode exited. State reset to IDLE.');
    } else {
      // Entering Walkie-Talkie mode - set to WAITING state for UI instructions
      console.log('[INTERACTIVE_VOICE] Entering Walkie-Talkie mode...');
      
      // Stop any active dictation session
      if (voice.isListening) {
        console.log('[WALKIE_TALKIE] Stopping active dictation before starting interactive mode.');
        try {
          await voice.stopListening();
          await voice.releaseResources();
          await new Promise((resolve) => setTimeout(resolve, 200));
        } catch (e) {
          console.warn('[WALKIE_TALKIE] Error stopping dictation session:', e);
        }
      }

      isActiveRef.current = true;
      
      // Set to WAITING state (UI shows instruction text)
      // User must press-and-hold to transition to RECORDING
      if (voice.isMuted) {
        setVoiceState('MUTED');
      } else {
        setVoiceState('WAITING');
      }
      
      console.log('[INTERACTIVE_VOICE] Walkie-Talkie mode waiting for input.');
    }
  }, [voiceState, voice, abortLlm, resetSpeechQueue, setVoiceState, releaseMicResources]);

  const queueSpeech = useCallback((text: string) => {
    const cleaned = text.replace(/<[^>]*>?/gm, '').trim();
    if (cleaned) {
      sentenceQueueRef.current.push(cleaned);
      // Process queue immediately to enable streaming TTS while LLM generates
      processSpeechQueue();
    }
  }, [processSpeechQueue]);

  const clearSpeechQueue = useCallback(() => {
    resetSpeechQueue();
    preloadedMapRef.current = {};
    voice.stopSpeaking();
  }, [resetSpeechQueue, voice]);

  const startSpeechSession = useCallback(() => {
    resetSpeechQueue();
    isGeneratingRef.current = true;
    isFirstSentenceRef.current = true;
    sessionStartTimeRef.current = Date.now();
    lastQueueActivityRef.current = Date.now();
  }, [resetSpeechQueue]);

  const endSpeechSession = useCallback(() => {
    isGeneratingRef.current = false;
    processSpeechQueue();
  }, [processSpeechQueue]);

  const handleInterruptSpeech = useCallback(() => {
    console.log('[INTERACTIVE_VOICE] User tapped to interrupt speech.');
    resetSpeechQueue();
    preloadedMapRef.current = {};
    voice.stopSpeaking();
    abortLlm();
    if (isActiveRef.current && voiceStateRef.current !== 'MUTED') {
      setVoiceState('WAITING');
    }
  }, [resetSpeechQueue, voice, abortLlm, setVoiceState]);

  return {
    voiceState,
    toggleInteractiveMode,
    toggleMute,
    isWhisperReady: voice.isWhisperReady,
    isInitializing: voice.isInitializing,
    transcript: liveTranscript,
    voiceError: voice.voiceError,
    availableVoices: voice.availableVoices,
    selectedVoiceId: voice.selectedVoiceId,
    setSelectedVoiceId: voice.setSelectedVoiceId,
    speak: voice.speak,
    stopSpeaking: voice.stopSpeaking,
    isSpeaking: voice.isSpeaking,
    queueSpeech,
    clearSpeechQueue,
    startSpeechSession,
    endSpeechSession,
    handleTalkStart,
    handleTalkEnd,
    processingMessage: getProcessingMessage(),
    handleInterruptSpeech,
  };
}