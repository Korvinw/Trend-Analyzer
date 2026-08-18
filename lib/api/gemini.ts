import { ApiError, GoogleGenAI } from '@google/genai'
import type { AnalysisFactor, PotentialTier, VideoAnalysis } from '../types'
import { parseGeminiResult } from './schemas'
import type {
  AnalyzeRequestVideo,
  EvidenceLevel,
  GeminiAnalysisResult,
  GeminiScenarioStep,
} from './types'

const DEFAULT_MODEL = 'gemini-3.7-flash'

export class GeminiApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'GeminiApiError'
  }
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY)
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL
}

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  }
  return client
}

/** Test helper — drop the cached SDK client. */
export function resetGeminiClient(): void {
  client = null
}

/* -------------------------------------------------------------------------- */
/*  Prompt                                                                    */
/* -------------------------------------------------------------------------- */

function ratio(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator == null || denominator == null || denominator <= 0) return null
  return Number((numerator / denominator).toFixed(4))
}

export function buildGeminiPrompt(video: AnalyzeRequestVideo): string {
  const views = typeof video.views === 'number' ? video.views : null
  const likes = typeof video.likes === 'number' ? video.likes : null
  const shares = typeof video.shares === 'number' ? video.shares : null

  const metadata = JSON.stringify(
    {
      id: video.id,
      rank: video.rank ?? null,
      title: video.title ?? null,
      creator: video.creator ?? null,
      coverUrl: video.cover ?? null,
      durationSeconds: video.duration ?? null,
      itemUrl: video.itemUrl ?? null,
      countryCode: video.countryCode ?? null,
      region: video.region ?? null,
      stats: {
        views,
        likes,
        shares,
        likeRate: ratio(likes, views),
        shareRate: ratio(shares, views),
      },
    },
    null,
    2,
  )

  return [
    'Ты — ведущий TikTok-стратег. Твоя задача — разобрать механику ролика и оценить, насколько её стоит повторять.',
    '',
    'Тебе даны ТОЛЬКО метаданные: заголовок, создатель, длительность, страна и — если доступны — реальные метрики (просмотры/лайки/репосты) и производные коэффициенты.',
    '',
    'ЖЁСТКИЕ ПРАВИЛА:',
    '1. У тебя НЕТ самого видео, аудио и данных удержания. Не ссылайся на кадры, монтаж или звук — анализируй заголовок, хэштеги, тему, нишу, длительность, создателя и метрики.',
    '2. НИКОГДА не выдумывай и не оценивай метрики. Комментарии, удержание (retention), досмотры НЕИЗВЕСТНЫ — не приводи для них числа. Используй только переданные views/likes/shares и коэффициенты.',
    '3. Интерпретируй коэффициенты честно и по делу: типичный like/view в TikTok ≈ 3–6% (сильный сигнал — выше 8%), share/view ≈ 0.2–1% (виральный — выше 1.5%). Если коэффициент недоступен — не делай выводов о виральности, прямо отметь, что сигнала нет.',
    '4. evidenceLevel ДОЛЖЕН быть "METADATA_ONLY".',
    '5. КАЖДЫЙ вывод обязан опираться на конкретику: цитируй слова из заголовка, называй нишу и паттерн хука (открытая петля, конкретика/цифры, обратный отсчёт, список, до/после, POV, челлендж, история, провокация, туториал). Клише или слабый хук — низкие баллы.',
    '6. ЗАПРЕЩЕНО писать шаблонные фразы вроде «сделайте контент интереснее», «привлекайте внимание», «добавьте вовлечённость» — без конкретики. Каждая рекомендация называет конкретный элемент: переформулированный заголовок, конкретный первый кадр, конкретную фразу CTA, конкретную длительность или структуру.',
    '7. Сценарий распределяй пропорционально длительности: HOOK ≈ первые 10–15%, BUILD ≈ 15–55%, PAYOFF ≈ 55–85%, CTA ≈ 85–100%. Заметки фаз — про тему ЭТОГО ролика (что именно показывать), а не общие слова.',
    '8. score 0–100 = потенциал ПОВТОРИТЬ механику. Якоря: 90+ — сильные коэффициенты + яркий узнаваемый паттерн хука + механику можно перенести в другую нишу; 70–89 — рабочая механика с конкретными замечаниями; 50–69 — средний хук и средние сигналы; ниже 50 — клише, слабые сигналы, механика не ясна из метаданных.',
    '9. Ответ — ТОЛЬКО один валидный JSON без markdown-обёртки, строго по схеме:',
    '{',
    '  "score": <int 0-100>,\n  "verdict": "HIGH_POTENTIAL" | "MEDIUM_POTENTIAL" | "LOW_POTENTIAL",\n  "summary": "<2-3 предложения на русском: почему механика работает или нет, со ссылкой на конкретику>",\n  "factors": [\n    { "name": "Hook" | "Pacing" | "Engagement" | "Format" | "Novelty",\n      "score": <int 0-100>,\n      "impact": "positive" | "negative" | "neutral",\n      "reason": "<конкретное обоснование на русском, с цитатой из заголовка или числом коэффициента>" }\n  ],\n  "recommendations": ["<конкретная рекомендация на русском>", ...],\n  "remakePotential": <int 0-100>,\n  "evidenceLevel": "METADATA_ONLY",\n  "keep": ["<что сохранить, на русском>", ...],\n  "change": ["<что изменить, на русском>", ...],\n  "tryIdeas": ["<конкретная идея ремейка с темой ролика, на русском>", ...],\n  "scenario": [\n    { "phase": "HOOK" | "BUILD" | "PAYOFF" | "CTA", "time": "<секунды, например 0-4с>", "note": "<что конкретно показать в этой фазе, на русском>" }\n  ],\n  "caveat": "<честное ограничение, на русском>"\n}',
    '',
    'МЕТАДАННЫЕ РОЛИКА:',
    metadata,
  ].join('\n')
}

