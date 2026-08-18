import { z } from 'zod'
import {
  ORDER_BY_VALUES,
  PERIOD_VALUES,
  VERDICT_VALUES,
  type EvidenceLevel,
  type GeminiAnalysisResult,
} from './types'

/* -------------------------------------------------------------------------- */
/*  GET /api/videos query                                                      */
/* -------------------------------------------------------------------------- */

export const videoQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  /** TikTok endpoint hard-caps limit at 20 — enforce it server-side. */
  limit: z.coerce.number().int().min(1).max(20).default(20),
  period: z.coerce.number().refine((v) => PERIOD_VALUES.includes(v as never), {
    message: 'period must be 7 or 30',
  }).default(30),
  order_by: z.enum(ORDER_BY_VALUES).default('vv'),
  country: z.string().trim().min(2).max(3).toUpperCase().default('US'),
})

export type ParsedVideoQuery = z.infer<typeof videoQuerySchema>

/** RapidAPI may return `{ "message": "Bad request" }` on 4xx. */
export function isBadRequestPayload(json: unknown): json is { message: string } {
  return (
    typeof json === 'object' &&
    json !== null &&
    'message' in json &&
    typeof (json as { message: unknown }).message === 'string'
  )
}

/* -------------------------------------------------------------------------- */
/*  POST /api/videos/:id/analyze body                                         */
/* -------------------------------------------------------------------------- */

export const analyzeBodySchema = z.object({
  video: z.object({
    id: z.string().min(1),
    rank: z.number().int().min(1).optional(),
    title: z.string().optional(),
    cover: z.string().optional(),
    duration: z.number().int().min(0).optional(),
    itemUrl: z.string().optional(),
    countryCode: z.string().optional(),
    region: z.string().optional(),
    creator: z.string().optional(),
    views: z.number().int().min(0).optional(),
    likes: z.number().int().min(0).optional(),
    shares: z.number().int().min(0).optional(),
  }),
})

export type ParsedAnalyzeBody = z.infer<typeof analyzeBodySchema>

export const userInfoQuerySchema = z.object({
  uniqueId: z.string().trim().min(1).max(100),
})

/* -------------------------------------------------------------------------- */
/*  Gemini result contract                                                    */
/* -------------------------------------------------------------------------- */

const evidenceLevelSchema = z.enum(['METADATA_ONLY', 'VIDEO_CONTENT', 'FULL_ANALYTICS'])

const geminiFactorSchema = z.object({
  name: z.string().min(1),
  score: z.number().int().min(0).max(100),
  impact: z.enum(['positive', 'negative', 'neutral']),
  reason: z.string().min(1),
})

const geminiScenarioStepSchema = z.object({
  phase: z.enum(['HOOK', 'BUILD', 'PAYOFF', 'CTA']),
  time: z.string().min(1),
  note: z.string().min(1),
})

/**
 * The fixed contract is strict: score/verdict/summary/factors/recommendations/
 * remakePotential/evidenceLevel are required and range-checked. Extra drawer
 * fields (keep/change/tryIdeas/scenario/caveat) are optional.
 */
export const geminiResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  verdict: z.enum(VERDICT_VALUES),
  summary: z.string().min(1),
  factors: z.array(geminiFactorSchema).min(1).max(8),
  recommendations: z.array(z.string().min(1)).min(1).max(12),
  remakePotential: z.number().int().min(0).max(100),
  evidenceLevel: evidenceLevelSchema,
  keep: z.array(z.string().min(1)).max(12).optional(),
  change: z.array(z.string().min(1)).max(12).optional(),
  tryIdeas: z.array(z.string().min(1)).max(12).optional(),
  scenario: z.array(geminiScenarioStepSchema).min(1).max(4).optional(),
  caveat: z.string().optional(),
})

export function parseGeminiResult(json: unknown): GeminiAnalysisResult {
  const parsed = geminiResultSchema.safeParse(json)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.') || 'root'}: ${i.message}`)
    throw new Error(`Gemini result failed validation: ${issues.join('; ')}`)
  }
  return parsed.data
}

export function isEvidenceLevel(v: unknown): v is EvidenceLevel {
  return v === 'METADATA_ONLY' || v === 'VIDEO_CONTENT' || v === 'FULL_ANALYTICS'
}