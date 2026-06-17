import * as SQLite from 'expo-sqlite';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  🧠 ANIMA GRAPH: CAPA 1 (La Verdad Matemática)                   ║
 * ║                                                                  ║
 * ║  Almacena los nodos (hechos), aristas (similitud semántica) y    ║
 * ║  comunidades (clusters Louvain) de la memoria del usuario.       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

export async function initializeKnowledgeGraph(db: SQLite.SQLiteDatabase): Promise<void> {
  console.log('[DB] Inicializando Grafo de Conocimiento (Anima Graph Capa 1)...');
  try {
    // Nodos del grafo (cada hecho extraído es un nodo)
    // fact_id se enlaza a knowledge_base(id) de la memoria sintáctica
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS kg_nodes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          fact_id INTEGER REFERENCES knowledge_base(id) ON DELETE CASCADE,
          category TEXT,
          summary TEXT NOT NULL,
          embedding TEXT, 
          community_id INTEGER DEFAULT -1,
          strength REAL DEFAULT 1.0,
          created_at INTEGER NOT NULL,
          last_accessed INTEGER
      );
    `);

    // Aristas del grafo (relaciones semánticas entre hechos)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS kg_edges (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_id INTEGER NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
          target_id INTEGER NOT NULL REFERENCES kg_nodes(id) ON DELETE CASCADE,
          weight REAL NOT NULL,
          edge_type TEXT DEFAULT 'semantic',
          created_at INTEGER NOT NULL,
          UNIQUE(source_id, target_id)
      );
    `);

    // Comunidades detectadas (cache del resultado de Louvain)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS kg_communities (
          id INTEGER PRIMARY KEY,
          label TEXT,
          color TEXT,
          node_count INTEGER DEFAULT 0,
          centroid_node_id INTEGER,
          updated_at INTEGER NOT NULL
      );
    `);

    // Indices para performance y búsquedas rápidas de vecinos
    // NOTE: Each index is a separate execAsync call — iOS SQLite rejects multi-statement strings
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_kg_nodes_community ON kg_nodes(community_id);`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_kg_nodes_fact ON kg_nodes(fact_id);`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_kg_edges_source ON kg_edges(source_id);`);
    await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_kg_edges_target ON kg_edges(target_id);`);

    console.log('[DB] Anima Graph (Capa 1) forjado exitosamente.');
  } catch (error) {
    // Do NOT re-throw — a failed knowledge graph init must NOT propagate to the ObjC runtime.
    // Re-throwing here bypasses the JS error boundary and causes SIGABRT on iOS (v1.9.6 crash).
    console.error('[DB] Error al inicializar Anima Graph (non-fatal, app continuará):', error);
  }
}
