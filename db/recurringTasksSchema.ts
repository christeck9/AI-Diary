import { type SQLiteDatabase } from 'expo-sqlite';

export async function initializeRecurringTasks(db: SQLiteDatabase): Promise<void> {
  console.log('[DB] Inicializando Tareas Recurrentes...');
  try {
    // 1. Tabla de Tareas Recurrentes
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recurring_tasks (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        preset_key TEXT NOT NULL,
        custom_query TEXT,
        interval_val TEXT NOT NULL,
        last_run INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);

    // 2. Tabla de Reportes Pendientes
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_reports (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL,
        raw_content TEXT NOT NULL,
        summary TEXT,
        is_processed INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES recurring_tasks(id) ON DELETE CASCADE
      );
    `);
    
    console.log('[DB] Tablas de Tareas Recurrentes listas.');
  } catch (error) {
    console.error('[DB] Error al inicializar Tareas Recurrentes:', error);
    throw error;
  }
}
