import { streamObject, streamText } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';
import type { OrdbokeneData } from './ordbokene';

export const wordAnalysisSchema = z.object({
  translation: z.string().optional(),
  definition: z.string().optional(),
  synonyms: z.array(z.string()).optional(),
  gender: z.enum(['masculine', 'feminine', 'neuter']).optional(),
  wordClass: z.enum(['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'sentence', 'other']).optional(),
  difficulty: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']).optional(),
  forms: z.record(z.string(), z.string()).optional(),
  examples: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type WordAnalysis = z.infer<typeof wordAnalysisSchema>;

const groq = createGroq();

function buildGroundingSection(data: OrdbokeneData): string {
  const formsList = Object.entries(data.forms)
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');
  const defsList = data.definitions.map((d, i) => `  ${i + 1}. ${d}`).join('\n');
  return `
AUTHORITATIVE DATA from Nynorskordboka (official dictionary — treat as ground truth):
- Lemma: ${data.lemma}
${data.wordClass ? `- Word class: ${data.wordClass}` : ''}
${data.gender ? `- Gender: ${data.gender}` : ''}
${formsList ? `- Official inflection forms:\n${formsList}` : ''}
${defsList ? `- Official Nynorsk definitions:\n${defsList}` : ''}

Use this data directly for wordClass, gender, and forms. Your main task is to add the Ukrainian translation and format everything as required.
`.trim();
}

function buildAnalysisPrompt(headword: string, ordbokene?: OrdbokeneData | null): string {
  return `
You are an expert in Nynorsk Norwegian (nynorsk), one of the two written standards of Norwegian.
Analyze the Nynorsk input "${headword}" and return structured data. The input can be a single word or a full sentence.
${ordbokene ? `\n${buildGroundingSection(ordbokene)}\n` : ''}

CRITICAL - Use ONLY Nynorsk forms, never Bokmal:
- Plural definite of "hus" -> "husa" (NOT "husene" which is Bokmal)
- Negation -> "ikkje" (NOT "ikke")
- First person singular pronoun -> "eg" (NOT "jeg")
- Feminine nouns use -a suffix in definite: "boka", "sola", "jenta"
- Verb infinitives often end in -a in Nynorsk: "skriva", "lesa", "gjera"

Return a JSON object with these fields:
- translation: Ukrainian translation (short, 1-5 words)
- definition: two short sentences separated by " — ": first a Nynorsk dictionary-style definition, then its Ukrainian translation. Example: "Eit hus er ein bygning der folk bur. — Будинок — споруда, де живуть люди."
- synonyms: array of 2-4 Nynorsk synonyms or closely related words/phrases (omit if none exist)
- gender: "masculine", "feminine", or "neuter" (for nouns only, omit for other classes)
- wordClass: one of "noun", "verb", "adjective", "adverb", "pronoun", "sentence", "other"
- difficulty: CEFR level - one of "A1", "A2", "B1", "B2", "C1", "C2"
- forms: flat object with Nynorsk inflection forms:
    nouns: { sing_indef, sing_def, pl_indef, pl_def }
      - sing_indef MUST include the indefinite article based on gender: "ein" (masculine), "ei" (feminine), "eit" (neuter) — e.g. "ein bil", "ei bok", "eit hus"
      - sing_def, pl_indef, pl_def: just the inflected form, no article — e.g. "bilen", "bilar", "bilane"
    verbs: { inf, pres, past, past_part }
      - inf value MUST start with "å": e.g. "å skriva", "å lesa"
      - past_part value MUST start with "har": e.g. "har skrive", "har lese"
    adjectives: { positive, comparative, superlative }
    pronouns/adverbs/sentences/other: {} (empty object)
- If the input is a full sentence or phrase, set wordClass to "sentence" and forms to {}
- examples: array of 2-3 short strings, each containing a Nynorsk example sentence and its Ukrainian translation, formatted like "Eg bur i Noreg. — Я живу в Норвегії."
- tags: array of 2-4 English topic tags (e.g. "house", "nature", "body", "daily life")
`.trim();
}

interface WordContext {
  headword: string;
  translation: string | null;
  wordClass: string | null;
  gender: string | null;
  difficulty: string | null;
  forms: unknown;
  examples: string[];
  notes: string | null;
}

function buildChatSystemPrompt(word: WordContext): string {
  const formsList = word.forms && typeof word.forms === 'object'
    ? Object.entries(word.forms as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(', ')
    : '';
  return `
You are a Nynorsk Norwegian language tutor helping a Ukrainian learner study the word/phrase: "${word.headword}".

Word context:
- Translation: ${word.translation ?? '—'}
- Word class: ${word.wordClass ?? '—'}
- Gender: ${word.gender ?? '—'}
- CEFR level: ${word.difficulty ?? '—'}
${formsList ? `- Forms: ${formsList}` : ''}
${word.examples.length ? `- Examples: ${word.examples.join(' | ')}` : ''}
${word.notes ? `- Notes: ${word.notes}` : ''}

Your role: explain usage, give additional Nynorsk examples with Ukrainian translations, clarify grammar, answer questions about this word.
Always use Ukrainian for explanations. Use Nynorsk (never Bokmål) for any Norwegian text.
Keep answers concise and practical.
`.trim();
}

export function chatAboutWord(
  word: WordContext,
  messages: { role: 'user' | 'assistant'; content: string }[],
) {
  return streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: buildChatSystemPrompt(word),
    messages,
  });
}

export function analyzeWord(headword: string, ordbokene?: OrdbokeneData | null) {
  return streamObject({
    model: groq('llama-3.3-70b-versatile'),
    schema: wordAnalysisSchema,
    prompt: buildAnalysisPrompt(headword, ordbokene),
  });
}
