import { type SQLiteDatabase } from 'expo-sqlite';

import { initializeSyntacticMemory } from '../db/syntacticMemorySchema';

export async function initializeDatabase(db: SQLiteDatabase) {
  try {
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

    // 2. Virtual Tables (FTS5)
    await db.execAsync(`CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(id UNINDEXED, role UNINDEXED, text);`);

    // 3. Legacy Migrations (for older versions)
    try { await db.runAsync('ALTER TABLE messages ADD COLUMN thoughts TEXT'); } catch (e) {}
    try { await db.runAsync('ALTER TABLE messages ADD COLUMN tool_query TEXT'); } catch (e) {}
    try { await db.runAsync('ALTER TABLE user_profile ADD COLUMN values_tags TEXT'); } catch (e) {}
    try { await db.runAsync('ALTER TABLE user_profile ADD COLUMN short_term_goal TEXT'); } catch (e) {}
    try { await db.runAsync('ALTER TABLE user_profile ADD COLUMN long_term_goal TEXT'); } catch (e) {}
    try { await db.runAsync('ALTER TABLE user_profile ADD COLUMN response_style_tags TEXT'); } catch (e) {}
    try { await db.runAsync('ALTER TABLE psy_profile ADD COLUMN mood_balance REAL DEFAULT 0'); } catch (e) {}
    try { await db.runAsync('ALTER TABLE psy_profile ADD COLUMN mbti_type TEXT DEFAULT ""'); } catch (e) {}

    // Initialize Syntactic Memory Sanctuary Infrastructure
    try {
      await initializeSyntacticMemory(db);
    } catch (e) {
      console.error('[DATABASE] Failed to initialize Syntactic Memory:', e);
    }

    console.log('[DATABASE] Initialization successful.');
  } catch (error) {
    console.error('[DATABASE] Initialization error:', error);
    throw error;
  }
}
