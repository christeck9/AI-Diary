import { type SQLiteDatabase } from 'expo-sqlite';

interface LlamaContext {
  completion: (options: any) => Promise<any | string>;
}

export class ContextFoldingService {
  /**
   * Executes asynchronous context folding (Recursive Language Modeling).
   * Takes discarded messages and the previous summary, and generates a new compact summary.
   */
  async foldHistoryThreshold(
    llamaContext: LlamaContext, 
    messagesToDrop: {role: string, text: string}[], 
    db: SQLiteDatabase,
    arch: 'gemma3' | 'gemma4' | 'llama' = 'gemma4'
  ): Promise<void> {
    if (!messagesToDrop || messagesToDrop.length === 0) return;

    try {
      console.log(`[ContextFoldingService] 🗜️ Starting context folding of ${messagesToDrop.length} messages (${arch})...`);

      // 1. Fetch existing folded context
      let currentFolded = '';
      const row = await db.getFirstAsync<{folded_text: string}>('SELECT folded_text FROM session_folding WHERE id = 1');
      if (row && row.folded_text) {
        currentFolded = row.folded_text;
      }

      // 2. Format the dropped messages
      const transcript = messagesToDrop.map(m => `${m.role.toUpperCase()}: ${m.text}`).join('\n');

      const isLlama = arch === 'llama';
      const isGemma4 = arch === 'gemma4';
      
      let startUser = isGemma4 ? '<|turn|>user\n' : '<start_of_turn>user\n';
      let endUser = isGemma4 ? '<|turn|>\n' : '<end_of_turn>\n';
      let startModel = isGemma4 ? '<|turn|>model\n' : '<start_of_turn>model\n';

      if (isLlama) {
        startUser = '<|start_header_id|>user<|end_header_id|>\n\n';
        endUser = '<|eot_id|>\n';
        startModel = '<|start_header_id|>assistant<|end_header_id|>\n\n';
      }

      // 3. Build the highly compressed RLM prompt using dynamic tokens
      let prompt = '';
      if (isLlama) {
        prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\nAct as a cognitive memory compression system.<|eot_id|>\n${startUser}Generate an extremely dense summary (maximum 2 paragraphs) of the following conversation. Extract only the key conclusions, decisions, emotional states, or irrevocable instructions.
If there is a previous summary, merge it with the new information chronologically without losing critical details.

[PREVIOUS EXISTING SUMMARY]:
${currentFolded || 'None. This is the first iteration.'}

[NEW MESSAGES TO INTEGRATE INTO SUMMARY]:
${transcript}${endUser}${startModel}[CONSOLIDATED EPISODIC MEMORY]: `;
      } else {
        prompt = `${startUser}Act as a cognitive memory compression system. Generate an extremely dense summary (maximum 2 paragraphs) of the following conversation. Extract only the key conclusions, decisions, emotional states, or irrevocable instructions.
If there is a previous summary, merge it with the new information chronologically without losing critical details.

[PREVIOUS EXISTING SUMMARY]:
${currentFolded || 'None. This is the first iteration.'}

[NEW MESSAGES TO INTEGRATE INTO SUMMARY]:
${transcript}${endUser}${startModel}[CONSOLIDATED EPISODIC MEMORY]: `;
      }

      const stopTokens = arch === 'llama' 
        ? ["<|eot_id|>", "<|eom_id|>", "<|begin_of_text|>"] 
        : arch === 'gemma3'
          ? ["<eos>", "<end_of_turn>", "<|endoftext|>"]
          : ["<eos>", "<end_of_turn>", "<|turn|>"];

      // 4. Execute completion
      const response = await llamaContext.completion({
        prompt,
        n_predict: 250,
        temperature: 0.1,
        stop: stopTokens,
        isBackground: true,
      });

      let text = typeof response === 'string' ? response : response.text;
      if (!text) return;

      // 🛡️ Remove stop tokens that might leak despite the stop parameter
      text = text.replace(/<\|eot_id\|>|<eos>|<end_of_turn>|<\|turn\|>|<\|im_end\|>|<\|begin_of_text\|>|<\|eom_id\|>|<\|endoftext\|>/g, '');

      const newFoldedText = text.trim();

      // 5. Save back to SQLite
      await db.runAsync(
        'INSERT OR REPLACE INTO session_folding (id, folded_text, updated_at) VALUES (1, ?, ?)',
        [newFoldedText, Date.now()]
      );
      
      console.log('[ContextFoldingService] ✅ Context folding saved successfully in SQLite.');

    } catch (error) {
      console.error('[ContextFoldingService] Critical error during context folding:', error);
    }
  }
}

export const contextFoldingService = new ContextFoldingService();
