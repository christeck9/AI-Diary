/**
 * @deprecated UNUSED_CODE - This file is deprecated and scheduled for deletion. The search orchestrator only uses BraveLlmSearch and wikipedia.
 * 
 * lib/wikidata.ts — Wikidata Atomic Fact Engine
 * 
 * Retrieves structured facts (dates, names, relations) 
 * from Wikidata in a lightweight manner.
 */

import { getIdentity, rotateIdentity } from './IdentityRotator';

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';

interface WikidataSearchResponse {
  search?: Array<{ id: string }>;
}

interface WikidataEntityResponse {
  entities: {
    [qid: string]: {
      labels: { [lang: string]: { value: string } };
      descriptions: { [lang: string]: { value: string } };
    };
  };
}

/**
 * searchEntity - Finds the QID (Unique Identifier) of a topic
 */
async function searchEntity(query: string, lang: string = 'es'): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      action: 'wbsearchentities',
      search: query,
      language: lang,
      format: 'json',
      origin: '*'
    });

    const response = await fetch(`${WIKIDATA_API}?${params.toString()}`, {
      headers: { 'User-Agent': getIdentity() }
    });

    if (response.status === 403) {
      rotateIdentity();
      return null;
    }

    if (!response.ok) return null;

    const data = (await response.json()) as WikidataSearchResponse;
    return data.search?.[0]?.id || null;
  } catch (e) {
    return null;
  }
}

/**
 * getEntityFacts - Retrieves structured data for a given QID
 */
async function getEntityFacts(qid: string, lang: string = 'es'): Promise<string> {
  try {
    const params = new URLSearchParams({
      action: 'wbgetentities',
      ids: qid,
      languages: lang,
      format: 'json',
      origin: '*'
    });

    const response = await fetch(`${WIKIDATA_API}?${params.toString()}`, { 
      headers: { 'User-Agent': getIdentity() } 
    });

    if (response.status === 403) {
      rotateIdentity();
      return "";
    }
    
    if (!response.ok) return "";

    const data = (await response.json()) as WikidataEntityResponse;
    const entity = data.entities?.[qid];
    
    if (!entity) return "";

    const label = entity.labels[lang]?.value || entity.labels['en']?.value || qid;
    const description = entity.descriptions[lang]?.value || entity.descriptions['en']?.value || "";
    
    return `WIKIDATA_FACT: ${label} - ${description} (Ref: ${qid})`;
  } catch (e) {
    return "";
  }
}

/**
 * wikidataQuery - Orchestrates atomic fact retrieval
 */
export async function wikidataQuery(query: string, lang: 'es' | 'en' = 'es'): Promise<string> {
  const cleanQuery = query.trim();
  console.log(`[WIKIDATA] Querying atomic facts for: "${cleanQuery}"`);
  
  let qid = await searchEntity(cleanQuery, lang);
  
  // Fallback: If no QID is found, attempt to isolate the semantic subject by removing common stop words
  if (!qid) {
    const stopWords = /^(who|what|where|when|is|the|of|current|was|were|a|an|in|on|at|how|many|much|tell|me|about|quien|que|donde|cuando|es|el|la|de|actual|fue|eran|un|una|en|sobre|como|cuantos|dime|del)$/i;
    const keywords = cleanQuery
      .replace(/[?¿!¡.,;]/g, '')
      .split(/\s+/)
      .filter(word => !stopWords.test(word))
      .join(' ')
      .trim();
    
    if (keywords && keywords !== cleanQuery) {
      console.log(`[WIKIDATA] Retrying with semantic subject: "${keywords}"`);
      qid = await searchEntity(keywords, lang);
    }
  }

  if (!qid) return "SENTINEL_NULL_DATA: No se halló registro atómico en Wikidata.";

  const result = await getEntityFacts(qid, lang);
  return result || "SENTINEL_NULL_DATA: No se pudieron extraer hechos del registro.";
}
