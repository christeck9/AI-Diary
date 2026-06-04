/**
 * lib/SettingsService.ts
 *
 * Singleton de configuración de la app con:
 * - Caché en memoria (elimina lecturas de disco redundantes).
 * - Cola de escrituras serializadas (previene race conditions por escritura concurrente).
 * - Merge granular por clave (ningún módulo sobreescribe secciones ajenas).
 *
 * Uso:
 *   const settings = await settingsService.get();          // Todo el objeto
 *   const voice = await settingsService.get('voice');      // Sección específica
 *   await settingsService.set({ voice: { isMuted: true } }); // Escritura segura
 *   settingsService.invalidate();                          // Fuerza reload del disco
 */

import * as FileSystem from 'expo-file-system';

const SETTINGS_PATH = () => `${FileSystem.documentDirectory}app_settings.json`;

class SettingsService {
  private cache: Record<string, any> | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  /**
   * Lee el settings object completo o una sección específica.
   * Sirve desde caché si está disponible; de lo contrario carga del disco.
   */
  async get(): Promise<Record<string, any>>;
  async get<T = any>(key: string): Promise<T | undefined>;
  async get(key?: string): Promise<any> {
    if (!this.cache) {
      await this.reload();
    }
    if (key === undefined) return this.cache ?? {};
    return this.cache?.[key];
  }

  /**
   * Escribe una o varias claves de forma segura.
   * Las escrituras se encolan y se ejecutan en serie para evitar
   * que dos módulos sobreescriban el archivo simultáneamente.
   */
  async set(updates: Record<string, any>): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      try {
        // Asegurar que la caché esté cargada
        if (!this.cache) {
          await this.reload();
        }
        // Merge profundo: combina los updates con el estado actual
        this.cache = this.deepMerge(this.cache ?? {}, updates);
        await FileSystem.writeAsStringAsync(
          SETTINGS_PATH(),
          JSON.stringify(this.cache),
          { encoding: FileSystem.EncodingType.UTF8 }
        );
      } catch (e) {
        console.warn('[SettingsService] Error writing settings:', e);
      }
    });
    return this.writeQueue;
  }

  /**
   * Invalida la caché en memoria, forzando la siguiente lectura desde disco.
   */
  invalidate(): void {
    this.cache = null;
  }

  /**
   * Carga el archivo de settings desde disco y actualiza la caché.
   * Si el archivo no existe o está corrupto, inicializa con un objeto vacío.
   */
  private async reload(): Promise<void> {
    try {
      const path = SETTINGS_PATH();
      const info = await FileSystem.getInfoAsync(path);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(path, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        this.cache = JSON.parse(content);
      } else {
        this.cache = {};
      }
    } catch (e) {
      console.warn('[SettingsService] Error reading settings, using empty object:', e);
      this.cache = {};
    }
  }

  /**
   * Merge profundo de dos objetos planos.
   * Las claves del override sobreescriben las del base en el primer nivel.
   */
  private deepMerge(
    base: Record<string, any>,
    override: Record<string, any>
  ): Record<string, any> {
    const result = { ...base };
    for (const key of Object.keys(override)) {
      if (
        override[key] !== null &&
        typeof override[key] === 'object' &&
        !Array.isArray(override[key]) &&
        typeof base[key] === 'object' &&
        base[key] !== null
      ) {
        result[key] = { ...base[key], ...override[key] };
      } else {
        result[key] = override[key];
      }
    }
    return result;
  }
}

// Singleton exportado para uso en toda la app.
export const settingsService = new SettingsService();
