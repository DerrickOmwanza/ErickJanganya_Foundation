import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/auth.js';
import trackerRoutes from './routes/tracker.js';
import promisesRoutes from './routes/promises.js';
import newsRoutes from './routes/news.js';
import eventsRoutes from './routes/events.js';
import mediaRoutes from './routes/media.js';
import contactRoutes from './routes/contact.js';
import newsletterRoutes from './routes/newsletter.js';

// The Express app itself, with no app.listen() call — shared by the local dev server
// (src/index.js) and the Vercel serverless entry (api/index.js), so routes are defined
// in exactly one place.
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'erick-janganya-foundation-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api/promises', promisesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/newsletter', newsletterRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
