/**
 * useAIVisionAttachment.ts
 * Date: 2026-05-12
 *
 * Hook para selección y pre-procesamiento de imágenes para inferencia multimodal.
 * Reemplaza la versión anterior que importaba paquetes alucinados
 * (react-native-ferropix, react-native-turbo-base64) que NO existen en npm.
 *
 * Dependencias reales verificadas en el proyecto:
 * - expo-document-picker (nativo, ya usado en useFileAttachment.ts)
 * - expo-image-manipulator (lazy-loaded con guard, ya usado en useFileAttachment.ts)
 * - expo-file-system/legacy (ya importado en múltiples hooks)
 */

import { useState, useCallback } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { MODEL_CONFIG } from '../../../config/ModelConfig';
import { checkBudget } from '../../../../lib/MemoryManager';

// Lazy-load ImageManipulator — mismo patrón de seguridad que useFileAttachment.ts
let ImageManipulator: any = null;
try {
  ImageManipulator = require('expo-image-manipulator');
} catch (e) {
  console.warn('[VISION] expo-image-manipulator no disponible. Procesamiento de imagen omitido.');
}

export interface VisionAttachment {
  uri: string;
  width: number;
  height: number;
  type: string;
  gemmeTileCount: number;
  base64?: string;
}

/**
 * Hook para adjuntar y pre-procesar imágenes para Gemma 4 Vision.
 * Redimensiona a la resolución objetivo del tiling (1008px) y serializa en base64
 * para la transferencia al motor llama.rn.
 */
export const useAIVisionAttachment = () => {
  const [attachment, setAttachment] = useState<VisionAttachment | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const processAIVision = useCallback(async (uri: string) => {
    setIsProcessing(true);
    try {
      // Verificación de presupuesto de RAM antes de procesar la imagen
      const isSafe = await checkBudget(1800);
      if (!isSafe) {
        console.warn('[VISION] Memoria insuficiente para procesamiento de imagen.');
        return;
      }

      const targetWidth = MODEL_CONFIG.vision.targetWidth; // 1008px

      let finalUri = uri;
      let finalWidth = targetWidth;
      let finalHeight = targetWidth;
      let base64: string | undefined;

      if (ImageManipulator) {
        // Redimensionar y convertir a JPEG comprimido para minimizar transferencia al motor C++
        const result = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: targetWidth } }],
          { compress: 0.88, format: ImageManipulator.SaveFormat?.JPEG ?? 'jpeg', base64: true }
        );
        finalUri = result.uri;
        finalWidth = result.width ?? targetWidth;
        finalHeight = result.height ?? targetWidth;
        base64 = result.base64;
      } else {
        // Fallback: leer la imagen como base64 directamente sin redimensionar
        console.warn('[VISION] Usando fallback base64 sin redimensionado.');
        const raw = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        base64 = raw;
      }

      setAttachment({
        uri: finalUri,
        width: finalWidth,
        height: finalHeight,
        type: 'image/vision-optimized',
        gemmeTileCount: MODEL_CONFIG.vision.gridSize ** 2, // 9 tiles (3x3)
        base64,
      });

      console.log(`[VISION] ✅ Imagen procesada: ${finalWidth}x${finalHeight}, tiles: ${MODEL_CONFIG.vision.gridSize ** 2}`);
    } catch (error) {
      console.error('[VISION] Error en procesamiento de imagen:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'image/*' });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        await processAIVision(result.assets[0].uri);
      }
    } catch (e) {
      console.error('[VISION] Error seleccionando archivo:', e);
    }
  }, [processAIVision]);

  const clearAttachment = useCallback(() => setAttachment(null), []);

  return { attachment, isProcessing, pickDocument, clearAttachment };
};
