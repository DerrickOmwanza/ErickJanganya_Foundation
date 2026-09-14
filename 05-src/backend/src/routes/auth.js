import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword, signToken } from '../lib/auth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = Router();

// One-time-ish admin bootstrap. Requires ADMIN_SETUP_KEY from .env so
// randoms can't create themselves an admin account by hitting this route.
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, setupKey } = req.body || {};

    if (!setupKey || setupKey !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ error: 'Invalid setup key' });
    }
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' });
    }

    const existing = await prisma.adminUser.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const passwordHash = await hashPassword(password);
    const admin = await prisma.adminUser.create({
      data: { email, passwordHash, name: name || null },
    });

    res.status(201).json({ id: admin.id, email: admin.email, name: admin.name });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register admin', detail: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await verifyPassword(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signToken({ sub: admin.id, email: admin.email });
    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', detail: err.message });
  }
});

router.get('/me', requireAdmin, async (req, res) => {
  const admin = await prisma.adminUser.findUnique({
    where: { id: req.admin.sub },
    select: { id: true, email: true, name: true, createdAt: true, lastLoginAt: true },
  });
  if (!admin) return res.status(404).json({ error: 'Not found' });
  res.json(admin);
});

export default router;
