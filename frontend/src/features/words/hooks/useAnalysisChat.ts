import { useState } from 'react';
import { previewChatMessage } from '../api/chatApi';
import type { ChatMessage, PreviewWordContext } from '../api/chatApi';

export function useAnalysisChat(wordContext: PreviewWordContext | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const send = async (content: string) => {
    if (!wordContext || !content.trim() || loading) return;
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      wordId: '',
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setLoading(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const response = await previewChatMessage(wordContext, history, content.trim());
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        wordId: '',
        role: 'assistant',
        content: response,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setMessages([]);

  return { messages, loading, send, reset };
}
