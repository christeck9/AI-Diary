import { BADGE_EVALUATION_GRAMMAR, getBadgeEvaluationPrompt } from './grammars';
import { type SQLiteDatabase } from 'expo-sqlite';
import { incrementBadge } from '../db/badgeSchema';

interface LlamaCompletionOptions {
  prompt: string;
  grammar?: string;
  n_predict?: number;
  temperature?: number;
  stop?: string[];
  slot_id?: number;
  cache_prompt?: boolean;
  isBackground?: boolean;
}

interface LlamaCompletionResponse {
  text: string;
  [key: string]: any;
}

interface LlamaContext {
  completion: (options: LlamaCompletionOptions) => Promise<LlamaCompletionResponse | string>;
}

export class BadgeService {
  async evaluateConversation(
    llamaContext: LlamaContext,
    userMsg: string,
    aiMsg: string,
    db: SQLiteDatabase,
    arch: 'gemma3' | 'gemma4' | 'llama' = 'gemma4'
  ): Promise<{ emoji: string, name: string, count: number } | null> {
    try {
      const prompt = getBadgeEvaluationPrompt(userMsg, aiMsg, arch);

      const response = await llamaContext.completion({
        prompt,
        grammar: BADGE_EVALUATION_GRAMMAR,
        n_predict: 64,
        temperature: 0,
        stop: ["<eos>", "<end_of_turn>", "<|im_end|>", "<|eot_id|>", "<turn|>", "<|turn|>"],
        isBackground: true,
      });

      const text = typeof response === 'string' ? response : response.text;
      if (!text) return null;

      try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.badge_id && parsed.badge_id !== 'NONE') {
          return await incrementBadge(db, parsed.badge_id);
        }
      } catch (parseError) {
        console.log('[BadgeService] Failed to parse badge JSON (expected LLM format mismatch):', parseError);
      }
      return null;
    } catch (error) {
      console.error('[BadgeService] Error during badge evaluation:', error);
      return null;
    }
  }
}

export const badgeService = new BadgeService();
