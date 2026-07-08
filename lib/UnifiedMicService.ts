/**
 * UnifiedMicService.ts
 * Date: 2026-05-12
 *
 * 🛡️ ARCHITECTURAL SHIELD - VOICE SYSTEM SEGREGATION POLICY:
 * This app maintains two strictly isolated voice workflows:
 *   - Modo A (Walkie-Talkie): Live voice-to-voice stream with immediate LLM pipe and TTS.
 *   - Modo B (Voice Notes/Dictation): Text-only input transcription to append to the chat draft.
 * Do NOT merge, mix, or unify their UI states, component state managers, or hooks.
 * Always coordinate mic session acquisition via this UnifiedMicService to prevent thread collisions.
 *
 * Singleton microphone service that manages exclusive access to the audio input
 * for the entire AI Sanctuary app. Prevents concurrent recording conflicts
 * between useVoice and useInteractiveVoice hooks.
 *
 * Consumer API (used by useVoice.ts):
 *   micService.requestMicPermission(lang)
 *   micService.startListening(caller, whisperCtx, options, callback)
 *   micService.stopListening(caller)
 *   micService.releaseAllAudioSessions()
 */

import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { PermissionsAndroid, Platform } from 'react-native';
// RealtimeTranscriber and AudioPcmStreamAdapter are dynamically imported

export type MicCallback = (text: string, isCapturing: boolean, language?: string, sliceIndex?: number) => void;

interface ActiveSession {
  caller: string;
  stopFn: () => void;
}

class UnifiedMicService {
  private activeSession: ActiveSession | null = null;
  public lastAudioMode: 'recording' | 'playback' = 'playback';

