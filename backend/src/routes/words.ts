import { Router } from 'express';
import { analyzeWord } from '../services/ai';
import * as wordsService from '../services/words';

const router = Router();

router.post('/analyze', async (req, res, next) => {
  const headword = req.body?.headword;
  if (!headword || typeof headword !== 'string' || !headword.trim()) {
    return res.status(400).json({ error: 'headword is required' });
  }

  try {
    const result = analyzeWord(headword.trim());
    result.pipeTextStreamToResponse(res);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const words = await wordsService.listWords(req.user!.userId);
    res.json(words);
  } catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
  if (!req.body.headword || typeof req.body.headword !== 'string' || !req.body.headword.trim()) {
    return res.status(400).json({ error: 'headword is required' });
  }
  try {
    const word = await wordsService.createWord(req.user!.userId, req.body);
    res.status(201).json(word);
  } catch (err: any) {
    if (err.statusCode === 409) return res.status(409).json({ error: 'Headword already exists for this user' });
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
