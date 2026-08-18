'use client'

import { Check, ChevronDown, X } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { CATEGORIES, FORMATS } from '@/lib/mock-data'
import type { Category, LengthBucket, SortKey, VideoFormat } from '@/lib/types'

export type Period = 'today' | '7d' | '30d'

export interface Filters {
  period: Period
  category: Category | 'all'
  formats: VideoFormat[]
  lengths: LengthBucket[]
  sort: SortKey
}

export const DEFAULT_FILTERS: Filters = {
  period: '7d',
  category: 'all',
  formats: [],
  lengths: [],
  sort: 'recommended',
}

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Сегодня' },
  { key: '7d', label: '7 дней' },
  { key: '30d', label: '30 дней' },
]

const LENGTHS: LengthBucket[] = ['<15s', '15–30s', '30–60s', '60s+']

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'recommended', label: 'Рекомендуемые' },
  { key: 'growth', label: 'Быстрее растут' },
  { key: 'views', label: 'Больше просмотров' },
  { key: 'potential', label: 'Высокий потенциал' },
]

interface FilterBarProps {
  filters: Filters
  onChange: (next: Filters) => void
  onReset: () => void
  hasActive: boolean
}

export function FilterBar({ filters, onChange, onReset, hasActive }: FilterBarProps) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value })

  const toggleInArray = <T,>(arr: T[], value: T): T[] =>
    arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]

  const sortLabel = SORTS.find((s) => s.key === filters.sort)?.label ?? 'Сортировка'

  return (
    <div className="sticky top-16 z-20 -mx-4 border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* Period chips */}
        <div className="flex shrink-0 items-center gap-1 rounded-lg bg-muted p-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => set('period', p.key)}
              aria-pressed={filters.period === p.key}
              className={cn(
                'rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                filters.period === p.key
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Category dropdown */}
        <FilterMenu
          label={filters.category === 'all' ? 'Все категории' : filters.category}
          active={filters.category !== 'all'}
        >
          <DropdownMenuLabel>Категория</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={filters.category}
            onValueChange={(v) => set('category', v as Category | 'all')}
          >
            <DropdownMenuRadioItem value="all">Все категории</DropdownMenuRadioItem>
            {CATEGORIES.map((c) => (
              <DropdownMenuRadioItem key={c} value={c}>
                {c}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </FilterMenu>

        {/* Format multi-select */}
        <FilterMenu
          label={filters.formats.length ? `Формат · ${filters.formats.length}` : 'Формат'}
          active={filters.formats.length > 0}
        >
          <DropdownMenuLabel>Формат</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {FORMATS.map((f) => (
            <DropdownMenuCheckboxItem
              key={f}
              checked={filters.formats.includes(f)}
              onCheckedChange={() => set('formats', toggleInArray(filters.formats, f))}
              closeOnClick={false}
            >
              {f}
            </DropdownMenuCheckboxItem>
          ))}
        </FilterMenu>

        {/* Length multi-select */}
        <FilterMenu
          label={filters.lengths.length ? `Длина · ${filters.lengths.length}` : 'Длина'}
          active={filters.lengths.length > 0}
        >
          <DropdownMenuLabel>Длина ролика</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {LENGTHS.map((l) => (
            <DropdownMenuCheckboxItem
              key={l}
              checked={filters.lengths.includes(l)}
              onCheckedChange={() => set('lengths', toggleInArray(filters.lengths, l))}
              closeOnClick={false}
            >
              {l}
            </DropdownMenuCheckboxItem>
          ))}
        </FilterMenu>

        {hasActive && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden />
            Сбросить
          </button>
        )}

        {/* Sort — pushed to the right, one explicit menu */}
        <div className="ml-auto shrink-0 pl-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-muted">
              <span className="text-muted-foreground">Сортировка:</span>
              {sortLabel}
              <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuRadioGroup
                value={filters.sort}
                onValueChange={(v) => set('sort', v as SortKey)}
              >
                {SORTS.map((s) => (
                  <DropdownMenuRadioItem key={s.key} value={s.key}>
                    {s.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

function FilterMenu({
  label,
  active,
  children,
}: {
  label: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors',
          active
            ? 'border-primary/30 bg-primary/10 text-primary'
            : 'border-border bg-surface text-foreground hover:bg-muted',
        )}
      >
        {active && <Check className="size-3.5" aria-hidden />}
        {label}
        <ChevronDown className="size-3.5 opacity-60" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
