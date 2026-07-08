import * as FileSystem from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';
import { sanitizeForNativeTTS, sanitizeForGoogleTTS } from './TTSSanitizer';
import { toByteArray } from 'base64-js';

export interface TTSProviderSettings {
  useCloudTTS: boolean;
  cloudProvider: 'openai' | 'google' | string;
  openAIKey?: string;
  cloudTTSKey?: string; // Google Key
  openAIVoice?: string;
  googleVoiceName?: string;
}

class CloudTTSService {
  private cachedOpenAIKey: string | null = null;
  private cachedGoogleKey: string | null = null;

  public clearCache(): void {
    this.cachedOpenAIKey = null;
    this.cachedGoogleKey = null;
    console.log('[CloudTTSService] 🧹 API key cache cleared.');
  }

  /**
   * Synthesizes text into speech using the configured cloud provider.
   * Returns the local file URI of the generated MP3, or null if it fails or is disabled.
   * 
   * @param text The clean text to synthesize.
   * @param lang The language of the text ('es', 'en', etc.).
   * @param settings The user settings containing API keys and provider preference.
   * @param prefix A prefix for the temporary file name (e.g. 'speech_preload', 'speech_o').
   */
  public async synthesize(
    text: string, 
    lang: string, 
    settings: TTSProviderSettings,
    prefix: string = 'speech_cloud'
  ): Promise<string | null> {
    if (!settings.useCloudTTS || !text) {
      return null;
    }

    try {
      if (settings.cloudProvider === 'openai') {
        let openAIKey = settings.openAIKey;
        if (this.cachedOpenAIKey) {
          openAIKey = this.cachedOpenAIKey;
        } else {
          try {
            const secureKey = await SecureStore.getItemAsync('openai_tts_api_key');
            if (secureKey && secureKey.trim()) {
              openAIKey = secureKey.trim();
              this.cachedOpenAIKey = openAIKey;
            }
          } catch (err) {
            console.warn('[CloudTTSService] Error loading OpenAI key from SecureStore:', err);
          }
        }

        if (openAIKey) {
          return await this.synthesizeOpenAI(text, openAIKey, prefix, settings.openAIVoice);
        }
      }

      if (settings.cloudProvider === 'google') {
        let googleKey = settings.cloudTTSKey;
        if (this.cachedGoogleKey) {
          googleKey = this.cachedGoogleKey;
        } else {
          try {
            const secureKey = await SecureStore.getItemAsync('google_tts_api_key');
            if (secureKey && secureKey.trim()) {
              googleKey = secureKey.trim();
              this.cachedGoogleKey = googleKey;
            }
          } catch (err) {
            console.warn('[CloudTTSService] Error loading Google key from SecureStore:', err);
          }
        }

        if (googleKey) {
          return await this.synthesizeGoogle(text, lang, googleKey, prefix, settings.googleVoiceName);
        }
      }
      
      // Future providers (ElevenLabs, Azure, etc.) can be easily plugged in here.

    } catch (e) {
      console.error('[CloudTTSService] Synthesis failed:', e);
    }

    return null;
  }

