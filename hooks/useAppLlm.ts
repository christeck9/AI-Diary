import { useState, useEffect, useRef, useMemo } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { getCurrentTier, MemoryTier } from '../lib/MemoryManager';
import * as FileSystem from 'expo-file-system';
import { initLlama, releaseAllLlama } from 'llama.rn';
import { getHardwareConfig, getDeviceTemperature, getTotalRAM } from '../lib/hardware';
import { MODEL_CONFIG, getDynamicEngineConfig, MODEL_LIST, ModelDefinition } from '../src/config/ModelConfig';
import { cpuSemaphore } from '../lib/CPUSemaphore';
import { canLoadModel, getFreeRAM } from '../lib/RAMGuard';
import { settingsService } from '../lib/SettingsService';
import { Asset } from 'expo-asset';


export interface ModelInfo extends ModelDefinition {
  label: string;
  description: string;
}

// Concurrency control interface and queue for Llama context
interface QueuedTask {
  params: any;
  callback: any;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
  isBackground: boolean;
}

let activeCompletionPromise: Promise<any> | null = null;
let currentTaskType: 'main' | 'background' | null = null;
let backgroundQueue: QueuedTask[] = [];
let isProcessingQueue = false;
let activeContext: any = null;
let isModelLoading = false;
let generationId = 0;

let globalEmbeddingContext: any = null;
let embeddingInitPromise: Promise<void> | null = null;

const clearCompletionQueue = () => {
  generationId++; // Invalida cualquier callback de completion pendiente de inmediato
  console.log('[CONCURRENCY] Clearing Llama completion queue.');
  backgroundQueue.forEach(t => t.reject(new Error('Model released or changed')));
  backgroundQueue = [];
  activeCompletionPromise = null;
  currentTaskType = null;
  activeContext = null;
};

const wrappedCompletion = async (context: any, params: any, callback: any): Promise<any> => {
  const isBackground = !!params.isBackground;
  // Extract and clean the isBackground flag to avoid sending it to the native C++ library
  const { isBackground: _, ...cleanParams } = params;

  if (context !== activeContext) {
    throw new Error('Model released or changed');
  }

  return new Promise((resolve, reject) => {
    const task: QueuedTask = {
      params: cleanParams,
      callback,
      resolve,
      reject,
      isBackground
    };

    if (isBackground) {
      backgroundQueue.push(task);
      processNextTasks(context);
    } else {
      handleMainTask(context, task);
    }
  });
};

const handleMainTask = async (context: any, task: QueuedTask) => {
  if (context !== activeContext) {
    task.reject(new Error('Model released or changed'));
    return;
  }

  if (activeCompletionPromise) {
    if (currentTaskType === 'background') {
      console.log('[CONCURRENCY] ⚡ Preempting background task for main query...');
      try {
        await context.stopCompletion();
      } catch (err) {
        console.warn('[CONCURRENCY] Error calling stopCompletion on background task:', err);
      }
      try {
        await activeCompletionPromise;
      } catch (e) {
        // Ignore cancellation errors
      }
    } else {
      console.log('[CONCURRENCY] ⚡ Cancelling active main task for new query...');
      try {
        await context.stopCompletion();
      } catch (err) { }
      try {
        await activeCompletionPromise;
      } catch (e) { }
    }
  }

  currentTaskType = 'main';
  activeCompletionPromise = (async () => {
    try {
      const res = await context._originalCompletion(task.params, task.callback);
      if (context !== activeContext) {
        task.reject(new Error('Model released or changed'));
        return;
      }
      task.resolve(res);
    } catch (err) {
      task.reject(err);
    } finally {
      if (context === activeContext) {
        activeCompletionPromise = null;
        currentTaskType = null;
        processNextTasks(context);
      }
    }
  })();
};

const processNextTasks = async (context: any) => {
  if (context !== activeContext) return;
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  try {
    while (backgroundQueue.length > 0) {
      if (context !== activeContext) break;
      if (currentTaskType === 'main' || activeCompletionPromise) {
        break;
      }

      const nextTask = backgroundQueue.shift();
      if (!nextTask) continue;

      currentTaskType = 'background';
      activeCompletionPromise = (async () => {
        try {
          const res = await context._originalCompletion(nextTask.params, nextTask.callback);
          if (context !== activeContext) {
            nextTask.reject(new Error('Model released or changed'));
            return;
          }
          nextTask.resolve(res);
        } catch (err) {
          nextTask.reject(err);
        } finally {
          if (context === activeContext) {
            activeCompletionPromise = null;
            currentTaskType = null;
          }
        }
      })();

      try {
        await activeCompletionPromise;
      } catch (err) {
        // Ignore cancellations
      }
    }
  } finally {
    isProcessingQueue = false;
  }
};


