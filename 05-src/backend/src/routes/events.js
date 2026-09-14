import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();
const REQUIRED = ['title', 'eventDate'];
const WRITABLE = ['title', 'description', 'eventDate', 'eventTime', 'location', 'ward', 'rsvpUrl'];

function pickWritable(body) {
  const data = {};
  for (const key of WRITABLE) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (data.eventDate) data.eventDate = new Date(data.eventDate);
  return data;
}

router.get('/', async (req, res) => {
  const { ward, limit, offset } = req.query;
  const where = {};
  if (ward) where.ward = ward;

  const take = Math.min(Number(limit) || 50, 200);
  const skip = Number(offset) || 0;

  const [items, total] = await Promise.all([
    prisma.event.findMany({ where, take, skip, orderBy: { eventDate: 'asc' } }),
    prisma.event.count({ where }),
  ]);
  res.json({ items, total, limit: take, offset: skip });
});

router.get('/:id', async (req, res) => {
  const item = await prisma.event.findUnique({ where: { id: Number(req.params.id) } });
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
    const item = await prisma.event.create({ data: pickWritable(body) });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create event', detail: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.event.update({
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
    await prisma.event.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

export default router;
