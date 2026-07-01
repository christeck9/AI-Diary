import { type SQLiteDatabase } from 'expo-sqlite';

import { initializeSyntacticMemory } from '../db/syntacticMemorySchema';
import { initializeBadges } from '../db/badgeSchema';
import { initializeKnowledgeGraph } from '../db/knowledgeGraphSchema';
import { initializeTodos } from '../db/todoSchema';
import { initializeCalendar } from '../db/calendarSchema';

export async function initializeDatabase(db: SQLiteDatabase) {
  try {
    // 0. Enable foreign keys and sanitize orphaned edges (for Louvain integrity)
    await db.execAsync('PRAGMA foreign_keys = ON;');
    await db.execAsync('PRAGMA journal_mode = WAL;');
    
    try {
      await db.execAsync('DELETE FROM kg_edges WHERE source_id NOT IN (SELECT id FROM kg_nodes) OR target_id NOT IN (SELECT id FROM kg_nodes);');
    } catch (e) {
      // Table might not exist yet on first run, ignore safely
    }

    // 1. Base Tables
    await db.execAsync(`CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        nickname TEXT,
        work TEXT,
        likes TEXT,
        values_tags TEXT,
        short_term_goal TEXT,
        long_term_goal TEXT,
        response_style_tags TEXT
      );`);

    await db.execAsync(`CREATE TABLE IF NOT EXISTS psy_profile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        O REAL DEFAULT 0, C REAL DEFAULT 0, E REAL DEFAULT 0,
        A REAL DEFAULT 0, N REAL DEFAULT 0, D REAL DEFAULT 0, L REAL DEFAULT 0
      );`);

    await db.execAsync(`CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        thoughts TEXT,
        tool_query TEXT,
        created_at INTEGER
      );`);

    await db.execAsync(`CREATE TABLE IF NOT EXISTS memory_synthesis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start TEXT,
        week_end TEXT,
        summary TEXT,
        message_count INTEGER,
        created_at INTEGER
      );`);

    await db.execAsync(`CREATE TABLE IF NOT EXISTS sentinel_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT,
        raw_results TEXT,
        intent TEXT,
        ttfb INTEGER DEFAULT 0,
        payload_size INTEGER DEFAULT 0,
        timestamp INTEGER
      );`);

    await db.execAsync(`CREATE TABLE IF NOT EXISTS onboarding_status (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        completed INTEGER DEFAULT 0,
        completed_at INTEGER
      );`);

    await db.execAsync(`CREATE TABLE IF NOT EXISTS session_folding (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        folded_text TEXT,
        updated_at INTEGER
      );`);

    await db.execAsync(`CREATE TABLE IF NOT EXISTS document_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        text TEXT NOT NULL,
        embedding TEXT NOT NULL
      );`);

    await db.execAsync(`CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        theme TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'active',
        summary TEXT,
        created_at INTEGER NOT NULL
      );`);

    await db.execAsync(`CREATE TABLE IF NOT EXISTS library_books (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        year TEXT,
        file_path TEXT NOT NULL,
        last_read_page INTEGER DEFAULT 1,
        total_pages INTEGER DEFAULT 0,
        is_indexed INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );`);

    // 2. Virtual Tables (FTS5)
    await db.execAsync(`CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(id UNINDEXED, role UNINDEXED, text);`);

    // 3. Legacy Migrations (for older versions)
    const safeAddColumn = async (tableName: string, columnName: string, columnDef: string) => {
      // Verificación estricta (Whitelist) para prevenir inyecciones SQL
      const validTables = ['user_profile', 'psy_profile', 'messages', 'memory_synthesis', 'sentinel_audit', 'document_chunks', 'zen_flora', 'zen_tree', 'kg_nodes', 'kg_edges', 'kg_communities', 'knowledge_base', 'projects', 'library_books'];
      if (!validTables.includes(tableName)) {
        console.error(`[DATABASE] Intento de migración en tabla inválida: ${tableName}`);
        return;
      }
      // Sanitizar el nombre de la columna permitiendo solo alfanuméricos y guiones bajos
      if (!/^[a-zA-Z0-9_]+$/.test(columnName)) {
        console.error(`[DATABASE] Nombre de columna inválido: ${columnName}`);
        return;
      }

      try {
        const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName});`);
        const exists = columns.some(col => col.name === columnName);
        if (!exists) {
          await db.runAsync(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef};`);
          console.log(`[DATABASE] Migrated: added column ${columnName} to ${tableName}`);
        }
      } catch (err) {
        console.warn(`[DATABASE] Failed to check or add column ${columnName} to ${tableName}:`, err);
      }
    };

    // Índice de rendimiento para historial de mensajes
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);`);

    await safeAddColumn('messages', 'thoughts', 'TEXT');
    await safeAddColumn('messages', 'tool_query', 'TEXT');
    await safeAddColumn('user_profile', 'values_tags', 'TEXT');
    await safeAddColumn('user_profile', 'short_term_goal', 'TEXT');
    await safeAddColumn('user_profile', 'long_term_goal', 'TEXT');
    await safeAddColumn('user_profile', 'response_style_tags', 'TEXT');
    await safeAddColumn('psy_profile', 'mood_balance', 'REAL DEFAULT 0');
    await safeAddColumn('psy_profile', 'mbti_type', 'TEXT DEFAULT ""');

    // Initialize Syntactic Memory Sanctuary Infrastructure
    try {
      await initializeSyntacticMemory(db);
    } catch (e) {
      console.error('[DATABASE] Failed to initialize Syntactic Memory:', e);
    }

    try {
      await initializeBadges(db);
    } catch (e) {
      console.error('[DATABASE] Failed to initialize Badges:', e);
    }
    // Initialize Todo List
    try {
      await initializeTodos(db);
    } catch (e) {
      console.error('[DATABASE] Failed to initialize Todo List:', e);
    }

    // Initialize Calendar Events
    try {
      await initializeCalendar(db);
    } catch (e) {
      console.error('[DATABASE] Failed to initialize Calendar Events:', e);
    }

    // Initialize Knowledge Graph (Anima Graph Layer 1)
    try {
      await initializeKnowledgeGraph(db);
    } catch (e) {
      console.error('[DATABASE] Failed to initialize Knowledge Graph:', e);
    }

    // Initialize Recurring Tasks & Automations
    try {
      const { initializeRecurringTasks } = require('../db/recurringTasksSchema');
      await initializeRecurringTasks(db);
    } catch (e) {
      console.error('[DATABASE] Failed to initialize Recurring Tasks:', e);
    }

    console.log('[DATABASE] Initialization successful.');
  } catch (error) {
    console.error('[DATABASE] Initialization error:', error);
    throw error;
  }
}
