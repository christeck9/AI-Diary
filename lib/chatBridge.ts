
export interface TestDescriptionRequest {
  prompt: string;
  testType: string;
  results: any;
}

type ChatMessageHandler = (request: TestDescriptionRequest) => Promise<void>;


let handler: ChatMessageHandler | null = null;

export const chatBridge = {
  registerHandler: (h: ChatMessageHandler) => {
    handler = h;
  },
  sendTestDescription: async (request: TestDescriptionRequest): Promise<void> => {
    if (!handler) {
      throw new Error('Chat handler is not registered');
    }
    return handler(request);
  },
};

