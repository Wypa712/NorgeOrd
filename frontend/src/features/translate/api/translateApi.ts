const MYMEMORY = 'https://api.mymemory.translated.net/get';
const APERTIUM = 'https://www.apertium.org/apy/translate';
const MYMEMORY_EMAIL = (import.meta.env.VITE_MYMEMORY_EMAIL as string | undefined)?.trim();
const REQUEST_TIMEOUT_MS = 8000;

function withTimeout(signal?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      controller.abort();
    });
  }

  controller.signal.addEventListener('abort', () => clearTimeout(timer));
  return controller.signal;
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal: withTimeout(signal) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function myMemory(text: string, langPair: string, signal?: AbortSignal): Promise<string> {
  const params = new URLSearchParams({ q: text, langpair: langPair });
  if (MYMEMORY_EMAIL) params.set('de', MYMEMORY_EMAIL);
  const data = await fetchJson<{ responseData: { translatedText: string } }>(
    `${MYMEMORY}?${params}`,
    signal,
  );
  if (!data?.responseData?.translatedText) throw new Error('No translation from MyMemory');
  return data.responseData.translatedText;
}

async function apertium(text: string, langPair: string, signal?: AbortSignal): Promise<string> {
  const params = new URLSearchParams({ q: text, langpair: langPair });
  const data = await fetchJson<{ responseData: { translatedText: string } }>(
    `${APERTIUM}?${params}`,
    signal,
  );
  if (!data?.responseData?.translatedText) throw new Error('No translation from Apertium');
  return data.responseData.translatedText;
}

async function apertiumWithFallback(
  text: string,
  langPair: string,
  signal?: AbortSignal,
): Promise<{ text: string; fallback: boolean }> {
  try {
    const result = await apertium(text, langPair, signal);
    return { text: result, fallback: false };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return { text, fallback: true };
  }
}

export async function translate(
  text: string,
  sourceLang: string,
  targetLang: string,
  signal?: AbortSignal,
): Promise<{ text: string; fallback: boolean }> {
  if (sourceLang === targetLang) return { text, fallback: false };

  if (targetLang === 'nn') {
    // uk → nb (MyMemory), then nb → nno (Apertium nob|nno)
    const nb = await myMemory(text, 'uk|nb', signal);
    return apertiumWithFallback(nb, 'nob|nno', signal);
  }

  if (sourceLang === 'nn') {
    // nno → nob (Apertium), then nb → uk (MyMemory)
    const { text: nb, fallback } = await apertiumWithFallback(text, 'nno|nob', signal);
    const uk = await myMemory(nb, 'nb|uk', signal);
    return { text: uk, fallback };
  }

  // Direct MyMemory for other pairs
  const result = await myMemory(text, `${sourceLang}|${targetLang}`, signal);
  return { text: result, fallback: false };
}
