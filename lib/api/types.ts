import type { TrendVideo } from '../types'

/* -------------------------------------------------------------------------- */
/*  TikTok (RapidAPI) contract                                                */
/* -------------------------------------------------------------------------- */

export const ORDER_BY_VALUES = ['vv', 'like', 'comment', 'repost'] as const
export type OrderBy = (typeof ORDER_BY_VALUES)[number]

export const PERIOD_VALUES = [7, 30] as const
export type Period = (typeof PERIOD_VALUES)[number]

export interface VideoQuery {
  page: number
  limit: number
  period: Period
  order_by: OrderBy
  country: string
}

/**
 * Raw item from TikTok's user-posts feed (`/api/user/posts`), full aweme
 * shape. Only the fields the app consumes are typed; everything else is
 * ignored and unknown fields are never guessed.
 */
export interface RawTiktokItem {
  id?: string
  desc?: string
  createTime?: number
  stats?: {
    playCount?: number
    diggCount?: number
    commentCount?: number
    shareCount?: number
    collectCount?: number
  }
  video?: {
    cover?: string
    originCover?: string
    dynamicCover?: string
    duration?: number
  }
  author?: {
    uniqueId?: string
    nickname?: string
    avatarMedium?: string
    avatarLarger?: string
    secUid?: string
  }
}

/** Raw user-posts response: `{ data: { itemList: [...] } }`. */
export interface RawTiktokResponse {
  data?: {
    itemList?: unknown[]
    hasMore?: boolean
    cursor?: string
  }
}

/* -------------------------------------------------------------------------- */
/*  Normalized wire format for the frontend                                   */
/* -------------------------------------------------------------------------- */

/** Video in the shape the frontend consumes (TrendVideo) plus raw extras. */
export type NormalizedVideo = TrendVideo & {
  duration: number | null
  countryCode: string | null
  region: string | null
}

export interface VideosData {
  videos: NormalizedVideo[]
  pagination: {
    page: number
    limit: number
    hasMore: boolean
    totalCount: number
  }
  /** When the upstream data was fetched by the backend. */
  requestedAt: string
}

/**
 * Normalized creator info from GET /api/user/info?uniqueId=...
 * The upstream contract varies; unknown fields are null, never guessed.
 */
export interface CreatorInfo {
  id: string | null
  uniqueId: string
  nickname: string | null
  signature: string | null
  avatar: string | null
  url: string
  /** TikTok secUid — required by the user-posts endpoint. */
  secUid: string | null
  stats: {
    followers: number | null
    following: number | null
    videos: number | null
    hearts: number | null
  }
}

export interface ApiErrorBody {
  error: {
    code: 'VALIDATION' | 'CONFIG' | 'UPSTREAM' | 'GEMINI' | 'NOT_FOUND'
    message: string
  }
}

/* -------------------------------------------------------------------------- */
/*  Analyze contract (POST /api/videos/:id/analyze)                           */
/* -------------------------------------------------------------------------- */

/**
 * The frontend sends the selected video with the request so the
 * serverless handler doesn't have to rely on in-memory state.
 */
export interface AnalyzeRequestVideo {
  id: string
  rank?: number
  title?: string
  cover?: string
  duration?: number
  itemUrl?: string
  countryCode?: string
  region?: string
}

export type EvidenceLevel = 'METADATA_ONLY' | 'VIDEO_CONTENT' | 'FULL_ANALYTICS'

export const VERDICT_VALUES = ['HIGH_POTENTIAL', 'MEDIUM_POTENTIAL', 'LOW_POTENTIAL'] as const
export type Verdict = (typeof VERDICT_VALUES)[number]

export type GeminiImpact = 'positive' | 'negative' | 'neutral'

export interface GeminiFactor {
  name: string
  score: number
  impact: GeminiImpact
  reason: string
}

export interface GeminiScenarioStep {
  phase: 'HOOK' | 'BUILD' | 'PAYOFF' | 'CTA'
  time: string
  note: string
}

/**
 * Strict contract of the Gemini result. `keep`/`change`/`tryIdeas`/`scenario`/
 * `caveat` are optional extra fields used to render the frontend drawer; the
 * fixed contract fields (score, verdict, summary, factors, recommendations,
 * remakePotential, evidenceLevel) are always required.
 */
export interface GeminiAnalysisResult {
  score: number
  verdict: Verdict
  summary: string
  factors: GeminiFactor[]
  recommendations: string[]
  remakePotential: number
  evidenceLevel: EvidenceLevel
  keep?: string[]
  change?: string[]
  tryIdeas?: string[]
  scenario?: GeminiScenarioStep[]
  caveat?: string
}
