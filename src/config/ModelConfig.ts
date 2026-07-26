/**
 * ModelConfig: Centralized AI Engine Parameters
 * Optimized for Gemma 4 (Sanctuary Protocol v4.0)
 */
export interface ModelDefinition {
  id: string;
  labelEs: string;
  labelEn: string;
  sizeMB: number;
  mmprojSizeMB?: number;
  descEs: string;
  descEn: string;
  fileName: string;
  url: string;
  mmprojFileName?: string;
  mmprojUrl?: string;
}

export const MODEL_LIST: ModelDefinition[] = [
  {
    id: 'gemma3-1b-it-q4',
    labelEs: 'Anima Light',
    labelEn: 'Anima Light',
    sizeMB: 850,
    descEs: 'Núcleo Ligero — Especial para teléfonos básicos. (Sin visión / No soporta imágenes)',
    descEn: 'Light Core — Optimized for older phones. (No vision / No image support)',
    fileName: 'google_gemma-3-1b-it-Q4_K_M.gguf',
    url: 'https://huggingface.co/bartowski/google_gemma-3-1b-it-GGUF/resolve/main/google_gemma-3-1b-it-Q4_K_M.gguf',
  },
  {
    id: 'gemma4-e2b-qat',
    labelEs: 'Anima Deep',
    labelEn: 'Anima Deep',
    sizeMB: 2500,
    mmprojSizeMB: 940,
    descEs: 'Sabio Profundo — Razonamiento superior acelerado con QAT. (Con visión / Soporta imágenes)',
    descEn: 'Deep Sage — Superior reasoning accelerated with QAT. (With vision / Image support)',
    fileName: 'gemma-4-E2B-it-qat-UD-Q4_K_XL.gguf',
    url: 'https://huggingface.co/unsloth/gemma-4-E2B-it-qat-GGUF/resolve/main/gemma-4-E2B-it-qat-UD-Q4_K_XL.gguf',
    mmprojFileName: 'mmproj-google_gemma-4-E2B-it-f16.gguf',
    mmprojUrl: 'https://huggingface.co/bartowski/google_gemma-4-E2B-it-GGUF/resolve/main/mmproj-google_gemma-4-E2B-it-f16.gguf',
  },
];

export const EMBEDDING_MODEL: ModelDefinition = {
  id: 'all-MiniLM-L6-v2',
  labelEs: 'RAG Embedding Core',
  labelEn: 'RAG Embedding Core',
  sizeMB: 23,
  descEs: 'Motor de memoria profunda para leer documentos largos. (Solo backend)',
  descEn: 'Deep memory engine for reading long documents. (Backend only)',
  fileName: 'all-MiniLM-L6-v2-ggml-model-q4_0.gguf',
  url: 'https://huggingface.co/second-state/All-MiniLM-L6-v2-Embedding-GGUF/resolve/main/all-MiniLM-L6-v2-Q4_0.gguf',
};

export const MODEL_CONFIG = {
  gemma4: {
    // Context size optimized for 9-tile vision (1008px) + system prompt
    n_ctx: 4096,
    n_gpu_layers: 24, // Optimized for Snapdragon/Tensor

    // KV Cache Pruning / Context Shifting
    ctx_shift: 512,

    // Multimodal Projector settings
    mmproj: 'mmproj-google_gemma-4-E2B-it-f16.gguf',

    // Sampling parameters
    temperature: 0.3, // Equilibrado para razonamiento y fluidez
    top_p: 0.85,
    min_p: 0.05,
    repeat_penalty: 1.05,
  },

  gemma3: {
    n_ctx: 2048, 
    n_gpu_layers: 24,
    ctx_shift: 256,

    // Sampling parameters (adjusted for Gemma 3 dialect and stability)
    temperature: 0.3, 
    top_p: 0.9,
    min_p: 0.05,
    repeat_penalty: 1.05, 
  },

  llama3_2: {
    n_ctx: 2048, // Reduced context for older phones
    n_gpu_layers: 24,
    ctx_shift: 256,

    // Sampling parameters
    temperature: 0.3, // Lowered to prevent hallucinations and language drift on 1B model
    top_p: 0.9,
    min_p: 0.05,
    repeat_penalty: 1.05, // Lowered to prevent word starvation / "zen" single-word responses
  },

  // Tiling strategy for Vision
  vision: {
    tileSize: 336,
    gridSize: 3, // 3x3 grid = 1008px
    targetWidth: 1008,
  }
};

