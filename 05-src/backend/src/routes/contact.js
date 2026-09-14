import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

// Public: anyone can submit the contact form.
router.post('/', async (req, res) => {
  const { name, email, phone, subject, message } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'name, email, and message are required' });
  }
  try {
    const submission = await prisma.contactSubmission.create({
      data: { name, email, phone: phone || null, subject: subject || null, message },
    });
    res.status(201).json({ id: submission.id, message: 'Thank you — your message has been received.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit message', detail: err.message });
  }
});

// Admin: view submissions.
router.get('/', requireAdmin, async (req, res) => {
  const { limit, offset } = req.query;
  const take = Math.min(Number(limit) || 50, 200);
  const skip = Number(offset) || 0;

  const [items, total] = await Promise.all([
    prisma.contactSubmission.findMany({ take, skip, orderBy: { createdAt: 'desc' } }),
    prisma.contactSubmission.count(),
  ]);
  res.json({ items, total, limit: take, offset: skip });
});

export default router;
