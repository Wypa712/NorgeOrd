import { streamObject } from 'ai';
import { createGroq } from '@ai-sdk/groq';
import { z } from 'zod';

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

function buildAnalysisPrompt(headword: string): string {
  return `
You are an expert in Nynorsk Norwegian (nynorsk), one of the two written standards of Norwegian.
Analyze the Nynorsk input "${headword}" and return structured data. The input can be a single word or a full sentence.

CRITICAL - Use ONLY Nynorsk forms, never Bokmal:
- Plural definite of "hus" -> "husa" (NOT "husene" which is Bokmal)
- Negation -> "ikkje" (NOT "ikke")
- First person singular pronoun -> "eg" (NOT "jeg")
- Feminine nouns use -a suffix in definite: "boka", "sola", "jenta"
- Verb infinitives often end in -a in Nynorsk: "skriva", "lesa", "gjera"

Return a JSON object with these fields:
- translation: Ukrainian translation (short, 1-5 words)
- definition: a concise Ukrainian dictionary-style definition, 1-2 sentences, explaining what the word/phrase means in context
- synonyms: array of 2-4 Nynorsk synonyms or closely related words/phrases (omit if none exist)
- gender: "masculine", "feminine", or "neuter" (for nouns only, omit for other classes)
- wordClass: one of "noun", "verb", "adjective", "adverb", "pronoun", "sentence", "other"
- difficulty: CEFR level - one of "A1", "A2", "B1", "B2", "C1", "C2"
- forms: flat object with Nynorsk inflection forms:
    nouns: { sing_indef, sing_def, pl_indef, pl_def }
    verbs: { inf, pres, past, past_part }
    adjectives: { positive, comparative, superlative }
    pronouns/adverbs/sentences/other: {} (empty object)
- If the input is a full sentence or phrase, set wordClass to "sentence" and forms to {}
- examples: array of 2-3 short strings, each containing a Nynorsk example sentence and its Ukrainian translation, formatted like "Eg bur i Noreg. — Я живу в Норвегії."
- tags: array of 2-4 English topic tags (e.g. "house", "nature", "body", "daily life")
`.trim();
}

export function analyzeWord(headword: string) {
  return streamObject({
    model: groq('llama-3.3-70b-versatile'),
    schema: wordAnalysisSchema,
    prompt: buildAnalysisPrompt(headword),
  });
}
