import api from '../../../lib/api';

export async function translate(
  text: string,
  sourceLang: string,
  targetLang: string,
  signal?: AbortSignal,
): Promise<{ text: string; fallback: boolean }> {
  if (sourceLang === targetLang) return { text, fallback: false };
  const response = await api.post<{ text: string; fallback: boolean }>(
    '/translate',
    { text, sourceLang, targetLang },
    { signal },
  );
  return response.data;
}
