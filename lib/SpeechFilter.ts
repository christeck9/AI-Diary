/**
 * SpeechFilter.ts
 * Utility class to detect background noise, Whisper hallucinations, and language mismatches.
 */
import * as FileSystem from 'expo-file-system';

export class SpeechFilter {
  // Common hallucination phrases in English and Spanish
  private static readonly HALLUCINATION_BLOCKLIST: Set<string> = new Set([
    "thanks for watching",
    "thank you for watching",
    "please subscribe",
    "subtitles by",
    "transcribed by",
    "suscríbete a mi canal",
    "gracias por ver",
    "amara.org",
    "foreign language",
    "blank audio",
    "silence",
    "bye",
    "you",
    "peace",
    "shh"
  ]);

  // Music/noise related tags that Whisper often generates
  private static readonly NOISE_MUSIC_BLOCKLIST: Set<string> = new Set([
    "[music]",
    "[musik]",
    "[song]",
    "[singing]",
    "[guitar]",
    "[piano]",
    "[violin]",
    "[drum]",
    "[beat]",
    "[bass]",
    "[audio]",
    "[noise]",
    "[background noise]",
    "[crowd]",
    "[applause]",
    "[laughter]",
    "[cheering]",
    "[talking]",
    "[speech]",
    "[conversation]",
    "[radio]",
    "[tv]",
    "[movie]",
  ]);

