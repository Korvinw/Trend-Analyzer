import { Skeleton } from '@/components/ui/skeleton'

/** Shown immediately when the drawer opens, before analysis "returns". */
export function AnalysisSkeleton() {
  return (
    <div className="flex flex-col">
      <div className="flex items-start gap-3 border-b border-border p-5">
        <Skeleton className="aspect-[9/16] w-16 rounded-lg" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      <div className="p-5">
        <div className="rounded-xl border border-border p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-12 w-40" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </div>
      </div>

      <div className="space-y-3 border-t border-border px-5 py-5">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="mt-1.5 size-2 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>

      <p className="px-5 pb-5 text-[13px] text-muted-foreground">Проверяем ролик…</p>
    </div>
  )
}
