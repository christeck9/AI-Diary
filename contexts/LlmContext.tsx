import React, { createContext, useContext, useRef, useMemo } from 'react';
import { ModelDefinition } from '../src/config/ModelConfig';
import { useAppLlm } from '../hooks/useAppLlm';
import { useLanguage } from './LanguageContext';
import { ModelInfo } from '../hooks/useAppLlm';

// We split the context into two parts: State and Actions.
export type LlmState = {
  deviceRAM: number;
  status: 'idle' | 'downloading' | 'loading' | 'ready' | 'error';
  isDownloading: boolean;
  downloadingModel: ModelDefinition | null;
  downloadingType: 'model' | 'vision' | null;
  activeModel: ModelInfo | null;
  AVAILABLE_MODELS: ModelInfo[];
};

export type LlmProgress = {
  downloadedMB: number;
  downloadSpeed: number;
  downloadPercent: number;
  currentContextSize: number;
  tokensUsed: number;
};

export type LlmActions = {
  selectModel: (model: ModelInfo) => void;
  downloadModel: (model: ModelInfo) => Promise<void>;
  downloadVisionModel: (model: ModelInfo) => Promise<void>;
  checkVisionModelExists: (model: ModelInfo) => Promise<boolean>;
  pauseDownload: () => void;
  cancelDownload: () => Promise<void>;
  loadModel: () => Promise<void>;
  resetToHome: () => Promise<void>;
  llamaContextRef: React.MutableRefObject<any>;
  generateStreamingResponse: (prompt: string | null, onTokenReceived: (text: string) => void, onError: (error: string) => void, imagePath?: string | string[], multimodalMessages?: any[], binaryBuffer?: Uint8Array, consciousnessLevel?: number, forceHighTemperature?: boolean, forceDeterminism?: boolean) => Promise<string>;
  prefillContextLlm: (prompt: string | null, messages?: any[]) => Promise<void>;
  abortGeneration: () => Promise<void>;
  getModelStatus: (model: ModelInfo) => Promise<{ status: 'missing' | 'current' | 'outdated'; localSizeMB: number; remoteSizeMB: number; integrity: boolean; }>;
  checkModelVersion: (model: ModelInfo) => Promise<'missing' | 'current' | 'outdated'>;
  resumeIncompleteDownloads: () => Promise<void>;
  generateEmbeddings: (texts: string[]) => Promise<number[][]>;
};

const LlmStateContext = createContext<LlmState | null>(null);
const LlmProgressContext = createContext<LlmProgress | null>(null);
const LlmActionsContext = createContext<LlmActions | null>(null);

/**
 * LlmProvider: wraps useAppLlm at the root layout level so the download
 * state survives tab navigation.
 */
export function LlmProvider({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  const llm = useAppLlm(lang);

  // Closure ref pattern: keep latest closure instance
  const llmRef = useRef(llm);
  // Update synchronously during render to prevent stale closures
  llmRef.current = llm;

  const actions = useMemo<LlmActions>(() => ({
    selectModel: (modelId) => llmRef.current.selectModel(modelId),
    downloadModel: (model) => llmRef.current.downloadModel(model),
    downloadVisionModel: (model) => llmRef.current.downloadVisionModel(model),
    checkVisionModelExists: (model) => llmRef.current.checkVisionModelExists(model),
    pauseDownload: () => llmRef.current.pauseDownload(),
    cancelDownload: () => llmRef.current.cancelDownload(),
    loadModel: () => llmRef.current.loadModel(),
    resetToHome: () => llmRef.current.resetToHome(),
    get llamaContextRef() { return llmRef.current.llamaContextRef; },
    generateStreamingResponse: (prompt, onTokenReceived, onError, imagePath, multimodalMessages, binaryBuffer, consciousnessLevel, forceHighTemperature, forceDeterminism) => {
      console.log('[LlmContext] generateStreamingResponse wrapper called! Prompt length:', prompt?.length);
      return llmRef.current.generateStreamingResponse(prompt, onTokenReceived, onError, imagePath, multimodalMessages, binaryBuffer, consciousnessLevel, forceHighTemperature, forceDeterminism);
    },
    prefillContextLlm: (...args) => llmRef.current.prefillContextLlm(...args),
    abortGeneration: () => llmRef.current.abortGeneration(),
    getModelStatus: (model) => llmRef.current.getModelStatus(model),
    checkModelVersion: (model) => llmRef.current.checkModelVersion(model),
    resumeIncompleteDownloads: () => llmRef.current.resumeIncompleteDownloads(),
    generateEmbeddings: (texts) => llmRef.current.generateEmbeddings(texts),
  }), []);

  const state: LlmState = useMemo(() => ({
    deviceRAM: llm.deviceRAM,
    status: llm.status,
    isDownloading: llm.isDownloading,
    downloadingModel: llm.downloadingModel,
    downloadingType: llm.downloadingType,
    activeModel: llm.activeModel,
    AVAILABLE_MODELS: llm.AVAILABLE_MODELS,
  }), [
    llm.deviceRAM, llm.status, llm.isDownloading, 
    llm.downloadingModel, llm.downloadingType, 
    llm.activeModel, llm.AVAILABLE_MODELS
  ]);

  const progress: LlmProgress = useMemo(() => ({
    downloadedMB: llm.downloadedMB,
    downloadSpeed: llm.downloadSpeed,
    downloadPercent: llm.downloadPercent,
    currentContextSize: llm.currentContextSize,
    tokensUsed: llm.tokensUsed,
  }), [
    llm.downloadedMB, llm.downloadSpeed, llm.downloadPercent, 
    llm.currentContextSize, llm.tokensUsed
  ]);

  return (
    <LlmStateContext.Provider value={state}>
      <LlmProgressContext.Provider value={progress}>
        <LlmActionsContext.Provider value={actions}>
          {children}
        </LlmActionsContext.Provider>
      </LlmProgressContext.Provider>
    </LlmStateContext.Provider>
  );
}

export function useLlmState(): LlmState {
  const ctx = useContext(LlmStateContext);
  if (!ctx) throw new Error('useLlmState must be used inside <LlmProvider>');
  return ctx;
}

export function useLlmProgress(): LlmProgress {
  const ctx = useContext(LlmProgressContext);
  if (!ctx) throw new Error('useLlmProgress must be used inside <LlmProvider>');
  return ctx;
}

export function useLlmActions(): LlmActions {
  const ctx = useContext(LlmActionsContext);
  if (!ctx) throw new Error('useLlmActions must be used inside <LlmProvider>');
  return ctx;
}
