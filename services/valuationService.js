const Anthropic = require('@anthropic-ai/sdk');

// ─── Anthropic client ─────────────────────────────────────
// API key stays on the server — never sent to the browser
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Condition price multipliers ──────────────────────────
const CONDITION_MULTIPLIERS = {
  'Mint / unworn':  1.08,
  'Excellent':      1.02,
  'Very good':      1.00, // baseline
  'Good':           0.92,
  'Fair / worn':    0.83,
};

// ─── Box & papers premiums (rough % of base) ─────────────
const BP_PREMIUMS = {
  'Full set (box + papers)': 0.06,
  'Papers only':             0.03,
  'Box only':                0.01,
  'No box or papers':        0.00,
};

// ─── Build the AI prompt ──────────────────────────────────
function buildPrompt(watchData) {
  const { brand, reference, model, condition, boxAndPapers, year } = watchData;
  const watchStr = [brand, reference, model].filter(Boolean).join(' ');

  return `You are a luxury watch market analyst with deep knowledge of the current secondary market.
Your data sources: Chrono24 live listings, eBay completed/sold listings, WatchBox, Bob's Watches, Phillips Watches auctions, Sotheby's, and Christie's.

Provide a precise current market valuation for:
- Watch: ${watchStr}
- Condition: ${condition}
- Box & papers: ${boxAndPapers}
- Production year: ${year || 'unknown'}

Known reference points (use as anchors, adjust for condition/papers):
- Rolex Submariner 126610LN: $13,500–$15,500 (full set, excellent)
- Rolex Daytona 116500LN: $28,000–$34,000 (full set, excellent)
- Rolex GMT-Master II 126710BLRO: $18,000–$22,000 (full set, excellent)
- Omega Speedmaster Pro 311.30.42.30.01.005: $4,500–$6,500
- AP Royal Oak 15500ST: $32,000–$42,000
- Patek Philippe Nautilus 5711/1A: $130,000–$160,000
- Patek Philippe Calatrava 5196: $20,000–$28,000
- IWC Portugieser 5001: $10,000–$14,000
- TAG Heuer Carrera Heuer-02: $3,500–$5,000

Respond ONLY with a valid JSON object. No markdown, no explanation outside the JSON:
{
  "estimated_value": <number, no commas>,
  "range_low": <number>,
  "range_high": <number>,
  "confidence_pct": <integer 0-100>,
  "condition_adj": "<e.g. +$400 (Excellent)>",
  "bp_adj": "<e.g. +$900 (Full set)>",
  "trend_30d": "<e.g. +2.1% or -0.8%>",
  "trend_dir": "<up or down>",
  "samples": "<e.g. 143 recent transactions>",
  "sources": ["Chrono24", "eBay sold", "WatchBox", "Auction results"],
  "analysis": "<3 specific sentences: current demand for this reference, what is driving recent price movement, and a concrete buy/sell/hold recommendation>"
}`;
}

// ─── Parse and validate AI response ──────────────────────
function parseAIResponse(text) {
  // Extract JSON even if model adds surrounding text
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('AI response contained no JSON');

  const data = JSON.parse(match[0]);

  // Validate required fields
  const required = ['estimated_value', 'range_low', 'range_high', 'confidence_pct', 'analysis'];
  for (const field of required) {
    if (data[field] === undefined) throw new Error(`Missing field: ${field}`);
  }

  // Sanitize numbers
  data.estimated_value = Math.round(Number(data.estimated_value));
  data.range_low       = Math.round(Number(data.range_low));
  data.range_high      = Math.round(Number(data.range_high));
  data.confidence_pct  = Math.min(100, Math.max(0, parseInt(data.confidence_pct)));

  return data;
}

// ─── Main valuation function ──────────────────────────────
async function getValuation(watchData) {
  const prompt = buildPrompt(watchData);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = message.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  const result = parseAIResponse(rawText);

  // Attach metadata
  result.watch = [watchData.brand, watchData.reference, watchData.model]
    .filter(Boolean).join(' ');
  result.queried_at = new Date().toISOString();
  result.model_used = 'claude-sonnet-4-20250514';

  return result;
}

module.exports = { getValuation };
