/**
 * IdentityRotator.ts
 * Date: 2026-05-12
 *
 * Manages User-Agent rotation for outbound HTTP requests (Freedom Search).
 * Prevents captcha blocks and rate-limiting from web search services.
 */

const UA_POOL: string[] = [
  'Mozilla/5.0 (Linux; Android 14; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.179 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.118 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
];

let currentIndex: number = Math.floor(Math.random() * UA_POOL.length);

/**
 * Returns the current User-Agent string.
 */
export function getIdentity(): string {
  return UA_POOL[currentIndex];
}

/**
 * Advances to the next User-Agent in the rotation pool.
 * Call this before each outbound request to vary identity.
 */
export function rotateIdentity(): void {
  currentIndex = (currentIndex + 1) % UA_POOL.length;
}

/**
 * Universal fetch wrapper for all Sentinel network providers.
 * Includes AbortController, timeout, per-request UA rotation, 
 * and handles 403 automatic rotation if it happens.
 */
export async function sentinelFetch(url: string, options: RequestInit = {}, timeoutMs: number = 5000): Promise<Response> {
  // Rotate identity *before* every request to prevent fingerprinting
  rotateIdentity();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    'User-Agent': getIdentity(),
    ...options.headers,
  };

  try {
    let response = await fetch(url, { ...options, headers, signal: controller.signal });

    if (response.status === 403 || response.status === 401) {
      console.warn(`[SENTINEL_FETCH] Auth/Rate-limit (Status ${response.status}) from ${url.split('?')[0]}. Rotating identity and retrying once...`);
      rotateIdentity();
      // Update header and retry once
      const retryHeaders = { ...headers, 'User-Agent': getIdentity() };
      response = await fetch(url, { ...options, headers: retryHeaders, signal: controller.signal });
    }

    return response;
  } finally {
    clearTimeout(timer);
  }
}
