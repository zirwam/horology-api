/**
 * requireAuth middleware
 *
 * In production, verify a real JWT token (from Supabase Auth,
 * Auth0, or your own login system). For now this accepts a
 * simple API key header so you can test immediately.
 *
 * Production upgrade path:
 *   1. Add Supabase or Auth0 to your frontend
 *   2. They issue a JWT on login
 *   3. Frontend sends: Authorization: Bearer <jwt>
 *   4. Replace the stub below with real JWT verification
 */

const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Include an Authorization: Bearer <token> header',
    });
  }

  const token = authHeader.slice(7);

  // ── DEVELOPMENT: accept a static API key ─────────────────
  // Set API_KEY in your .env for local testing
  if (process.env.NODE_ENV !== 'production') {
    if (token === process.env.API_KEY || token === 'dev-token') {
      req.user = { id: 'dev-user', plan: 'pro' };
      return next();
    }
  }

  // ── PRODUCTION: verify JWT ────────────────────────────────
  // Uncomment and install jsonwebtoken when ready:
  //
  // const jwt = require('jsonwebtoken');
  // try {
  //   const decoded = jwt.verify(token, process.env.JWT_SECRET);
  //   req.user = { id: decoded.sub, plan: decoded.plan || 'free' };
  //   return next();
  // } catch (err) {
  //   return res.status(401).json({ error: 'Invalid or expired token' });
  // }

  // Until JWT is wired up, reject unknown tokens in production
  return res.status(401).json({ error: 'Invalid token' });
};

module.exports = { requireAuth };
