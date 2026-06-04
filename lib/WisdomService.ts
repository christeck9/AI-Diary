import * as SQLite from 'expo-sqlite';

/**
 * WisdomService
 * 
 * Manages the retrieval of persistent facts using SQLite FTS5 and BM25 ranking.
 */

/**
 * Sanitizes input to prevent syntax errors in the FTS5 engine.
 * Supports Unicode characters to ensure compatibility with multiple languages (e.g., Spanish).
 */
function sanitizeFtsQuery(input: string): string {
  if (!input) return "";
  
  // Remove special characters that could break FTS5 syntax, preserving Unicode letters and numbers
  const cleaned = input.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").trim();
  if (!cleaned) return "";
  
  // Create an OR query with prefixes for maximum coverage
  return cleaned.split(/\s+/).filter(Boolean).map((t) => `${t}*`).join(" OR ");
}

export const WisdomService = {
  /**
   * Queries the knowledge base and returns a formatted context block.
   */
  getWisdomContext: async (db: SQLite.SQLiteDatabase, userInput: string): Promise<string> => {
    if (!db || !userInput) return "";

    const query = sanitizeFtsQuery(userInput);
    if (!query) return "";

    try {
      // BM25 devuelve valores negativos donde el más bajo (más negativo) es el más relevante.
      // Por eso ordenamos ASC (Ascendente).
      const rows = await db.getAllAsync<{category: string, fact: string}>(`
        SELECT kb.category, kb.fact, bm25(knowledge_base_fts) AS rank
        FROM knowledge_base_fts fts
        JOIN knowledge_base kb ON kb.id = fts.rowid
        WHERE knowledge_base_fts MATCH ?
        ORDER BY rank ASC
        LIMIT 5;
      `, [query]);

      if (rows.length === 0) return "";

      // Build the retrieved knowledge block
      let wisdom = `\n[KNOWLEDGE_BASE - CONFIRMED FACTS]:\n`;
      rows.forEach(row => {
        wisdom += `- (${row.category}): ${row.fact}\n`;
      });
      
      console.log(`[WISDOM_SERVICE] Knowledge retrieved for: "${userInput.substring(0, 20)}..."`);
      return wisdom;

    } catch (error) {
      console.warn("[WISDOM_SERVICE] Error en recuperación FTS5:", error);
      return "";
    }
  }
};
