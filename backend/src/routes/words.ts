import { Router } from 'express';
import { analyzeWord, chatAboutWord } from '../services/ai';
import { fetchOrdbokeneData } from '../services/ordbokene';
import * as wordsService from '../services/words';
import { prisma } from '../lib/prisma';

const router = Router();

router.post('/analyze', async (req, res, next) => {
  const headword = req.body?.headword;
  if (!headword || typeof headword !== 'string' || !headword.trim()) {
    return res.status(400).json({ error: 'headword is required' });
  }

  try {
    const ordbokene = await fetchOrdbokeneData(headword.trim());
    const aiResult = await analyzeWord(headword.trim(), ordbokene);
    const meanings = ordbokene && ordbokene.meanings.length > 1
      ? ordbokene.meanings.map(m => ({ translation: m.definition }))
      : undefined;
    res.json({ ...aiResult, ...(meanings ? { meanings } : {}) });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const words = await wordsService.listWords(req.user!.userId, req.query.q as string | undefined);
    res.json(words);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  if (!req.body.headword || typeof req.body.headword !== 'string' || !req.body.headword.trim()) {
    return res.status(400).json({ error: 'headword is required' });
  }
  try {
    const { pendingChatMessages, ...wordInput } = req.body;

    // Normalize headword to canonical dictionary form based on wordClass
    const forms = wordInput.forms as Record<string, string> | undefined;
    if (forms) {
      if (wordInput.wordClass === 'noun' && forms.sing_indef) {
        wordInput.headword = forms.sing_indef;
      } else if (wordInput.wordClass === 'verb' && forms.inf) {
        wordInput.headword = forms.inf;
      } else if (wordInput.wordClass === 'adjective' && forms.positive) {
        wordInput.headword = forms.positive;
      }
    }

    const word = await wordsService.createWord(req.user!.userId, wordInput);
    const pending = pendingChatMessages;
    if (Array.isArray(pending) && pending.length > 0) {
      await prisma.chatMessage.createMany({
        data: pending
          .filter((m: any) => m.role === 'user' || m.role === 'assistant')
          .map((m: any) => ({ wordId: word.id, role: m.role, content: String(m.content) })),
      });
    }
    res.status(201).json(word);
  } catch (err: any) {
    if (err.statusCode === 409) return res.status(409).json({ error: 'Headword already exists for this user' });
    next(err);
  }
});

router.post('/preview-chat', async (req, res, next) => {
  try {
    const { wordContext, messages, message } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'message is required' });
    if (!wordContext?.headword) return res.status(400).json({ error: 'wordContext is required' });
    const history: { role: 'user' | 'assistant'; content: string }[] = Array.isArray(messages)
      ? messages.filter((m: any) => m.role === 'user' || m.role === 'assistant')
      : [];
    const allMessages = [...history, { role: 'user' as const, content: message.trim() }];
    const result = chatAboutWord(wordContext, allMessages);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    for await (const chunk of result.textStream) {
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const word = await wordsService.getWordForUser(req.user!.userId, req.params.id);
    res.json(word);
  } catch (err: any) {
    if (err.statusCode === 404) return res.status(404).json({ error: 'Word not found' });
    if (err.statusCode === 403) return res.status(403).json({ error: 'Forbidden' });
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const word = await wordsService.updateWord(req.user!.userId, req.params.id, req.body);
    res.json(word);
  } catch (err: any) {
    if (err.statusCode === 404) return res.status(404).json({ error: 'Word not found' });
    if (err.statusCode === 403) return res.status(403).json({ error: 'Forbidden' });
    next(err);
  }
});

router.get('/:id/chat', async (req, res, next) => {
  try {
    await wordsService.getWordForUser(req.user!.userId, req.params.id);
    const history = await prisma.chatMessage.findMany({
      where: { wordId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json(history);
  } catch (err: any) {
    if (err.statusCode === 404) return res.status(404).json({ error: 'Word not found' });
    if (err.statusCode === 403) return res.status(403).json({ error: 'Forbidden' });
    next(err);
  }
});

router.post('/:id/chat', async (req, res, next) => {
  try {
    const word = await wordsService.getWordForUser(req.user!.userId, req.params.id);
    const message: string = req.body?.message;
    if (!message?.trim()) return res.status(400).json({ error: 'message is required' });

    const history = await prisma.chatMessage.findMany({
      where: { wordId: req.params.id },
      orderBy: { createdAt: 'asc' },
    });

    await prisma.chatMessage.create({
      data: { wordId: req.params.id, role: 'user', content: message.trim() },
    });

    const messages = [
      ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message.trim() },
    ];

    const result = chatAboutWord(word, messages);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    let fullText = '';
    for await (const chunk of result.textStream) {
      fullText += chunk;
      res.write(chunk);
    }
    res.end();

    await prisma.chatMessage.create({
      data: { wordId: req.params.id, role: 'assistant', content: fullText },
    });
  } catch (err: any) {
    if (err.statusCode === 404) return res.status(404).json({ error: 'Word not found' });
    if (err.statusCode === 403) return res.status(403).json({ error: 'Forbidden' });
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await wordsService.deleteWord(req.user!.userId, req.params.id);
    res.status(204).send();
  } catch (err: any) {
    if (err.statusCode === 404) return res.status(404).json({ error: 'Word not found' });
    if (err.statusCode === 403) return res.status(403).json({ error: 'Forbidden' });
    next(err);
  }
});

export default router;
