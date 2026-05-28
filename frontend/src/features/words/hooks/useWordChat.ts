import { useState, useEffect, useRef } from 'react';
import { getChatHistory, sendChatMessage } from '../api/chatApi';
import type { ChatMessage } from '../api/chatApi';
import { toast } from '../../../lib/toastStore';

export function useWordChat(wordId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const loadedForId = useRef<string | null>(null);

  useEffect(() => {
    if (!wordId || wordId === loadedForId.current) return;
    loadedForId.current = wordId;
    getChatHistory(wordId).then(setMessages).catch(() => setMessages([]));
  }, [wordId]);

  const send = async (content: string) => {
    if (!wordId || !content.trim() || loading) return;
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      wordId,
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setLoading(true);
    try {
      const response = await sendChatMessage(wordId, content.trim());
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        wordId,
        role: 'assistant',
        content: response,
        createdAt: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      toast.error('Не вдалося надіслати повідомлення');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    loadedForId.current = null;
    setMessages([]);
  };

  return { messages, loading, send, reset };
}
