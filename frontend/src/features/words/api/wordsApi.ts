import api from '../../../lib/api';

export type Gender = 'masculine' | 'feminine' | 'neuter';
export type WordClass = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'sentence' | 'other';
export type Difficulty = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type WordForms = Record<string, string>;

export interface WordTag {
  wordId: string;
  tagId: string;
  tag: { id: string; name: string };
}

export interface WordAnalysis {
  translation?: string;
  gender?: Gender;
  wordClass?: WordClass;
  difficulty?: Difficulty;
  forms?: WordForms;
  examples?: string[];
  tags?: string[];
}

export interface Word {
  id: string;
  userId: string;
  headword: string;
  translation: string | null;
  gender: Gender | null;
  wordClass: WordClass | null;
  difficulty: Difficulty | null;
  notes: string | null;
  personalNote: string | null;
  forms: WordForms | null;
  examples: string[];
  tags: WordTag[];
  rawAiOutput: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWordInput {
  headword: string;
  translation?: string;
  gender?: Gender;
  wordClass?: WordClass;
  notes?: string;
  forms?: WordForms;
  examples?: string[];
  tagNames?: string[];
  difficulty?: Difficulty;
}

export interface UpdateWordInput extends Partial<CreateWordInput> {
  personalNote?: string;
}

export async function listWords(query?: string): Promise<Word[]> {
  const { data } = await api.get('/words', {
    params: query?.trim() ? { q: query.trim() } : undefined,
  });
  return data;
}

export async function createWord(input: CreateWordInput): Promise<Word> {
  const { data } = await api.post('/words', input);
  return data;
}

function parseAnalysisText(data: string): WordAnalysis {
  const trimmed = data.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(withoutFence) as WordAnalysis;
}

export async function analyzeWord(headword: string): Promise<WordAnalysis> {
  const { data } = await api.post('/words/analyze', { headword });
  if (typeof data === 'string') {
    return parseAnalysisText(data);
  }
  return data as WordAnalysis;
}

export async function getWord(id: string): Promise<Word> {
  const { data } = await api.get(`/words/${id}`);
  return data;
}

export async function updateWord(input: UpdateWordInput & { id: string }): Promise<Word> {
  const { id, ...rest } = input;
  const { data } = await api.patch(`/words/${id}`, rest);
  return data;
}

export async function deleteWord(id: string): Promise<void> {
  await api.delete(`/words/${id}`);
}
