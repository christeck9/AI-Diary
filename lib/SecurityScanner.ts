/**
 * lib/SecurityScanner.ts
 * Date: 2026-07-27
 *
 * Servicio de auditoría de seguridad y hardware para AI Diary.
 * Ejecuta chequeos en periodos de inactividad (Idle) para preservar recursos.
 */

import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import { settingsService } from './SettingsService';

export interface SecurityStatus {
  isSecure: boolean;
  isRootedOrJailbroken: boolean;
  cameraPermission: 'granted' | 'denied' | 'undetermined';
  micPermission: 'granted' | 'denied' | 'undetermined';
  lastScanTime: number;
}

// Rutas comunes para buscar el binario 'su' en Android
const ANDROID_SU_PATHS = [
  '/system/app/Superuser.apk',
  '/sbin/su',
  '/system/bin/su',
  '/system/xbin/su',
  '/data/local/xbin/su',
  '/data/local/bin/su',
  '/system/sd/xbin/su',
  '/system/bin/failsafe/su',
  '/data/local/su',
  '/su/bin/su'
];

// Rutas comunes de Jailbreak en iOS
const IOS_JAILBREAK_PATHS = [
  '/Applications/Cydia.app',
  '/Applications/Sileo.app',
  '/Applications/Zebra.app',
  '/Library/MobileSubstrate/MobileSubstrate.dylib',
  '/bin/bash',
  '/usr/sbin/sshd',
  '/etc/apt',
  '/private/var/lib/apt',
  '/private/var/lib/cydia'
];

class SecurityScanner {
  private lastStatus: SecurityStatus | null = null;
  private isScanning = false;

  /**
   * Ejecuta el escaneo en segundo plano usando requestIdleCallback si está disponible.
   */
  public queueScan(onComplete?: (status: SecurityStatus) => void): void {
    const runScanTask = () => {
      this.runScan().then((status) => {
        if (onComplete) {
          onComplete(status);
        }
      }).catch((err) => {
        console.warn('[SecurityScanner] Error during background scan:', err);
      });
    };

    if (typeof (global as any).requestIdleCallback !== 'undefined') {
      (global as any).requestIdleCallback(() => runScanTask());
    } else {
      // Fallback para entornos donde requestIdleCallback no esté disponible
      setTimeout(runScanTask, 1500);
    }
  }

