// Vercel serverless entry point. Every request (see vercel.json's rewrite) lands here; Express's
// own router — defined once in ../src/app.js — handles routing from that point on exactly as it
// does locally, so /api/health, /api/tracker, etc. all work unchanged.
import app from '../src/app.js';

export default app;
