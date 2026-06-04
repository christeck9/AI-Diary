import { wikipediaSearch } from './wikipedia';
import { purifyQuery } from './TextUtils';
import { searchBraveLlm } from './BraveLlmSearch';
import { consultCodex } from './openlibrary';
import { SentinelStream } from './SentinelService';

/**
 * SanctuarySearchOrchestrator
 * Orchestrates search across 3 functional layers: Brave LLM Context, Wikipedia, and Codex.
 */
export async function SanctuarySearchOrchestrator(
  stream: SentinelStream, 
  query: string
): Promise<string> {
  const pureQuery = purifyQuery(query);
  console.log(`[Orchestrator] Processing Stream [${stream}]: "${pureQuery}"`);

  // Layer 1: Brave LLM Context API (Motor Primario - Tiempo real)
  if (stream === 'FAST_FACT' || stream === 'DEEP_RESEARCH') {
    const braveResult = await searchBraveLlm(pureQuery);
    if (braveResult && braveResult !== 'NO_DATA') {
      console.log(`[Orchestrator] Layer 1 (Brave) succeeded.`);
      return braveResult;
    }
    console.log(`[Orchestrator] Layer 1 (Brave) failed/exhausted. Falling back to Layer 2...`);
  }

  // Layer 2: Wikipedia (Enciclopédico - Always Free Fallback)
  // Siempre ejecutamos Wikipedia si el stream es KNOWLEDGE, o si Brave falló
  if (stream === 'KNOWLEDGE' || stream === 'FAST_FACT' || stream === 'DEEP_RESEARCH') {
    const wikiResult = await wikipediaSearch(pureQuery, 'es');
    if (wikiResult && !wikiResult.includes('SENTINEL_NULL_DATA')) {
      console.log(`[Orchestrator] Layer 2 (Wikipedia) succeeded.`);
      return wikiResult;
    }
    console.log(`[Orchestrator] Layer 2 (Wikipedia) failed/exhausted.`);
  }

  // Layer 3: Codex / OpenLibrary (Bibliográfico)
  if (stream === 'BIBLIOGRAPHIC') {
    const codexResult = await consultCodex(pureQuery);
    if (codexResult) {
      console.log(`[Orchestrator] Layer 3 (Codex) succeeded.`);
      return codexResult;
    }
  }

  return 'NO_DATA_FOUND: All search paths exhausted.';
}
