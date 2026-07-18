/**
 * KnowledgeManager.ts
 * Date: 2026-05-12
 *
 * Manages persistent fact storage in the knowledge_base SQLite table.
 * Fixed: Was using synchronous db.run/db.all (better-sqlite3 style) which
 * is incompatible with expo-sqlite's async API. Now uses proper async methods.
 *
 * Requires: db.knowledge_base table initialized by syntacticMemorySchema.ts
 */

import { type SQLiteDatabase } from 'expo-sqlite';

export interface Fact {
  fact: string;
  confidence: number;
  category?: string;
  source?: string;
}

export class KnowledgeManager {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Saves a fact to the knowledge_base table.
   */
  async saveFact(fact: Fact): Promise<number | null> {
    try {
      const result = await this.db.runAsync(
        `INSERT INTO knowledge_base (category, fact, confidence, timestamp)
         VALUES (?, ?, ?, ?)`,
        [
          fact.category || 'Sabiduría',
          fact.fact,
          fact.confidence ?? 1.0,
          Date.now(),
        ]
      );
      return result.lastInsertRowId;
    } catch (error) {
      console.error(`[KnowledgeManager] Error saving fact:`, error);
      throw error;
    }
  }

  /**
   * Retrieves facts by category using the async expo-sqlite API.
   */
  async getFactsByCategory(category: string): Promise<Fact[]> {
    try {
      return await this.db.getAllAsync<Fact>(
        'SELECT fact, confidence, category FROM knowledge_base WHERE category = ? ORDER BY timestamp DESC LIMIT 50',
        [category]
      );
    } catch (error) {
      console.error(`[KnowledgeManager] Error retrieving facts:`, error);
      return [];
    }
  }

  /**
   * Builds the Seed Memory map by grouping facts by category.
   * Returns a structured string for the LLM prompt.
   */
  async getSeedMemoryMap(): Promise<string> {
    try {
      const rows = await this.db.getAllAsync<{ category: string, facts: string }>(
        `SELECT category, GROUP_CONCAT(fact, ' | ') as facts 
         FROM knowledge_base 
         GROUP BY category 
         ORDER BY MAX(timestamp) DESC`
      );
      
      if (!rows || rows.length === 0) return 'No hay conceptos almacenados.';

      return rows.map(row => `- ${row.category}: ${row.facts}`).join('\n');
    } catch (error) {
      console.error(`[KnowledgeManager] Error building seed memory map:`, error);
      return '';
    }
  }

  /**
   * Clears all facts from the knowledge_base.
   * ⚠️ Destructive — only call from the Vault UI with explicit user confirmation.
   */
  async clearMemory(): Promise<void> {
    try {
      await this.db.runAsync('DELETE FROM knowledge_base');
      console.log('[KnowledgeManager] knowledge_base cleared.');
    } catch (error) {
      console.error(`[KnowledgeManager] Error clearing memory:`, error);
    }
  }
}

/**
 * Factory function — returns a KnowledgeManager bound to an active db instance.
 * Usage: const km = createKnowledgeManager(db);
 */
export function createKnowledgeManager(db: SQLiteDatabase): KnowledgeManager {
  return new KnowledgeManager(db);
}