/**
 * ⚡ DYNAMIC QUANTIZATION & THERMAL THROTTLING
 * Calcula en tiempo real cuántos núcleos y capas de GPU usar
 * basado en la temperatura de la batería para evitar crashes.
 */
let lastTempCelsius = -1;
let lastTempTimestamp = 0;

export const getDynamicEngineConfig = (
  tempCelsius: number,
  hwThreads: number,
  isEmulator: boolean,
  useTurbo: boolean = false,
  isIOS: boolean = false,
  architecture: string = 'unknown',
  totalRAM: number = 8192,
  freeRAM: number = 8192,
  maxGpuLayers: number = 99
) => {
  const now = Date.now();
  let tempTrend = 0; // degrees per minute

  if (lastTempCelsius !== -1 && lastTempTimestamp !== 0) {
    const timeDeltaMs = now - lastTempTimestamp;
    // Calculate trend if more than 5 seconds have passed
    if (timeDeltaMs > 5000) {
       const timeDeltaMin = timeDeltaMs / 60000;
       tempTrend = (tempCelsius - lastTempCelsius) / timeDeltaMin;
    }
  }

  // Update thermal state
  lastTempCelsius = tempCelsius;
  lastTempTimestamp = now;

  let threads = hwThreads;
  let gpu_layers = 0; // Por defecto seguro en Android

  if (useTurbo) {
    gpu_layers = 99; // Máxima delegación a Metal/OpenCL
  } else if (isIOS) {
    // 🛡️ iOS Adaptive Metal & Crash Recovery
    const RAM_RESERVE_MB = 2000; 
    const MB_PER_LAYER = 25; // 99 layers = ~2.5GB VRAM
    const availableForMetal = freeRAM - RAM_RESERVE_MB;
    let calculatedLayers = 0;
    
    if (availableForMetal > 0) {
      calculatedLayers = Math.floor(availableForMetal / MB_PER_LAYER);
    }
    
    gpu_layers = Math.max(0, Math.min(99, calculatedLayers, maxGpuLayers));
  } else if (
    (architecture === 'qualcomm-snapdragon' || architecture === 'google-tensor') &&
    totalRAM >= 7000
  ) {
    gpu_layers = 24; // Aceleración OpenCL inteligente para Snapdragon y Tensor con >= 7GB RAM
  }

  if (isEmulator) {
    return { threads: 4, gpu_layers: 0, reason: 'EMULATOR_SAFE_MODE' };
  }

  // 🌡️ Protección Térmica (Predictive Thermal Throttling)
  if (tempCelsius >= 45) {
    // Calor Extremo: Reducir estrés en NPU/GPU a la mitad y limitar hilos
    threads = Math.min(threads, 4);
    gpu_layers = Math.floor(gpu_layers / 2);
    return { threads, gpu_layers, reason: 'CRITICAL_HEAT_45C+' };
  } else if (tempCelsius >= 42 && tempTrend >= 1.0) {
    // Throttling Predictivo: Está cerca del límite y calentándose rápido (>1°C/min)
    threads = Math.min(threads, 4);
    gpu_layers = Math.floor(gpu_layers / 2);
    return { threads, gpu_layers, reason: 'PREDICTIVE_THROTTLE_RISING_FAST' };
  } else if (tempCelsius >= 40) {
    // Calor Moderado
    threads = Math.min(threads, 6);
    return { threads, gpu_layers: Math.min(gpu_layers, 12), reason: 'MODERATE_HEAT_40C+' };
  }

  // Temperatura Óptima
  return { threads, gpu_layers, reason: 'OPTIMAL_TEMP' };
};
