import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

interface CreateWordInput {
  headword: string;
  translation?: string;
  gender?: 'masculine' | 'feminine' | 'neuter';
  wordClass?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'other';
  notes?: string;
}

interface UpdateWordInput extends Partial<CreateWordInput> {
  difficulty?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  personalNote?: string;
}

export async function listWords(userId: string) {
  return prisma.word.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function createWord(userId: string, data: CreateWordInput) {
  try {
    return await prisma.word.create({ data: { userId, ...data } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw Object.assign(new Error('Duplicate headword'), { statusCode: 409 });
    }
    throw err;
  }
}

export async function getWordForUser(userId: string, wordId: string) {
  const word = await prisma.word.findUnique({ where: { id: wordId } });
  if (!word) throw Object.assign(new Error('Not found'), { statusCode: 404 });
  if (word.userId !== userId) throw Object.assign(new Error('Forbidden'), { statusCode: 403 });
  return word;
}

export async function updateWord(userId: string, wordId: string, data: UpdateWordInput) {
  await getWordForUser(userId, wordId);
  return prisma.word.update({ where: { id: wordId }, data });
}

export async function deleteWord(userId: string, wordId: string) {
  await getWordForUser(userId, wordId);
  await prisma.word.delete({ where: { id: wordId } });
}
