/** @deprecated UNUSED_CODE - This file is deprecated and scheduled for deletion. Search logic is managed by SentinelService and useAgentEngine. */
import { SanctuarySearchOrchestrator } from './tools';

export interface AgentAction {
  type: 'SEARCH' | 'REFLECTION' | 'CLARIFY' | 'NONE';
  payload: string;
}

export class TaskRouter {
  static identifyAction(output: string): AgentAction {
    const searchMatch = output.match(/\[SEARCH:\s*(.+?)\]/);
    if (searchMatch) return { type: 'SEARCH', payload: searchMatch[1] };

    const clarifyMatch = output.match(/\[CLARIFY:\s*(.+?)\]/);
    if (clarifyMatch) return { type: 'CLARIFY', payload: clarifyMatch[1] };

    const reflectionMatch = output.match(/\[PHASE: REFLECTION\]/);
    if (reflectionMatch) return { type: 'REFLECTION', payload: '' };

    return { type: 'NONE', payload: '' };
  }

  static async executeAction(action: AgentAction): Promise<string> {
    switch (action.type) {
      case 'SEARCH':
        // Use the orchestrator for a tiered search approach (starting at level 2 for web)
        return await SanctuarySearchOrchestrator('KNOWLEDGE', action.payload);
      case 'REFLECTION':
        return "REFLECTION_MODE_ACTIVE";
      case 'CLARIFY':
        return "CLARIFICATION_REQUIRED";
      default:
        return "";
    }
  }
}
