import { Router } from 'express';
import { MODEL_REGISTRY, getActiveModel, setActiveModel } from '../services/ai';

const router = Router();

router.get('/', (_req, res) => {
  const active = getActiveModel();
  const models = Object.entries(MODEL_REGISTRY).map(([key, info]) => ({
    key,
    ...info,
    active: key === active,
  }));
  res.json({ active, models });
});

router.post('/', (req, res) => {
  const { model } = req.body;
  if (!model || typeof model !== 'string') {
    return res.status(400).json({ error: 'model is required' });
  }
  try {
    setActiveModel(model);
    res.json({ active: model, note: 'Switched for this server instance only. Set LLM_MODEL env var for persistence.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
