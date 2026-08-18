'use client'

import Image from 'next/image'
import { ArrowRight, Bookmark, ExternalLink, Info } from 'lucide-react'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import type { AnalysisFactor, PotentialTier, TrendVideo, VideoAnalysis } from '@/lib/types'
import { formatCount, tierLabel } from '@/lib/format'
import { AnalysisSkeleton } from './analysis-skeleton'

interface AnalysisDrawerProps {
  video: TrendVideo | null
  analysis: VideoAnalysis | null
  loading: boolean
  open: boolean
  saved: boolean
  onOpenChange: (open: boolean) => void
  onToggleSave: (id: string) => void
}

const tierAccent: Record<PotentialTier, string> = {
  high: 'text-success',
  medium: 'text-warning',
  low: 'text-danger',
}

const tierBorder: Record<PotentialTier, string> = {
  high: 'border-l-success',
  medium: 'border-l-warning',
  low: 'border-l-danger',
}

export function AnalysisDrawer({
  video,
  analysis,
  loading,
  open,
  saved,
  onOpenChange,
  onToggleSave,
}: AnalysisDrawerProps) {

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-[600px]"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Анализ ролика {video ? `@${video.creator ?? '—'}` : ''}</SheetTitle>
        </SheetHeader>

        {loading || !video || !analysis ? (
          <AnalysisSkeleton />
        ) : (
          <div className="flex flex-col">
            {/* Header */}
            <div className="flex items-start gap-3 border-b border-border p-5">
              <div className="relative aspect-[9/16] w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                <Image
                  src={video.thumbnail || '/placeholder.svg'}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-muted-foreground">
                  @{video.creator ?? '—'} · {video.postedAgo ?? video.countryCode ?? '—'} ·{' '}
                  {video.category}
                </p>
                <h2 className="mt-0.5 line-clamp-2 text-[15px] font-semibold leading-snug text-pretty">
                  {video.hook}
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  <a
                    href={video.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                  >
                    Открыть оригинал
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                </div>
              </div>
            </div>

            {/* Decision block — first and most important */}
            <div className="p-5">
              <div className={cn('rounded-xl border border-l-4 bg-surface p-5', tierBorder[analysis.tier])}>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Потенциал
                </p>
                <div className="mt-1 flex items-end justify-between gap-4">
                  <span className="text-5xl font-bold leading-none tabular-nums">
                    {analysis.score}
                    <span className="ml-1 text-xl font-semibold text-muted-foreground">/ 100</span>
                  </span>
                  <span className={cn('text-[13px] font-semibold uppercase tracking-wide', tierAccent[analysis.tier])}>
                    {tierLabel[analysis.tier]}
                  </span>
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-foreground">{analysis.reason}</p>
                <p className="mt-2 text-[13px] text-muted-foreground">
                  Для адаптации:{' '}
                  <span className="font-semibold text-foreground">
                    {analysis.adaptable ? 'да' : 'скорее нет'}
                  </span>{' '}
                  · Вердикт: <span className="font-semibold text-foreground">{analysis.verdict}</span>
                </p>
                <p className="mt-3 flex items-start gap-1.5 text-[12px] text-muted-foreground">
                  <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                  {analysis.caveat}
                </p>
              </div>
            </div>

            {/* Why — factors */}
            <Section title="Почему ролик работает">
              <ul className="flex flex-col gap-3">
                {analysis.factors.map((f) => (
                  <FactorRow key={f.key} factor={f} />
                ))}
              </ul>
            </Section>

            {/* Recommendations: keep / change / try */}
            <Section title="Что с этим делать">
              <RecoGroup title="Сохранить" tone="success" items={analysis.keep} />
              <RecoGroup title="Изменить" tone="warning" items={analysis.change} />
              <RecoGroup title="Попробовать" tone="neutral" items={analysis.tryIdeas} />
            </Section>

            {/* Scenario blueprint */}
            <Section title="Сценарий">
              <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {analysis.scenario.map((step, i) => (
                  <li
                    key={step.phase}
                    className="relative flex flex-col gap-1 rounded-lg border border-border bg-surface p-3"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                      {step.phase}
                    </span>
                    <span className="text-[12px] font-medium text-muted-foreground">{step.time}</span>
                    <span className="text-[13px] leading-snug">{step.note}</span>
                    {i < analysis.scenario.length - 1 && (
                      <ArrowRight
                        className="absolute -right-[11px] top-1/2 hidden size-4 -translate-y-1/2 text-border sm:block"
                        aria-hidden
                      />
                    )}
                  </li>
                ))}
              </ol>
            </Section>

            {/* Source data — secondary, collapsed */}
            <Section title="" noHeading>
              <Accordion>
                <AccordionItem value="source" className="border-none">
                  <AccordionTrigger className="rounded-lg px-0 text-[14px] font-semibold hover:no-underline">
                    Исходные данные
                  </AccordionTrigger>
                  <AccordionContent>
                    <dl className="grid grid-cols-3 gap-3 pt-1">
                      <SourceMetric label="Просмотры" value={formatCount(video.views)} />
                      <SourceMetric label="Лайки" value={formatCount(video.likes)} />
                      <SourceMetric label="Репосты" value={formatCount(video.shares)} />
                      <SourceMetric label="Формат" value={video.format} />
                      <SourceMetric label="Длина" value={video.length} />
                      <SourceMetric
                        label="Рост"
                        value={video.growth == null ? '—' : `${video.growth}/100`}
                      />
                    </dl>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Section>

            {/* Sticky actions */}
            <div className="sticky bottom-0 mt-auto flex items-center gap-2 border-t border-border bg-background/90 p-4 backdrop-blur">
              <a
                href={video.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-[14px] font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Открыть оригинал
                <ExternalLink className="size-4" aria-hidden />
              </a>
              <button
                type="button"
                onClick={() => onToggleSave(video.id)}
                aria-pressed={saved}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-[14px] font-medium transition-colors',
                  saved
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-border bg-surface text-foreground hover:bg-muted',
                )}
              >
                <Bookmark className={cn('size-4', saved && 'fill-current')} aria-hidden />
                {saved ? 'Сохранено' : 'Сохранить'}
              </button>
              <SheetClose className="inline-flex h-10 items-center rounded-lg border border-border bg-surface px-4 text-[14px] font-medium transition-colors hover:bg-muted">
                Закрыть
              </SheetClose>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

function Section({
  title,
  children,
  noHeading = false,
}: {
  title: string
  children: React.ReactNode
  noHeading?: boolean
}) {
  return (
    <section className="border-t border-border px-5 py-5">
      {!noHeading && <h3 className="mb-3 text-[15px] font-semibold">{title}</h3>}
      {children}
    </section>
  )
}

const strengthText: Record<AnalysisFactor['strength'], string> = {
  strong: 'Сильный',
  'above-average': 'Выше среднего',
  average: 'Средний',
  weak: 'Слабый',
}

const strengthDot: Record<AnalysisFactor['strength'], string> = {
  strong: 'bg-success',
  'above-average': 'bg-success/70',
  average: 'bg-warning',
  weak: 'bg-danger',
}

function FactorRow({ factor }: { factor: AnalysisFactor }) {
  return (
    <li className="flex gap-3">
      <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', strengthDot[factor.strength])} aria-hidden />
      <div>
        <p className="text-[14px] font-medium">
          {factor.label}
          <span className="ml-2 text-[12px] font-normal text-muted-foreground">
            {strengthText[factor.strength]}
          </span>
        </p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{factor.explanation}</p>
      </div>
    </li>
  )
}

function RecoGroup({
  title,
  tone,
  items,
}: {
  title: string
  tone: 'success' | 'warning' | 'neutral'
  items: string[]
}) {
  const toneCls =
    tone === 'success'
      ? 'text-success'
      : tone === 'warning'
        ? 'text-warning'
        : 'text-foreground'
  return (
    <div className="mb-4 last:mb-0">
      <p className={cn('mb-1.5 text-[12px] font-semibold uppercase tracking-wide', toneCls)}>{title}</p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-foreground">
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SourceMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-2.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