  // Regex patterns to match substrings or bracketed descriptions (e.g. [Music], (silence))
  private static readonly HALLUCINATION_REGEXES: RegExp[] = [
    /thanks?\s+for\s+watching/gi,
    /please\s+subscribe/gi,
    /subtitles\s+by/gi,
    /transcribed\s+by/gi,
    /gracias\s+por\s+ver/gi,
    /suscr(i|í)bete/gi,
    /foreign\s+language/gi,
    /blank\s+audio/gi,
    /amara\.org/gi,
    /^you$/i,
    /pauses\s*\(silence/gi,
    /microphone\s*is\s*waiting/gi,
    /speak\s*to\s*start/gi,
    /\[.*\]/,  // Bracketed audio tags (e.g., [BLANK_AUDIO], [Music])
    /\(.*\)/   // Parenthesized audio tags
  ];

  // Patterns that indicate music or non-speech audio
  private static readonly MUSIC_NOISE_PATTERNS: RegExp[] = [
    /\[music\]/gi,
    /\[musik\]/gi,
    /\[song\]/gi,
    /\[singing\]/gi,
    /\[guitar\]/gi,
    /\[piano\]/gi,
    /\[violin\]/gi,
    /\[drum\]/gi,
    /\[beat\]/gi,
    /\[bass\]/gi,
    /\[audio\]/gi,
    /\[noise\]/gi,
    /\[background\s+noise\]/gi,
    /\[crowd\]/gi,
    /\[applause\]/gi,
    /\[laughter\]/gi,
    /\[cheering\]/gi,
    /\[talking\]/gi,
    /\[speech\]/gi,
    /\[radio\]/gi,
    /\[tv\]/gi,
    /\[movie\]/gi,
  ];

  /**
   * Calculates Shannon Entropy of a text string based on character distribution.
   * Higher entropy means more diverse characters (typical of organic language).
   * Low entropy (< 1.25 bits) indicates repeating character patterns/loops.
   */
  public static calculateShannonEntropy(text: string): number {
    if (!text || text.length === 0) return 0;

    // Remove whitespace and punctuation to focus purely on letter variety
    const normalized = text.replace(/[\s.,\/#!$%\^&\*;:{}=\-_`~()¡¿?]/g, '').toLowerCase();
    const len = normalized.length;
    if (len === 0) return 0;

    const frequencies: Record<string, number> = {};
    for (let i = 0; i < len; i++) {
      const char = normalized[i];
      frequencies[char] = (frequencies[char] || 0) + 1;
    }

    let entropy = 0;
    for (const char in frequencies) {
      const probability = frequencies[char] / len;
      entropy -= probability * Math.log2(probability);
    }

    return entropy;
  }

  /**
   * Calculates the compression ratio: unique words / total words.
   * If a sentence has low unique vocabulary variety, it might be a looping hallucination.
   */
  public static calculateCompressionRatio(text: string): number {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return 1.0;

    const uniqueWords = new Set(words);
    return uniqueWords.size / words.length;
  }

  /**
   * Checks if the text contains music or noise indicators.
   * This is especially important for Walkie-Talkie mode which lacks VAD.
   */
  public static containsMusicOrNoise(text: string): boolean {
    // Check for bracketed music/noise tags
    for (const pattern of this.MUSIC_NOISE_PATTERNS) {
      if (pattern.test(text)) {
        console.log(`[SpeechFilter] Detected music/noise pattern: ${pattern}`);
        return true;
      }
    }

    // Check for common music/noise words without clear speech context
    const musicWords = ['music', 'musik', 'song', 'singing', 'guitar', 'piano', 'violin', 'drum', 'beat', 'bass', 'audio', 'noise', 'crowd', 'applause', 'laughter', 'cheering'];
    const words = text.toLowerCase().split(/\s+/);
    
    // If the text is mostly music/noise words and very short, likely not speech
    if (words.length <= 3) {
      const musicWordCount = words.filter(w => musicWords.includes(w.replace(/[.,!?]/g, ''))).length;
      if (musicWordCount > 0) {
        console.log(`[SpeechFilter] Short text with music/noise words detected`);
        return true;
      }
    }

    return false;
  }

  /**
   * Checks if an audio file is valid (not empty or corrupt).
   * Note: This does NOT check actual audio energy/volume.
   * True silence detection is delegated to isNoiseOrHallucination() on the transcript.
   */
  public static async isAudioFileValid(uri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) return false;
      
      const fileSizeKB = (fileInfo.size || 0) / 1024;
      
      // Files < 2KB are usually empty or corrupt WAV headers
      if (fileSizeKB < 2) {
        console.log(`[SpeechFilter] Audio file corrupt or empty (${fileSizeKB.toFixed(1)}KB)`);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[SpeechFilter] Error checking audio file validity:', e);
      return false; 
    }
  }

  /**
   * Evaluates if a given transcript block should be classified as noise, hallucination,
   * or a language mismatch.
   */
  public static isNoiseOrHallucination(
    text: string,
    expectedLang: string,
    detectedLang?: string,
    strictMode: boolean = true
  ): boolean {
    const cleaned = text.toLowerCase().trim();
    if (!cleaned) return true;

    // 0. Music/Noise Check (NEW - for Walkie-Talkie mode)
    if (this.containsMusicOrNoise(text)) {
      console.log(`[SpeechFilter] Rejected: Music or noise detected in transcription`);
      return true;
    }

    // 1. Language Mismatch Check
    // If Whisper explicitly auto-detects a language and it contradicts our expected language,
    // discard it. Whisper often assigns random foreign languages to environmental noises.
    if (strictMode && detectedLang && expectedLang) {
      const cleanExpected = expectedLang.toLowerCase().substring(0, 2);
      const cleanDetected = detectedLang.toLowerCase().substring(0, 2);
      
      // Auto-detected languages sometimes return 'auto' or are undefined, skip in those cases.
      if (cleanDetected && cleanDetected !== 'au' && cleanDetected !== cleanExpected) {
        console.log(`[SpeechFilter] Rejected: Language mismatch. Expected: "${cleanExpected}", Detected: "${cleanDetected}"`);
        return true;
      }
    }

    // 2. Exact Blocklist Check
    const cleanNoPunctuation = cleaned.replace(/[.,!?¡¿()\[\]]/g, '').trim();
    if (this.HALLUCINATION_BLOCKLIST.has(cleanNoPunctuation)) {
      console.log(`[SpeechFilter] Rejected: Exact match blocklist ("${cleanNoPunctuation}")`);
      return true;
    }

    // 3. Regex Substring Check (covers bracketed noise, foreign language tags, etc.)
    for (const regex of this.HALLUCINATION_REGEXES) {
      if (regex.test(cleaned)) {
        console.log(`[SpeechFilter] Rejected: Regex match (${regex})`);
        return true;
      }
    }

    // 4. Shannon Entropy Check
    // Typical human speech has entropy between 1.5 and 2.5 bits. Low entropy indicates repeating loops.
    const entropy = this.calculateShannonEntropy(text);
    if (entropy > 0 && entropy <= 1.25) {
      console.log(`[SpeechFilter] Rejected: Low entropy (${entropy.toFixed(2)} bits/char)`);
      return true;
    }

    // 5. Lexical Compression Check (only for longer phrases > 5 words)
    const wordCount = cleaned.split(/\s+/).length;
    if (wordCount > 5) {
      const compRatio = this.calculateCompressionRatio(text);
      if (compRatio < 0.35) {
        console.log(`[SpeechFilter] Rejected: Low lexical compression ratio (${compRatio.toFixed(2)})`);
        return true;
      }
    }

    return false;
  }
}