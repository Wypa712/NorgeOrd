import api from '../../../lib/api';

export interface ChatMessage {
  id: string;
  wordId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface PreviewWordContext {
  headword: string;
  translation: string | null;
  wordClass: string | null;
  gender: string | null;
  difficulty: string | null;
  forms: Record<string, string>;
  examples: string[];
  notes: string | null;
}

export async function getChatHistory(wordId: string): Promise<ChatMessage[]> {
  const { data } = await api.get(`/words/${wordId}/chat`);
  return data;
}

export async function sendChatMessage(wordId: string, message: string): Promise<string> {
  const { data } = await api.post(`/words/${wordId}/chat`, { message }, {
    responseType: 'text',
  });
  return data as string;
}

export async function previewChatMessage(
  wordContext: PreviewWordContext,
  messages: { role: 'user' | 'assistant'; content: string }[],
  message: string,
): Promise<string> {
  const { data } = await api.post('/words/preview-chat', { wordContext, messages, message }, {
    responseType: 'text',
  });
  return data as string;
}
