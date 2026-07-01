/**
 * TextUtils.ts - Unified Text Processing Utilities
 * Consolidates all text cleaning, sanitization, and query processing
 * FIXED: Eliminates redundant purifyQuery functions scattered across codebase
 */

/**
 * Purifies query text by removing AI artifacts, system tags, and meta-dialogue.
 * Simplifies the query to its core intent for better search results.
 */
export function purifyQuery(query: string): string {
  if (!query) return '';
  
  return query
    .replace(/<[^>]*>/g, '') // Remove XML/HTML tags
    .replace(/\[[^\]]*\]/g, '') // Remove system brackets
    .replace(/^(?:hi|hello|hola|please|por favor|hey|hey there|escucha|dime|encuentra|busca noticias de|investiga qu[eé] caracter[ií]sticas tiene|haz una investigaci[oó]n sobre|do a research on|research about|do some research on|busca en google|busca en la web|buscar en google|buscar en la web|investigar(?:lo|la|los|las|me|nos|se|te|les|le)?|invest[ií]game|invest[ií]ga(?:lo|la|los|las|me|nos|se|te|les|le)?|buscar(?:lo|la|los|las|me|nos|se|te|les|le)?|busc[aá]me|b[uú]sca(?:lo|la|los|las|me|nos|se|te|les|le)?|b[uú]sque(?:lo|la|los|las|me|nos|se|te|les|le)?|googl[eé]a(?:lo|la|los|las|me|nos|se|te|les|le)?|google|websearch|consultar(?:lo|la|los|las|me|nos|se|te|les|le)?|cons[uú]lta(?:lo|la|los|las|me|nos|se|te|les|le)?)\s*,?\s*/gi, '')
    .replace(/(?:the user asked|user asked|searching for|looking up|i need to find|verifying|attempting to|therefore i have to).*?:?/gi, '') // Remove meta-dialogue
    .replace(/\s*(?:en internet|on the web|en la web|por favor)\s*/gi, ' ') // Remove location and polite fluff anywhere
    .replace(/[{}()]/g, '') // Remove structural characters but keep quotes for phrase searching
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitizes web-scraped text for safe transmission.
 * Decodes basic HTML entities and removes tags.
 */
export function sanitizeWebText(text: string): string {
  if (!text) return "";
  
  const entities: Record<string, string> = {
    '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&lt;': '<', '&gt;': '>'
  };
  
  let sanitized = text;
  for (const [entity, value] of Object.entries(entities)) {
    sanitized = sanitized.split(entity).join(value);
  }
  
  return sanitized
    .replace(/<\/?[^>]+(>|$)/g, "")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts the most relevant sentences from long text based on query keywords
 * Used for fact distillation in search results
 */
export function distillContext(rawText: string, query: string, maxChars: number = 350): string {
  if (!rawText) return "";

  const keywords = query.toLowerCase()
    .replace(/[?¿!¡.,;]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);

  const cleanText = rawText.replace(/\[\d+\]/g, '').replace(/\s+/g, ' ');
  const sentences = cleanText.split(/[.!?]+\s+/).filter(s => s.length > 20);
  const identityMarkers = ['is', 'was', 'named', 'president', 'born', 'elected', 'es', 'fue', 'nombrado', 'actual'];
  
  const scoredSentences = sentences.map(s => {
    const sLower = s.toLowerCase();
    let score = 0;
    keywords.forEach(kw => { if (sLower.includes(kw)) score += 5; });
    identityMarkers.forEach(mark => { if (sLower.includes(mark)) score += 3; });
    if (/[A-Z][a-z]+ [A-Z][a-z]+/.test(s)) score += 2;
    return { text: s, score };
  });

  const bestSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.text.trim());

  if (bestSentences.length === 0) return "";

  let result = bestSentences.join('. ');
  if (!result.endsWith('.')) result += '.';
  
  if (result.length > maxChars) {
    result = result.substring(0, maxChars).trim() + "...";
  }
  
  return result;
}

