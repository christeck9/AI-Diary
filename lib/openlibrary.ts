/**
 * OpenLibraryService
 * 
 * Provides access to the Open Library API for bibliographic research and knowledge expansion.
 */

import { sentinelFetch } from './IdentityRotator';
import { purifyQuery } from './TextUtils';

const OPEN_LIBRARY_API = 'https://openlibrary.org/search.json';

export interface OpenLibraryBook {
    title: string;
    author_name?: string[];
    first_publish_year?: number;
    key: string;
}

export interface OpenLibraryResponse {
    docs: OpenLibraryBook[];
    numFound: number;
}

/**
 * Searches for books and treatises related to the given query.
 * Returns a formatted string of recommended bibliography.
 */
export async function consultCodex(query: string): Promise<string> {
    const pureQuery = purifyQuery(query);
    try {
        const params = new URLSearchParams({
            q: pureQuery,
            limit: '3',
            fields: 'title,author_name,first_publish_year,key'
        });

        const response = await sentinelFetch(`${OPEN_LIBRARY_API}?${params.toString()}`);

        if (!response.ok) {
            console.error(`[OPEN_LIBRARY] API Error: ${response.status} ${response.statusText}`);
            return "";
        }

        const data: OpenLibraryResponse = await response.json();
        
        if (!data.docs || data.docs.length === 0) {
            return "";
        }

        const books = data.docs.map((book) => {
            const author = book.author_name ? book.author_name.join(', ') : 'Unknown Author';
            const year = book.first_publish_year || 'N/A';
            return `- "${book.title}" by ${author} (${year})`;
        });

        return `\n--- THE VAULT (Knowledge Expansion) ---\nRecommended Bibliography:\n${books.join('\n')}\n`;

    } catch (error) {
        console.error('[OPEN_LIBRARY] Retrieval failed:', error);
        return "";
    }
}