  private async synthesizeOpenAI(
    text: string, 
    apiKey: string, 
    prefix: string,
    selectedVoice?: string
  ): Promise<string | null> {
    // Sanitize text before sending to OpenAI (OpenAI TTS-1 does not support SSML)
    const cleanText = sanitizeForNativeTTS(text);
    if (!cleanText) return null;

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: cleanText,
        voice: selectedVoice || 'alloy'
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const reader = new FileReader();
    const base64: string = await new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
    
    // Extract base64 payload from data URL (e.g. "data:audio/mp3;base64,...")
    const base64Data = base64.split(',')[1];
    if (!base64Data) throw new Error("Failed to extract Base64 data from OpenAI response");

    const uri = `${FileSystem.cacheDirectory}${prefix}_${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(uri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
    return uri;
  }

  /**
   * Directly synthesizes text to a Float32Array containing PCM audio data.
   * This bridges the Cloud TTS API directly to our JSI zero-latency native engine.
   */
  public async synthesizeJSI(
    text: string, 
    lang: string, 
    settings: TTSProviderSettings
  ): Promise<Float32Array | Int16Array | ArrayBuffer | null> {
    if (!settings.useCloudTTS || !text) return null;

    try {
      if (settings.cloudProvider === 'openai') {
        let openAIKey = settings.openAIKey || this.cachedOpenAIKey;
        if (!openAIKey) {
          const secureKey = await SecureStore.getItemAsync('openai_tts_api_key');
          if (secureKey && secureKey.trim()) openAIKey = this.cachedOpenAIKey = secureKey.trim();
        }

        if (openAIKey) {
          const cleanText = sanitizeForNativeTTS(text);
          if (!cleanText) return null;

          const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openAIKey}`
            },
            body: JSON.stringify({
              model: 'tts-1',
              input: cleanText,
              voice: settings.openAIVoice || 'alloy',
              response_format: 'pcm'
            })
          });

          if (!response.ok) {
            throw new Error(`OpenAI PCM Error: ${response.status}`);
          }

          return await response.arrayBuffer();
        }
      }

      if (settings.cloudProvider === 'google') {
        let googleKey = settings.cloudTTSKey || this.cachedGoogleKey;
        if (!googleKey) {
          const secureKey = await SecureStore.getItemAsync('google_tts_api_key');
          if (secureKey && secureKey.trim()) googleKey = this.cachedGoogleKey = secureKey.trim();
        }

        if (googleKey) {
          let voiceName = settings.googleVoiceName;
          if (!voiceName) {
            voiceName = lang === 'es' ? 'es-419-Chirp3-HD-Aoede' : 'en-US-Chirp3-HD-Aoede';
          }

          let languageCode = lang === 'es' ? 'es-MX' : 'en-US';
          const parts = voiceName.split('-');
          if (parts.length >= 2) {
            if (parts[1].toLowerCase() === '419') {
              languageCode = `${parts[0].toLowerCase()}-419`;
            } else {
              languageCode = `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
            }
          }

          const ssmlText = sanitizeForGoogleTTS(text, lang);

          const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { ssml: ssmlText },
              voice: {
                languageCode: languageCode,
                name: voiceName
              },
              audioConfig: {
                audioEncoding: 'LINEAR16',
                sampleRateHertz: 24000
              }
            })
          });

          if (!response.ok) {
            throw new Error(`Google JSI PCM Error: ${response.status}`);
          }

          const data = await response.json();
          if (data.audioContent) {
            const bytes = toByteArray(data.audioContent);
            return new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
          }
        }
      }
    } catch (e) {
      console.error('[CloudTTSService] JSI Synthesis failed:', e);
    }
    return null;
  }

  private async synthesizeGoogle(
    text: string, 
    lang: string, 
    apiKey: string, 
    prefix: string,
    selectedVoiceName?: string
  ): Promise<string | null> {
    let voiceName = selectedVoiceName;
    if (!voiceName) {
      voiceName = lang === 'es' ? 'es-419-Chirp3-HD-Aoede' : 'en-US-Chirp3-HD-Aoede';
    }

    let languageCode = lang === 'es' ? 'es-MX' : 'en-US';
    const parts = voiceName.split('-');
    if (parts.length >= 2) {
      if (parts[1].toLowerCase() === '419') {
        languageCode = `${parts[0].toLowerCase()}-419`;
      } else {
        languageCode = `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
      }
    }

    // Build SSML input for natural prosody (pauses at commas/semicolons, no "punto" vocalization)
    const ssmlText = sanitizeForGoogleTTS(text, lang);

    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { ssml: ssmlText },
        voice: {
          languageCode: languageCode,
          name: voiceName
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,   // Natural speed (1.0 = default, range 0.25–4.0)
          pitch: 0.0,          // Natural pitch (0.0 = default, range -20.0–20.0 semitones)
          // Optimize for handset/phone speaker playback — reduces micro-glitches in MP3 decoding
          effectsProfileId: ['handset-class-device'],
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Google TTS API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (data.audioContent) {
      const uri = `${FileSystem.cacheDirectory}${prefix}_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(uri, data.audioContent, { encoding: FileSystem.EncodingType.Base64 });
      return uri;
    }

    return null;
  }
  
  /**
   * Helper method to safely delete an audio file from cache.
   */
  public async cleanupAudioFile(uri: string): Promise<void> {
    if (!uri) return;
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        // console.log(`[CloudTTSService] Cleaned up cached audio: ${uri}`);
      }
    } catch (e) {
      console.warn(`[CloudTTSService] Failed to cleanup audio file ${uri}:`, e);
    }
  }
}

export const cloudTTSService = new CloudTTSService();
