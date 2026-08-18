'use client'

import Image from 'next/image'
import { Bookmark, ExternalLink, Loader2, VideoOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TrendVideo, VideoAnalysis } from '@/lib/types'
import { formatCount } from '@/lib/format'
import { ScoreBadge } from './score-badge'
import { TrendPill } from './trend-pill'

export type CardStatus = 'idle' | 'analyzing' | 'analyzed'

interface VideoCardProps {
  video: TrendVideo
  analysis: VideoAnalysis | null
  status: CardStatus
  saved: boolean
  selected: boolean
  unavailable?: boolean
  onAnalyze: (video: TrendVideo) => void
  onToggleSave: (id: string) => void
}

export function VideoCard({
  video,
  analysis,
  status,
  saved,
  selected,
  unavailable = false,
  onAnalyze,
  onToggleSave,
}: VideoCardProps) {
  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow duration-150',
        'hover:shadow-[0_2px_16px_-6px_rgba(18,25,38,0.18)]',
        selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
      )}
    >
      {/* Preview — vertical 9:16 */}
      <div className="relative aspect-[9/16] overflow-hidden bg-muted">
        {unavailable ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <VideoOff className="size-6 text-muted-foreground" aria-hidden />
            <p className="text-[13px] font-medium text-muted-foreground">Видео недоступно</p>
          </div>
        ) : (
          <Image
            src={video.thumbnail || '/placeholder.svg'}
            alt={`Превью ролика @${video.creator ?? 'unknown'}: ${video.hook}`}
            fill
            sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            loading="lazy"
          />
        )}

        {!unavailable && (
          <>
            <div className="absolute left-2.5 top-2.5">
              <TrendPill label={video.trendLabel} />
            </div>
            {analysis && (
              <div className="absolute right-2.5 top-2.5">
                <ScoreBadge score={analysis.score} tier={analysis.tier} />
              </div>
            )}
            <span className="absolute bottom-2.5 right-2.5 rounded bg-foreground/70 px-1.5 py-0.5 text-[11px] font-medium text-background">
              {video.length}
            </span>
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <span className="font-medium text-foreground">@{video.creator ?? '—'}</span>
          <span aria-hidden>·</span>
          <span>{video.postedAgo ?? video.countryCode ?? '—'}</span>
          <span aria-hidden>·</span>
          <span>{video.category}</span>
        </div>

        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-pretty">
          {video.hook}
        </h3>

        {/* Performance — 2-3 metrics max */}
        <div className="mt-auto flex items-center gap-4 pt-1 text-[13px]">
          <Metric value={formatCount(video.views)} label="просмотров" emphasized />
          <Metric value={formatCount(video.likes)} label="лайков" />
          <Metric value={formatCount(video.shares)} label="репостов" />
        </div>

        {/* Actions */}
        <div className="mt-1 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAnalyze(video)}
            disabled={unavailable || status === 'analyzing'}
            className={cn(
              'inline-flex h-9 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold transition-colors',
              'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99]',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
          >
            {status === 'analyzing' ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Анализируем…
              </>
            ) : status === 'analyzed' ? (
              'Открыть анализ'
            ) : (
              'Узнать успешность'
            )}
          </button>

          <button
            type="button"
            onClick={() => onToggleSave(video.id)}
            aria-pressed={saved}
            aria-label={saved ? 'Убрать из сохранённых' : 'Сохранить ролик'}
            className={cn(
              'inline-flex size-9 items-center justify-center rounded-lg border transition-colors',
              saved
                ? 'border-primary/30 bg-primary/10 text-primary'
                : 'border-border bg-surface text-muted-foreground hover:text-foreground',
            )}
          >
            <Bookmark className={cn('size-4', saved && 'fill-current')} aria-hidden />
          </button>

          <a
            href={video.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Открыть оригинал в новой вкладке"
            className="inline-flex size-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
          >
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>
      </div>
    </article>
  )
}

function Metric({
  value,
  label,
  emphasized = false,
}: {
  value: string
  label: string
  emphasized?: boolean
}) {
  return (
    <div className="flex items-baseline gap-1">
      <span className={cn('font-semibold tabular-nums', emphasized ? 'text-foreground' : 'text-foreground/80')}>
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}