export type Category =
  | 'Fashion'
  | 'Food'
  | 'Fitness'
  | 'Beauty'
  | 'Tech'
  | 'DIY'
  | 'Travel'
  | 'Pets'
  | 'Other'

export type VideoFormat = 'Talking head' | 'Tutorial' | 'Story' | 'List' | 'Meme'

export type LengthBucket = '<15s' | '15–30s' | '30–60s' | '60s+'

export type TrendLabel = 'rising-fast' | 'steady' | 'peaking' | null

export type SortKey = 'recommended' | 'growth' | 'views' | 'potential'

export type PotentialTier = 'high' | 'medium' | 'low'

export interface TrendVideo {
  id: string
  creator: string | null
  /** e.g. "2ч" — unavailable for API-fetched videos (null). */
  postedAgo: string | null
  category: Category
  format: VideoFormat
  length: LengthBucket
  thumbnail: string
  hook: string
  /** null = метрика недоступна в источнике данных. */
  views: number | null
  likes: number | null
  shares: number | null
  /** relative growth signal, 0..100, used for sort/label only; null = unavailable */
  growth: number | null
  trendLabel: TrendLabel
  /** precomputed potential score for demo/sort purposes; null = unavailable */
  potentialScore: number | null
  sourceUrl: string
  /** raw seconds from source, if known */
  duration?: number | null
  countryCode?: string | null
  region?: string | null
}

export interface AnalysisFactor {
  key: 'hook' | 'pacing' | 'engagement' | 'format' | 'novelty'
  label: string
  strength: 'strong' | 'above-average' | 'average' | 'weak'
  explanation: string
}

export interface ScenarioStep {
  phase: 'HOOK' | 'BUILD' | 'PAYOFF' | 'CTA'
  time: string
  note: string
}

export interface VideoAnalysis {
  score: number
  tier: PotentialTier
  verdict: string
  reason: string
  adaptable: boolean
  factors: AnalysisFactor[]
  keep: string[]
  change: string[]
  tryIdeas: string[]
  scenario: ScenarioStep[]
  caveat: string
}
