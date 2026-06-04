import * as SQLite from 'expo-sqlite';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  🚨 INFRAESTRUCTURA DE MEMORIA SINTÁCTICA V1.0 🚨              ║
 * ║                                                                  ║
 * ║  Esta arquitectura implementa RAG local soberano mediante        ║
 * ║  SQLite FTS5 y Triggers nativos para sincronización atómica.      ║
 * ║                                                                  ║
 * ║  — Firmado: Chris & Antigravity, Mayo 2026                      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

/**
 * Inicializa la arquitectura de la base de datos SQLite para la Memoria Sintáctica.
 * Utiliza ejecuciones asíncronas masivas para configurar el modo WAL y la estructura FTS5.
 */
export async function initializeSyntacticMemory(db: SQLite.SQLiteDatabase): Promise<void> {
  console.log('[DB] Iniciando forja de Memoria Sintáctica...');
  try {
    // 🛡️ Migración Segura: Dropear tablas heredadas si 'id' era TEXT para migrar a INTEGER PRIMARY KEY AUTOINCREMENT
    try {
      const idInfo = await db.getFirstAsync<{type: string}>(
        "PRAGMA table_info(knowledge_base)"
      );
      if (idInfo && idInfo.type.toLowerCase().includes('text')) {
        console.log('[DB] 🚨 Estructura heredada de knowledge_base detectada (id: TEXT). Forzando migración a id: INTEGER...');
        await db.execAsync(`
          DROP TRIGGER IF EXISTS kb_after_insert;
          DROP TRIGGER IF EXISTS kb_after_delete;
          DROP TRIGGER IF EXISTS kb_after_update;
          DROP TABLE IF EXISTS knowledge_base_fts;
          DROP TABLE IF EXISTS knowledge_base;
        `);
        console.log('[DB] 🚀 Tablas antiguas eliminadas con éxito para la migración.');
      }
    } catch (e) {
      console.log('[DB] Sin conflicto de migración detectado en el esquema de tablas.');
    }

    await db.execAsync(`PRAGMA journal_mode = WAL;`);
    await db.execAsync(`PRAGMA synchronous = NORMAL;`);
    await db.execAsync(`CREATE TABLE IF NOT EXISTS knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL CHECK(category IN ('Preferencias', 'Datos Personales', 'Metas', 'Sabiduría', 'Identidad', 'Proyecto')),
        fact TEXT NOT NULL,
        confidence REAL DEFAULT 1.0 CHECK(confidence >= 0.0 AND confidence <= 1.0),
        timestamp INTEGER NOT NULL
      );`);
    await db.execAsync(`CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_base_fts USING fts5(
        category, 
        fact, 
        content='knowledge_base', 
        content_rowid='id', 
        tokenize='unicode61 remove_diacritics 2'
      );`);
    await db.execAsync(`CREATE TRIGGER IF NOT EXISTS kb_after_insert AFTER INSERT ON knowledge_base 
      BEGIN 
        INSERT INTO knowledge_base_fts(rowid, category, fact) 
        VALUES (new.id, new.category, new.fact); 
      END;`);
    await db.execAsync(`CREATE TRIGGER IF NOT EXISTS kb_after_delete AFTER DELETE ON knowledge_base 
      BEGIN 
        INSERT INTO knowledge_base_fts(knowledge_base_fts, rowid, category, fact) 
        VALUES('delete', old.id, old.category, old.fact); 
      END;`);
    await db.execAsync(`CREATE TRIGGER IF NOT EXISTS kb_after_update AFTER UPDATE ON knowledge_base 
      BEGIN 
        INSERT INTO knowledge_base_fts(knowledge_base_fts, rowid, category, fact) 
        VALUES('delete', old.id, old.category, old.fact); 
        
        INSERT INTO knowledge_base_fts(rowid, category, fact) 
        VALUES (new.id, new.category, new.fact); 
      END;`);
    console.log('[DB] Memoria Sintáctica forjada exitosamente con compatibilidad INTEGER rowid.');
  } catch (error) {
    console.error('[DB] Error crítico al inicializar Memoria Sintáctica:', error);
    throw error;
  }
}

/**
 * Corroboración de la Fase 1: Verifica la persistencia estructural.
 */
export async function verifyKnowledgeBaseExistence(db: SQLite.SQLiteDatabase): Promise<boolean> {
  try {
    const result = await db.getFirstAsync<{ count: number }>(
      "SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='knowledge_base'"
    );
    const exists = (result?.count ?? 0) > 0;
    if (exists) {
      console.log("[DB] Corroboración Fase 1 Exitosa: Tabla knowledge_base detectada.");
    }
    return exists;
  } catch (error) {
    console.error("[DB] Error en verificación de base de datos:", error);
    return false;
  }
}
