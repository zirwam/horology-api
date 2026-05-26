const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { getValuation } = require('../services/valuationService');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

// ─── Per-route rate limit (stricter than global) ──────────
// Each user gets max 20 valuations per 15 min window
const valuationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 20,
  // Use user ID when available (post-auth), fall back to IP
  keyGenerator: (req) => req.user?.id ?? undefined,
  skip: (req) => !req.user,
  message: { error: 'Valuation limit reached. Try again in 15 minutes.' },
});

// ─── Input validation schema ──────────────────────────────
// Zod validates and sanitizes every field before it touches the AI
const valuationSchema = z.object({
  brand: z.string().min(1).max(100),
  reference: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  condition: z.enum([
    'Mint / unworn',
    'Excellent',
    'Very good',
    'Good',
    'Fair / worn',
  ]),
  boxAndPapers: z.enum([
    'Full set (box + papers)',
    'Papers only',
    'Box only',
    'No box or papers',
  ]),
  year: z.string().max(20).optional(),
}).refine(
  (data) => data.reference || data.model,
  { message: 'Provide at least a reference number or model name' }
);

// ─── POST /api/valuation ──────────────────────────────────
router.post(
  '/',
  requireAuth,       // user must be logged in
  valuationLimiter,  // per-user rate limit
  async (req, res, next) => {
    try {
      // 1. Validate input
      const parsed = valuationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid input',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      // 2. Call the AI service (never exposed to the browser)
      const result = await getValuation(parsed.data);

      // 3. Log for your analytics (optional — add DB write here later)
      console.log(`[valuation] user=${req.user.id} watch="${parsed.data.brand} ${parsed.data.reference || parsed.data.model}" value=$${result.estimated_value}`);

      // 4. Return clean result
      res.json({ success: true, data: result });

    } catch (err) {
      next(err); // passes to global error handler
    }
  }
);

// ─── GET /api/valuation/history ───────────────────────────
// Returns the logged-in user's past valuations
// Wire to a database later (Postgres / Supabase)
router.get('/history', requireAuth, (req, res) => {
  // Placeholder — swap for DB query
  res.json({
    success: true,
    data: [],
    message: 'Connect a database to store valuation history',
  });
});

module.exports = router;
