
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface Conversation {
  id: string;
  platform: string;
  title?: string;
  url: string;
  messages: Message[];
}

export interface Adapter {
  detect(): boolean;
  extractConversation(): Conversation | null;
  observeNewTokens(callback: (token: string) => void): () => void;
}

