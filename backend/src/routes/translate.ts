import { Router } from 'express';
import type { Request, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { translateText } from '../services/ai';

const router = Router();

const translateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: 'Too many translation requests, please try again later' },
});

router.post('/', translateLimiter, async (req: Request, res: Response) => {
  const { text, sourceLang, targetLang } = req.body as {
    text?: unknown;
    sourceLang?: unknown;
    targetLang?: unknown;
  };

  if (typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'text is required' });
    return;
  }
  if (sourceLang !== 'uk' && sourceLang !== 'nn') {
    res.status(400).json({ error: 'sourceLang must be "uk" or "nn"' });
    return;
  }
  if (targetLang !== 'uk' && targetLang !== 'nn') {
    res.status(400).json({ error: 'targetLang must be "uk" or "nn"' });
    return;
  }
  if (sourceLang === targetLang) {
    res.json({ text, fallback: false });
    return;
  }

  const bytes = Buffer.byteLength(text.trim(), 'utf8');
  if (bytes > 2000) {
    res.status(400).json({ error: 'Text too long' });
    return;
  }

  try {
    const translated = await translateText(text.trim(), sourceLang as 'uk' | 'nn', targetLang as 'uk' | 'nn');
    res.json({ text: translated, fallback: false });
  } catch (err) {
    console.error('Translation error:', err);
    res.status(500).json({ error: 'Translation failed' });
  }
});

export default router;
