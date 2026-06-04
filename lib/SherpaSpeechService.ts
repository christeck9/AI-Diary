import { createTTS, saveAudioToFile, TtsEngine } from 'react-native-sherpa-onnx/tts';
import { createSTT, SttEngine } from 'react-native-sherpa-onnx/stt';
import { getLocalModelPathByCategory, ModelCategory } from 'react-native-sherpa-onnx/download';
import { fileModelPath } from 'react-native-sherpa-onnx';
import * as FileSystem from 'expo-file-system';

class SherpaSpeechService {
  private ttsInstance: TtsEngine | null = null;
  private sttInstance: SttEngine | null = null;
  private currentTtsModelId: string | null = null;
  private currentSttModelId: string | null = null;
  private lastTtsUri: string | null = null;

  async initializeTTS(lang: 'es' | 'en', modelId: string): Promise<void> {
    // If it's already initialized with the same model, do nothing
    if (this.ttsInstance && this.currentTtsModelId === modelId) {
      console.log(`[SherpaSpeechService] TTS already initialized with ${modelId}`);
      return;
    }

    // Destroy existing instance
    if (this.ttsInstance) {
      console.log('[SherpaSpeechService] Unloading existing TTS instance...');
      await this.ttsInstance.destroy();
      this.ttsInstance = null;
      this.currentTtsModelId = null;
    }

    // Resolve local path
    const localPath = await getLocalModelPathByCategory(ModelCategory.Tts, modelId);
    if (!localPath) {
      throw new Error(`Model not found locally: ${modelId}`);
    }

    console.log(`[SherpaSpeechService] Initializing TTS with model at: ${localPath}`);
    this.ttsInstance = await createTTS({
      modelPath: fileModelPath(localPath),
      modelType: 'vits',
      numThreads: 2,
      modelOptions: {
        vits: {
          noiseScale: 0.33,
          noiseScaleW: 0.4,
          lengthScale: 1.0,
        },
      },
    });
    this.currentTtsModelId = modelId;
    console.log('[SherpaSpeechService] TTS Engine loaded successfully!');
  }

  async initializeSTT(modelId: string): Promise<void> {
    if (this.sttInstance && this.currentSttModelId === modelId) {
      console.log(`[SherpaSpeechService] STT already initialized with ${modelId}`);
      return;
    }

    if (this.sttInstance) {
      console.log('[SherpaSpeechService] Unloading existing STT instance...');
      await this.sttInstance.destroy();
      this.sttInstance = null;
      this.currentSttModelId = null;
    }

    const localPath = await getLocalModelPathByCategory(ModelCategory.Stt, modelId);
    if (!localPath) {
      throw new Error(`Model not found locally: ${modelId}`);
    }

    console.log(`[SherpaSpeechService] Initializing STT with model at: ${localPath}`);
    this.sttInstance = await createSTT({
      modelPath: fileModelPath(localPath),
      modelType: 'whisper',
      numThreads: 2,
    });
    this.currentSttModelId = modelId;
    console.log('[SherpaSpeechService] STT Engine loaded successfully!');
  }

  async speakOffline(text: string, sid?: number): Promise<string> {
    if (!this.ttsInstance) {
      throw new Error('TTS Engine is not initialized. Call initializeTTS first.');
    }

    // Delete the previous generated WAV file if it exists to prevent cache buildup
    if (this.lastTtsUri) {
      try {
        console.log(`[SherpaSpeechService] Deleting previous TTS file: ${this.lastTtsUri}`);
        await FileSystem.deleteAsync(this.lastTtsUri, { idempotent: true });
      } catch (e) {
        console.warn(`[SherpaSpeechService] Failed to delete previous TTS file: ${this.lastTtsUri}`, e);
      }
      this.lastTtsUri = null;
    }

    console.log(`[SherpaSpeechService] Generating speech (sid: ${sid ?? 0}) for text: "${text.substring(0, 30)}..."`);
    // Generate audio samples
    const audio = await this.ttsInstance.generateSpeech(text, sid !== undefined ? { sid } : undefined);
    
    // Save to temp file
    const tempUri = `${FileSystem.cacheDirectory}sherpa_tts_${Date.now()}.wav`;
    const rawPath = tempUri.replace(/^file:\/\//, '');
    
    console.log(`[SherpaSpeechService] Saving audio to temp path: ${rawPath}`);
    await saveAudioToFile(audio, rawPath);
    
    this.lastTtsUri = tempUri;
    return tempUri;
  }

  async transcribeOffline(audioUri: string): Promise<string> {
    if (!this.sttInstance) {
      throw new Error('STT Engine is not initialized. Call initializeSTT first.');
    }

    const rawPath = audioUri.replace(/^file:\/\//, '');
    console.log(`[SherpaSpeechService] Transcribing file: ${rawPath}`);
    
    const result = await this.sttInstance.transcribeFile(rawPath);
    console.log(`[SherpaSpeechService] Transcription result: "${result.text}"`);
    return result.text;
  }

  async releaseAll(): Promise<void> {
    console.log('[SherpaSpeechService] Releasing all offline speech models...');
    if (this.ttsInstance) {
      try {
        await this.ttsInstance.destroy();
      } catch (e) {
        console.error('[SherpaSpeechService] Error destroying TTS:', e);
      }
      this.ttsInstance = null;
      this.currentTtsModelId = null;
    }

    if (this.sttInstance) {
      try {
        await this.sttInstance.destroy();
      } catch (e) {
        console.error('[SherpaSpeechService] Error destroying STT:', e);
      }
      this.sttInstance = null;
      this.currentSttModelId = null;
    }

    if (this.lastTtsUri) {
      try {
        console.log(`[SherpaSpeechService] Cleaning up last TTS file on release: ${this.lastTtsUri}`);
        await FileSystem.deleteAsync(this.lastTtsUri, { idempotent: true });
      } catch (e) {
        console.error('[SherpaSpeechService] Error deleting last TTS file on release:', e);
      }
      this.lastTtsUri = null;
    }
    console.log('[SherpaSpeechService] Offline speech models released.');
  }
}

export const sherpaSpeechService = new SherpaSpeechService();
