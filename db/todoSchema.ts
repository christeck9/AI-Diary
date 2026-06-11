import * as SQLite from 'expo-sqlite';

export async function initializeTodos(db: SQLite.SQLiteDatabase): Promise<void> {
  console.log('[DB] Inicializando Todo List...');
  try {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        target_date TEXT,
        target_time TEXT,
        created_at INTEGER NOT NULL
      );`);
    console.log('[DB] Tabla de Todos lista.');
  } catch (error) {
    console.error('[DB] Error al inicializar Todos:', error);
    throw error;
  }
}

export type TodoItem = {
  id: number;
  text: string;
  target_date: string | null;
  target_time: string | null;
  created_at: number;
};
