import type { PotentialTier, TrendLabel } from './types'

/** 1_240_000 -> "1.2M", 840_000 -> "840K", null/undefined -> "—" */
export function formatCount(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—'
  if (n >= 1_000_000) {
    const v = n / 1_000_000
    return `${v >= 10 ? Math.round(v) : v.toFixed(1)}M`
  }
  if (n >= 1_000) {
    return `${Math.round(n / 1_000)}K`
  }
  return `${n}`
}

export const tierLabel: Record<PotentialTier, string> = {
  high: 'Высокий потенциал',
  medium: 'Средний потенциал',
  low: 'Низкий потенциал',
}

export const trendLabelText: Record<Exclude<TrendLabel, null>, string> = {
  'rising-fast': 'Быстро растёт',
  steady: 'Стабильно растёт',
  peaking: 'На пике',
}
