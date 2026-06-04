/**
 * BraveLlmSearch.ts
 * 
 * Uses Brave's /v1/llm/context endpoint for data-first real-time web search.
 * Optimizes the response for LLMs with configurable token budgets.
 */

import { getIdentity, rotateIdentity } from './IdentityRotator';
import { distillContext } from './TextUtils';

const BRAVE_LLM_API_URL = 'https://api.search.brave.com/res/v1/llm/context';

interface BraveGenericItem {
  url: string;
  title: string;
  snippets: string[];
}

interface BraveLlmResponse {
  grounding?: {
    generic?: BraveGenericItem[];
  };
}

import * as SecureStore from 'expo-secure-store';
import { settingsService } from './SettingsService';

/**
 * Helper to retrieve the API key.
 * Prioritizes environment variables, then SecureStore, and falls back to app_settings.json.
 */
async function getBraveApiKey(): Promise<string> {
  // 1. Check environment variable (highest priority)
  const envKey = (process.env as any).EXPO_PUBLIC_BRAVE_API_KEY || (process.env as any).BraveAPIKey;
  if (envKey) return envKey;

  // 2. Check SecureStore (medium priority, secure persistence)
  try {
    const secureKey = await SecureStore.getItemAsync('brave_search_api_key');
    if (secureKey && secureKey.trim()) {
      return secureKey.trim();
    }
  } catch (e) {
    // KeyPermanentlyInvalidatedException or similar Android KeyStore failure.
    // Delete the corrupted entry so future writes can succeed.
    console.warn('[BRAVE_LLM] KeyStore error reading API key — clearing corrupted entry:', e);
    try { await SecureStore.deleteItemAsync('brave_search_api_key'); } catch (_) {}
  }

  // 3. Check app_settings.json via SettingsService (fallback)
  try {
    const settings = await settingsService.get();
    if (settings.braveApiKey && settings.braveApiKey.trim()) {
      return settings.braveApiKey.trim();
    }
  } catch (e) {
    console.warn('[BRAVE_LLM] Error reading API key from SettingsService:', e);
  }

  return '';
}

/**
 * Searches the web and returns a pre-digested summary optimized for LLM injection.
 */
export async function searchBraveLlm(query: string, timeoutMs: number = 5000): Promise<string> {
  const apiKey = await getBraveApiKey();
  if (!apiKey) {
    console.error('[BRAVE_LLM] No API Key found.');
    return "NO_DATA";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(BRAVE_LLM_API_URL);
    url.searchParams.append('q', query);
    // Correct parameter is maximum_number_of_tokens, min value is 1024
    url.searchParams.append('maximum_number_of_tokens', '1024');

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'Cache-Control': 'no-cache',
        'X-Subscription-Token': apiKey,
        'User-Agent': getIdentity()
      },
      signal: controller.signal
    });

    if (response.status === 403 || response.status === 401) {
      console.warn('[BRAVE_LLM] Authentication failed or credits exhausted. Rotating identity...');
      rotateIdentity();
      return "NO_DATA";
    }

    if (!response.ok) {
      let errMsg = '';
      try {
        const errJson = await response.json();
        errMsg = JSON.stringify(errJson);
      } catch (_) {
        try {
          errMsg = await response.text();
        } catch (__) {}
      }
      console.error(`[BRAVE_LLM] API Error: ${response.status} ${response.statusText} - Details: ${errMsg}`);
      return "NO_DATA";
    }

    const data: BraveLlmResponse = await response.json();
    
    if (!data || !data.grounding || !data.grounding.generic) {
      return "NO_DATA";
    }

    const chunks: string[] = [];
    // Process up to top 3 search results to control token and character budget
    const itemsToProcess = data.grounding.generic.slice(0, 3);

    for (const item of itemsToProcess) {
      if (item.snippets && item.snippets.length > 0) {
        const rawSnippetsText = item.snippets.join('\n');
        // Distill the raw snippets text using NLP helper to extract the most relevant sentences
        let distilled = distillContext(rawSnippetsText, query, 350);

        // Fallback: if distillContext returns empty or too short (fragments under 30 chars),
        // use a simple substring slice of the original snippets text
        if (!distilled || distilled.trim().length < 30) {
          distilled = rawSnippetsText.substring(0, 350).trim() + "...";
        }

        chunks.push(`Source: ${item.title} (${item.url})\nContent: ${distilled}`);
      }
    }

    if (chunks.length === 0) {
      return "NO_DATA";
    }

    return `\n[BRAVE_LLM_CONTEXT (Verified Web Data)]:\n${chunks.join('\n\n')}\n`;

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[BRAVE_LLM] Request timed out');
    } else {
      console.error('[BRAVE_LLM] Search failed:', error.message || error);
    }
    return "NO_DATA";
  } finally {
    clearTimeout(timeoutId);
  }
}
