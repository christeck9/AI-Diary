import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

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
 * Uses react-native-device-info for real metrics instead of hardcoded strings.
 */
export async function getHardwareConfig(): Promise<HardwareConfig> {
  if (hardwareCache) return hardwareCache;

  const totalRAM = await getTotalRAM();
  const isEmulator = await DeviceInfo.isEmulator();
  
  const abis = await DeviceInfo.supportedAbis();
  const is64Bit = abis.some(abi => abi.includes('64') || abi.includes('arm64') || abi.includes('x86_64'));
  
  const isHighEnd = totalRAM >= 8192; // 8GB+ is considered High-End

  const config: HardwareConfig = {
    architecture: 'unknown',
    threads: isHighEnd ? 6 : (is64Bit ? 4 : 2),
    gpuLayers: 0,
    useMmap: true,
    isHighEnd: isHighEnd,
    isEmulator: isEmulator,
  };

  if (Platform.OS === 'ios') {
    config.architecture = 'apple-silicon';
    config.gpuLayers = 32; // Metal acceleration
    config.threads = isHighEnd ? 6 : 4;
  } else if (Platform.OS === 'android') {
    // For Android, we enable GPU layers (OpenCL/Vulkan) safely only on High-End 64-bit devices
    // to prevent low-end OOM crashes or unsupported driver crashes.
    config.architecture = isHighEnd ? 'qualcomm-snapdragon' : 'generic-arm';
    config.gpuLayers = isHighEnd && is64Bit ? 24 : 0;
  }

  hardwareCache = config;
  return config;
}

/**
 * Gets the total system RAM in MB using react-native-device-info.
 */
export async function getTotalRAM(): Promise<number> {
  try {
    const totalBytes = await DeviceInfo.getTotalMemory();
    if (totalBytes && totalBytes > 0) {
      return Math.floor(totalBytes / (1024 * 1024));
    }
  } catch (e) {
    console.error("Error fetching total RAM:", e);
  }
  // Safe defaults if API fails
  return Platform.OS === 'ios' ? 6144 : 8192;
}

/**
 * Gets the free disk storage in MB using react-native-device-info.
 */
export async function getFreeDiskStorageMB(): Promise<number> {
  try {
    const freeBytes = await DeviceInfo.getFreeDiskStorage();
    if (freeBytes && freeBytes > 0) {
      return Math.floor(freeBytes / (1024 * 1024));
    }
  } catch (e) {
    console.error("Error fetching free disk storage:", e);
  }
  return 10000; // Default fallback to 10GB if API fails
}

/**
 * Returns a safe constant thermal proxy.
 * Actual low-power/thermal management is handled by the battery hook in index.tsx.
 */
export async function getDeviceTemperature(): Promise<number> {
  return 35; 
}
