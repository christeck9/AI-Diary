import { Platform } from 'react-native';

/**
 * 🛡️ SoC Architecture Types
 */
export type SoCArchitecture = 'google-tensor' | 'qualcomm-snapdragon' | 'apple-silicon' | 'generic-arm' | 'unknown';

export interface HardwareConfig {
  architecture: SoCArchitecture;
  threads: number;
  gpuLayers: number;
  useMmap: boolean;
  isHighEnd: boolean;
  isEmulator: boolean;
}

let hardwareCache: HardwareConfig | null = null;

/**
 * Hardware Abstraction Layer (HAL) for AI Sanctuary
 * Uses only Platform.constants from React Native core — zero external native modules.
 */
export async function getHardwareConfig(): Promise<HardwareConfig> {
  if (hardwareCache) return hardwareCache;

  const totalRAM = await getTotalRAM();
  const constants = Platform.constants as any;
  const model = (constants?.Model || '').toLowerCase();
  const brand = (constants?.Brand || '').toLowerCase();

  // Detect 64-bit ABI using Platform.constants (built into React Native — no extra module needed)
  const cpuAbi: string = constants?.CPU_ABI || constants?.abi || '';
  const is64Bit = cpuAbi.includes('64') || cpuAbi.includes('arm64') || cpuAbi.includes('x86_64');

  const config: HardwareConfig = {
    architecture: 'unknown',
    threads: 4,
    gpuLayers: 0,
    useMmap: true,
    isHighEnd: totalRAM >= 8192,
    isEmulator: model.includes('sdk') || model.includes('vbox') || model.includes('generic'),
  };

  if (Platform.OS === 'ios') {
    config.architecture = 'apple-silicon';
    config.gpuLayers = 32;
    config.threads = 4;
    config.isHighEnd = true;
  } else if (Platform.OS === 'android') {
    // ─── Google Pixel / Tensor ────────────────────────────────────────────
    if (brand.includes('google') && model.includes('pixel')) {
      config.architecture = 'google-tensor';
      config.isHighEnd = true;
      config.threads = 4;
      config.gpuLayers = 24; // ✅ FIX: Tensor GPU OpenCL acceleration enabled

    // ─── Samsung Galaxy S / Qualcomm ─────────────────────────────────────
    } else if (brand.includes('samsung') && (model.startsWith('sm-s') || model.startsWith('sm-g') || model.startsWith('sm-f'))) {
      config.architecture = 'qualcomm-snapdragon';
      config.isHighEnd = totalRAM >= 8192;
      config.threads = 6;
      config.gpuLayers = 24; // Galaxy S flagship — OpenCL enabled

    // ─── OnePlus / Nothing / Other Snapdragon flagships ──────────────────
    } else if (brand.includes('oneplus') || brand.includes('nothing') || brand.includes('asus')) {
      config.architecture = 'qualcomm-snapdragon';
      config.isHighEnd = totalRAM >= 8192;
      config.threads = 6;
      config.gpuLayers = config.isHighEnd ? 24 : 0;

    // ─── Generic high-end 64-bit Android (likely Snapdragon/Dimensity) ───
    } else if (config.isHighEnd && is64Bit) {
      config.architecture = 'qualcomm-snapdragon'; // Broad but safe fallback
      config.threads = 6;
      config.gpuLayers = 24;

    // ─── Low/mid-range or unknown SoC ────────────────────────────────────
    } else {
      config.architecture = 'generic-arm';
      config.threads = is64Bit ? 4 : 2;
      config.gpuLayers = 0; // No GPU acceleration — unknown/unsupported SoC
    }
  }

  hardwareCache = config;
  return config;
}

/**
 * Gets the total system RAM in MB.
 * Uses Platform.constants.totalMemory (React Native 0.71+, no extra module needed).
 * Falls back to safe defaults: 6GB on iOS, 8GB on Android.
 */
export async function getTotalRAM(): Promise<number> {
  try {
    const constants = Platform.constants as any;
    if (constants?.totalMemory && constants.totalMemory > 0) {
      return Math.floor(constants.totalMemory / (1024 * 1024));
    }
  } catch (e) {
    // fall through to defaults
  }
  return Platform.OS === 'ios' ? 6144 : 8192;
}

/**
 * Returns a safe constant thermal proxy.
 * Actual low-power/thermal management is handled by the battery hook in index.tsx,
 * which already reads expo-battery in a safe React hook context (not at module init time).
 */
export async function getDeviceTemperature(): Promise<number> {
  return 35; // Safe default — upstream hook handles real eco-mode detection
}
