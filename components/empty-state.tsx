import { SearchX } from 'lucide-react'

interface EmptyStateProps {
  onReset: () => void
}

export function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <div>
        <p className="text-[15px] font-semibold">По этим фильтрам ничего нет</p>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Попробуйте расширить период или сбросить фильтры.
        </p>
      </div>
      <button
        type="button"
        onClick={onReset}
        className="mt-1 inline-flex h-9 items-center rounded-lg border border-border bg-surface px-4 text-[13px] font-medium transition-colors hover:bg-muted"
      >
        Сбросить фильтры
      </button>
    </div>
  )
}
