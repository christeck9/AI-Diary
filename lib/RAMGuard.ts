import DeviceInfo from 'react-native-device-info';

export interface RAMGuardResult {
  allowed: boolean;
  warning: boolean;
  message: string;
  requiredDifferenceMB: number;
  freeRamMB: number;
}

export const RAM_THRESHOLDS = {
  'llama3.2-1b-q4': {
    min: 1500,
    recommended: 2200
  },
  'gemma4-e2b-qat': {
    min: 3600,
    recommended: 4200
  },
  'gemma4-e2b-qat-vision': {
    min: 4800,
    recommended: 5400
  }
};

/**
 * Returns the estimated free system RAM in Megabytes.
 * Calculated as Total RAM - Used RAM.
 */
export async function getFreeRAM(): Promise<number> {
  try {
    const total = await DeviceInfo.getTotalMemory();
    const used = await DeviceInfo.getUsedMemory();
    const freeBytes = total - used;
    // Prevent negative numbers just in case of OS weirdness
    const freeMB = Math.max(0, Math.floor(freeBytes / (1024 * 1024)));
    return freeMB;
  } catch (error) {
    console.error("Error in getFreeRAM:", error);
    return 0;
  }
}

/**
 * Evaluates if the current system has enough Free RAM to safely load and run a model.
 * 
 * @param modelId The ID of the model (e.g. 'llama3.2-1b-q4', 'gemma4-e2b-qat')
 * @param hasVision Whether the vision module will be loaded alongside the model
 * @param isEsp Whether to return the message in Spanish
 * @returns RAMGuardResult indicating if loading should be allowed or blocked.
 */
export async function canLoadModel(modelId: string, hasVision: boolean = false, isEsp: boolean = true): Promise<RAMGuardResult> {
  const freeRamMB = await getFreeRAM();
  
  let key = modelId;
  // We use the exact key mapping for gemma4 vision
  if (modelId === 'gemma4-e2b-qat' && hasVision) {
    key = 'gemma4-e2b-qat-vision';
  }

  const thresholds = RAM_THRESHOLDS[key as keyof typeof RAM_THRESHOLDS] || { min: 1500, recommended: 2200 };

  // Zone Red: Blocked
  if (freeRamMB < thresholds.min) {
    const diff = thresholds.min - freeRamMB;
    return {
      allowed: false,
      warning: false,
      message: isEsp 
        ? `No tienes suficiente memoria libre para iniciar. Libera al menos ${diff} MB cerrando aplicaciones recientes.` 
        : `Not enough free memory to start. Free up at least ${diff} MB by closing recent applications.`,
      requiredDifferenceMB: diff,
      freeRamMB
    };
  }

  // Zone Yellow: Allowed with warning
  if (freeRamMB >= thresholds.min && freeRamMB < thresholds.recommended) {
    return {
      allowed: true,
      warning: true,
      message: isEsp
        ? `Advertencia: Tienes la memoria mínima para ejecutar este modelo, pero el rendimiento podría ser inestable. Se recomiendan ${thresholds.recommended} MB libres.`
        : `Warning: You have the minimum memory to run this model, but performance may be unstable. ${thresholds.recommended} MB free is recommended.`,
      requiredDifferenceMB: 0,
      freeRamMB
    };
  }

  // Zone Green: Optimal
  return {
    allowed: true,
    warning: false,
    message: isEsp ? 'Memoria óptima.' : 'Optimal memory.',
    requiredDifferenceMB: 0,
    freeRamMB
  };
}

/**
 * Generates a dynamic UI message analyzing free RAM against all available models.
 */
export function evaluateDeviceRAMCapabilities(freeRamMB: number, lang: string) {
  let message = '';
  let status: 'red' | 'yellow' | 'green' = 'red';
  let isLowRam = false;

  const thresholds = {
    light: { min: RAM_THRESHOLDS['llama3.2-1b-q4'].min, rec: RAM_THRESHOLDS['llama3.2-1b-q4'].recommended, name: lang === 'es' ? 'Anima Light (Llama 3.2 1B)' : 'Anima Light (Llama 3.2 1B)' },
    gemmaText: { min: RAM_THRESHOLDS['gemma4-e2b-qat'].min, rec: RAM_THRESHOLDS['gemma4-e2b-qat'].recommended, name: lang === 'es' ? 'Gemma 4 E2B (Solo texto)' : 'Gemma 4 E2B (Text only)' },
    gemmaVision: { min: RAM_THRESHOLDS['gemma4-e2b-qat-vision'].min, rec: RAM_THRESHOLDS['gemma4-e2b-qat-vision'].recommended, name: lang === 'es' ? 'Gemma 4 E2B (Texto + Visión)' : 'Gemma 4 E2B (Text + Vision)' }
  };

  if (freeRamMB < thresholds.light.min) {
    isLowRam = true;
    status = 'red';
    message = lang === 'es'
      ? `Detecté una memoria de ${freeRamMB} MB libres en tu dispositivo. Desafortunadamente, no cumples con el mínimo de ${thresholds.light.min} MB para correr ningún modelo. Por favor libera memoria cerrando otras aplicaciones.`
      : `Detected ${freeRamMB} MB of free memory on your device. Unfortunately, you do not meet the minimum of ${thresholds.light.min} MB to run any model. Please free up memory by closing other apps.`;
    return { message, status, isLowRam, canRunLight: false, canRunDeepMindText: false, canRunDeepMindVision: false };
  }

  // Determine the HIGHEST model they can run
  let highestModel = thresholds.light;
  let nextModel: any = thresholds.gemmaText;
  
  const canRunLight = true;
  const canRunDeepMindText = freeRamMB >= thresholds.gemmaText.min;
  const canRunDeepMindVision = freeRamMB >= thresholds.gemmaVision.min;
  
  if (canRunDeepMindVision) {
    highestModel = thresholds.gemmaVision;
    nextModel = null;
  } else if (canRunDeepMindText) {
    highestModel = thresholds.gemmaText;
    nextModel = thresholds.gemmaVision;
  }

  const isRecommended = freeRamMB >= highestModel.rec;
  status = isRecommended ? 'green' : 'yellow';

  let baseMsg = lang === 'es' 
    ? `Detecté una memoria de ${freeRamMB} MB libres en tu dispositivo, podemos correr ${highestModel.name}.`
    : `Detected ${freeRamMB} MB of free memory on your device, we can run ${highestModel.name}.`;

  if (!isRecommended) {
    const diff = highestModel.rec - freeRamMB;
    baseMsg += lang === 'es'
      ? ` Aún así, recomendamos liberar unos ${diff} MB más de memoria por si acaso.`
      : ` Still, we recommend freeing up about ${diff} MB more memory just in case.`;
  } else if (nextModel) {
    const nextDiff = nextModel.min - freeRamMB;
    baseMsg += lang === 'es'
      ? ` Si liberas ${nextDiff} MB más de memoria libre, podrías correr también ${nextModel.name}.`
      : ` If you free up ${nextDiff} MB more free memory, you could also run ${nextModel.name}.`;
  } else {
    baseMsg += lang === 'es'
      ? ` Memoria óptima para ejecutar todo a máxima capacidad.`
      : ` Optimal memory to run everything at maximum capacity.`;
  }

  message = baseMsg;
  return { message, status, isLowRam, canRunLight, canRunDeepMindText, canRunDeepMindVision };
}
