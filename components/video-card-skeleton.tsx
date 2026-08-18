import { Skeleton } from '@/components/ui/skeleton'

/** Matches the real card dimensions so the layout does not shift on load. */
export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-[9/16] w-full rounded-none" />
      <div className="flex flex-col gap-3 p-3.5">
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="size-9 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
