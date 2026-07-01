import * as SQLite from 'expo-sqlite';

function cosineSimilarity(vecA: number[], vecB: number[]) {
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

export const SemanticService = {
  getSemanticContext: async (
    db: SQLite.SQLiteDatabase, 
    userInput: string, 
    generateEmbeddings?: (texts: string[]) => Promise<number[][]>
  ): Promise<string> => {
    if (!db || !userInput || !generateEmbeddings) return "";

    try {
      // Get the embedding for the user's query
      const queryEmbeddings = await generateEmbeddings([userInput]);
      if (!queryEmbeddings || queryEmbeddings.length === 0) return "";
      const queryVector = queryEmbeddings[0];

      // Fetch the most recent chunks from the database to prevent memory exhaustion
      const rows = await db.getAllAsync<{ document_id: string, chunk_index: number, text: string, embedding: string }>(
        `SELECT document_id, chunk_index, text, embedding FROM document_chunks ORDER BY id DESC LIMIT 2000`
      );

      if (rows.length === 0) return "";

      // Compute cosine similarities
      const scoredChunks = rows.map(row => {
        try {
          const chunkVector = JSON.parse(row.embedding) as number[];
          const score = cosineSimilarity(queryVector, chunkVector);
          return { text: row.text, score, doc_id: row.document_id };
        } catch (e) {
          return { text: row.text, score: -1, doc_id: row.document_id };
        }
      });

      // Filter out invalid ones and sort by highest similarity
      let validChunks = scoredChunks.filter(c => c.score > 0.4); // Threshold to filter noise

      // Fallback: If no chunks match the strict 0.4 threshold (e.g. for Spanish/multilingual
      // queries where the monolingual all-MiniLM-L6-v2 model produces lower similarity scores), fallback to 0.3.
      if (validChunks.length === 0) {
        validChunks = scoredChunks.filter(c => c.score > 0.3);
      }

      validChunks.sort((a, b) => b.score - a.score);

      // Select top chunks (e.g., top 5)
      const topChunks = validChunks.slice(0, 5);

      if (topChunks.length === 0) return "";

      let context = `\n[DOCUMENT EXCERPTS - RAG]:\n`;
      topChunks.forEach(chunk => {
        context += `- [Doc: ${chunk.doc_id}] ${chunk.text.substring(0, 500)}...\n`;
      });

      console.log(`[SEMANTIC_SERVICE] Found ${topChunks.length} relevant chunks for: "${userInput.substring(0, 20)}..."`);
      return context;
    } catch (e) {
      console.warn("[SEMANTIC_SERVICE] Error in semantic retrieval:", e);
      return "";
    }
  }
};
