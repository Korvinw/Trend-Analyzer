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

export function buildGeminiPrompt(video: AnalyzeRequestVideo): string {
  const metadata = JSON.stringify(
    {
      id: video.id,
      rank: video.rank ?? null,
      title: video.title ?? null,
      coverUrl: video.cover ?? null,
      durationSeconds: video.duration ?? null,
      itemUrl: video.itemUrl ?? null,
      countryCode: video.countryCode ?? null,
      region: video.region ?? null,
    },
    null,
    2,
  )

  return [
    'You are an expert TikTok creative strategist. Analyze the video below using ONLY the metadata provided.',
    '',
    'CRITICAL RULES:',
    '1. You do NOT have access to the video file, audio, captions, view/like/comment/share counts or retention data.',
    '2. NEVER invent or estimate metrics such as views, likes, comments, shares, watch time or retention. If a metric is unknown, do not mention a number for it.',
    '3. evidenceLevel MUST be "METADATA_ONLY".',
    '4. Base every factor, score and recommendation strictly on: title, duration, cover URL domain hint, creator, country/region and ranking.',
    '5. Be skeptical and specific. A weak hook or generic title must score low.',
    '6. Reply with ONLY a single valid JSON object, no markdown fences, matching this schema:',
    '{',
    '  "score": <int 0-100 overall potential to replicate the mechanic>,\n  "verdict": "HIGH_POTENTIAL" | "MEDIUM_POTENTIAL" | "LOW_POTENTIAL",\n  "summary": "<2-3 sentence Russian summary of why the mechanic works or not>",\n  "factors": [\n    { "name": "Hook" | "Pacing" | "Engagement" | "Format" | "Novelty",\n      "score": <int 0-100>,\n      "impact": "positive" | "negative" | "neutral",\n      "reason": "<specific Russian reason grounded in the metadata>" }\n  ],\n  "recommendations": ["<Russian recommendation>", ...],\n  "remakePotential": <int 0-100>,\n  "evidenceLevel": "METADATA_ONLY",\n  "keep": ["<what to keep, Russian>", ...],\n  "change": ["<what to change, Russian>", ...],\n  "tryIdeas": ["<remake ideas, Russian>", ...],\n  "scenario": [\n    { "phase": "HOOK" | "BUILD" | "PAYOFF" | "CTA", "time": "<e.g. 0-2s>", "note": "<Russian note>" }\n  ],\n  "caveat": "<honest limitation note, Russian>"\n}',
    '',
    'VIDEO METADATA:',
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
      : [
          { phase: 'HOOK', time: '0–2с', note: 'Обещание результата в первом кадре.' },
          { phase: 'BUILD', time: '2–7с', note: 'Быстрая демонстрация процесса.' },
          { phase: 'PAYOFF', time: '7–11с', note: 'Наглядный результат.' },
          { phase: 'CTA', time: '11–13с', note: 'Короткий призыв сохранить или повторить.' },
        ]

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
    caveat: result.caveat ?? defaultCaveat(result.evidenceLevel, video.duration),
  }
}

export function defaultCaveat(level: EvidenceLevel, duration?: number | null): string {
  const base = `Оценка основана ${duration != null ? `на длительности (${duration}с) и ` : 'на '}названии ролика — Gemini не смотрел само видео.`
  switch (level) {
    case 'METADATA_ONLY':
      return `${base} Метрики (просмотры, лайки, retention) недоступны в источнике данных.`
    case 'VIDEO_CONTENT':
      return `${base} Анализ учитывал содержимое видео, но не полную статистику.`
    case 'FULL_ANALYTICS':
      return 'Оценка учитывает полные данные ролика.'
  }
}