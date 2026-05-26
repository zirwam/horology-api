const express = require('express');
const router = express.Router();

/**
 * POST /api/auth/token
 *
 * Development: returns a static dev token.
 * Production: replace with Supabase Auth or Auth0 — 
 * they handle password hashing, JWTs, and refresh tokens 
 * so you don't have to build that yourself.
 *
 * Recommended: https://supabase.com/docs/guides/auth
 */
router.post('/token', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  // ── DEVELOPMENT STUB ──────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    return res.json({
      token: 'dev-token',
      user: { id: 'dev-user', email, plan: 'pro' },
      message: 'Dev token — replace with real auth in production',
    });
  }

  // ── PRODUCTION: wire Supabase here ────────────────────────
  // const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  // if (error) return res.status(401).json({ error: error.message });
  // return res.json({ token: data.session.access_token, user: data.user });

  res.status(501).json({ error: 'Auth not configured for production yet' });
});

module.exports = router;
