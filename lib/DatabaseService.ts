import { SQLiteDatabase } from 'expo-sqlite';

export const DatabaseService = {
  /**
   * Inserta un mensaje y su entrada FTS dentro de una transacción atómica.
   * Garantiza consistencia: o se guardan ambos, o ninguno.
   */
  async insertMessage(
    db: SQLiteDatabase,
    id: string,
    role: string,
    text: string,
    thoughts?: string,
    toolQuery?: string,
  ): Promise<void> {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'INSERT INTO messages (id, role, text, thoughts, tool_query, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [id, role, text, thoughts ?? null, toolQuery ?? null, Date.now()]
      );
      await db.runAsync(
        'INSERT INTO memory_fts (id, role, text) VALUES (?, ?, ?)',
        [id, role, text]
      );
    });
  },

  /**
   * Versión fire-and-forget para paths de baja latencia (voz interactiva).
   * La transacción sigue siendo atómica, pero no se espera a que termine.
   */
  insertMessageAsync(
    db: SQLiteDatabase,
    id: string,
    role: string,
    text: string,
    thoughts?: string,
    toolQuery?: string,
  ): void {
    DatabaseService.insertMessage(db, id, role, text, thoughts, toolQuery)
      .catch(e => console.error('[DB] Insert error:', e));
  }
};