  /**
   * Requests microphone permission from the OS.
   * Returns true if granted, false otherwise.
   */
  async requestMicPermission(lang: string = 'en'): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: lang === 'es' ? 'Permiso de Micrófono' : 'Microphone Permission',
            message: lang === 'es'
              ? 'AI Diary necesita acceso al micrófono para reconocimiento de voz.'
              : 'AI Diary needs microphone access for voice recognition.',
            buttonPositive: lang === 'es' ? 'Permitir' : 'Allow',
            buttonNegative: lang === 'es' ? 'Denegar' : 'Deny',
          }
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }

      // iOS: expo-av handles permissions implicitly via Audio.requestPermissionsAsync
      const { granted } = await Audio.requestPermissionsAsync();
      return granted;
    } catch (e) {
      console.error('[UnifiedMicService] Permission request failed:', e);
      return false;
    }
  }

  /**
   * Starts listening using Whisper.rn for STT.
   * Automatically preempts and stops any conflicting microphone session.
   */
  async startListening(
    caller: string,
    whisperContext: any,
    options: {
      language: string;
      realtimeAudioSec: number;
      realtimeAudioSliceSec: number;
      maxThreads: number;
      useVad: boolean;
    },
    callback: MicCallback
  ): Promise<boolean> {
    this.lastAudioMode = 'recording';
    if (this.activeSession && this.activeSession.caller !== caller) {
      console.warn(`[UnifiedMicService] Mic is busy (held by "${this.activeSession.caller}"). Programmatically stopping it for "${caller}".`);
      try {
        await this.activeSession.stopFn();
      } catch (e) {
        console.warn(`[UnifiedMicService] Failed to stop session for "${this.activeSession.caller}":`, e);
      }
      this.activeSession = null;
      // Wait a short time for resources to fully unload in the native layer
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    // Stop any existing session from the same caller before starting a new one
    if (this.activeSession) {
      try { await this.activeSession.stopFn(); } catch (e) {}
      this.activeSession = null;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        playThroughEarpieceAndroid: false,
      });

      // 1. Instantiate the native PCM audio stream adapter
      const { AudioPcmStreamAdapter } = await import('whisper.rn/lib/module/realtime-transcription/adapters/AudioPcmStreamAdapter');
      const audioStream = new AudioPcmStreamAdapter();

      // 2. Instantiate the Whisper RealtimeTranscriber
      const { RealtimeTranscriber } = await import('whisper.rn/lib/module/realtime-transcription');
      const transcriber = new RealtimeTranscriber(
        {
          whisperContext,
          audioStream,
        },
        {
          audioSliceSec: options.realtimeAudioSliceSec || 3,
          promptPreviousSlices: false, // Prevents looping hallucinations in cascade
          // Fix #4: Shorten initialPrompt — long prompts can delay the model's
          // "lock-on" to the start of the audio stream, causing the first slice to arrive late.
          initialPrompt: "Dictado de voz.",
          audioStreamConfig: {
            // Android emulator safety: Use a smaller, standard audio buffer size (4096 bytes)
            // instead of the default 16384 bytes, which exhausts the virtual HAL buffer
            // on modern Android (14/15) virtual devices, causing 'releaseBuffer: mUnreleased out of range' SIGABRT crash.
            bufferSize: 4096,
          },
          transcribeOptions: {
            language: options.language,
            maxThreads: options.maxThreads,
            // Fix #2: Mobile-optimised Whisper parameters:
            //   temperature:0.0 — Disables the internal whisper.cpp fallback mechanism that
            //                     re-processes segments when confidence is low, removing
            //                     the non-deterministic delay spikes on slow CPUs.
            //   beamSize:1      — Greedy decode. Cuts inference time by ~50% vs beamSize:2
            //                     with negligible accuracy loss for dictation use-cases.
            //   bestOf:1        — Eliminates the 3x CPU overhead of sampling N candidates.
            //   maxContext:0    — Equivalent to noContext: isolates each slice so stale
            //                     previous-slice tokens cannot contaminate new slices
            //                     (prevents hallucination loops in long sessions).
            temperature: 0.0,
            beamSize: 1,
            bestOf: 1,
            maxContext: 0,
          },
        },
        {
          onTranscribe: (event: any) => {
            const text = event?.data?.result ?? event?.result?.text ?? '';
            const isCapturing = event?.isCapturing ?? false;
            const detectedLang = event?.data?.language ?? event?.language ?? '';
            const sliceIndex = event?.sliceIndex;
            callback(text, isCapturing, detectedLang, sliceIndex);
          },
          onError: (error: string) => {
            console.error('[UnifiedMicService] RealtimeTranscriber error:', error);
          }
        }
      );

      // 3. Start the audio stream and transcription engine
      await transcriber.start();

      this.activeSession = {
        caller,
        stopFn: async () => {
          try {
            await transcriber.stop();
          } catch (e: any) {
            console.warn('[UnifiedMicService] Failed to stop transcriber:', e);
          }
          try {
            await audioStream.release();
          } catch (e: any) {
            console.warn('[UnifiedMicService] Failed to release audioStream:', e);
          }
        }
      };

      console.log(`[UnifiedMicService] 🎙️ RealtimeTranscriber started for: "${caller}"`);
      return true;
    } catch (e) {
      console.error('[UnifiedMicService] startListening failed:', e);
      this.activeSession = null;
      return false;
    }
  }

  /**
   * Registers an external capture session (like Walkie-Talkie recording).
   * Automatically stops any existing session before registering.
   */
  async registerSession(caller: string, stopFn: () => void): Promise<boolean> {
    this.lastAudioMode = 'recording';
    if (this.activeSession && this.activeSession.caller !== caller) {
      console.log(`[UnifiedMicService] Stopping active session of "${this.activeSession.caller}" for new caller "${caller}"`);
      try {
        await this.activeSession.stopFn();
      } catch (e) {
        console.warn(`[UnifiedMicService] Failed to stop session for "${this.activeSession.caller}":`, e);
      }
      this.activeSession = null;
      // Wait a short time for resources to clear
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    this.activeSession = {
      caller,
      stopFn,
    };
    console.log(`[UnifiedMicService] Registered active session for caller: "${caller}"`);
    return true;
  }

  /**
   * Unregisters the session if it matches the caller.
   */
  unregisterSession(caller: string): void {
    if (this.activeSession && this.activeSession.caller === caller) {
      this.activeSession = null;
      console.log(`[UnifiedMicService] Unregistered session for caller: "${caller}"`);
    }
  }

  /**
   * Stops the active listening session for the given caller.
   */
  async stopListening(caller: string): Promise<void> {
    if (!this.activeSession) return;
    if (this.activeSession.caller !== caller) {
      console.warn(`[UnifiedMicService] Stop ignored: active to session is "${this.activeSession.caller}", not "${caller}"`);
      return;
    }

    const stopFn = this.activeSession.stopFn;
    this.activeSession = null;

    try {
      await stopFn();
    } catch (e) {
      console.warn('[UnifiedMicService] Error during stopFn execution:', e);
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {}

    this.lastAudioMode = 'playback';
    console.log(`[UnifiedMicService] ⏹️ Session stopped for: "${caller}"`);
  }

  /**
   * Releases ALL audio sessions and resets audio mode.
   * Use this for emergency cleanup (e.g., app background, session timeout, or after Walkie-Talkie completes).
   * This ensures the microphone is fully released and available for the next session.
   */
  async releaseAllAudioSessions(): Promise<void> {
    if (this.activeSession) {
      try {
        await this.activeSession.stopFn();
        console.log(`[UnifiedMicService] 🔓 Emergency stopping session: "${this.activeSession.caller}"`);
      } catch (e) {
        console.warn('[UnifiedMicService] Error during emergency stopFn:', e);
      }
      this.activeSession = null;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        playThroughEarpieceAndroid: false,
      });
    } catch (e) {
      console.warn('[UnifiedMicService] releaseAllAudioSessions audio mode reset failed:', e);
    }

    this.lastAudioMode = 'playback';
    console.log('[UnifiedMicService] 🔓 All audio sessions released and audio mode reset.');
  }

  get isActive(): boolean {
    return this.activeSession !== null;
  }

  get currentCaller(): string | null {
    return this.activeSession?.caller ?? null;
  }
}

// Singleton exported for use across the app.
export const micService = new UnifiedMicService();