import { cn } from '@/lib/utils'
import type { PotentialTier } from '@/lib/types'
import { tierLabel } from '@/lib/format'

const tierStyles: Record<PotentialTier, string> = {
  high: 'bg-success-subtle text-success',
  medium: 'bg-warning-subtle text-warning',
  low: 'bg-danger-subtle text-danger',
}

const dotStyles: Record<PotentialTier, string> = {
  high: 'bg-success',
  medium: 'bg-warning',
  low: 'bg-danger',
}

interface ScoreBadgeProps {
  score: number
  tier: PotentialTier
  /** show the words next to the number */
  showLabel?: boolean
  className?: string
}

/**
 * Compact score pill. Meaning is never encoded by color alone —
 * the numeric score and (optionally) the text label are always present.
 */
export function ScoreBadge({ score, tier, showLabel = false, className }: ScoreBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold leading-none',
        tierStyles[tier],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', dotStyles[tier])} aria-hidden />
      <span className="tabular-nums">{score}</span>
      <span className="text-[11px] font-medium opacity-70">/ 100</span>
      {showLabel && <span className="ml-1 text-[11px] font-semibold uppercase tracking-wide">{tierLabel[tier]}</span>}
    </span>
  )
}
