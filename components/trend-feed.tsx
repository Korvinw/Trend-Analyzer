'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { analyzeVideo, FEED_UPDATED_AGO, VIDEOS } from '@/lib/mock-data'
import { useAuth } from '@/lib/auth-context'
import type { TrendVideo, VideoAnalysis } from '@/lib/types'
import { DEFAULT_FILTERS, FilterBar, type Filters } from './filter-bar'
import { VideoCard, type CardStatus } from './video-card'
import { VideoCardSkeleton } from './video-card-skeleton'
import { AnalysisDrawer } from './analysis-drawer'
import { EmptyState } from './empty-state'
import { AuthModal } from './auth-modal'

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
  const { user, refresh: refreshAuth } = useAuth()
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [feedSource, setFeedSource] = useState<FeedSource>('loading')
  const [videos, setVideos] = useState<TrendVideo[]>(VIDEOS)

  const [statuses, setStatuses] = useState<Record<string, CardStatus>>({})
  const [analyses, setAnalyses] = useState<Record<string, VideoAnalysis>>({})
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const [activeVideo, setActiveVideo] = useState<TrendVideo | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [showFavorites, setShowFavorites] = useState(false)
  const [favoriteVideos, setFavoriteVideos] = useState<TrendVideo[]>([])

  const fetchSeq = useRef(0)

  // Load favorites from API when user logs in
  useEffect(() => {
    if (!user) {
      setSaved(new Set())
      setFavoriteVideos([])
      return
    }
    fetch('/api/favorites', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const ids = new Set<string>(json.data.map((f: { video_id: string }) => f.video_id))
          setSaved(ids)
          setFavoriteVideos(json.data.map((f: { video_data: TrendVideo }) => f.video_data))
        }
      })
      .catch(() => {})
  }, [user])

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
    if (!user) {
      setActiveVideo(video)
      setAuthMode('login')
      setAuthOpen(true)
      return
    }

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
      if (res.status === 402) {
        await refreshAuth()
        setAnalyses((a) => ({ ...a, [video.id]: analyzeVideo(video) }))
        return
      }
      if (!res.ok) throw new Error(`analyze request failed: ${res.status}`)
      const json = await res.json()
      setAnalyses((a) => ({ ...a, [video.id]: json.data }))
      await refreshAuth()
    } catch {
      setAnalyses((a) => ({ ...a, [video.id]: analyzeVideo(video) }))
    } finally {
      setStatuses((s) => ({ ...s, [video.id]: 'analyzed' }))
      setAnalysisLoading(false)
    }
  }

  const toggleSave = async (id: string) => {
    if (!user) {
      setAuthMode('login')
      setAuthOpen(true)
      return
    }

    const isSaved = saved.has(id)
    // Optimistic update
    setSaved((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

    try {
      if (isSaved) {
        await fetch(`/api/favorites?videoId=${encodeURIComponent(id)}`, { method: 'DELETE' })
        setFavoriteVideos((prev) => prev.filter((v) => v.id !== id))
      } else {
        const video = videos.find((v) => v.id === id) ?? favoriteVideos.find((v) => v.id === id)
        if (video) {
          await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId: id, videoData: video }),
          })
          setFavoriteVideos((prev) => [video, ...prev.filter((v) => v.id !== id)])
        }
      }
    } catch {
      // Revert on error
      setSaved((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    }
  }

  const reset = () => { setFilters(DEFAULT_FILTERS); setShowFavorites(false) }

  const updatedLabel =
    feedSource === 'api' ? 'только что' : `Обновлено ${FEED_UPDATED_AGO} назад`

  const displayVideos = showFavorites ? favoriteVideos : visible

  return (
    <>
      {/* Intro zone */}
      <div className="flex flex-wrap items-end justify-between gap-2 pb-1">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-balance">
            {showFavorites ? '\u0418\u0437\u0431\u0440\u0430\u043d\u043d\u043e\u0435' : '\u0422\u0440\u0435\u043d\u0434\u043e\u0432\u044b\u0435 \u0432\u0438\u0434\u0435\u043e'}
          </h1>
          <p className="mt-1 text-[15px] text-muted-foreground text-pretty">
            {showFavorites
              ? '\u0412\u0430\u0448\u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0451\u043d\u043d\u044b\u0435 \u0440\u043e\u043b\u0438\u043a\u0438'
              : '\u0424\u043e\u0440\u043c\u0430\u0442\u044b, \u043a\u043e\u0442\u043e\u0440\u044b\u0435 \u043f\u0440\u044f\u043c\u043e \u0441\u0435\u0439\u0447\u0430\u0441 \u043d\u0430\u0431\u0438\u0440\u0430\u044e\u0442 \u0432\u043d\u0438\u043c\u0430\u043d\u0438\u0435 \u2014 \u043f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043f\u043e\u0442\u0435\u043d\u0446\u0438\u0430\u043b \u043a\u0430\u0436\u0434\u043e\u0433\u043e.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <button
              type="button"
              onClick={() => setShowFavorites(!showFavorites)}
              className={'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium transition-colors ' +
                (showFavorites
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface text-muted-foreground hover:text-foreground')}
            >
              {'\u2606'} {'\u0418\u0437\u0431\u0440\u0430\u043d\u043d\u043e\u0435'} {saved.size > 0 && `(${saved.size})`}
            </button>
          )}
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <RefreshCw className="size-3.5" aria-hidden />
            {feedSource === 'mock' ? '\u0414\u0435\u043c\u043e-\u0434\u0430\u043d\u043d\u044b\u0435 (API \u043d\u0435 \u043d\u0430\u0441\u0442\u0440\u043e\u0435\u043d)' : updatedLabel}
          </span>
        </div>
      </div>

      <FilterBar filters={filters} onChange={setFilters} onReset={reset} hasActive={hasActiveFilters} />

      <section aria-label="Лента трендовых видео" className="pt-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {feedSource === 'loading' && !showFavorites ? (
            Array.from({ length: 6 }).map((_, i) => <VideoCardSkeleton key={i} />)
          ) : displayVideos.length === 0 ? (
            showFavorites ? (
              <div className="col-span-full py-16 text-center">
                <p className="text-[15px] text-muted-foreground">
                  {'\u041f\u043e\u043a\u0430 \u043d\u0438\u0447\u0435\u0433\u043e \u043d\u0435 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043e'}
                </p>
                <button
                  type="button"
                  onClick={() => setShowFavorites(false)}
                  className="mt-3 text-[13px] font-medium text-primary hover:underline"
                >
                  {'\u0412\u0435\u0440\u043d\u0443\u0442\u044c\u0441\u044f \u043a \u043b\u0435\u043d\u0442\u0435'}
                </button>
              </div>
            ) : (
              <EmptyState onReset={reset} />
            )
          ) : (
            displayVideos.map((video) => (
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

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} initialMode={authMode} />
    </>
  )
}