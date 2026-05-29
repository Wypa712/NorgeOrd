export interface OrdbokeneMeaning {
  definition: string;
}

export interface OrdbokeneData {
  lemma: string;
  wordClass?: string;
  gender?: string;
  forms: Record<string, string>;
  definitions: string[];
  meanings: OrdbokeneMeaning[];
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

function extractFirstDefinition(body: Record<string, unknown>): string | null {
  function walk(elements: unknown[]): string | null {
    for (const el of elements ?? []) {
      const node = el as Record<string, unknown>;
      if (node.type_ === 'explanation' && typeof node.content === 'string' && node.content.trim()) {
        return node.content;
      }
      if (Array.isArray(node.elements)) {
        const found = walk(node.elements);
        if (found) return found;
      }
    }
    return null;
  }
  return walk((body?.definitions as unknown[]) ?? []);
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
  const timeout = setTimeout(() => controller.abort(), 5000);
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

    // Fetch up to 4 articles in parallel; first article is the primary (forms, gender, wordClass)
    const articleIds = ids.slice(0, 4);
    const articles = await Promise.all(
      articleIds.map(id =>
        fetch(`https://ord.uib.no/nn/article/${id}.json`, { signal: controller.signal })
          .then(r => r.ok ? r.json() as Promise<Record<string, unknown>> : null)
          .catch(() => null),
      ),
    );

    const primaryArticle = articles[0];
    if (!primaryArticle) return null;

    const lemmas = primaryArticle.lemmas as Array<Record<string, unknown>> | undefined;
    const lemmaData = lemmas?.[0];
    const paradigms = lemmaData?.paradigm_info as Array<Record<string, unknown>> | undefined;
    const paradigm = paradigms?.[0];

    // One meaning per article (each article = a distinct meaning group)
    const meanings: OrdbokeneMeaning[] = articles
      .filter((a): a is Record<string, unknown> => a !== null)
      .map(a => extractFirstDefinition(a.body as Record<string, unknown>))
      .filter((d): d is string => d !== null)
      .map(definition => ({ definition }));

    return {
      lemma: typeof lemmaData?.lemma === 'string' ? lemmaData.lemma : word,
      wordClass: paradigm ? extractWordClass(paradigm.tags as string[]) : undefined,
      gender: paradigm ? extractGender(paradigm.tags as string[]) : undefined,
      forms: paradigm?.inflection
        ? extractForms(paradigm.inflection as Array<{ tags: string[]; word_form: string }>)
        : {},
      definitions: extractDefinitions(primaryArticle.body as Record<string, unknown>),
      meanings,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
