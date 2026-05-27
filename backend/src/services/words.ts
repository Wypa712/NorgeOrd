import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

interface CreateWordInput {
  headword: string;
  translation?: string;
  gender?: 'masculine' | 'feminine' | 'neuter';
  wordClass?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'sentence' | 'other';
  notes?: string;
  forms?: Record<string, string>;
  examples?: string[];
  tagNames?: string[];
  difficulty?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

interface UpdateWordInput extends Partial<Omit<CreateWordInput, 'tagNames'>> {
  personalNote?: string;
}

export async function listWords(userId: string, query?: string) {
  const trimmed = query?.trim();
  if (trimmed) {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Word"
      WHERE "userId" = ${userId}
      AND to_tsvector('pg_catalog.norwegian', headword || ' ' || COALESCE(translation, ''))
          @@ plainto_tsquery('pg_catalog.norwegian', ${trimmed})
      ORDER BY ts_rank(
        to_tsvector('pg_catalog.norwegian', headword || ' ' || COALESCE(translation, '')),
        plainto_tsquery('pg_catalog.norwegian', ${trimmed})
      ) DESC
    `;
    if (rows.length === 0) return [];
    const ids = rows.map(r => r.id);
    const words = await prisma.word.findMany({
      where: { id: { in: ids }, userId },
      include: { tags: { include: { tag: true } } },
    });
    const order = new Map(ids.map((id, i) => [id, i]));
    return words.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }
  return prisma.word.findMany({
    where: { userId },
    include: { tags: { include: { tag: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createWord(userId: string, data: CreateWordInput) {
  const { tagNames, ...wordData } = data;
  try {
    return await prisma.word.create({
      data: {
        userId,
        examples: [],
        ...wordData,
        ...(tagNames?.length ? {
          tags: {
            create: tagNames.map((name) => ({
              tag: {
                connectOrCreate: {
                  where: { name },
                  create: { name },
                },
              },
            })),
          },
        } : {}),
      },
      include: { tags: { include: { tag: true } } },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw Object.assign(new Error('Duplicate headword'), { statusCode: 409 });
    }
    throw err;
  }
}

export async function getWordForUser(userId: string, wordId: string) {
  const word = await prisma.word.findUnique({
    where: { id: wordId },
    include: { tags: { include: { tag: true } } },
  });
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
