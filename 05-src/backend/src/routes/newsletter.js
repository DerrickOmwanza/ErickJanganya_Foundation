import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

// Public: subscribe. Upsert so re-subscribing with the same email doesn't error.
router.post('/', async (req, res) => {
  const { email, firstName, lastName, zip, phone, agreedToTerms, ward } = req.body || {};
  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: 'firstName, lastName, and email are required' });
  }
  if (!agreedToTerms) {
    return res.status(400).json({ error: 'You must agree to the Terms of Service to subscribe' });
  }
  try {
    const data = {
      firstName,
      lastName,
      zip: zip || null,
      phone: phone || null,
      agreedToTerms: !!agreedToTerms,
      ward: ward || undefined,
    };
    const subscriber = await prisma.newsletterSubscriber.upsert({
      where: { email },
      update: data,
      create: { email, ...data, ward: ward || null },
    });
    res.status(201).json({ id: subscriber.id, message: "You're subscribed." });
  } catch (err) {
    res.status(500).json({ error: 'Failed to subscribe', detail: err.message });
  }
});

// Admin: view subscriber list.
router.get('/', requireAdmin, async (req, res) => {
  const { limit, offset } = req.query;
  const take = Math.min(Number(limit) || 50, 200);
  const skip = Number(offset) || 0;

  const [items, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({ take, skip, orderBy: { subscribedAt: 'desc' } }),
    prisma.newsletterSubscriber.count(),
  ]);
  res.json({ items, total, limit: take, offset: skip });
});

export default router;
