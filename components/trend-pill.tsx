import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrendLabel } from '@/lib/types'
import { trendLabelText } from '@/lib/format'

interface TrendPillProps {
  label: TrendLabel
  className?: string
}

/** Small, quiet label. Only rendered when there is clear semantics. */
export function TrendPill({ label, className }: TrendPillProps) {
  if (!label) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-surface/90 px-2 py-1 text-[11px] font-semibold text-foreground shadow-sm ring-1 ring-border backdrop-blur',
        className,
      )}
    >
      <TrendingUp className="size-3 text-success" aria-hidden />
      {trendLabelText[label]}
    </span>
  )
}
