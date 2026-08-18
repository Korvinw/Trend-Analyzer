/**
 * Smoke test: real Gemini analysis via the official @google/genai SDK.
 * Requires GEMINI_API_KEY (uses .env via --env-file-if-exists).
 * Usage: npm run smoke:gemini
 */

import { GoogleGenAI } from '@google/genai'

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash'

function fail(msg) {
  console.error(`SMOKE FAIL: ${msg}`)
  process.exit(1)
}

const SAMPLE_VIDEO = {
  id: '7572995879557139742',
  rank: 1,
  title: 'maybe the best day of my life 🥹💚🎄🐱 #angeltree #walmart gifting a support cat for Christmas with Angel Gift Tree',
  cover: 'https://p16-sign-va.tiktokcdn.com/…',
  duration: 159,
  itemUrl: 'https://www.tiktok.com/@mnm_pipi/video/7572995879557139742',
  countryCode: 'US',
  region: 'United States',
}

const PROMPT = `Analyze the video metadata below. You do NOT have the video file, audio or engagement metrics.
NEVER invent views/likes/shares/retention numbers. evidenceLevel MUST be "METADATA_ONLY".
Reply with ONLY a JSON object: {"score":0-100,"verdict":"HIGH_POTENTIAL"|"MEDIUM_POTENTIAL"|"LOW_POTENTIAL","summary":"...","factors":[{"name":"Hook"|"Pacing"|"Engagement"|"Format"|"Novelty","score":0-100,"impact":"positive"|"negative"|"neutral","reason":"..."}],"recommendations":["..."],"remakePotential":0-100,"evidenceLevel":"METADATA_ONLY","keep":["..."],"change":["..."],"tryIdeas":["..."],"scenario":[{"phase":"HOOK"|"BUILD"|"PAYOFF"|"CTA","time":"0-2s","note":"..."}],"caveat":"..."}
Video: ${JSON.stringify(SAMPLE_VIDEO)}`

async function main() {
  const key = process.env.GEMINI_API_KEY
  if (!key) fail('GEMINI_API_KEY is not set')

  const ai = new GoogleGenAI({ apiKey: key })
  console.log(`generateContent model=${MODEL}`)
  const started = Date.now()
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
    config: { temperature: 0.4, responseMimeType: 'application/json' },
  })
  const ms = Date.now() - started

  const text = response.text
  if (!text) fail('no text in response')

  let json
  try {
    json = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''))
  } catch {
    fail('Gemini returned invalid JSON')
  }

  const required = ['score', 'verdict', 'summary', 'factors', 'recommendations', 'remakePotential', 'evidenceLevel']
  for (const field of required) {
    if (!(field in json)) fail(`result missing required field "${field}"`)
  }
  if (json.evidenceLevel !== 'METADATA_ONLY') fail(`evidenceLevel must be METADATA_ONLY, got ${json.evidenceLevel}`)

  console.log(`OK in ${ms}ms — evidenceLevel=${json.evidenceLevel}, score=${json.score}, verdict=${json.verdict}`)
  console.log(JSON.stringify(json, null, 2))
}

main().catch((err) => fail(err.message))