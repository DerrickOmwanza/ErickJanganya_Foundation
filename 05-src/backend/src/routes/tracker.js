import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();
const REQUIRED = ['title', 'ward', 'category', 'status'];
const WRITABLE = [
  'title', 'ward', 'category', 'status', 'progressPercent', 'budgetKes',
  'fundingSource', 'summary', 'location', 'photoUrl', 'startedOn',
  'beforePhotoUrl', 'afterPhotoUrl', 'beforeTakenOn', 'afterTakenOn',
];
const DATE_FIELDS = ['startedOn', 'beforeTakenOn', 'afterTakenOn'];

function pickWritable(body) {
  const data = {};
  for (const key of WRITABLE) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  for (const key of DATE_FIELDS) {
    if (data[key]) data[key] = new Date(data[key]);
  }
  if (data.progressPercent !== undefined) data.progressPercent = Number(data.progressPercent);
  if (data.budgetKes !== undefined) data.budgetKes = data.budgetKes === null ? null : Number(data.budgetKes);
  return data;
}

// Public
router.get('/', async (req, res) => {
  const { status, ward, category, limit, offset } = req.query;
  const where = {};
  if (status) where.status = status;
  if (ward) where.ward = ward;
  if (category) where.category = category;

  const take = Math.min(Number(limit) || 50, 200);
  const skip = Number(offset) || 0;

  const [items, total] = await Promise.all([
    prisma.trackerProject.findMany({ where, take, skip, orderBy: { updatedAt: 'desc' } }),
    prisma.trackerProject.count({ where }),
  ]);
  res.json({ items, total, limit: take, offset: skip });
});

router.get('/:id', async (req, res) => {
  const item = await prisma.trackerProject.findUnique({ where: { id: Number(req.params.id) } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// Admin
router.post('/', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const missing = REQUIRED.filter((f) => !body[f]);
  if (missing.length) {
    return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
  }
  try {
    const item = await prisma.trackerProject.create({ data: pickWritable(body) });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project', detail: err.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const item = await prisma.trackerProject.update({
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
    await prisma.trackerProject.delete({ where: { id: Number(req.params.id) } });
    res.status(204).end();
  } catch {
    res.status(404).json({ error: 'Not found' });
  }
});

export default router;
