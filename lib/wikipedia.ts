import { getIdentity, rotateIdentity } from './IdentityRotator';

interface WikiPage {
  title: string;
  extract: string;
  lang: string;
  url: string;
}

const COMMON_FIRST_NAMES = new Set([
  'sara', 'sarah', 'maria', 'jose', 'juan', 'john', 'david', 'ana', 'luis', 'carlos', 'jorge', 'pedro', 
  'miguel', 'angel', 'paul', 'mary', 'james', 'robert', 'william', 'alex', 'mark', 'tom', 'sam', 
  'daniel', 'manuel', 'antonio', 'francisco', 'jesus', 'alejandro', 'santiago', 'sebastian', 'mateo', 
  'nicolas', 'diego', 'samuel', 'benjamin', 'lucas', 'alexander', 'michael', 'christopher', 'matthew', 
  'joshua', 'andrew', 'joseph', 'elizabeth', 'jennifer', 'laura', 'cristina', 'marta', 'carmen', 
  'alicia', 'andrea', 'sofia', 'camila', 'valentina', 'isabella', 'valeria', 'daniela', 'mariana',
  'pablo', 'fernando', 'ricardo', 'roberto', 'eduardo', 'hugo', 'alvaro', 'adrian', 'marcos', 
  'javier', 'enrique', 'alberto', 'ramon', 'vicente', 'raul', 'julio', 'cesar', 'sergio',
  'lisa', 'susan', 'karen', 'jessica', 'emily', 'ashley', 'brian', 'kevin', 'jason', 'jeff', 
  'tim', 'timothy', 'richard', 'charles', 'thomas'
]);

const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 5000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * fetchWikiSummary - Retrieves a summary of a Wikipedia page
 */
async function fetchWikiSummary(query: string, lang: string): Promise<WikiPage | null> {
  try {
    const endpoint = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/\s+/g, '_'))}`;
    const response = await fetchWithTimeout(endpoint, { headers: { 'User-Agent': getIdentity() } });
    
    if (response.status === 403) {
      rotateIdentity();
      return null;
    }

    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.type === 'disambiguation') return null;

    return {
      title: data.title,
      extract: data.extract,
      lang: lang,
      url: data.content_urls?.desktop?.page || `https://${lang}.wikipedia.org/wiki/${data.title}`
    };
  } catch (e) {
    return null;
  }
}

/**
 * fetchWikiPageData - Retrieves detailed page content (Lead section)
 */
async function fetchWikiPageData(title: string, lang: string): Promise<string> {
  try {
    const endpoint = `https://${lang}.wikipedia.org/api/rest_v1/page/mobile-sections/${encodeURIComponent(title.replace(/\s+/g, '_'))}`;
    const response = await fetchWithTimeout(endpoint, { headers: { 'User-Agent': getIdentity() } });
    
    if (response.status === 403) {
      rotateIdentity();
      return "";
    }
    
    if (!response.ok) return "";

    const data = await response.json();
    const lead = data.lead?.sections?.[0]?.text || "";
    return lead.replace(/<\/?[^>]+(>|$)/g, " ").replace(/\s+/g, ' ').trim().substring(0, 1500);
  } catch (e) {
    return "";
  }
}

/**
 * fetchWikiInfobox - Extracts structured data from the page Infobox
 */
async function fetchWikiInfobox(title: string, lang: string): Promise<string> {
  try {
    const endpoint = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvsection=0&titles=${encodeURIComponent(title)}&format=json&origin=*`;
    const response = await fetchWithTimeout(endpoint, { headers: { 'User-Agent': getIdentity() } });
    
    if (response.status === 403) {
      rotateIdentity();
      return "";
    }
    
    const data = await response.json();
    const pages = data.query?.pages;
    if (!pages) return "";
    
    const pageId = Object.keys(pages)[0];
    if (pageId === "-1") return ""; // Page not found
    
    const revisions = pages[pageId].revisions;
    if (!revisions || revisions.length === 0) return "";
    
    const content = revisions[0]['*'];

    const infoboxMatch = content.match(/\{\{Infobox[\s\S]*?\n\}\}/i);
    if (!infoboxMatch) return "";

    const rawInfobox = infoboxMatch[0];
    const facts = rawInfobox
      .split('\n')
      .filter((line: string) => line.startsWith('|'))
      .map((line: string) => {
        const parts = line.split('=');
        if (parts.length < 2) return null;
        const key = parts[0].replace('|', '').trim();
        const value = parts[1].replace(/\[\[|\]\]|\{\{|\}\}/g, '').split('<')[0].trim();
        return value ? `${key}: ${value}` : null;
      })
      .filter(Boolean)
      .slice(0, 10);

    return facts.length > 0 ? `### [${lang.toUpperCase()}] FACT BOX:\n${facts.join('\n')}\n` : "";
  } catch (e) {
    return "";
  }
}

