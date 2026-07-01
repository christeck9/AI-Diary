import * as SQLite from 'expo-sqlite';
import { settingsService } from './SettingsService';

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
      const activeProjId = await settingsService.get('activeProjectId');

      // 1. Búsqueda Literal (BM25)
      // BM25 devuelve valores negativos donde el más bajo es el más relevante.
      const bm25Rows = await db.getAllAsync<{id: number, category: string, fact: string}>(`
        SELECT kb.id, kb.category, kb.fact, bm25(knowledge_base_fts) AS rank
        FROM knowledge_base_fts fts
        JOIN knowledge_base kb ON kb.id = fts.rowid
        WHERE knowledge_base_fts MATCH ?
        ORDER BY rank ASC
        LIMIT 3;
      `, [query]);

      if (bm25Rows.length === 0) return "";

      const initialIds = bm25Rows.map(r => r.id);
      
      // 2. Expansión de Grafo (1-Hop)
      // Buscamos los nodos vecinos (semánticamente conectados) de los resultados encontrados.
      const placeholders = initialIds.map(() => '?').join(',');
      const graphRows = await db.getAllAsync<{id: number, category: string, fact: string, weight: number}>(`
        SELECT * FROM (
          SELECT kb.id, kb.category, kb.fact, e.weight
          FROM kg_nodes n1
          JOIN kg_edges e ON e.source_id = n1.id
          JOIN kg_nodes n2 ON n2.id = e.target_id
          JOIN knowledge_base kb ON kb.id = n2.fact_id
          WHERE n1.fact_id IN (${placeholders})
            AND n2.fact_id NOT IN (${placeholders})
          
          UNION ALL
          
          SELECT kb.id, kb.category, kb.fact, e.weight
          FROM kg_nodes n1
          JOIN kg_edges e ON e.target_id = n1.id
          JOIN kg_nodes n2 ON n2.id = e.source_id
          JOIN knowledge_base kb ON kb.id = n2.fact_id
          WHERE n1.fact_id IN (${placeholders})
            AND n2.fact_id NOT IN (${placeholders})
        )
        ORDER BY weight DESC
        LIMIT 4;
      `, [...initialIds, ...initialIds, ...initialIds, ...initialIds]);

      // Helper function to filter out facts from other/no active projects
      const filterFact = (fact: string) => {
        const match = fact.match(/^\[Proyecto:([^\]]+)\]/);
        if (match) {
          const projId = match[1];
          return activeProjId === projId;
        }
        return true; // Keep general facts
      };

      // 3. Fusión y Deduplicación
      const allFacts = new Map<number, {category: string, fact: string, source: string}>();
      
      bm25Rows.forEach(r => {
        if (filterFact(r.fact)) {
          allFacts.set(r.id, {category: r.category, fact: r.fact, source: 'Memoria Directa'});
        }
      });
      
      graphRows.forEach(r => {
        if (!allFacts.has(r.id) && filterFact(r.fact)) {
          allFacts.set(r.id, {category: r.category, fact: r.fact, source: 'Conexión Semántica'});
        }
      });

      // 4. Construcción del Bloque de Contexto
      let wisdom = `\n[ANIMA GRAPH - KNOWLEDGE RETRIEVAL]:\n`;
      allFacts.forEach((value) => {
        wisdom += `- [${value.source}] (${value.category}): ${value.fact}\n`;
      });
      
      console.log(`[WISDOM_SERVICE] Grafo expandido para: "${userInput.substring(0, 20)}..." (${bm25Rows.length} directos, ${graphRows.length} conexos)`);
      return wisdom;

    } catch (error) {
      console.warn("[WISDOM_SERVICE] Error en Graph RAG:", error);
      return "";
    }
  }
};
