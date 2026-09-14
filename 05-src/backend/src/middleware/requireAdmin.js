import { verifyToken } from '../lib/auth.js';

// Protects admin-only write routes. Expects `Authorization: Bearer <token>`
// where <token> was issued by POST /api/auth/login.
export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    req.admin = verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