/* -------------------------------------------------------------------------- */
/*  Gemini call via @google/genai SDK                                         */
/* -------------------------------------------------------------------------- */

export async function analyzeWithGemini(video: AnalyzeRequestVideo): Promise<GeminiAnalysisResult> {
  const model = geminiModel()

  let response
  try {
    response = await getClient().models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: buildGeminiPrompt(video) }] }],
      config: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    })
  } catch (err) {
    if (err instanceof ApiError) {
      throw new GeminiApiError(err.status, err.status === 429 ? 'RATE_LIMITED' : 'UPSTREAM', err.message)
    }
    throw new GeminiApiError(502, 'UPSTREAM', err instanceof Error ? err.message : 'Gemini request failed')
  }

  const text = response.text
  if (!text) {
    throw new GeminiApiError(502, 'GEMINI', 'Gemini returned no text content')
  }

  let json: unknown
  try {
    json = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''))
  } catch {
    throw new GeminiApiError(502, 'GEMINI', 'Gemini returned invalid JSON')
  }

  return parseGeminiResult(json)
}

/* -------------------------------------------------------------------------- */
/*  Map strict Gemini contract -> frontend VideoAnalysis                      */
/* -------------------------------------------------------------------------- */

const FACTOR_KEYS: AnalysisFactor['key'][] = ['hook', 'pacing', 'engagement', 'format', 'novelty']

const FACTOR_LABELS: Record<AnalysisFactor['key'], string> = {
  hook: 'Сила хука',
  pacing: 'Темп',
  engagement: 'Сигнал вовлечённости',
  format: 'Соответствие формата',
  novelty: 'Новизна',
}

const FACTOR_ALIASES: Record<string, AnalysisFactor['key']> = {
  hook: 'hook',
  pacing: 'pacing',
  tempo: 'pacing',
  pace: 'pacing',
  engagement: 'engagement',
  engaging: 'engagement',
  format: 'format',
  novelty: 'novelty',
  originality: 'novelty',
  freshness: 'novelty',
}

export function tierForScore(score: number): PotentialTier {
  if (score >= 75) return 'high'
  if (score >= 55) return 'medium'
  return 'low'
}

const VERDICT_TEXT: Record<GeminiAnalysisResult['verdict'], string> = {
  HIGH_POTENTIAL: 'Стоит разобрать',
  MEDIUM_POTENTIAL: 'Можно протестировать',
  LOW_POTENTIAL: 'Слабая база для повторения',
}