/**
 * searchWikiTitles - Searches for the most relevant page titles
 */
async function searchWikiTitles(searchTerm: string, lang: string): Promise<Array<{ title: string }>> {
  try {
    const endpoint = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(searchTerm)}&format=json&origin=*`;
    const response = await fetchWithTimeout(endpoint, { headers: { 'User-Agent': getIdentity() } });
    if (response.status === 403) { rotateIdentity(); return []; }
    const data = await response.json();
    return data.query?.search || [];
  } catch (e) {
    return [];
  }
}

/**
 * getInterWikiTitle - Maps a page title to another language
 */
async function getInterWikiTitle(title: string, fromLang: string, toLang: string): Promise<string | null> {
  try {
    const endpoint = `https://${fromLang}.wikipedia.org/w/api.php?action=query&prop=langlinks&lllang=${toLang}&titles=${encodeURIComponent(title)}&format=json&origin=*`;
    const response = await fetchWithTimeout(endpoint, { headers: { 'User-Agent': getIdentity() } });
    const data = await response.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    const pageId = Object.keys(pages)[0];
    return pages[pageId]?.langlinks?.[0]?.['*'] || null;
  } catch (e) {
    return null;
  }
}

/**
 * wikipediaSearch - Orchestrates bilingual Wikipedia data retrieval
 */
export async function wikipediaSearch(query: string, preferredLang: 'es' | 'en' = 'es'): Promise<string> {
  const cleanQuery = query.trim();
  const otherLang = preferredLang === 'es' ? 'en' : 'es';

  // 1. Direct attempt
  const primarySummary = await fetchWikiSummary(cleanQuery, preferredLang);
  
  if (!primarySummary) {
    let results = await searchWikiTitles(cleanQuery, preferredLang);
    
    const stopWords = /^(who|what|when|where|why|how|is|are|was|were|the|of|in|on|at|by|for|to|with|about|current|actual|news|today|some|give|want|search|find|please|hello|quien|que|cuando|donde|porque|como|es|son|era|fue|el|la|los|las|de|en|un|una|con|sobre|acerca|actual|noticia|noticias|hoy|algo|dame|quiero|busca|buscar|encuentra|favor|hola)$/i;

    if (results.length === 0) {
      const keywords = cleanQuery.split(' ').filter(word => !stopWords.test(word)).join(' ').trim();
      if (keywords && keywords !== cleanQuery) {
        results = await searchWikiTitles(keywords, preferredLang);
      }
    }

    if (results.length > 0) {
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const normalizedTitle = normalize(results[0].title);
      const queryKeywords = normalize(cleanQuery)
        .replace(/[?¿!¡.,;]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.test(word));

      const overlappingKeywords = queryKeywords.filter(kw => normalizedTitle.includes(kw));
      
      let isMatchValid = false;
      if (overlappingKeywords.length > 0) {
        if (overlappingKeywords.length === 1) {
          const singleMatch = overlappingKeywords[0];
          if (!COMMON_FIRST_NAMES.has(singleMatch)) {
            isMatchValid = true;
          } else {
            console.log(`[WIKIPEDIA] Rejected single match on common first name: "${singleMatch}" for query "${cleanQuery}" against title "${results[0].title}"`);
          }
        } else {
          isMatchValid = true;
        }
      }

      if (isMatchValid) {
        return await wikipediaSearch(results[0].title, preferredLang);
      } else {
        console.warn(`[WIKIPEDIA] Discarding irrelevant title match "${results[0].title}" for query "${cleanQuery}" due to lack of valid keyword overlap.`);
      }
    }
    
    return "SENTINEL_NULL_DATA: No se halló registro relevante en Wikipedia.";
  }

  // 2. Deep extraction (Preferred Language Only)
  const [primaryDeep, primaryInfobox] = await Promise.all([
    fetchWikiPageData(primarySummary.title, preferredLang),
    fetchWikiInfobox(primarySummary.title, preferredLang)
  ]);

  // 3. Data Fusion
  let contextPayload = `--- WIKIPEDIA DATA ---\n\n`;
  
  if (primaryInfobox) {
    contextPayload += `[[ FACT BOX ]]\n${primaryInfobox}\n`;
  }

  const text = primaryDeep.length > primarySummary.extract.length ? primaryDeep : primarySummary.extract;
  contextPayload += `### [${preferredLang.toUpperCase()}] CONTENT:\n${text}\n\n`;

  const finalResult = `${contextPayload}Source: ${primarySummary.url}`;
  console.log(`[WIKIPEDIA] Retrieval completed. Length: ${finalResult.length} chars.`);
  return finalResult;
}
