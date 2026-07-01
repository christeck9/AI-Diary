import * as SQLite from 'expo-sqlite';
import { louvainCommunities, Edge } from './LouvainCommunity';

// Utils para similitud coseno
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const KnowledgeGraphService = {
  /**
   * Añade un nuevo nodo al grafo y calcula sus aristas automáticamente.
   */
  addNode: async (
    db: SQLite.SQLiteDatabase,
    factId: number,
    summary: string,
    embedding: number[],
    category?: string
  ): Promise<void> => {
    try {
      const embeddingStr = JSON.stringify(embedding);
      const now = Date.now();

      // 1. Insertar nodo
      const result = await db.runAsync(
        `INSERT INTO kg_nodes (fact_id, summary, embedding, created_at, last_accessed, category)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [factId, summary, embeddingStr, now, now, category || null]
      );
      
      const newNodeId = result.lastInsertRowId;

      // 2. Calcular aristas
      await KnowledgeGraphService.calculateEdgesForNode(db, newNodeId, embedding);
      
    } catch (e) {
      console.error('[KG_SERVICE] Error adding node:', e);
    }
  },

  /**
   * Calcula similitud coseno con otros nodos y crea aristas si superan el umbral.
   */
  calculateEdgesForNode: async (
    db: SQLite.SQLiteDatabase,
    nodeId: number,
    nodeEmbedding: number[]
  ): Promise<void> => {
    try {
      const SIMILARITY_THRESHOLD = 0.55;

      // Traer los 500 nodos más recientes para prevenir cuelgues por Full Table Scan
      const rows = await db.getAllAsync<{id: number, embedding: string}>(
        `SELECT id, embedding FROM kg_nodes WHERE id != ? ORDER BY id DESC LIMIT 500`,
        [nodeId]
      );

      await db.withTransactionAsync(async () => {
        for (const row of rows) {
          if (!row.embedding) continue;
          try {
            const otherEmbedding = JSON.parse(row.embedding) as number[];
            const sim = cosineSimilarity(nodeEmbedding, otherEmbedding);

            if (sim >= SIMILARITY_THRESHOLD) {
              await db.runAsync(
                `INSERT INTO kg_edges (source_id, target_id, weight, created_at)
                 VALUES (?, ?, ?, ?)`,
                [nodeId, row.id, sim, Date.now()]
              );
            }
          } catch (e) {
            console.warn(`[KG_SERVICE] Error parsing embedding for node ${row.id}`, e);
          }
        }
      });
    } catch (e) {
      console.error('[KG_SERVICE] Error calculating edges:', e);
    }
  },

  /**
   * Aplica el algoritmo de Louvain para agrupar nodos en comunidades.
   */
  detectCommunities: async (db: SQLite.SQLiteDatabase): Promise<void> => {
    console.log('[KG_SERVICE] Iniciando detección autónoma de comunidades (Louvain)...');
    try {
      // 1. Leer nodos y aristas
      const nodeRows = await db.getAllAsync<{id: number}>('SELECT id FROM kg_nodes');
      const edgeRows = await db.getAllAsync<{source_id: number, target_id: number, weight: number}>(
        'SELECT source_id, target_id, weight FROM kg_edges'
      );

      const nodes = nodeRows.map(n => n.id);
      const edges: Edge[] = edgeRows.map(e => ({
        source: e.source_id,
        target: e.target_id,
        weight: e.weight
      }));

      // 2. Ejecutar Louvain
      const communitiesMap = louvainCommunities(nodes, edges, 1.0);

      // Agrupar conteo de nodos por comunidad
      const counts = new Map<number, number>();
      for (const commId of communitiesMap.values()) {
        counts.set(commId, (counts.get(commId) || 0) + 1);
      }

      await db.withTransactionAsync(async () => {
        // 3. Actualizar kg_nodes
        for (const [nodeId, commId] of communitiesMap.entries()) {
          await db.runAsync(
            'UPDATE kg_nodes SET community_id = ? WHERE id = ?',
            [commId, nodeId]
          );
        }

        // 4. Actualizar/Recrear tabla kg_communities
        await db.runAsync('DELETE FROM kg_communities');

        const now = Date.now();
        for (const [commId, count] of counts.entries()) {
          await db.runAsync(
            `INSERT INTO kg_communities (id, label, color, node_count, updated_at)
             VALUES (?, ?, ?, ?, ?)`,
            [
              commId, 
              `Comunidad ${commId}`, // El Juez Filosófico (Capa 2) le dará un nombre/Badge mejor
              '#00ffcc', // Default color
              count,
              now
            ]
          );
        }
      });

      console.log(`[KG_SERVICE] Louvain detectó ${counts.size} comunidades.`);
    } catch (e) {
      console.error('[KG_SERVICE] Error detectando comunidades:', e);
    }
  },

  /**
   * Poda el grafo para respetar los límites de Hardware (maxNodes = 500).
   * Elimina los nodos más viejos o menos accedidos.
   */
  pruneGraph: async (db: SQLite.SQLiteDatabase, maxNodes: number = 500): Promise<void> => {
    try {
      const result = await db.getFirstAsync<{count: number}>('SELECT COUNT(*) as count FROM kg_nodes');
      const count = result?.count || 0;

      if (count > maxNodes) {
        const excess = count - maxNodes;
        console.log(`[KG_SERVICE] Límite de hardware excedido. Purgando ${excess} nodos...`);

        // Borrar los nodos más viejos y menos accedidos
        // Las restricciones ON DELETE CASCADE de SQLite limpiarán kg_edges automáticamente
        await db.runAsync(`
          DELETE FROM kg_nodes 
          WHERE id IN (
            SELECT id FROM kg_nodes 
            ORDER BY last_accessed ASC, created_at ASC 
            LIMIT ?
          )
        `, [excess]);

        console.log('[KG_SERVICE] Poda de grafo completada.');
      }
    } catch (e) {
      console.error('[KG_SERVICE] Error podando grafo:', e);
    }
  }
};