  /**
   * Corre el escaneo de seguridad de manera inmediata y retorna el status.
   */
  public async runScan(): Promise<SecurityStatus> {
    if (this.isScanning) {
      return this.lastStatus || this.getEmptyStatus();
    }

    this.isScanning = true;
    try {
      const isCompromised = await this.checkIntegrity();
      const cameraPerm = await this.checkCameraPermission();
      const micPerm = await this.checkMicPermission();

      const status: SecurityStatus = {
        isRootedOrJailbroken: isCompromised,
        cameraPermission: cameraPerm,
        micPermission: micPerm,
        isSecure: !isCompromised && cameraPerm === 'granted' && micPerm === 'granted',
        lastScanTime: Date.now()
      };

      this.lastStatus = status;
      return status;
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Ejecuta el escaneo y produce el anuncio por voz Sentinel si aplica.
   * Respeta la frecuencia del usuario ('daily', 'always', 'never') y si el TTS está libre.
   */
  public async runDailyVoiceReport(lang: string): Promise<void> {
    const settings = (await settingsService.get('security')) || {};
    const reportMode = settings.voiceReportMode || 'daily';

    if (reportMode === 'never') {
      // Si está desactivado, igual corre el escaneo en segundo plano de diagnóstico silencioso
      this.queueScan();
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (reportMode === 'daily' && settings.lastVoiceReportDate === todayStr) {
      this.queueScan(); // Solo escaneo silencioso de actualización
      return;
    }

    // Verificar si el motor TTS nativo está ocupado hablando
    try {
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        // Re-intentar en 15 segundos
        setTimeout(() => this.runDailyVoiceReport(lang), 15000);
        return;
      }
    } catch {
      // Ignorar fallos de consulta de TTS
    }

    // Ejecutar el escaneo completo
    const status = await this.runScan();

    // Guardar fecha de reporte para la frecuencia
    await settingsService.set({
      security: {
        ...settings,
        lastVoiceReportDate: todayStr
      }
    });

    // Formular el mensaje según el resultado de integridad
    let text = '';
    if (status.isRootedOrJailbroken) {
      text = lang === 'es'
        ? 'Alerta de seguridad. Se ha detectado acceso a la raíz en tu dispositivo. Tu diario podría estar en riesgo.'
        : 'Security alert. Root access detected on your device. Your diary could be at risk.';
    } else {
      text = lang === 'es'
        ? 'He escaneado por tu seguridad: cámara, micrófono, acceso a la raíz del sistema y jailbreak en tu teléfono. Todo en orden.'
        : 'For your security, I have scanned your camera, microphone, root access, and system integrity. Everything is secure.';
    }

    try {
      const targetLanguage = lang === 'es' ? 'es-MX' : 'en-US';
      Speech.speak(text, {
        language: targetLanguage,
        pitch: 0.85, // Pitch bajo cibernético
        rate: 0.90,  // Ritmo pausado y robótico
        volume: 1.0
      });
    } catch (e) {
      console.warn('[SecurityScanner] Failed to play native TTS security report:', e);
    }
  }

  /**
   * Retorna el último estado escaneado sin volver a correr la lógica de disco.
   */
  public getLastStatus(): SecurityStatus | null {
    return this.lastStatus;
  }

  private getEmptyStatus(): SecurityStatus {
    return {
      isSecure: true,
      isRootedOrJailbroken: false,
      cameraPermission: 'undetermined',
      micPermission: 'undetermined',
      lastScanTime: 0
    };
  }

  /**
   * Revisa si el dispositivo está rooteado (Android) o jailbreakeado (iOS)
   */
  private async checkIntegrity(): Promise<boolean> {
    if (Platform.OS === 'android') {
      // 1. Verificar existencia de binarios
      for (const path of ANDROID_SU_PATHS) {
        try {
          const info = await FileSystem.getInfoAsync(path);
          if (info.exists) {
            return true; // Encontró su binary
          }
        } catch {
          // Ignorar errores de acceso y seguir buscando
        }
      }
    } else if (Platform.OS === 'ios') {
      // 1. Verificar existencia de apps/librerías de Jailbreak
      for (const path of IOS_JAILBREAK_PATHS) {
        try {
          const info = await FileSystem.getInfoAsync(path);
          if (info.exists) {
            return true;
          }
        } catch {
          // Ignorar
        }
      }

      // 2. Intentar escribir fuera del sandbox de la app
      try {
        const testPath = `${FileSystem.documentDirectory}../../../../jailbreak_write_test.txt`;
        await FileSystem.writeAsStringAsync(testPath, 'jailbreak_test');
        await FileSystem.deleteAsync(testPath, { idempotent: true });
        return true; // Si pudo escribir fuera, el sandbox está vulnerado
      } catch {
        // Falló la escritura (comportamiento normal y seguro)
      }

      // 3. Verificar si puede abrir el esquema de Cydia
      try {
        const canOpenCydia = await Linking.canOpenURL('cydia://package/com.example');
        if (canOpenCydia) {
          return true;
        }
      } catch {
        // Ignorar
      }
    }

    return false;
  }

  /**
   * Audita el permiso de la cámara
   */
  private async checkCameraPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      return status;
    } catch (e) {
      console.warn('[SecurityScanner] Error checking camera permission:', e);
      return 'undetermined';
    }
  }

  /**
   * Audita el permiso del micrófono
   */
  private async checkMicPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
    try {
      const { status } = await Audio.getPermissionsAsync();
      return status;
    } catch (e) {
      console.warn('[SecurityScanner] Error checking mic permission:', e);
      return 'undetermined';
    }
  }
}

export const securityScanner = new SecurityScanner();
