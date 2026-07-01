import * as SQLite from 'expo-sqlite';

export async function initializeCalendar(db: SQLite.SQLiteDatabase): Promise<void> {
  console.log('[DB] Inicializando Calendar...');
  try {
    await db.execAsync(`CREATE TABLE IF NOT EXISTS calendar_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        message TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );`);
    console.log('[DB] Tabla de Calendar lista.');
  } catch (error) {
    console.error('[DB] Error al inicializar Calendar:', error);
    throw error;
  }
}

export type CalendarEvent = {
  id: number;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string | null; // HH:MM
  message: string;
  created_at: number;
};
