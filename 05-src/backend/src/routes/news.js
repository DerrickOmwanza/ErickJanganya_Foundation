import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();
const REQUIRED = ['title', 'publishedOn', 'sourceType'];
const WRITABLE = ['title', 'summary', 'body', 'publishedOn', 'sourceType', 'externalUrl', 'imageUrl'];

function pickWritable(body) {
  const data = {};
  for (const key of WRITABLE) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (data.publishedOn) data.publishedOn = new Date(data.publishedOn);
  return data;
}

router.get('/', async (req, res) => {
  const { sourceType, limit, offset } = req.query;
  const where = {};
  if (sourceType) where.sourceType = sourceType;

  const take = Math.min(Number(limit) || 50, 200);
  const skip = Number(offset) || 0;

  const [items, total] = await Promise.all([
    prisma.newsPost.findMany({ where, take, skip, orderBy: { publishedOn: 'desc' } }),
    prisma.newsPost.count({ where }),
  ]);
  res.json({ items, total, limit: take, offset: skip });
});

router.get('/:id', async (req, res) => {
  const item = await prisma.newsPost.findUnique({ where: { id: Number(req.params.id) } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

router.post('/', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const missing = REQUIRED.filter((f) => !body[f]);
  if (missing.length) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }
  try {
    const item = await prisma.newsPost.create({ data: pickWritable(body) });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create post', detail: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.newsPost.update({
      where: { id: Number(req.params.id) },
      data: pickWritable(req.body || {}),
    });
    res.json(item);
  } catch (err) {
    res.status(404).json({ error: 'Not found or update failed', detail: err.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.newsPost.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

export default router;
