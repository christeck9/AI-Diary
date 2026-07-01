export interface UserProfile {
  name: string;
  nickname: string;
  work: string;
  likes: string;
  communication_style?: 'direct' | 'balanced' | 'analytical';
  formality?: 'casual' | 'formal';
  expertise_level?: 'normal' | 'teacher' | 'phd';
  format_preference?: 'continuous' | 'bullets';
  values: string[];
  shortTermGoal: string;
  longTermGoal: string;
  responseStyle: string[];
}

export interface PsyProfile {
  O: number;
  C: number;
  E: number;
  A: number;
  N: number;
  D: number;
  L: number;
}

export interface Message {
  id: string;
  role: 'user' | 'ai' | 'model' | 'system' | 'tool' | 'ipython' | 'assistant';
  text: string;
  created_at?: number;
  status?: 'pending' | 'sent';
}

// ModelId: restricted to Gemma models and Llama light core.
export type ModelId = 'gemma3-4b-q4' | 'gemma4-e2b-qat' | 'llama3.2-1b-q4';


export interface ModelInfo {
  id: ModelId;
  name: string;
  version: string;
  url: string;
  size: string;
  description: string;
}