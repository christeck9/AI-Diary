/**
 * TTSSanitizer.ts
 *
 * Prepares LLM-generated text for audio synthesis.
 * Separate from SentinelService.filterUI (which targets the visual UI).
 * This module targets the AUDIO output — stripping characters that native
 * and cloud TTS engines would vocalize incorrectly (e.g. "punto", "asterisco").
 */

// Emoji regex — matches any Unicode emoji character
const EMOJI_REGEX = /[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}]/gu;

// Markdown / formatting artifacts that should be silent
const MARKDOWN_REGEX = /^#{1,6}\s+|^[-*]\s+|^>\s+|_{2}|~~|`/gm;

/**
 * sanitizeForNativeTTS
 *
 * Cleans text for expo-speech (Android/iOS native TTS engine).
 * Native voices sometimes vocalize terminal periods as "punto" / "period",
 * and announce emoji as their text descriptions.
 *
 * Strategy:
 *  1. Strip emoji
 *  2. Strip markdown bullet / heading / blockquote markers
 *  3. Remove trailing period at end of the entire text (not mid-sentence —
 *     mid-sentence periods are already handled by the sentence accumulator
 *     which ensures no period-only fragment is dispatched)
 *  4. Strip lone punctuation marks that appear as isolated words (e.g. ". " or "- ")
 *  5. Normalize whitespace
 */
export function sanitizeForNativeTTS(text: string): string {
  if (!text) return '';

  let cleaned = text
    // Remove system tag residue
    .replace(/\[SISTEMA\].*$/gm, '')
    .replace(/\[SYSTEM\].*$/gm, '')
    .replace(/█/g, '')
    .replace(/```[\s\S]*?```/g, '')
    // Strip emoji
    .replace(EMOJI_REGEX, '')
    // Strip markdown formatting characters
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(MARKDOWN_REGEX, '')
    // Strip inline code backticks
    .replace(/`[^`]*`/g, '')
    // Strip lone hyphen-dash list markers
    .replace(/^\s*-\s+/gm, '')
    // Remove trailing period at the very end of the text block
    // (prevents "punto" / "period" being spoken after final sentence)
    .replace(/\.\s*$/, '')
    // Remove stray isolated punctuation that may appear as a single character
    // after the accumulator emits a segment ending with ".  Next" style
    .replace(/^\s*[.,;:!?]\s*$/gm, '')
    // Normalize multiple blank lines → single space
    .replace(/\n{2,}/g, ' ')
    .replace(/\n/g, ' ')
    // Normalize multiple spaces
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
}

/**
 * sanitizeForGoogleTTS
 *
 * Converts cleaned text to SSML for Google Cloud Text-to-Speech API.
 * SSML allows encoding natural prosody (pauses, breaks) that the plain-text
 * path cannot express. Chirp3-HD voices respect SSML break tags natively.
 *
 * @param text  Pre-cleaned plain text (run through sanitizeForNativeTTS first)
 * @param lang  'es' | 'en'
 * @returns     SSML string wrapped in <speak>...</speak>
 */
export function sanitizeForGoogleTTS(text: string, lang: string): string {
  if (!text) return '<speak></speak>';

  // First apply the same base cleaning as native TTS
  const baseClean = sanitizeForNativeTTS(text);
  if (!baseClean) return '<speak></speak>';

  // Escape XML special characters in the text content
  const escaped = baseClean
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  // Convert punctuation to prosody-encoding SSML break tags.
  // We use short breaks to preserve natural rhythm while eliminating
  // the perception of the TTS engine "resetting" between clauses.
  const ssmlBody = escaped
    // Comma, Semicolon, Colon → Let the Google TTS engine handle them naturally (no break tag)
    // Ellipsis → thoughtful pause (slightly reduced from 400ms to 300ms)
    .replace(/\.\.\.\s*/g, '... <break time="300ms"/>')
    // En-dash / em-dash → short pause
    .replace(/[–—]\s*/g, '— <break time="150ms"/>')
    // Newline that survived → treat as sentence boundary (short pause)
    .replace(/\s+/g, ' ')
    .trim();

  return `<speak>${ssmlBody}</speak>`;
}
