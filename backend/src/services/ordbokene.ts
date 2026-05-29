export interface OrdbokeneData {
  lemma: string;
  wordClass?: string;
  gender?: string;
  forms: Record<string, string>;
  definitions: string[];
}

function extractWordClass(tags: string[]): string | undefined {
  if (tags.includes('NOUN')) return 'noun';
  if (tags.includes('VERB')) return 'verb';
  if (tags.includes('ADJ')) return 'adjective';
  if (tags.includes('ADV')) return 'adverb';
  return undefined;
}

function extractGender(tags: string[]): string | undefined {
  if (tags.includes('Neuter')) return 'neuter';
  if (tags.includes('Feminine')) return 'feminine';
  if (tags.includes('Masculine')) return 'masculine';
  return undefined;
}

function extractForms(inflection: Array<{ tags: string[]; word_form: string }>): Record<string, string> {
  const forms: Record<string, string> = {};
  for (const form of inflection) {
    forms[form.tags.join('_').toLowerCase()] = form.word_form;
  }
  return forms;
}

function extractDefinitions(body: Record<string, unknown>): string[] {
  const defs: string[] = [];
  function walk(elements: unknown[]) {
    for (const el of elements ?? []) {
      const node = el as Record<string, unknown>;
      if (node.type_ === 'explanation' && typeof node.content === 'string' && node.content.trim()) {
        defs.push(node.content);
      }
      if (Array.isArray(node.elements)) walk(node.elements);
    }
  }
  walk((body?.definitions as unknown[]) ?? []);
  return defs.slice(0, 4);
}

async function resolveToLemma(word: string, signal: AbortSignal): Promise<string> {
  const res = await fetch(
    `https://ord.uib.no/api/suggest?q=${encodeURIComponent(word)}&dict=nn&include=i&n=1`,
    { signal },
  );
  if (!res.ok) return word;
  const data = await res.json() as { a?: { inflect?: [string, string[]][] } };
  return data?.a?.inflect?.[0]?.[0] ?? word;
}

export async function fetchOrdbokeneData(word: string): Promise<OrdbokeneData | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    // Try exact lemma match first; if nothing found, resolve inflected form to its base lemma
    let articlesRes = await fetch(
      `https://ord.uib.no/api/articles?w=${encodeURIComponent(word)}&dict=nn`,
      { signal: controller.signal },
    );
    if (!articlesRes.ok) return null;

    let articlesData = await articlesRes.json() as { articles?: { nn?: number[] } };
    let ids = articlesData?.articles?.nn ?? [];

    if (ids.length === 0) {
      const lemma = await resolveToLemma(word, controller.signal);
      if (lemma === word) return null;
      articlesRes = await fetch(
        `https://ord.uib.no/api/articles?w=${encodeURIComponent(lemma)}&dict=nn`,
        { signal: controller.signal },
      );
      if (!articlesRes.ok) return null;
      articlesData = await articlesRes.json() as { articles?: { nn?: number[] } };
      ids = articlesData?.articles?.nn ?? [];
      if (ids.length === 0) return null;
    }

    const articleRes = await fetch(
      `https://ord.uib.no/nn/article/${ids[0]}.json`,
      { signal: controller.signal },
    );
    if (!articleRes.ok) return null;

    const article = await articleRes.json() as Record<string, unknown>;
    const lemmas = article.lemmas as Array<Record<string, unknown>> | undefined;
    const lemmaData = lemmas?.[0];
    const paradigms = lemmaData?.paradigm_info as Array<Record<string, unknown>> | undefined;
    const paradigm = paradigms?.[0];

    return {
      lemma: typeof lemmaData?.lemma === 'string' ? lemmaData.lemma : word,
      wordClass: paradigm ? extractWordClass(paradigm.tags as string[]) : undefined,
      gender: paradigm ? extractGender(paradigm.tags as string[]) : undefined,
      forms: paradigm?.inflection
        ? extractForms(paradigm.inflection as Array<{ tags: string[]; word_form: string }>)
        : {},
      definitions: extractDefinitions(article.body as Record<string, unknown>),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
