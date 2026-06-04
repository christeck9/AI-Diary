/**
 * MemoryManager.ts
 * Date: 2026-05-12
 *
 * Manages RAM-tier classification and budget enforcement for LLM inference.
 * Provides MemoryTier enum and getCurrentTier() consumed by useAppLlm.ts
 * to dynamically select context window and batch sizes.
 */
import { Platform } from 'react-native';
import { getTotalRAM } from './hardware';

// Lectura síncrona eager usando constantes del sistema React Native
const constants = Platform.constants as any;
let totalRAM: number = constants?.totalMemory && constants.totalMemory > 0 
  ? Math.floor(constants.totalMemory / (1024 * 1024))
  : (Platform.OS === 'ios' ? 6144 : 8192);

console.log(`[MemoryManager] Eager RAM resolution: ${totalRAM} MB`);

export async function initializeMemoryManager(): Promise<void> {
  try {
    const hardwareRAM = await getTotalRAM();
    if (hardwareRAM > 0) {
      totalRAM = hardwareRAM;
      console.log(`[MemoryManager] Total RAM updated from hardware: ${totalRAM} MB`);
    }
  } catch (error) {
    console.warn(`[MemoryManager] Could not update RAM from hardware asynchronously:`, error);
  }
}
// --- Memory Tier Enum ---
// Maps device RAM ranges to capability tiers used for dynamic context sizing.
export enum MemoryTier {
  TITAN       = 'TITAN',        // 20GB+  (Flagship tablets, Desktop-class)
  ELITE       = 'ELITE',        // 12-20GB (High-end flagship phones)
  AVANZADO    = 'AVANZADO',     // 8-12GB  (Mid-high range phones)
  ESTANDAR_PRO = 'ESTANDAR_PRO',// 6-8GB   (Standard flagship phones)
  ESTANDAR    = 'ESTANDAR',     // 4-6GB   (Mid-range phones)
  ENTRADA     = 'ENTRADA',      // <4GB    (Entry-level / low-end)
}

const RAM_THRESHOLDS = [
  { limit: 20480, multiplier: 0.85 },
  { limit: 12288, multiplier: 0.70 },
  { limit: 8192,  multiplier: 0.60 },
  { limit: 0,     multiplier: 0.40 },
];

export function getDynamicThreshold(): number {
  const tier = RAM_THRESHOLDS.find(t => totalRAM >= t.limit);
  return tier ? tier.multiplier : 0.40;
}

export async function checkBudget(estimatedRequirementMB: number = 2000): Promise<boolean> {
  if (totalRAM === 0) {
    await initializeMemoryManager();
  }

  const budget = getBudgetLimit();
  const isSafe = estimatedRequirementMB <= budget;

  if (!isSafe) {
    const threshold = getDynamicThreshold();
    console.warn(`[MemoryManager] Budget exceeded! Tier Threshold: ${Math.round(threshold * 100)}%, Req: ${estimatedRequirementMB}MB, Budget: ${Math.round(budget)}MB`);
  }

  return isSafe;
}

export function getTotalRAMValue(): number {
  return totalRAM;
}

export function getBudgetLimit(): number {
  return totalRAM * getDynamicThreshold();
}

/**
 * getCurrentTier — Maps detected RAM to a MemoryTier enum value.
 * Called by useAppLlm.ts to select context window and batch size.
 * Initializes the RAM cache if not yet done.
 */
export function getCurrentTier(): MemoryTier {
  if (totalRAM >= 20480) return MemoryTier.TITAN;
  if (totalRAM >= 12288) return MemoryTier.ELITE;
  if (totalRAM >= 8192)  return MemoryTier.AVANZADO;
  if (totalRAM >= 6144)  return MemoryTier.ESTANDAR_PRO;
  if (totalRAM >= 4096)  return MemoryTier.ESTANDAR;
  return MemoryTier.ENTRADA;
}