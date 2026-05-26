# Horology AI — Backend API

Node.js/Express proxy that sits between your frontend and the Anthropic API.
This is what fixes the "Failed to fetch" CORS error — the browser calls YOUR
server, your server calls Anthropic. The API key never touches the browser.

---

## Project structure

```
horology-api/
├── server.js                  # Entry point — Express app setup
├── routes/
│   ├── valuation.js           # POST /api/valuation
│   └── auth.js                # POST /api/auth/token
├── services/
│   └── valuationService.js    # All AI logic (prompt, parse, validate)
├── middleware/
│   ├── requireAuth.js         # Auth guard on every route
│   └── errorHandler.js        # Global error handler
├── tests/
│   └── valuation.test.js      # Integration tests (no API key needed)
├── .env.example               # Copy to .env and fill in
└── package.json
```

---

## Quick start (local dev)

```bash
# 1. Clone / copy this folder
cd horology-api

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env — add your ANTHROPIC_API_KEY

# 4. Run tests (no API key needed)
npm test

# 5. Start the server
npm run dev        # auto-restarts on file changes
# or
npm start          # production
```

Server runs on http://localhost:3001

---

## API reference

### POST /api/valuation
Returns an AI-powered market valuation.

**Headers**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**
```json
{
  "brand": "Rolex",
  "reference": "126610LN",
  "model": "Submariner Date",
  "condition": "Excellent",
  "boxAndPapers": "Full set (box + papers)",
  "year": "2021–2023"
}
```

**Condition values (exact strings)**
- `"Mint / unworn"`
- `"Excellent"`
- `"Very good"`
- `"Good"`
- `"Fair / worn"`

**Box & papers values (exact strings)**
- `"Full set (box + papers)"`
- `"Papers only"`
- `"Box only"`
- `"No box or papers"`

**Response**
```json
{
  "success": true,
  "data": {
    "estimated_value": 14200,
    "range_low": 13100,
    "range_high": 15400,
    "confidence_pct": 88,
    "condition_adj": "+$200 (Excellent)",
    "bp_adj": "+$900 (Full set)",
    "trend_30d": "+2.1%",
    "trend_dir": "up",
    "samples": "143 recent transactions",
    "sources": ["Chrono24", "eBay sold", "WatchBox", "Auction results"],
    "analysis": "Market analysis text...",
    "watch": "Rolex 126610LN Submariner Date",
    "queried_at": "2026-05-21T12:00:00.000Z",
    "model_used": "claude-sonnet-4-20250514"
  }
}
```

### GET /api/valuation/history
Returns the user's past valuations (wire to DB to activate).

### POST /api/auth/token
Dev-mode returns a static token. Replace with Supabase in production.

### GET /health
Returns `{ "status": "ok" }`. Use for uptime monitoring.

---

## Calling from your frontend

```javascript
// Replace the direct Anthropic call with this:
async function getValuation(watchData) {
  const res = await fetch('https://your-api.com/api/valuation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,  // from your auth system
    },
    body: JSON.stringify(watchData),
  });

  const { data } = await res.json();
  return data;
}
```

---

## Deployment (Railway — easiest for Node.js)

1. Push this folder to a GitHub repo
2. Go to railway.app → New Project → Deploy from GitHub
3. Add environment variables in Railway dashboard:
   - `ANTHROPIC_API_KEY` = your key
   - `NODE_ENV` = production
   - `ALLOWED_ORIGINS` = https://yourfrontend.com
   - `JWT_SECRET` = long random string
4. Railway gives you a URL like `https://horology-api.up.railway.app`
5. Point your frontend to that URL

Other options: Render.com, Fly.io, AWS Lambda, Vercel (serverless functions).

---

## Security checklist

- [x] API key never sent to browser (stays in .env on server)
- [x] CORS — only your frontend domain allowed
- [x] Helmet — secure HTTP headers
- [x] Rate limiting — 20 valuations per user per 15 min
- [x] Input validation — Zod schema on every request
- [x] Auth guard — every route requires a valid token
- [x] Error handler — never leaks stack traces to client
- [ ] JWT verification — uncomment in requireAuth.js when auth is set up
- [ ] Database logging — add Supabase/Postgres for valuation history
- [ ] Monitoring — add Sentry or Datadog for error tracking

---

## Adding live market data (Phase 2)

Wire real price data into `services/valuationService.js`:

```javascript
// Chrono24 via Apify scraper
const chrono24Prices = await fetchChrono24(brand, reference);

// eBay Finding API (official, free tier available)
const ebayPrices = await fetchEbaySold(brand, reference);

// Pass as context into the AI prompt
const prompt = buildPrompt(watchData, { chrono24Prices, ebayPrices });
```

The AI then reasons from real data instead of training knowledge.
This is the single biggest accuracy improvement available.
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |
| `PORT` | No | Server port (default 3001) |
| `NODE_ENV` | No | `development` or `production` |
| `ALLOWED_ORIGINS` | Yes | Comma-separated frontend URLs |
| `JWT_SECRET` | Production | For signing auth tokens |
| `RATE_LIMIT_MAX` | No | Max requests per 15 min (default 20) |
| `API_KEY` | Dev only | Static key for local testing |
