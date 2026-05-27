import api from '../../../lib/api';

export interface Word {
  id: string;
  userId: string;
  headword: string;
  translation: string | null;
  gender: 'masculine' | 'feminine' | 'neuter' | null;
  wordClass: 'noun' | 'verb' | 'adjective' | 'adverb' | 'other' | null;
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | null;
  notes: string | null;
  personalNote: string | null;
  forms: unknown;
  examples: string[];
  rawAiOutput: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWordInput {
  headword: string;
  translation?: string;
  gender?: Word['gender'];
  wordClass?: Word['wordClass'];
  notes?: string;
}

export interface UpdateWordInput extends Partial<CreateWordInput> {
  difficulty?: Word['difficulty'];
  personalNote?: string;
}

export async function listWords(): Promise<Word[]> {
  const { data } = await api.get('/words');
  return data;
}

export async function createWord(input: CreateWordInput): Promise<Word> {
  const { data } = await api.post('/words', input);
  return data;
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
