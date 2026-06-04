/**
 * useExperimentalWalkieTalkie.ts
 * Walkie-Talkie mode for the Experimental tab.
 * Uses file-based recording with Sherpa-ONNX STT/TTS.
 * Isolated from main tab's voice system.
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { SpeechFilter } from '../lib/SpeechFilter';
import { sherpaSpeechService } from '../lib/SherpaSpeechService';
import { micService } from '../lib/UnifiedMicService';
import { ModelCategory, isModelDownloadedByCategory } from 'react-native-sherpa-onnx/download';

export type ExperimentalVoiceState = 'IDLE' | 'RECORDING' | 'PROCESSING' | 'SPEAKING' | 'MUTED';

function useSafeState<T>(initialValue: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialValue);
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);
  const safeSetState = useCallback((val: T | ((prev: T) => T)) => {
    if (isMounted.current) setState(val);
  }, []);
  return [state, safeSetState];
}

export function useExperimentalWalkieTalkie(
  lang: string,
  sendMessageToLlm: (text: string) => Promise<string>
) {
  const [voiceState, setVoiceState] = useSafeState<ExperimentalVoiceState>('IDLE');
  const [transcript, setTranscript] = useSafeState('');
  const [isMuted, setIsMuted] = useSafeState(false);
  const [voiceError, setVoiceError] = useSafeState('');
  const [isWhisperReady, setIsWhisperReady] = useSafeState(false);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const isProcessingRef = useRef(false);

  // Check if STT model is ready
  useEffect(() => {
    const checkModel = async () => {
      try {
        const isDownloaded = await isModelDownloadedByCategory(ModelCategory.Stt, 'sherpa-onnx-whisper-tiny');
        setIsWhisperReady(isDownloaded);
      } catch (e) {
        console.warn('[EXPERIMENTAL_WALKIE] Model check failed:', e);
      }
    };
    checkModel();
  }, []);

  const startRecording = useCallback(async () => {
    if (voiceState !== 'IDLE' || isMuted) return;
    
    try {
      // Register session to prevent conflicts
      await micService.registerSession('EXPERIMENTAL_WALKIE', async () => {
        console.log('[EXPERIMENTAL_WALKIE] Force-stopping recording session');
        if (recordingRef.current) {
          const rec = recordingRef.current;
          recordingRef.current = null;
          try {
            await rec.stopAndUnloadAsync();
          } catch (e) {
            console.warn('[EXPERIMENTAL_WALKIE] Stop failed:', e);
          }
        }
        setVoiceState('IDLE');
      });

      // Audio mode setup
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
      recordingRef.current = recording;
      setVoiceState('RECORDING');
      setTranscript('');
    } catch (e: any) {
      console.error('[EXPERIMENTAL_WALKIE] Start recording failed:', e);
      setVoiceError(lang === 'es' ? 'Error al iniciar grabación' : 'Failed to start recording');
      setVoiceState('IDLE');
    }
  }, [voiceState, isMuted, lang]);

  const stopAndProcess = useCallback(async () => {
    if (voiceState !== 'RECORDING' || !recordingRef.current) return;
    
    setVoiceState('PROCESSING');
    isProcessingRef.current = true;

    try {
      const recording = recordingRef.current;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      // Release mic session
      micService.unregisterSession('EXPERIMENTAL_WALKIE');

      if (!uri) {
        setVoiceError(lang === 'es' ? 'No se obtuvo audio' : 'No audio captured');
        setVoiceState('IDLE');
        return;
      }

      // Convert to WAV 16k
      const tempWavUri = `${FileSystem.cacheDirectory}exp_walkie_${Date.now()}.wav`;
      const inputPath = uri.replace(/^file:\/\//, '');
      const outputPath = tempWavUri.replace(/^file:\/\//, '');
      
      const { convertAudioToWav16k } = require('react-native-sherpa-onnx/audio');
      await convertAudioToWav16k(inputPath, outputPath);

      // File validity check
      const isValid = await SpeechFilter.isAudioFileValid(tempWavUri);
      if (!isValid) {
        console.log(`[EXPERIMENTAL_WALKIE] Invalid audio file`);
        setVoiceState('IDLE');
        return;
      }

      // Transcribe with Sherpa
      const transcriptionText = await sherpaSpeechService.transcribeOffline(tempWavUri);
      
      // Clean up temp files
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        await FileSystem.deleteAsync(tempWavUri, { idempotent: true });
      } catch (e) {}

      // Filter noise/hallucinations
      let cleanedText = transcriptionText
        .replace(/\[BLANK_AUDIO\]/gi, '')
        .replace(/\[silence\]/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanedText || SpeechFilter.isNoiseOrHallucination(cleanedText, lang)) {
        console.log('[EXPERIMENTAL_WALKIE] Blocked: noise/hallucination');
        setVoiceState('IDLE');
        return;
      }

      // Word count check (1-12 words for Walkie-Talkie)
      const wordCount = cleanedText.split(/\s+/).filter(w => w.length > 0).length;
      if (wordCount < 1) {
        setVoiceState('IDLE');
        return;
      }
      if (wordCount > 12) {
        cleanedText = cleanedText.split(/\s+/).slice(0, 12).join(' ');
      }

      setTranscript(cleanedText);

      // Send to LLM
      if (isProcessingRef.current) {
        setVoiceState('SPEAKING');
        const response = await sendMessageToLlm(cleanedText);
        // TTS will be handled by the component
      }
    } catch (e: any) {
      console.error('[EXPERIMENTAL_WALKIE] Processing failed:', e);
      setVoiceError(lang === 'es' ? 'Error al procesar audio' : 'Failed to process audio');
    } finally {
      isProcessingRef.current = false;
      setVoiceState(prev => prev !== 'SPEAKING' ? 'IDLE' : prev);
    }
  }, [voiceState, lang, sendMessageToLlm]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (newMuted && voiceState === 'RECORDING') {
      // Stop recording if muting
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
      micService.unregisterSession('EXPERIMENTAL_WALKIE');
      setVoiceState('MUTED');
    } else if (!newMuted && voiceState === 'MUTED') {
      setVoiceState('IDLE');
    }
  }, [isMuted, voiceState]);

  const releaseResources = useCallback(async () => {
    micService.unregisterSession('EXPERIMENTAL_WALKIE');
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
      } catch (e) {}
      recordingRef.current = null;
    }
    setVoiceState('IDLE');
  }, []);

  return {
    voiceState,
    transcript,
    isMuted,
    voiceError,
    isWhisperReady,
    startRecording,
    stopAndProcess,
    toggleMute,
    releaseResources,
  };
}