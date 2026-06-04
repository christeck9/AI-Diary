import { useState } from 'react';

export type ModelId = 'gemma4-2b' | 'gemma4-4b';

export interface ModelInfo {
  id: ModelId;
  label: string;
  sizeMB: number;
  description: string;
}

export const AVAILABLE_MODELS: ModelInfo[] = [
  { id: 'gemma4-2b', label: 'Gemma4:2B', sizeMB: 1300, description: 'Ligero — ideal para dispositivos con 4GB RAM' },
  { id: 'gemma4-4b', label: 'Gemma4:4B', sizeMB: 2800, description: 'Potente — requiere 6GB+ RAM' },
];

export function useAppLlm() {
  const [status, setStatus] = useState<'idle' | 'downloading' | 'loading' | 'ready'>('ready');
  const [activeModel, setActiveModel] = useState<ModelInfo | null>(AVAILABLE_MODELS[0]);

  const downloadModel = async (model: ModelInfo) => {
    setStatus('ready');
    setActiveModel(model);
    return 'ready';
  };

  const loadModel = async (
    modelOrOptions?: any,
    options?: { n_threads?: number }
  ) => {
    if (modelOrOptions && typeof modelOrOptions === 'object' && 'id' in modelOrOptions) {
      setActiveModel(modelOrOptions);
    }
    setStatus('ready');
    return 'ready';
  };

  const generateStreamingResponse = async (
    prompt: string,
    onTokenReceived: (text: string) => void,
    onError: (error: string) => void
  ) => {
    try {
      const response = await fetch(`http://localhost:8080/completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt,
          stream: true,
          n_predict: 1024,
          temperature: 0.7,
          stop: ["<eos>", "<end_of_turn>", "<|im_end|>", "<|eot_id|>"]
        })
      });

      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let fullResponse = "";
      let partialLine = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        partialLine += chunk;
        
        const lines = partialLine.split("\n");
        partialLine = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const json = JSON.parse(line.substring(6));
              if (json.content) {
                fullResponse += json.content;
                onTokenReceived(json.content);
              }
            } catch (e) {}
          }
        }
      }
      return fullResponse;
    } catch (e: any) {
      onError(e.message);
      return "";
    }
  };

  return { status, activeModel, downloadModel, loadModel, generateStreamingResponse, AVAILABLE_MODELS };
}
