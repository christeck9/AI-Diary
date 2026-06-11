import * as SQLite from 'expo-sqlite';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  🌿 ESQUEMA DE BASE DE DATOS: ANIMA HARNESS (Jardín Zen) 🌿      ║
 * ║                                                                  ║
 * ║  Esta arquitectura almacena el ecosistema visual del usuario     ║
 * ║  (Semillas, Flora, y los Atributos del Árbol del Sí Mismo).      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

export async function initializeZenGarden(db: SQLite.SQLiteDatabase): Promise<void> {
  console.log('[DB] Inicializando Anima Harness (Jardín Zen)...');
  try {
    // Tabla para la Flora (Hierbas, Cactus, Lotos y Semillas)
    // - type: 'seed', 'herb', 'cactus', 'lotus'
    // - status: 'growing', 'mature', 'transformed' (un cactus superado se transforma)
    await db.execAsync(`CREATE TABLE IF NOT EXISTS zen_flora (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL CHECK(type IN ('seed', 'herb', 'cactus', 'lotus')),
        status TEXT NOT NULL CHECK(status IN ('growing', 'mature', 'transformed')),
        related_message_id TEXT,
        created_at INTEGER NOT NULL,
        transformed_at INTEGER
      );`);

    // Migration helper for schema changes
    const addFloraColumn = async (columnName: string, columnDef: string) => {
      try {
        const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(zen_flora);`);
        const exists = columns.some(col => col.name === columnName);
        if (!exists) {
          await db.runAsync(`ALTER TABLE zen_flora ADD COLUMN ${columnName} ${columnDef};`);
          console.log(`[DATABASE] Zen Garden Migrated: added column ${columnName} to zen_flora`);
        }
      } catch (err) {
        console.warn(`[DATABASE] Failed to check or add column ${columnName} to zen_flora:`, err);
      }
    };

    await addFloraColumn('category', 'TEXT');
    await addFloraColumn('label', 'TEXT');

    // Tabla para el Árbol del Sí Mismo (Axis Mundi)
    // Usamos una fila única (id=1) para guardar los atributos activos.
    await db.execAsync(`CREATE TABLE IF NOT EXISTS zen_tree (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        strength REAL DEFAULT 0.0,
        equanimity REAL DEFAULT 0.0,
        wisdom REAL DEFAULT 0.0,
        updated_at INTEGER NOT NULL
      );`);

    // Asegurar que exista la fila inicial del árbol si no existe
    const treeExists = await db.getFirstAsync<{ id: number }>("SELECT id FROM zen_tree WHERE id = 1");
    if (!treeExists) {
      await db.runAsync(
        "INSERT INTO zen_tree (id, strength, equanimity, wisdom, updated_at) VALUES (1, 0, 0, 0, ?)",
        [Date.now()]
      );
      console.log('[DB] Semilla del Árbol del Sí Mismo plantada.');
    }

    console.log('[DB] Anima Harness (Jardín Zen) forjado exitosamente.');
  } catch (error) {
    console.error('[DB] Error crítico al inicializar el Jardín Zen:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------
// MÉTODOS REPOSITORIO (CRUD) PARA EL LLM Y LA UI
// ----------------------------------------------------------------------

export async function plantSeed(db: SQLite.SQLiteDatabase, relatedMessageId?: string, category?: string, label?: string): Promise<void> {
  await db.runAsync(
    "INSERT INTO zen_flora (type, status, related_message_id, category, label, created_at) VALUES ('seed', 'growing', ?, ?, ?, ?)",
    [relatedMessageId || null, category || null, label || null, Date.now()]
  );
}

export async function growFlora(db: SQLite.SQLiteDatabase, type: 'herb' | 'cactus' | 'lotus', relatedMessageId?: string, category?: string, label?: string): Promise<void> {
  await db.runAsync(
    "INSERT INTO zen_flora (type, status, related_message_id, category, label, created_at) VALUES (?, 'mature', ?, ?, ?, ?)",
    [type, relatedMessageId || null, category || null, label || null, Date.now()]
  );
}

export async function transformFlora(db: SQLite.SQLiteDatabase, floraId: number): Promise<void> {
  await db.runAsync(
    "UPDATE zen_flora SET status = 'transformed', transformed_at = ? WHERE id = ?",
    [Date.now(), floraId]
  );
}

export async function updateTreeAttribute(db: SQLite.SQLiteDatabase, attribute: 'strength' | 'equanimity' | 'wisdom', valueToAdd: number): Promise<void> {
  const column = attribute; // Safe because of TypeScript type checking
  await db.runAsync(
    `UPDATE zen_tree SET ${column} = ${column} + ?, updated_at = ? WHERE id = 1`,
    [valueToAdd, Date.now()]
  );
}

export async function getZenGardenState(db: SQLite.SQLiteDatabase) {
  const flora = await db.getAllAsync("SELECT * FROM zen_flora ORDER BY created_at DESC LIMIT 50");
  const tree = await db.getFirstAsync("SELECT * FROM zen_tree WHERE id = 1");
  return { flora, tree };
}

export async function getAnimaMessage(db: SQLite.SQLiteDatabase, lang: 'es' | 'en'): Promise<string> {
  try {
    // 1. Check if there are seeds waiting to germinate
    const seeds = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM zen_flora WHERE type = 'seed' AND status = 'growing'"
    );
    if (seeds && seeds.count > 0) {
      return lang === 'es'
        ? "Una semilla está esperando germinar en tu Jardín."
        : "A seed is waiting to germinate in your Garden.";
    }

    // 2. Check if there is flora matured in the last 24 hours
    const recentFlora = await db.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) as count FROM zen_flora WHERE type IN ('herb', 'cactus', 'lotus') AND status = 'mature' AND created_at > ?",
      [Date.now() - 24 * 60 * 60 * 1000]
    );
    if (recentFlora && recentFlora.count > 0) {
      return lang === 'es'
        ? "¡Ha crecido una flor nueva en tu jardín!"
        : "A new flower has grown in your garden!";
    }

    // 3. Fallback welcome message / AI Diary presentation
    return lang === 'es'
      ? "Hola, soy tu Diario de IA"
      : "Hi, I'm AI Diary";
  } catch (e) {
    return lang === 'es'
      ? "Hola, soy tu Diario de IA"
      : "Hi, I'm AI Diary";
  }
}
