import api from '../../../lib/api';

export interface ChatMessage {
  id: string;
  wordId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
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