export function useAppLlm(lang: string = 'es') {
  const AVAILABLE_MODELS = useMemo(() => MODEL_LIST.map(m => ({
    ...m,
    label: lang === 'es' ? m.labelEs : m.labelEn,
    description: lang === 'es' ? m.descEs : m.descEn,
  })),[lang]);
  const [status, setStatus] = useState<'idle' | 'downloading' | 'loading' | 'ready'>('idle');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadingModel, setDownloadingModel] = useState<ModelDefinition | null>(null);
  // Default to the last model in the list (Anima Deep) to show correct UI during async startup.
  // The useEffect below will override this once preferredModel is read from SQLite (~200ms later).
  const [activeModel, setActiveModel] = useState<ModelInfo>(AVAILABLE_MODELS[AVAILABLE_MODELS.length - 1]);
  const [currentContextSize, setCurrentContextSize] = useState(4096);
  const [downloadedMB, setDownloadedMB] = useState(0);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [downloadPercent, setDownloadPercent] = useState(0);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [downloadingType, setDownloadingType] = useState<'model' | 'vision' | null>(null);

  const llamaContextRef = useRef<any>(null);
  const tokenCounterRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const downloadResumableRef = useRef<FileSystem.DownloadResumable | null>(null);
  // Synchronous mutex: React state updates are async, so isDownloading in a closure
  // can be stale for several ms. This ref is set in the same JS tick, preventing
  // resumeIncompleteDownloads from launching a duplicate downloadModel() call.
  const isDownloadingRef = useRef(false);

  const isSettingsLoadedRef = useRef(false);

  // Resume state helpers
  const getResumeStatePath = (filename: string) =>
    `${FileSystem.documentDirectory?.replace(/\/+$/, '')}/llm_models/download_resume_${filename}.json`;

  const clearResumeState = async (filename: string) => {
    try {
      const path = getResumeStatePath(filename);
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      }
    } catch (e) { console.warn('Error clearing resume state:', e); }
  };

  // Model persistence and version checking
  const resolveModelPath = async (model: { fileName: string }): Promise<string> => {
    const localDir = `${FileSystem.documentDirectory?.replace(/\/+$/, '')}/llm_models`;
    const localPath = `${localDir}/${model.fileName}`;
    try {
      const localInfo = await FileSystem.getInfoAsync(localPath);
      if (localInfo.exists && (localInfo as any).size > 1000000) {
        return localPath;
      }
    } catch (e) {}

    if (Platform.OS === 'android') {
      const sharedPaths = [
        `file:///data/user/0/com.christeck.worldtrans/files/llm_models/${model.fileName}`,
        `file:///data/user/0/com.christeck.aiworldtrans/files/llm_models/${model.fileName}`,
        `file:///data/user/0/com.christeck.aidiary/files/llm_models/${model.fileName}`
      ];
      for (const sPath of sharedPaths) {
        if (sPath.toLowerCase() === localPath.toLowerCase()) continue;
        try {
          const sharedInfo = await FileSystem.getInfoAsync(sPath);
          if (sharedInfo.exists && (sharedInfo as any).size > 1000000) {
            console.log(`[LLM] 🎯 Sharing downloaded model found at: ${sPath}`);
            return sPath;
          }
        } catch (e) {}
      }
    }
    return localPath;
  };

  const getModelLocalPath = (model: ModelDefinition) =>
    `${FileSystem.documentDirectory?.replace(/\/+$/, '')}/llm_models/${model.fileName}`;

  const getModelLocalSize = async (model: ModelDefinition): Promise<number | null> => {
    try {
      const path = await resolveModelPath(model);
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        return (info as any).size;
      }
    } catch (e) { console.warn('Error getting model size:', e); }
    return null;
  };

  const getModelRemoteSize = async (model: ModelDefinition): Promise<number | null> => {
    try {
      // 🛡️ 5s timeout: Prevent hanging HEAD requests in offline/emulator scenarios
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(model.url, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        console.log('[LLM] getModelRemoteSize: HEAD request timed out (5s). Assuming model is complete.');
      } else {
        console.log('Error fetching remote model size:', e);
      }
    }
    return null;
  };

  const checkModelVersion = async (model: ModelDefinition): Promise<'missing' | 'outdated' | 'current'> => {
    const localSize = await getModelLocalSize(model);
    if (!localSize) return 'missing';

    const remoteSize = await getModelRemoteSize(model);
    if (!remoteSize) return 'current'; // Assume current if can't check

    // Allow 50MB tolerance for size comparison to avoid false positives
    const tolerance = 50 * 1024 * 1024;
    if (Math.abs(localSize - remoteSize) > tolerance) {
      return 'outdated';
    }
    return 'current';
  };

  // Model integrity verification - uses file size + stored fingerprint
  // Note: Full SHA-256 on 2-3GB files would take 10-30 minutes, so we use a lightweight approach
  const getModelFingerprintPath = (model: ModelDefinition) =>
    `${FileSystem.documentDirectory?.replace(/\/+$/, '')}/llm_models/.${model.fileName}.fingerprint`;

  const saveModelFingerprint = async (model: ModelDefinition, size: number, downloadDate: string) => {
    try {
      const fingerprintPath = getModelFingerprintPath(model);
      const fingerprint = {
        size,
        downloadDate,
        modelId: model.id,
        fileName: model.fileName
      };
      await FileSystem.writeAsStringAsync(fingerprintPath, JSON.stringify(fingerprint));
    } catch (e) {
      console.warn('Error saving model fingerprint:', e);
    }
  };

  const getSavedModelFingerprint = async (model: ModelDefinition): Promise<{ size: number, downloadDate: string, modelId: string, fileName: string } | null> => {
    try {
      const fingerprintPath = getModelFingerprintPath(model);
      const info = await FileSystem.getInfoAsync(fingerprintPath);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(fingerprintPath);
        return JSON.parse(content);
      }
    } catch (e) {
      console.warn('Error reading saved model fingerprint:', e);
    }
    return null;
  };

  const verifyModelIntegrity = async (model: ModelDefinition): Promise<boolean> => {
    const localSize = await getModelLocalSize(model);
    if (!localSize) return false;

    const savedFingerprint = await getSavedModelFingerprint(model);
    if (savedFingerprint) {
      // Verify size matches (within 1% tolerance)
      const tolerance = savedFingerprint.size * 0.01;
      if (Math.abs(localSize - savedFingerprint.size) > tolerance) {
        return false;
      }
      return true;
    }

    // No fingerprint exists - create one for this model
    const newFingerprint = {
      size: localSize,
      downloadDate: new Date().toISOString(),
      modelId: model.id,
      fileName: model.fileName
    };
    await saveModelFingerprint(model, localSize, newFingerprint.downloadDate);
    return true;
  };

  const getModelStatus = async (model: ModelDefinition): Promise<{ status: 'missing' | 'outdated' | 'current', localSizeMB: number, remoteSizeMB: number, integrity: boolean }> => {
    const localSize = await getModelLocalSize(model);
    const remoteSize = await getModelRemoteSize(model);
    const status = await checkModelVersion(model);
    const integrity = await verifyModelIntegrity(model);
    return {
      status,
      localSizeMB: localSize ? Math.round(localSize / (1024 * 1024)) : 0,
      remoteSizeMB: remoteSize ? Math.round(remoteSize / (1024 * 1024)) : model.sizeMB,
      integrity
    };
  };

  const saveModelActiveState = async (active: boolean, preferredModelId?: string) => {
    try {
      const updates: Record<string, any> = { wasModelActive: active };
      if (preferredModelId) updates.preferredModel = preferredModelId;
      await settingsService.set(updates);
      console.log(`[LLM] Saved wasModelActive: ${active}, preferredModel: ${preferredModelId}`);
    } catch (e) {
      console.log('[LLM] Save model active state failed', e);
    }
  };

  // 🛡️ Cleanup: Liberar slots de Llama al desmontar el hook (KiloAuditC-JSI)
  useEffect(() => {
    return () => {
      if (llamaContextRef.current) {
        releaseAllLlama().catch(e => console.warn('[LLM] Cleanup error:', e));
        llamaContextRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isDownloading) {
      setDownloadSpeed(0);
      if (status === 'idle') {
        setDownloadPercent(0);
      }
    }
  }, [isDownloading, status]);

  const [deviceRAM, setDeviceRAM] = useState<number>(8192); // Default optimistic

  useEffect(() => {
    const loadPreferredModel = async () => {
      if (isSettingsLoadedRef.current) return;
      try {
        const hwConfig = await getHardwareConfig();
        const totalRam = await getTotalRAM();
        setDeviceRAM(totalRam);

        const settings = await settingsService.get();
        let modelToUse = activeModel;

        const baseDir = FileSystem.documentDirectory?.replace(/\/+$/, '') + '/llm_models';

        if (settings.preferredModel) {
          const model = AVAILABLE_MODELS.find(m => m.id === settings.preferredModel);
          if (model) {
            const filePath = `${baseDir}/${model.fileName}`;
            let fileExists = false;
            try {
              const fileInfo = await FileSystem.getInfoAsync(filePath);
              fileExists = fileInfo.exists;
            } catch (e) {
              console.warn('[LLM] Error checking model file existence:', e);
            }

            if (!fileExists) {
              console.warn(`[LLM] Preferred model ${model.id} not found on disk. Falling back to Anima Light.`);
              modelToUse = AVAILABLE_MODELS.find(m => m.id === 'gemma3-1b-it-q4') || model;
              await settingsService.set({ preferredModel: modelToUse.id, wasModelActive: false });
            } else if (model.id === 'gemma4-e2b-qat' && totalRam < 3000 && !hwConfig?.isEmulator) {
              console.log(`[LLM] Device has very low RAM (${totalRam} MB). Downgrading preferred model to Anima Light on startup.`);
              modelToUse = AVAILABLE_MODELS.find(m => m.id === 'gemma3-1b-it-q4') || model;
            } else {
              modelToUse = model;
            }
          }
        } else {
          // Hardware analyzer: no preferred model yet. 
          // Default to Gemma 3 1B to be safe on all devices. 
          // Future: Insert monetization rules here (e.g. Free Tier always gets Light model).
          console.log(`[LLM] Hardware Analyzer: Total RAM = ${totalRam} MB. Defaulting to Gemma 3 1B.`);
          const lightModel = AVAILABLE_MODELS.find(m => m.id === 'gemma3-1b-it-q4');
          if (lightModel) {
            modelToUse = lightModel;
          }
        }

        if (modelToUse.id !== activeModel.id) {
          setActiveModel(modelToUse);
        }

        if (settings.wasModelActive === true) {
          console.log(`[LLM] Auto-loading active model on startup (deferred 2000ms): ${modelToUse.id}`);
          setTimeout(() => {
            loadModel(modelToUse).catch(e => {
              console.error('[LLM] Auto-load model failed on startup:', e);
            });
          }, 2000);
        }
      } catch (e) { console.log('[LLM] Error loading preferred model setting:', e); }
      finally { isSettingsLoadedRef.current = true; }
    };
    if (status === 'idle') loadPreferredModel();
  }, [status]);

  // Auto-resume incomplete downloads on app start
  useEffect(() => {
    if (status === 'idle') {
      console.log('[LLM] Checking for incomplete downloads to resume...');
      resumeIncompleteDownloads().catch(e => {
        console.warn('[LLM] Auto-resume check failed:', e);
      });
    }
  }, [status]);

  const selectModel = (model: ModelInfo) => {
    setActiveModel(model);
    setStatus('idle');
    setDownloadedMB(0);
    saveModelActiveState(false, model.id);
  };

  // Robust download with reliable resume using file size as checkpoint
  const getDownloadedBytes = async (filePath: string): Promise<number> => {
    try {
      const info = await FileSystem.getInfoAsync(filePath);
      if (info.exists) {
        return (info as any).size;
      }
    } catch (e) {
      console.warn('[LLM] Error getting downloaded bytes:', e);
    }
    return 0;
  };

  const downloadFileResumable = async (
    url: string,
    filePath: string,
    model: ModelDefinition,
    isMmproj = false
  ) => {
    const filename = isMmproj ? model.mmprojFileName! : model.fileName;
    const resumeStatePath = getResumeStatePath(filename);

    // Get existing downloaded bytes for reliable resume
    const existingBytes = await getDownloadedBytes(filePath);
    let resumeData: string | undefined;

    if (existingBytes > 0) {
      // Use file size as resume point — more reliable than expo's resumeData blob
      resumeData = String(existingBytes);
      console.log(`[LLM] Resuming download from ${existingBytes} bytes for ${filename}`);

      // ── FIX: Pre-seed progress from existing bytes so the UI never flashes 0% ──
      // Without this, the bar shows 0% until the first progress callback fires,
      // causing the visible flicker between the old percentage and 0%.
      const targetSizeMB = isMmproj ? (model.mmprojSizeMB || 0) : model.sizeMB;
      const globalTotalBytes = targetSizeMB * 1024 * 1024;
      if (globalTotalBytes > 0) {
        const initialPct = Math.min(99, Math.round((existingBytes / globalTotalBytes) * 100));
        setDownloadPercent(initialPct);
        setDownloadedMB(Math.round(existingBytes / (1024 * 1024) * 10) / 10);
        console.log(`[LLM] Pre-seeded UI progress to ${initialPct}% from existing ${existingBytes} bytes`);
      }
    }

    // Track bytes/time for speed calculation
    let lastBytes = existingBytes;
    let lastTime = Date.now();

    const task = FileSystem.createDownloadResumable(
      url,
      filePath,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)' } },
      (progress) => {
        const { totalBytesWritten } = progress;
        const targetSizeMB = isMmproj ? (model.mmprojSizeMB || 0) : model.sizeMB;
        const globalTotalBytes = targetSizeMB * 1024 * 1024;

        if (globalTotalBytes > 0) {
          const pct = Math.min(100, Math.round((totalBytesWritten / globalTotalBytes) * 100));
          setDownloadPercent(pct);
        }
        setDownloadedMB(Math.round(totalBytesWritten / (1024 * 1024) * 10) / 10);

        // Calculate speed manually
        const now = Date.now();
        const diffMs = now - lastTime;
        if (diffMs > 1000) {
          const bytesDiff = totalBytesWritten - lastBytes;
          if (bytesDiff > 0) {
            const speedMBps = (bytesDiff / (1024 * 1024)) / (diffMs / 1000);
            setDownloadSpeed(Math.round(speedMBps * 10) / 10);
          }
          lastBytes = totalBytesWritten;
          lastTime = now;
        }
      },
      resumeData
    );

    try {
      downloadResumableRef.current = task;
      await task.downloadAsync();
      downloadResumableRef.current = null;
      await clearResumeState(filename);
    } catch (e: any) {
      downloadResumableRef.current = null;

      // Always save resume state on error - use file size as reliable checkpoint
      if (Platform.OS === 'android') {
        try {
          const fileInfo = await FileSystem.getInfoAsync(filePath);
          if (fileInfo.exists && (fileInfo as any).size > 0) {
            // Save both the expo resumeData AND the file size for double reliability
            const manualState = {
              url,
              fileUri: `file://${filePath}`,
              options: { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)' } },
              resumeData: String((fileInfo as any).size),
              downloadedBytes: (fileInfo as any).size,
              timestamp: Date.now()
            };
            await FileSystem.writeAsStringAsync(resumeStatePath, JSON.stringify(manualState));
            console.log(`[LLM] Saved resume state for ${filename} at ${(fileInfo as any).size} bytes`);
          }
        } catch (writeErr) {
          console.warn('[LLM] Failed to save resume state:', writeErr);
        }
      }
      throw e;
    }
  };

  const fetchContentLength = async (url: string): Promise<number | null> => {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)' }
      });
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
    } catch (e) {
      console.log(`[LLM] Failed to fetch Content-Length for ${url}:`, e);
    }
    return null;
  };

  const downloadModel = async (model: ModelDefinition) => {
    try {
      isDownloadingRef.current = true; // Set synchronously BEFORE any await
      setDownloadingModel(model);
      setDownloadingType('model');
      setIsDownloading(true);
      setStatus(curr => curr !== 'ready' ? 'downloading' : curr);

      const baseDir = FileSystem.documentDirectory?.replace(/\/+$/, '') + '/llm_models';
      const dirInfo = await FileSystem.getInfoAsync(baseDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
      }

      // Query real sizes from Hugging Face before starting
      let realSizeMB = model.sizeMB;

      console.log(`[LLM] Querying Hugging Face HEAD for real file size of ${model.id}...`);
      try {
        const mainLength = await fetchContentLength(model.url);
        if (mainLength) {
          realSizeMB = Math.round((mainLength / (1024 * 1024)) * 10) / 10;
          console.log(`[LLM] Dynamically resolved main model size: ${realSizeMB} MB`);
        }
      } catch (err) {
        console.warn('[LLM] Error resolving main model size:', err);
      }

      const resolvedModel = {
        ...model,
        sizeMB: realSizeMB
      };

      // Download primary model file
      await downloadFileResumable(resolvedModel.url, `${baseDir}/${resolvedModel.fileName}`, resolvedModel);

      // Save fingerprint for integrity verification
      const finalModelSize = (await getModelLocalSize(resolvedModel)) || 0;
      await saveModelFingerprint(resolvedModel, finalModelSize, new Date().toISOString());

      isDownloadingRef.current = false;
      setIsDownloading(false);
      setDownloadingModel(null);
      setDownloadingType(null);
      setStatus(curr => curr === 'downloading' ? 'idle' : curr);
    } catch (e: any) {
      // If error is related to network, we can resume it later. Do not clean up partial files.
      // If it's a fatal error like disk space, clean it up.
      const isFatalError = e?.message?.toLowerCase().includes('disk') || e?.message?.toLowerCase().includes('space') || e?.message?.toLowerCase().includes('no space left on device');

      if (isFatalError) {
        try {
          const baseDir = FileSystem.documentDirectory?.replace(/\/+$/, '') + '/llm_models';
          const modelPath = `${baseDir}/${model.fileName}`;
          const modelInfo = await FileSystem.getInfoAsync(modelPath);
          if (modelInfo.exists) {
            await FileSystem.deleteAsync(modelPath, { idempotent: true });
          }
          await clearResumeState(model.fileName);
        } catch (cleanupError) {
          console.error('[LLM] Error cleaning up partial download:', cleanupError);
        }
      } else {
        console.log('[LLM] Network or other resumable error occurred during download:', e.message);
      }

      isDownloadingRef.current = false;
      setIsDownloading(false);
      setDownloadingModel(null);
      setDownloadingType(null);
      setStatus(curr => curr === 'downloading' ? 'idle' : curr);
      throw e;
    }
  };

  const checkVisionModelExists = async (model: ModelDefinition): Promise<boolean> => {
    if (!model.mmprojFileName || !model.mmprojUrl) return true; // No vision required
    try {
      const localDir = `${FileSystem.documentDirectory?.replace(/\/+$/, '')}/llm_models`;
      const localPath = `${localDir}/${model.mmprojFileName}`;
      
      const pathsToCheck = [localPath];
      if (Platform.OS === 'android') {
        pathsToCheck.push(
          `file:///data/user/0/com.christeck.worldtrans/files/llm_models/${model.mmprojFileName}`,
          `file:///data/user/0/com.christeck.aiworldtrans/files/llm_models/${model.mmprojFileName}`,
          `file:///data/user/0/com.christeck.aidiary/files/llm_models/${model.mmprojFileName}`
        );
      }

      for (const path of pathsToCheck) {
        try {
          const mmprojInfo = await FileSystem.getInfoAsync(path);
          if (mmprojInfo.exists && (mmprojInfo as any).size > 0) {
            // Verify remote size to see if it is complete
            const remoteMmprojSize = await getModelRemoteSize({ ...model, fileName: model.mmprojFileName, url: model.mmprojUrl } as ModelDefinition);
            if (remoteMmprojSize && (mmprojInfo as any).size >= remoteMmprojSize * 0.99) {
              return true;
            }
          }
        } catch (err) {}
      }
      return false;
    } catch (err) {
      console.warn('[LLM] Error checking vision model exists:', err);
      return false;
    }
  };

  const downloadVisionModel = async (model: ModelDefinition) => {
    if (!model.mmprojUrl || !model.mmprojFileName) return;
    try {
      isDownloadingRef.current = true;
      setDownloadingModel(model);
      setDownloadingType('vision');
      setIsDownloading(true);
      setStatus(curr => curr !== 'ready' ? 'downloading' : curr);

      const baseDir = FileSystem.documentDirectory?.replace(/\/+$/, '') + '/llm_models';
      const dirInfo = await FileSystem.getInfoAsync(baseDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
      }

      let realMmprojSizeMB = model.mmprojSizeMB || 0;
      try {
        const mmprojLength = await fetchContentLength(model.mmprojUrl);
        if (mmprojLength) {
          realMmprojSizeMB = Math.round((mmprojLength / (1024 * 1024)) * 10) / 10;
          console.log(`[LLM] Dynamically resolved mmproj size: ${realMmprojSizeMB} MB`);
        }
      } catch (err) {
        console.warn('[LLM] Error resolving mmproj size:', err);
      }

      const resolvedModel = {
        ...model,
        mmprojSizeMB: realMmprojSizeMB
      };

      // Download mmproj
      await downloadFileResumable(resolvedModel.mmprojUrl!, `${baseDir}/${resolvedModel.mmprojFileName!}`, resolvedModel, true);

      isDownloadingRef.current = false;
      setIsDownloading(false);
      setDownloadingModel(null);
      setDownloadingType(null);
      setStatus(curr => curr === 'downloading' ? 'idle' : curr);
    } catch (e: any) {
      const isFatalError = e?.message?.toLowerCase().includes('disk') || e?.message?.toLowerCase().includes('space') || e?.message?.toLowerCase().includes('no space left on device');
      if (isFatalError) {
        try {
          const baseDir = FileSystem.documentDirectory?.replace(/\/+$/, '') + '/llm_models';
          const mmprojPath = `${baseDir}/${model.mmprojFileName}`;
          const mmprojInfo = await FileSystem.getInfoAsync(mmprojPath);
          if (mmprojInfo.exists) {
            await FileSystem.deleteAsync(mmprojPath, { idempotent: true });
          }
          await clearResumeState(model.mmprojFileName);
        } catch (cleanupError) {
          console.error('[LLM] Error cleaning up partial mmproj download:', cleanupError);
        }
      } else {
        console.warn('[LLM] Network or other resumable error occurred during mmproj download:', e.message);
      }

      isDownloadingRef.current = false;
      setIsDownloading(false);
      setDownloadingModel(null);
      setDownloadingType(null);
      setStatus(curr => curr === 'downloading' ? 'idle' : curr);
      throw e;
    }
  };

  const pauseDownload = async () => {
    if (!downloadResumableRef.current || !downloadingModel) return;
    try {
      const state = await downloadResumableRef.current.pauseAsync();
      const filename = state.url === downloadingModel.url ? downloadingModel.fileName : (downloadingModel.mmprojFileName || downloadingModel.fileName);
      const resumeStatePath = getResumeStatePath(filename);
      await FileSystem.writeAsStringAsync(resumeStatePath, JSON.stringify(state));
      isDownloadingRef.current = false;
      setIsDownloading(false);
      setStatus(curr => curr === 'downloading' ? 'idle' : curr);
    } catch (e) {
      console.error('[LLM] Error pausing download:', e);
    }
  };

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        cpuSemaphore.pause('background');
        if (downloadResumableRef.current && isDownloading) {
          console.log('[LLM] App state changed to', nextAppState, '- automatically pausing download.');
          await pauseDownload();
        }
      } else if (nextAppState === 'active') {
        cpuSemaphore.resume('background');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [isDownloading, downloadingModel]);


  const loadModel = async (
    modelOrOptions?: ModelDefinition | { n_threads?: number },
    options?: { n_threads?: number }
  ) => {
    if (isModelLoading) {
      console.log('[LLM] 🛡️ Model is already loading. Bypassing parallel load.');
      return;
    }
    isModelLoading = true;
    try {
      setStatus('loading');
      let modelToLoad: ModelInfo = activeModel;
      let loadOptions = options;
      if (modelOrOptions) {
        if ('id' in modelOrOptions && 'fileName' in modelOrOptions) {
          modelToLoad = AVAILABLE_MODELS.find(m => m.id === modelOrOptions.id) || (modelOrOptions as ModelInfo);
        } else {
          loadOptions = modelOrOptions as { n_threads?: number };
        }
      }

      const resolvedModelPath = await resolveModelPath(modelToLoad);
      const modelPath = resolvedModelPath.replace(/^file:\/\//, '');
      const modelUri = `file://${modelPath}`;
      
      const resolvedMmprojPath = modelToLoad.mmprojFileName ? await resolveModelPath({ fileName: modelToLoad.mmprojFileName }) : undefined;
      const mmprojPath = resolvedMmprojPath ? resolvedMmprojPath.replace(/^file:\/\//, '') : undefined;

      // RAM Guard Validation
      const guard = await canLoadModel(modelToLoad.id, !!modelToLoad.mmprojFileName, lang === 'es');
      if (!guard.allowed) {
        setStatus('idle');
        isModelLoading = false;
        throw new Error(guard.message);
      }

      generationId++; // Invalida todas las completions pendientes
      if (llamaContextRef.current) {
        try {
          console.log('[LLM] Stopping active completion before releasing model...');
          await llamaContextRef.current.stopCompletion();
        } catch (e) {
          console.warn('[LLM] Error stopping completion during loadModel:', e);
        }
      }
      await releaseAllLlama();
      llamaContextRef.current = null; // 🛡️ Prevent stale context calls during load
      clearCompletionQueue();
      const hw = await getHardwareConfig();
      const temp = await getDeviceTemperature();
      const totalRam = await getTotalRAM();
      const freeRam = await getFreeRAM();

      // Load settings, handle gpuTurbo and execute crash recovery
      let useTurbo = false;
      let maxGpuLayers = 99;
      try {
        const settings = await settingsService.get();
        if (settings.gpuTurbo ?? settings.experimentalTurbo) useTurbo = true;
        
        maxGpuLayers = settings.maxGpuLayers ?? 99;
        
        if (settings.isModelBooting === true) {
          console.warn('[LLM] 💥 Crash detected on previous model boot! Reducing maxGpuLayers as safety backup.');
          maxGpuLayers = Math.max(0, maxGpuLayers - 10);
          await settingsService.set({
            maxGpuLayers,
            isModelBooting: false // Reset flag to allow normal booting on current attempt
          });
        }
      } catch (e) { console.log('[LLM] Error reading settings for bootstrap:', e); }

      // Mark that model boot sequence is in progress
      try {
        await settingsService.set({ isModelBooting: true });
      } catch (e) { console.warn('[LLM] Failed to write booting state:', e); }

      const dynamicConfig = getDynamicEngineConfig(
        temp,
        hw.threads,
        hw.isEmulator,
        useTurbo,
        Platform.OS === 'ios',
        hw.architecture,
        totalRam,
        freeRam,
        maxGpuLayers
      );
      let dyn_threads = loadOptions?.n_threads ?? dynamicConfig.threads;
      
      // Bloqueo de Núcleos estricto: Dejar siempre núcleos libres para la UI y Audio
      let maxAllowedThreads = hw.threads > 4 ? Math.max(4, hw.threads - 2) : Math.max(1, hw.threads - 1);
      if (modelToLoad.id.includes('gemma') && maxAllowedThreads < 2 && hw.threads >= 2) {
         console.log(`[LLM] Forzando mínimo de 2 hilos para el modelo Gemma para evitar lentitud extrema.`);
         maxAllowedThreads = 2; // Forzar mínimo 2 hilos para Gemma (precaución: podría pausar el TTS)
      }
      if (dyn_threads > maxAllowedThreads) {
         console.log(`[LLM] Limitando hilos de inferencia de ${dyn_threads} a ${maxAllowedThreads} para proteger UI/Audio.`);
         dyn_threads = maxAllowedThreads;
      }

      let dyn_gpu_layers = dynamicConfig.gpu_layers;

      let dyn_ctx = 4096;
      let dyn_batch = 512;
      let dyn_ubatch = 512;

      const tier = getCurrentTier();
      const tierConfigs: Record<MemoryTier, { batch: number, ubatch: number, ctx: number }> = {
        [MemoryTier.TITAN]: { batch: 2048, ubatch: 512, ctx: 32768 },
        [MemoryTier.ELITE]: { batch: 2048, ubatch: 512, ctx: 24576 },
        [MemoryTier.AVANZADO]: { batch: 2048, ubatch: 512, ctx: 16384 },
        [MemoryTier.ESTANDAR_PRO]: { batch: 2048, ubatch: 512, ctx: 8192 },
        [MemoryTier.ESTANDAR]: { batch: 1024, ubatch: 256, ctx: 4096 },
        [MemoryTier.ENTRADA]: { batch: 1024, ubatch: 256, ctx: 3072 },
      };
      const config = tierConfigs[tier];
      dyn_batch = config.batch;
      dyn_ubatch = config.ubatch;
      dyn_ctx = config.ctx;

      // Cap de contexto en emuladores: Evitar los 16k/32k que disparan el TTFT a 142s
      if (hw.isEmulator) {
        const MAX_CTX_EMULATOR = 4096;
        if (dyn_ctx > MAX_CTX_EMULATOR) {
          console.log(`[LLM] Emulator detected: capping context from ${dyn_ctx} to ${MAX_CTX_EMULATOR} tokens.`);
          dyn_ctx = MAX_CTX_EMULATOR;
        }
      }

      const cacheType = totalRam < 12000 ? 'q4_0' : 'q8_0';

      console.log(`[LLM] Loading model from ${modelUri} with ${dyn_threads} threads, ${dyn_gpu_layers} GPU layers, context ${dyn_ctx}`);

      // Mmap dynamic fallback: Si el dispositivo tiene menos de 4GB RAM, evitamos mmap
      // para prevenir que el OS mate la app por exceder la memoria virtual (VMA).
      // Si tiene más de 4GB, usamos mmap para acelerar radicalmente la carga de modelos GGUF.
      const dyn_use_mmap = totalRam > 4000;

      const context = await initLlama({
        model: modelUri,
        use_mlock: Platform.OS === 'ios', // 🛡️ Avoid ulimit -l trap on Android 14+
        use_mmap: dyn_use_mmap, // 🚀 Carga rápida en alta gama, estable en gama de entrada
        n_ctx: dyn_ctx,
        n_batch: dyn_batch,
        n_ubatch: dyn_ubatch, // 🌡️ Thermally controlled Chunked Prefill (decoupled from n_batch)
        n_threads: dyn_threads,
        n_gpu_layers: dyn_gpu_layers,
        cache_type_k: cacheType,
        cache_type_v: cacheType,
        flash_attn_type: 'on', // 🚀 Flash Attention to accelerate and cool decoding
      });

      (context as any)._originalCompletion = context.completion;
      context.completion = (params: any, callback: any) => wrappedCompletion(context, params, callback);

      // Omitir la carga del proyector multimodal (940MB) en dispositivos/emuladores con <6GB RAM
      // para evitar que el sistema entre en swapping de memoria y ralentice la inferencia de texto 100x.
      const minRamForVision = modelToLoad.id.includes('gemma4') ? 6000 : 4000;
      if (mmprojPath && totalRam >= minRamForVision) {
        const mmprojUri = `file://${mmprojPath}`;
        const mmprojInfo = await FileSystem.getInfoAsync(mmprojUri);
        if (mmprojInfo.exists) {
          const useGpuForVision = dyn_gpu_layers > 0;
          // Optimize visual token budget for mobile CPU/GPU
          const imageMaxTokens = totalRam >= 8000 ? 1024 : 896;
          console.log(`[LLM] 📸 Initializing multimodal projector from: ${mmprojPath} (use_gpu: ${useGpuForVision}, image_max_tokens: ${imageMaxTokens})`);
          await context.initMultimodal({
            path: mmprojPath,
            use_gpu: useGpuForVision,
            image_max_tokens: imageMaxTokens
          });
        } else {
          console.log(`[LLM] 📸 Multimodal projector file not found at: ${mmprojPath}`);
        }
      }

      llamaContextRef.current = context;
      activeContext = context;
      setCurrentContextSize(dyn_ctx);
      if (modelToLoad.id !== activeModel.id) {
        setActiveModel(modelToLoad);
      }
      setStatus('ready');
      console.log('[LLM] Model loaded successfully!');
      try {
        await settingsService.set({ isModelBooting: false });
      } catch (err) {}
      await saveModelActiveState(true, modelToLoad.id);

      if (Platform.OS === 'android') {
        try {
          const { NativeModules } = require('react-native');
          const { LlmProtectionModule } = NativeModules;
          if (LlmProtectionModule) {
            await LlmProtectionModule.startForegroundService();
            console.log('[LLM] Android Foreground Service started/updated');
          }
        } catch (e) {
          console.warn('[LLM] Failed to start/update Android Foreground Service:', e);
        }
      }
    } catch (e: any) {
      console.error('[LLM] Error loading model:', e);
      setStatus('idle');
      try {
        await settingsService.set({ isModelBooting: false });
      } catch (err) {}
      await saveModelActiveState(false);
      throw e;
    } finally {
      isModelLoading = false;
    }
  };


  const prefillContextLlm = async (
    prompt: string | null,
    messages?: any[]
  ) => {
    if (!llamaContextRef.current) return;
    try {
      const completionOptions: any = {
        n_predict: 0,
        cache_prompt: true,
        slot_id: 0,
        prompt: messages ? undefined : prompt,
        messages: messages ? messages : undefined,
      };

      // Execute silently, no awaiting to prevent blocking
      llamaContextRef.current.completion(completionOptions, () => { }).catch((e: any) => {
        console.warn("[LLM] Prefill silent error:", e);
      });
    } catch (e) {
      console.warn("[LLM] Error in prefillContextLlm:", e);
    }
  };

  const generateStreamingResponse = async (
    prompt: string | null,
    onTokenReceived: (text: string) => void,
    onError: (error: string) => void,
    imagePath?: string | string[],
    multimodalMessages?: any[],
    binaryBuffer?: Uint8Array,
    consciousnessLevel: number = 2,
    forceHighTemperature: boolean = false,
    forceDeterminism: boolean = false,
    isVoiceMode: boolean = false
  ) => {
    try {
      if (!llamaContextRef.current) {
        throw new Error(lang === 'es' ? 'El modelo no está cargado o listo' : 'Model is not loaded or ready');
      }
      const hasAttachment = (multimodalMessages && multimodalMessages.length > 0) || !!imagePath || !!binaryBuffer;

      let adjustedPrompt = prompt;
      let adjustedMessages = multimodalMessages ? [...multimodalMessages] : null;

      const isLlama = activeModel?.id.includes('llama');
      const isGemma3 = activeModel?.id.includes('gemma3');
      const modelConfig = isLlama 
        ? MODEL_CONFIG.llama3_2 
        : (isGemma3 ? MODEL_CONFIG.gemma3 : MODEL_CONFIG.gemma4);

      // 🛡️ Safeproof Switch: Dynamic temperature limits to prevent hallucination
      // and behavioral drift. LLMs in long sessions hallucinate at high temps.
      let targetTemp = modelConfig.temperature;
      let targetMinP = modelConfig.min_p || 0.05;
      let targetRepeatPenalty = modelConfig.repeat_penalty;
      let targetTopP = forceDeterminism ? 0.90 : modelConfig.top_p;

      if (isLlama || isGemma3) {
        // 1B Models dynamic parameters (optimal baseline configs)
        targetTemp = forceDeterminism ? 0.15 : (forceHighTemperature ? 0.85 : (
          consciousnessLevel === 1 ? 0.20
            : consciousnessLevel === 2 ? modelConfig.temperature
              : consciousnessLevel === 3 ? 0.55
                : 0.70
        ));
        targetMinP = forceDeterminism ? 0.05 : (
          consciousnessLevel === 1 ? 0.05
            : consciousnessLevel === 2 ? 0.05
              : consciousnessLevel === 3 ? 0.08
                : 0.10
        );
        targetTopP = forceDeterminism ? 0.90 : modelConfig.top_p;
        targetRepeatPenalty = modelConfig.repeat_penalty;
      } else {
        // Gemma 4 E2B QAT dynamic sampling
        targetTemp = forceDeterminism ? 0.15 : (forceHighTemperature ? 0.85 : (
          consciousnessLevel === 1 ? 0.20
            : consciousnessLevel === 2 ? modelConfig.temperature
              : consciousnessLevel === 3 ? 0.70
                : 0.85
        ));
        targetMinP = forceDeterminism ? 0.05 : (
          consciousnessLevel === 1 ? 0.05
            : consciousnessLevel === 2 ? 0.05
              : consciousnessLevel === 3 ? 0.08
                : 0.10
        );
        targetTopP = 0.85;
        targetRepeatPenalty = 1.05;
      }

      // Map consciousnessLevel directly to directives (1=Zen, 2=Balance, 3=Deep, 4=Philosophic)
      const directives: Record<number, string> = {
        1: lang === 'es' 
             ? "\n[[RULE: Sin preámbulos. Responde en una sola oración. No inventes datos. Si no sabes algo, di 'No lo sé'. No tienes acceso a internet.]]" 
             : "\n[[RULE: No preamble. Respond in one sentence. Do not hallucinate facts. If you do not know, say 'I don't know'. You have no internet access.]]",
        2: (isLlama || isGemma3) ? "" : (lang === 'es' ? "\n[[RULE: Mantén tu Proceso de Pensamiento breve (máximo 2 párrafos).]]" : "\n[[RULE: Keep your Thinking Process brief (maximum 2 paragraphs).]]"),
        3: (isLlama || isGemma3) ? "" : (lang === 'es' ? "\n[[RULE: Mantén tu Proceso de Pensamiento conciso (máximo 4 párrafos).]]" : "\n[[RULE: Keep your Thinking Process concise (maximum 4 paragraphs).]]"),
        4: ""
      };

      // Only apply directives to multimodal message structure if present (they have reasoning blocks)
      const directive = (isLlama || isGemma3) ? "" : (directives[consciousnessLevel] || "");
      if (directive && adjustedMessages && adjustedMessages.length > 0) {
        const lastIdx = adjustedMessages.length - 1;
        const lastMsg = { ...adjustedMessages[lastIdx] };

        if (Array.isArray(lastMsg.content) && lastMsg.content.length > 0) {
          const firstContent = lastMsg.content[0];
          if (firstContent && typeof firstContent === 'object' && 'text' in firstContent) {
            lastMsg.content = [{ ...firstContent, text: firstContent.text + directive }];
          }
        }
        adjustedMessages[lastIdx] = lastMsg;
      }

      tokenCounterRef.current = 0;
      startTimeRef.current = Date.now();
      let fullResponse = "";
      const currentGenId = generationId;

      console.log(`[LLM] Generating response with model: ${activeModel.id}, temp: ${targetTemp}, min_p: ${targetMinP}, penalty: ${targetRepeatPenalty}, top_p: ${targetTopP}`);

      // ⚡ Opt. 3: Dynamic n_predict by consciousness level.
      // Zen=256 (safety cap), Balance=512, Deep/Philosophic=1024.
      // n_predict doesn't speed up per-token generation, but acts as a
      // hard ceiling that prevents thought-tag overflow from bloating the output.
      const nPredictByLevel: Record<number, number> = {
        1: 256,   // Zen: single sentence, fast cap
        2: 512,   // Balance
        3: 1024,  // Deep
        4: 1024,  // Philosophic
      };
      let dynamicNPredict = nPredictByLevel[consciousnessLevel] ?? 512;

      // Tarea 2: Dynamic n_predict calculation based on remaining tokens in context to prevent overflow crash
      try {
        if (adjustedPrompt && llamaContextRef.current && typeof llamaContextRef.current.tokenize === 'function') {
          const tokenResult = await llamaContextRef.current.tokenize(adjustedPrompt);
          const promptTokensCount = Array.isArray(tokenResult) ? tokenResult.length : (tokenResult?.tokens?.length || Math.ceil(adjustedPrompt.length / 3.0));
          const availableTokens = currentContextSize - promptTokensCount - 32;
          if (availableTokens > 0) {
            dynamicNPredict = Math.min(dynamicNPredict, availableTokens);
          } else {
            dynamicNPredict = 16; // Safety floor
          }
          console.log(`[LLM] Dynamic n_predict calculated: ${dynamicNPredict} (Available: ${availableTokens}, Prompt tokens: ${promptTokensCount}, Context: ${currentContextSize})`);
        }
      } catch (err) {
        console.warn('[LLM] Error calculating dynamic n_predict, falling back to heuristic:', err);
        const estimatedTokens = Math.ceil((adjustedPrompt || "").length / 3.0);
        const availableTokens = currentContextSize - estimatedTokens - 32;
        if (availableTokens > 0) {
          dynamicNPredict = Math.min(dynamicNPredict, availableTokens);
        }
      }

      let systemTokens = 0;
      if (adjustedMessages && adjustedMessages.length > 0 && adjustedMessages[0].role === 'system') {
        const sysContent = adjustedMessages[0].content;
        const text = typeof sysContent === 'string' ? sysContent : sysContent[0]?.text || '';
        try {
          if (llamaContextRef.current && typeof llamaContextRef.current.tokenize === 'function') {
            const tokenResult = await llamaContextRef.current.tokenize(text);
            systemTokens = Array.isArray(tokenResult) ? tokenResult.length : (tokenResult?.tokens?.length || Math.ceil(text.length / 2.8));
          } else {
            systemTokens = Math.ceil(text.length / 2.8);
          }
        } catch (err) {
          systemTokens = Math.ceil(text.length / 2.8); // 🛡️ Fallback ratio preciso para español/multilingüe (~2.8 chars/token)
        }
      } else if (adjustedPrompt) {
        systemTokens = 256; 
      }

      const completionOptions: any = {
        n_predict: dynamicNPredict,
        n_keep: systemTokens, // 🛡️ Anti-Drift: Anchor System Prompt
        temperature: targetTemp,
        top_p: targetTopP,
        min_p: targetMinP,
        repeat_penalty: targetRepeatPenalty,
        repeat_last_n: 128,
        stop: isLlama
          ? ["<|eot_id|>", "<|eom_id|>", "<|begin_of_text|>"]
          : ["<eos>", "<end_of_turn>", "<|turn|>", "<turn|>"],
        cache_prompt: true,
        slot_id: 0,
        prompt: adjustedMessages ? undefined : adjustedPrompt,
        messages: adjustedMessages ? adjustedMessages : undefined,
      };


      if (imagePath && llamaContextRef.current) {
        let isMultimodal = false;
        try {
          if (typeof llamaContextRef.current.isMultimodalEnabled === 'function') {
            isMultimodal = await llamaContextRef.current.isMultimodalEnabled();
          }
        } catch (e) {
          console.warn('[LLM] Error checking if multimodal is enabled:', e);
        }

        if (isMultimodal) {
          const paths = Array.isArray(imagePath) ? imagePath : [imagePath];
          completionOptions.media_paths = paths.map(p => {
            let cleanPath = p;
            if (cleanPath.startsWith('file://')) {
              cleanPath = cleanPath.slice(7);
            }
            return cleanPath;
          });
        } else {
          console.warn('[LLM] 📸 Image path was provided, but multimodal projector is not initialized. Skipping image parameter to prevent crash.');
        }
      }

      let tokenBuffer = "";
      let lastDispatchTime = Date.now();
      const BATCH_INTERVAL_MS = 40; // ~25 FPS UI updates

      console.log(`[LLM-DEBUG] Model ID: ${activeModel?.id}`);
      console.log(`[LLM-DEBUG] isLlama: ${isLlama}`);
      console.log(`[LLM-DEBUG] Stop tokens: ${JSON.stringify(completionOptions.stop)}`);
      console.log(`[LLM-DEBUG] Prompt being sent to llama.cpp:\n<<PROMPT_START>>\n${adjustedPrompt}\n<<PROMPT_END>>`);

      const result = await llamaContextRef.current.completion(completionOptions, (data: any) => {
        if (generationId !== currentGenId) return; // Contexto invalidado, descartar token
        
        if (cpuSemaphore.paused) {
          // Si el semáforo está pausado (ej. background), abortamos la generación de inmediato
          if (llamaContextRef.current) {
            llamaContextRef.current.stopCompletion().catch(() => {});
          }
          return;
        }

        if (tokenCounterRef.current === 0) console.log(`[Sanctuary] TTFT: ${Date.now() - startTimeRef.current}ms`);
        tokenCounterRef.current++;
        fullResponse += data.token;
        tokenBuffer += data.token;
        
        const now = Date.now();
        // Dispatch if 40ms elapsed, OR if we received a stop token/newline that makes sense to flush immediately
        if (now - lastDispatchTime >= BATCH_INTERVAL_MS || data.token.includes('\n')) {
          onTokenReceived(tokenBuffer);
          tokenBuffer = "";
          lastDispatchTime = now;
        }
      });

      // Ensure remaining buffer is sent
      if (tokenBuffer.length > 0) {
        onTokenReceived(tokenBuffer);
      }

      if (result && result.tokens_cached) {
        setTokensUsed(result.tokens_cached);
      }

      console.log(`[LLM-DEBUG] Final fullResponse from completion:\n<<RESPONSE_START>>\n${fullResponse}\n<<RESPONSE_END>>`);
      return fullResponse;
    } catch (e: any) {
      onError(`[NATIVE ERROR] Sanctuary Reasoning Loop failed: ${e?.message || e}`);
      return "";
    }
  };

  const abortGeneration = async () => {
    try {
      generationId++; // Invalida cualquier callback de completion pendiente de inmediato
      if (llamaContextRef.current) await llamaContextRef.current.stopCompletion();
    } catch (e) { console.error("[LLM] Error aborting:", e); }
  };

  const resetToHome = async () => {
    try {
      if (llamaContextRef.current) {
        try { await llamaContextRef.current.stopCompletion(); } catch (e) {}
      }
      generationId++; // Invalida cualquier callback pendiente
      await releaseAllLlama();
      llamaContextRef.current = null;
      clearCompletionQueue();
    } catch (e) { }
    setStatus('idle');
    await saveModelActiveState(false);
  };

  const cancelDownload = async () => {
    if (downloadResumableRef.current) {
      try {
        await downloadResumableRef.current.cancelAsync();
      } catch (e) { console.error('[LLM] Error canceling download:', e); }
    }

    // We intentionally don't delete the partial file here so it can be resumed later.
    isDownloadingRef.current = false;
    setIsDownloading(false);
    setStatus(curr => curr === 'downloading' ? 'idle' : curr);
  };

  // Resume incomplete downloads on app start
  const resumeIncompleteDownloads = async () => {
    // Use the ref (not React state) to avoid the race condition where a manual
    // download has already called downloadModel() but isDownloading is still
    // false in this stale closure.
    if (isDownloadingRef.current) return;

    // 🛡️ Fast connectivity pre-check: avoid blocking the JS thread with
    // network HEAD requests if offline or in an emulator without internet.
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      await fetch('https://huggingface.co', { method: 'HEAD', signal: controller.signal });
      clearTimeout(timeoutId);
    } catch {
      console.log('[LLM] resumeIncompleteDownloads: No connectivity. Skipping resume check.');
      return;
    }

    const baseDir = FileSystem.documentDirectory?.replace(/\/+$/, '') + '/llm_models';
    const dirInfo = await FileSystem.getInfoAsync(baseDir);
    if (!dirInfo.exists) return;

    for (const model of AVAILABLE_MODELS) {
      // Check main model
      const modelPath = `${baseDir}/${model.fileName}`;
      const modelInfo = await FileSystem.getInfoAsync(modelPath);

      if (modelInfo.exists && (modelInfo as any).size > 0) {
        const remoteSize = await getModelRemoteSize(model);
        if (remoteSize && (modelInfo as any).size < remoteSize * 0.99) {
          console.log(`[LLM] Found incomplete download for ${model.id}, resuming...`);
          try {
            await downloadModel(model);
            return; // Resume one at a time
          } catch (e) {
            console.log(`[LLM] Failed to resume ${model.id}:`, e);
          }
        }
      }

      // Check mmproj
      if (model.mmprojFileName) {
        const mmprojPath = `${baseDir}/${model.mmprojFileName}`;
        const mmprojInfo = await FileSystem.getInfoAsync(mmprojPath);

        if (mmprojInfo.exists && (mmprojInfo as any).size > 0) {
          const remoteMmprojSize = await getModelRemoteSize({ ...model, fileName: model.mmprojFileName, url: model.mmprojUrl! } as ModelDefinition);
          if (remoteMmprojSize && (mmprojInfo as any).size < remoteMmprojSize * 0.99) {
            console.log(`[LLM] Found incomplete mmproj download for ${model.id}, resuming...`);
            try {
              await downloadVisionModel(model);
              return;
            } catch (e) {
              console.log(`[LLM] Failed to resume mmproj ${model.id}:`, e);
            }
          }
        }
      }
    }
  };

  const deleteModel = async (modelId: string) => {
    if (activeModel?.id === modelId) {
      console.log('[LLM] Deleting active model, resetting to home first.');
      await resetToHome();
    }
    
    const modelDef = AVAILABLE_MODELS.find(m => m.id === modelId);
    if (modelDef) {
      const baseDirRaw = FileSystem.documentDirectory?.replace(/\/+$/, '') || '';
      const baseDir = baseDirRaw + '/llm_models';
      const filesToDelete = [
         modelDef.fileName,
         modelDef.mmprojFileName,
         modelDef.fileName ? `download_resume_${modelDef.fileName}.json` : undefined,
         modelDef.mmprojFileName ? `download_resume_${modelDef.mmprojFileName}.json` : undefined
      ];
      
      for (const fileName of filesToDelete) {
         if (!fileName) continue;
         const path = `${baseDir}/${fileName}`;
         try {
           const info = await FileSystem.getInfoAsync(path);
           if (info.exists) {
              await FileSystem.deleteAsync(path, { idempotent: true });
              console.log(`[LLM] Deleted model file: ${fileName}`);
           }
         } catch(e) {
           console.log(`[LLM] Failed to delete ${fileName}`, e);
         }
      }
    }
    setRefreshTrigger(prev => prev + 1);
  };

  return {
    deviceRAM,
    status,
    refreshTrigger,
    isDownloading,
    downloadingModel,
    downloadingType,
    activeModel,
    selectModel,
    downloadModel,
    downloadVisionModel,
    checkVisionModelExists,
    pauseDownload,
    cancelDownload,
    loadModel,
    resetToHome,
    llamaContextRef,
    generateStreamingResponse,
    prefillContextLlm,
    abortGeneration,
    AVAILABLE_MODELS,
    downloadedMB,
    downloadSpeed,
    downloadPercent,
    currentContextSize,
    tokensUsed,
    // Model persistence functions
    getModelStatus,
    checkModelVersion,
    resumeIncompleteDownloads,
    deleteModel,

    // RAG & Embeddings
    generateEmbeddings: async (texts: string[]): Promise<number[][]> => {
      const initGlobalEmbeddings = async () => {
        if (globalEmbeddingContext) return;
        if (embeddingInitPromise) {
           await embeddingInitPromise;
           return;
        }
        embeddingInitPromise = (async () => {
          const baseDirRaw = FileSystem.documentDirectory?.replace(/\/+$/, '').replace(/^file:\/\//, '');
          const modelPath = `${baseDirRaw}/llm_models/all-MiniLM-L6-v2-ggml-model-q4_0.gguf`;
          const info = await FileSystem.getInfoAsync(`file://${modelPath}`);
          
          if (!info.exists) {
            console.log(`[LLM] 🧠 Copying local embedding model (all-MiniLM-L6-v2) from assets...`);
            const parentDir = `${baseDirRaw}/llm_models`;
            const parentInfo = await FileSystem.getInfoAsync(`file://${parentDir}`);
            if (!parentInfo.exists) {
              await FileSystem.makeDirectoryAsync(`file://${parentDir}`, { intermediates: true });
            }
            const asset = Asset.fromModule(require('../assets/all-MiniLM-L6-v2-ggml-model-q4_0.gguf'));
            await asset.downloadAsync();
            if (asset.localUri) {
              await FileSystem.copyAsync({
                from: asset.localUri,
                to: `file://${modelPath}`
              });
              console.log(`[LLM] 🧠 Embedding Model copied successfully.`);
            } else {
              throw new Error('Failed to resolve local asset path for all-MiniLM-L6-v2');
            }
          }

          console.log(`[LLM] 🧠 Initializing Singleton Embedding Context...`);
          globalEmbeddingContext = await initLlama({
            model: `file://${modelPath}`,
            embedding: true,
            n_ctx: 512,
            n_threads: 2, // Minimal threads for small model
            n_gpu_layers: 0 // Keep on CPU to avoid OpenCL conflicts with active chat model
          });
        })();
        await embeddingInitPromise;
      };

      await initGlobalEmbeddings();

      const results: number[][] = [];
      console.log(`[LLM] 🧠 Generating ${texts.length} embeddings from Singleton...`);
      for (const text of texts) {
        const { embedding } = await globalEmbeddingContext.embedding(text);
        results.push(embedding);
      }
      return results;
    }
  };
}