export function strengthForScore(score: number): AnalysisFactor['strength'] {
  if (score >= 80) return 'strong'
  if (score >= 65) return 'above-average'
  if (score >= 50) return 'average'
  return 'weak'
}

function factorKeyFor(name: string): AnalysisFactor['key'] | null {
  const norm = name.trim().toLowerCase()
  return FACTOR_ALIASES[norm] ?? null
}

export function mapGeminiToAnalysis(result: GeminiAnalysisResult, video: AnalyzeRequestVideo): VideoAnalysis {
  const tier = tierForScore(result.score)
  const used = new Set<AnalysisFactor['key']>()

  const factors: AnalysisFactor[] = result.factors.slice(0, 5).map((f) => {
    const key = factorKeyFor(f.name) ?? FACTOR_KEYS.find((k) => !used.has(k))!
    used.add(key)
    return {
      key,
      label: FACTOR_LABELS[key],
      strength: strengthForScore(f.score),
      explanation: f.reason,
    }
  })

  for (const key of FACTOR_KEYS) {
    if (!used.has(key)) {
      factors.push({
        key,
        label: FACTOR_LABELS[key],
        strength: 'average',
        explanation: 'Не оценено моделью — метаданных недостаточно.',
      })
    }
  }

  const keep = result.keep?.length ? result.keep : []
  const change = result.change?.length ? result.change : result.recommendations
  const tryIdeas = result.tryIdeas?.length ? result.tryIdeas : []

  const scenario: GeminiScenarioStep[] =
    result.scenario?.length
      ? result.scenario
      : fallbackScenario(video.duration)

  return {
    score: result.score,
    tier,
    verdict: VERDICT_TEXT[result.verdict],
    reason: result.summary,
    adaptable: result.verdict !== 'LOW_POTENTIAL',
    factors,
    keep,
    change,
    tryIdeas,
    scenario: scenario.map((s) => ({ phase: s.phase, time: s.time, note: s.note })),
    caveat: result.caveat ?? defaultCaveat(result.evidenceLevel, video.duration, video.views != null),
  }
}

/** Duration-proportional fallback blueprint (used only if Gemini omits it). */
function fallbackScenario(duration?: number | null): GeminiScenarioStep[] {
  const d = duration && duration > 0 ? duration : null
  const hookEnd = d ? Math.round(d * 0.15) : 2
  const buildEnd = d ? Math.round(d * 0.55) : 7
  const payoffEnd = d ? Math.round(d * 0.85) : 11
  const ctaEnd = d ?? 13
  return [
    { phase: 'HOOK', time: d ? `0–${hookEnd}с` : '0–2с', note: 'Обещание результата в первом кадре: конкретика или открытая петля из заголовка.' },
    { phase: 'BUILD', time: d ? `${hookEnd}–${buildEnd}с` : '2–7с', note: 'Быстрая демонстрация процесса с нарастающим напряжением.' },
    { phase: 'PAYOFF', time: d ? `${buildEnd}–${payoffEnd}с` : '7–11с', note: 'Наглядный результат, который обещал хук.' },
    { phase: 'CTA', time: d ? `${payoffEnd}–${ctaEnd}с` : '11–13с', note: 'Короткий призыв: сохранить, повторить или прокомментировать.' },
  ]
}

export function defaultCaveat(level: EvidenceLevel, duration?: number | null, hasStats = false): string {
  const base = `Оценка основана ${duration != null ? `на длительности (${duration}с) и ` : 'на '}названии ролика — Gemini не смотрел само видео.`
  switch (level) {
    case 'METADATA_ONLY':
      return `${base} ${hasStats ? 'Учтены просмотры/лайки/репосты; удержание и комментарии недоступны.' : 'Метрики (просмотры, лайки, retention) недоступны в источнике данных.'}`
    case 'VIDEO_CONTENT':
      return `${base} Анализ учитывал содержимое видео, но не полную статистику.`
    case 'FULL_ANALYTICS':
      return 'Оценка учитывает полные данные ролика.'
  }
}