'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { analyzeVideo, FEED_UPDATED_AGO, VIDEOS } from '@/lib/mock-data'
import type { TrendVideo, VideoAnalysis } from '@/lib/types'
import { DEFAULT_FILTERS, FilterBar, type Filters } from './filter-bar'
import { VideoCard, type CardStatus } from './video-card'
import { VideoCardSkeleton } from './video-card-skeleton'
import { AnalysisDrawer } from './analysis-drawer'
import { EmptyState } from './empty-state'

interface TrendFeedProps {
  search: string
}

type FeedSource = 'loading' | 'api' | 'mock'

const apiVideo = (v: TrendVideo) => ({
  id: v.id,
  title: v.hook,
  cover: v.thumbnail,
  duration: v.duration ?? undefined,
  itemUrl: v.sourceUrl,
  countryCode: v.countryCode ?? undefined,
  region: v.region ?? undefined,
  creator: v.creator ?? undefined,
  views: v.views ?? undefined,
  likes: v.likes ?? undefined,
  shares: v.shares ?? undefined,
})

export function TrendFeed({ search }: TrendFeedProps) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [feedSource, setFeedSource] = useState<FeedSource>('loading')
  const [videos, setVideos] = useState<TrendVideo[]>(VIDEOS)

  const [statuses, setStatuses] = useState<Record<string, CardStatus>>({})
  const [analyses, setAnalyses] = useState<Record<string, VideoAnalysis>>({})
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const [activeVideo, setActiveVideo] = useState<TrendVideo | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(false)

  const fetchSeq = useRef(0)

  const loadFeed = useCallback(async (period: Filters['period'], region: Filters['region']) => {
    const seq = ++fetchSeq.current
    setFeedSource('loading')
    try {
      // TikTok period: 7 or 30 days. "today" is not supported upstream.
      const apiPeriod = period === '30d' ? 30 : 7
      const res = await fetch(`/api/videos?period=${apiPeriod}&limit=20&order_by=vv&country=${region}`)
      if (!res.ok) throw new Error(`feed request failed: ${res.status}`)
      const json = await res.json()
      if (seq !== fetchSeq.current) return
      setVideos(json.data.videos)
      setFeedSource('api')
    } catch {
      if (seq !== fetchSeq.current) return
      setVideos(VIDEOS)
      setFeedSource('mock')
    }
  }, [])

  useEffect(() => {
    loadFeed(filters.period, filters.region)
  }, [loadFeed, filters.period, filters.region])

  // New feed data — drop cached analyses tied to the previous filters.
  useEffect(() => {
    setAnalyses({})
    setStatuses({})
  }, [filters.period, filters.region])

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.formats.length > 0 ||
    filters.lengths.length > 0 ||
    filters.period !== DEFAULT_FILTERS.period ||
    filters.region !== DEFAULT_FILTERS.region ||
    filters.sort !== DEFAULT_FILTERS.sort ||
    search.trim().length > 0

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = videos.filter((v) => {
      if (filters.category !== 'all' && v.category !== filters.category) return false
      if (filters.formats.length && !filters.formats.includes(v.format)) return false
      if (filters.lengths.length && !filters.lengths.includes(v.length)) return false
      if (q) {
        const haystack = `${v.creator ?? ''} ${v.hook} ${v.category}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })

    const sorted = [...list]
    switch (filters.sort) {
      case 'growth':
        sorted.sort((a, b) => (b.growth ?? 0) - (a.growth ?? 0))
        break
      case 'views':
        sorted.sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        break
      case 'potential':
        sorted.sort((a, b) => (b.potentialScore ?? 0) - (a.potentialScore ?? 0))
        break
      default:
        // "recommended" — blended growth + potential (fallback: keep hot order)
        sorted.sort(
          (a, b) =>
            (b.growth ?? 0) +
            (b.potentialScore ?? 0) -
            ((a.growth ?? 0) + (a.potentialScore ?? 0)),
        )
    }
    return sorted
  }, [filters, search, videos])

  const runAnalysis = async (video: TrendVideo) => {
    setActiveVideo(video)
    setDrawerOpen(true)

    if (statuses[video.id] === 'analyzed') {
      setAnalysisLoading(false)
      return
    }

    setStatuses((s) => ({ ...s, [video.id]: 'analyzing' }))
    setAnalysisLoading(true)

    try {
      const res = await fetch(`/api/videos/${encodeURIComponent(video.id)}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video: apiVideo(video) }),
      })
      if (!res.ok) throw new Error(`analyze request failed: ${res.status}`)
      const json = await res.json()
      setAnalyses((a) => ({ ...a, [video.id]: json.data }))
    } catch {
      // Backend unavailable (no GEMINI_API_KEY etc.) — deterministic demo analysis.
      setAnalyses((a) => ({ ...a, [video.id]: analyzeVideo(video) }))
    } finally {
      setStatuses((s) => ({ ...s, [video.id]: 'analyzed' }))
      setAnalysisLoading(false)
    }
  }

  const toggleSave = (id: string) =>
    setSaved((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const reset = () => setFilters(DEFAULT_FILTERS)

  const updatedLabel =
    feedSource === 'api' ? 'только что' : `Обновлено ${FEED_UPDATED_AGO} назад`

  return (
    <>
      {/* Intro zone — compact, working-tool, no marketing hero */}
      <div className="flex flex-wrap items-end justify-between gap-2 pb-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">Трендовые видео</h1>
          <p className="mt-1 text-[15px] text-muted-foreground text-pretty">
            Форматы, которые прямо сейчас набирают внимание — проверьте потенциал каждого.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
          <RefreshCw className="size-3.5" aria-hidden />
          {feedSource === 'mock' ? 'Демо-данные (API не настроен)' : updatedLabel}
        </span>
      </div>

      <FilterBar filters={filters} onChange={setFilters} onReset={reset} hasActive={hasActiveFilters} />

      <section aria-label="Лента трендовых видео" className="pt-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {feedSource === 'loading' ? (
            Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} />)
          ) : visible.length === 0 ? (
            <EmptyState onReset={reset} />
          ) : (
            visible.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                analysis={analyses[video.id] ?? null}
                status={statuses[video.id] ?? 'idle'}
                saved={saved.has(video.id)}
                selected={drawerOpen && activeVideo?.id === video.id}
                onAnalyze={runAnalysis}
                onToggleSave={toggleSave}
              />
            ))
          )}
        </div>
      </section>

      <AnalysisDrawer
        video={activeVideo}
        analysis={activeVideo ? analyses[activeVideo.id] ?? null : null}
        loading={analysisLoading}
        open={drawerOpen}
        saved={activeVideo ? saved.has(activeVideo.id) : false}
        onOpenChange={setDrawerOpen}
        onToggleSave={toggleSave}
      />
    </>
  )
}