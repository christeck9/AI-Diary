/**
 * useVoiceMetrics.ts
 * Hook for tracking voice pipeline performance metrics
 * 
 * Tracks: VAD → Whisper → LLM latency, VAD skip counts, and processing times
 */
import { useRef, useCallback } from 'react';

interface VoiceMetrics {
  vadLatencyMs: number;
  whisperLatencyMs: number;
  llmLatencyMs: number;
  totalPipelineMs: number;
  vadSkipCount: number;
  vadThrottleCount: number;
  transcriptionLength: number;
}

const initialMetrics: VoiceMetrics = {
  vadLatencyMs: 0,
  whisperLatencyMs: 0,
  llmLatencyMs: 0,
  totalPipelineMs: 0,
  vadSkipCount: 0,
  vadThrottleCount: 0,
  transcriptionLength: 0,
};

export function useVoiceMetrics() {
  const metricsRef = useRef<VoiceMetrics>(initialMetrics);
  const startTimeRef = useRef<number>(0);

  const startPipeline = useCallback(() => {
    startTimeRef.current = Date.now();
    metricsRef.current = { ...initialMetrics };
  }, []);

  const markVadComplete = useCallback(() => {
    if (startTimeRef.current) {
      metricsRef.current.vadLatencyMs = Date.now() - startTimeRef.current;
    }
  }, []);

  const markWhisperComplete = useCallback(() => {
    if (startTimeRef.current) {
      metricsRef.current.whisperLatencyMs = Date.now() - startTimeRef.current - metricsRef.current.vadLatencyMs;
    }
  }, []);

  const markLlmComplete = useCallback(() => {
    if (startTimeRef.current) {
      metricsRef.current.llmLatencyMs = Date.now() - startTimeRef.current - metricsRef.current.vadLatencyMs - metricsRef.current.whisperLatencyMs;
      metricsRef.current.totalPipelineMs = Date.now() - startTimeRef.current;
    }
  }, []);

  const incrementVadSkip = useCallback(() => {
    metricsRef.current.vadSkipCount++;
  }, []);

  const incrementVadThrottle = useCallback(() => {
    metricsRef.current.vadThrottleCount++;
  }, []);

  const setTranscriptionLength = useCallback((length: number) => {
    metricsRef.current.transcriptionLength = length;
  }, []);

  const getMetrics = useCallback((): VoiceMetrics => {
    return { ...metricsRef.current };
  }, []);

  const resetMetrics = useCallback(() => {
    metricsRef.current = { ...initialMetrics };
  }, []);

  return {
    startPipeline,
    markVadComplete,
    markWhisperComplete,
    markLlmComplete,
    incrementVadSkip,
    incrementVadThrottle,
    setTranscriptionLength,
    getMetrics,
    resetMetrics,
  };
}