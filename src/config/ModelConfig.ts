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
    id: 'llama3.2-1b-q4',
    labelEs: 'Anima Light',
    labelEn: 'Anima Light',
    sizeMB: 770,
    descEs: 'Núcleo Ligero — Especial para teléfonos básicos. (Sin visión / No soporta imágenes)',
    descEn: 'Light Core — Optimized for older phones. (No vision / No image support)',
    fileName: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
    url: 'https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf',
  },
  {
    id: 'gemma3-4b-q4',
    labelEs: 'Anima Balance',
    labelEn: 'Anima Balance',
    sizeMB: 2374,
    mmprojSizeMB: 812,
    descEs: 'Núcleo Diario — Veloz y estable. (Con visión / Soporta imágenes)',
    descEn: 'Daily Core — Fast and stable. (With vision / Image support)',
    fileName: 'google_gemma-3-4b-it-Q4_K_M.gguf',
    url: 'https://huggingface.co/bartowski/google_gemma-3-4b-it-GGUF/resolve/main/google_gemma-3-4b-it-Q4_K_M.gguf',
    mmprojFileName: 'mmproj-google_gemma-3-4b-it-f16.gguf',
    mmprojUrl: 'https://huggingface.co/bartowski/google_gemma-3-4b-it-GGUF/resolve/main/mmproj-google_gemma-3-4b-it-f16.gguf',
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
    temperature: 0.1, // Reducido para evitar verborrea
    top_p: 0.85,
    min_p: 0.05,
    repeat_penalty: 1.05,
  },

  gemma3: {
    n_ctx: 4096,
    n_gpu_layers: 24,
    ctx_shift: 512,
    mmproj: 'mmproj-google_gemma-3-4b-it-f16.gguf',

    // Sampling parameters
    temperature: 0.7, // Gemma 3 4B base temperature for standard Sanctuary mode
    top_p: 0.95,
    min_p: 0.05,
    repeat_penalty: 1.0, // Disabled repeat penalty to avoid cut-offs and word starvation
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
export const getDynamicEngineConfig = (
  tempCelsius: number,
  hwThreads: number,
  isEmulator: boolean,
  useTurbo: boolean = false,
  isIOS: boolean = false,
  architecture: string = 'unknown',
  totalRAM: number = 8192
) => {
  let threads = hwThreads;
  let gpu_layers = 0; // Por defecto seguro en Android

  if (useTurbo) {
    gpu_layers = 99; // Máxima delegación a Metal/OpenCL
  } else if (isIOS) {
    // 🛡️ iOS stability guard: Metal GPU context allocation can cause native JSI
    // stack depth overflow in llama.rn during early bootstrap. Use CPU by default.
    gpu_layers = 0;
  } else if (
    (architecture === 'qualcomm-snapdragon' || architecture === 'google-tensor') &&
    totalRAM >= 7000
  ) {
    gpu_layers = 24; // Aceleración OpenCL inteligente para Snapdragon y Tensor con >= 7GB RAM
  }

  if (isEmulator) {
    return { threads: 4, gpu_layers: 0, reason: 'EMULATOR_SAFE_MODE' };
  }

  // 🌡️ Protección Térmica (Thermal Throttling)
  if (tempCelsius > 45) {
    // Calor Extremo: Reducir estrés en NPU/GPU a la mitad y limitar hilos
    threads = Math.min(threads, 4);
    gpu_layers = Math.floor(gpu_layers / 2);
    return { threads, gpu_layers, reason: 'CRITICAL_HEAT_45C+' };
  } else if (tempCelsius > 40) {
    // Calor Moderado
    threads = Math.min(threads, 6);
    return { threads, gpu_layers: Math.min(gpu_layers, 12), reason: 'MODERATE_HEAT_40C+' };
  }

  // Temperatura Óptima
  return { threads, gpu_layers, reason: 'OPTIMAL_TEMP' };
};
