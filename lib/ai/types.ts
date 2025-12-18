export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
}

export interface ChatConfig {
  systemPrompt: string;
  welcomeMessage?: string;
  placeholderText?: string;
  title?: string;
  description?: string;
}
