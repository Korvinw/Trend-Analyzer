import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  analyzeWithGemini,
  buildGeminiPrompt,
  defaultCaveat,
  GeminiApiError,
  mapGeminiToAnalysis,
  resetGeminiClient,
  strengthForScore,
  tierForScore,
} from '../lib/api/gemini'
import { parseGeminiResult } from '../lib/api/schemas'
import type { GeminiAnalysisResult } from '../lib/api/types'

const mockGenerateContent = vi.fn()

vi.mock('@google/genai', () => {
  class MockApiError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.name = 'ApiError'
      this.status = status
    }
  }
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => ({
      models: { generateContent: mockGenerateContent },
    })),
    ApiError: MockApiError,
  }
})

const validResult: GeminiAnalysisResult = {
  score: 87,
  verdict: 'HIGH_POTENTIAL',
  summary: 'Сильный хук и понятная механика.',
  factors: [
    { name: 'Hook', score: 84, impact: 'positive', reason: 'Обещание результата в первых секундах.' },
    { name: 'Pacing', score: 70, impact: 'positive', reason: 'Ритм соответствует длительности.' },
  ],
  recommendations: ['Сократить вступление', 'Добавить текстовый хук'],
  remakePotential: 91,
  evidenceLevel: 'METADATA_ONLY',
  keep: ['Вертикальный формат'],
  change: ['Сократить вступление'],
  tryIdeas: ['Версия-список'],
  scenario: [
    { phase: 'HOOK', time: '0–2с', note: 'Хук' },
    { phase: 'BUILD', time: '2–7с', note: 'Развитие' },
    { phase: 'PAYOFF', time: '7–11с', note: 'Финал' },
    { phase: 'CTA', time: '11–13с', note: 'Призыв' },
  ],
  caveat: 'Только метаданные.',
}

describe('parseGeminiResult', () => {
  it('accepts a fully valid result', () => {
    expect(parseGeminiResult(validResult)).toEqual(validResult)
  })

  it('accepts the minimal fixed contract (no extra fields)', () => {
    const minimal = {
      score: 50,
      verdict: 'MEDIUM_POTENTIAL',
      summary: 'Средне',
      factors: [{ name: 'Hook', score: 50, impact: 'neutral', reason: 'Средне' }],
      recommendations: ['Тест'],
      remakePotential: 55,
      evidenceLevel: 'METADATA_ONLY',
    }
    expect(parseGeminiResult(minimal)).toEqual(minimal)
  })

  it('rejects score out of range', () => {
    expect(() => parseGeminiResult({ ...validResult, score: 150 })).toThrow(/score/)
  })

  it('rejects unknown verdict', () => {
    expect(() => parseGeminiResult({ ...validResult, verdict: 'MAYBE' })).toThrow(/verdict/)
  })

  it('rejects missing evidenceLevel', () => {
    const { evidenceLevel: _el, ...rest } = validResult
    expect(() => parseGeminiResult(rest)).toThrow(/evidenceLevel/)
  })

  it('rejects unknown evidenceLevel value', () => {
    expect(() =>
      parseGeminiResult({ ...validResult, evidenceLevel: 'MADE_UP_LEVEL' }),
    ).toThrow(/evidenceLevel/)
  })

  it('rejects empty factors or recommendations', () => {
    expect(() => parseGeminiResult({ ...validResult, factors: [] })).toThrow(/factors/)
    expect(() => parseGeminiResult({ ...validResult, recommendations: [] })).toThrow(/recommendations/)
  })
})

describe('buildGeminiPrompt', () => {
  const video = {
    id: '7572995879557139742',
    rank: 1,
    title: 'gifting a support cat',
    cover: 'https://cover',
    duration: 159,
    itemUrl: 'https://www.tiktok.com/@mnm_pipi/video/7572995879557139742',
    countryCode: 'US',
    region: 'United States',
    creator: 'mnm_pipi',
    views: 25300000,
    likes: 4000000,
    shares: 193600,
  }

  it('forces METADATA_ONLY and forbids inventing metrics', () => {
    const prompt = buildGeminiPrompt(video)
    expect(prompt).toContain('METADATA_ONLY')
    expect(prompt).toMatch(/не выдумывай и не оценивай метрики/i)
    expect(prompt).toMatch(/нет самого видео/i)
  })

  it('embeds the video metadata as JSON', () => {
    const prompt = buildGeminiPrompt(video)
    expect(prompt).toContain('7572995879557139742')
    expect(prompt).toContain('gifting a support cat')
    expect(prompt).toContain('"durationSeconds": 159')
  })

  it('embeds real engagement stats and computed ratios', () => {
    const prompt = buildGeminiPrompt(video)
    expect(prompt).toContain('"views": 25300000')
    expect(prompt).toContain('"likes": 4000000')
    expect(prompt).toContain('"shares": 193600')
    // likeRate = 4M / 25.3M ≈ 0.1581, shareRate = 193600 / 25.3M ≈ 0.0077
    expect(prompt).toContain('"likeRate": 0.1581')
    expect(prompt).toContain('"shareRate": 0.0077')
  })

  it('omits ratios when stats are missing', () => {
    const prompt = buildGeminiPrompt({ id: 'x', title: 't' })
    expect(prompt).toContain('"likeRate": null')
    expect(prompt).toContain('"shareRate": null')
  })
})

describe('mapGeminiToAnalysis', () => {
  const video = { id: '1', title: 't', itemUrl: 'https://tiktok.com/@a/video/1', duration: 30 }

  it('maps core fields into the frontend VideoAnalysis shape', () => {
    const a = mapGeminiToAnalysis(validResult, video)
    expect(a.score).toBe(87)
    expect(a.tier).toBe('high')
    expect(a.verdict).toBe('Стоит разобрать')
    expect(a.reason).toBe(validResult.summary)
    expect(a.adaptable).toBe(true)
    expect(a.keep).toEqual(['Вертикальный формат'])
    expect(a.change).toEqual(['Сократить вступление'])
    expect(a.tryIdeas).toEqual(['Версия-список'])
    expect(a.scenario).toHaveLength(4)
  })

  it('maps Gemini factors onto the 5 fixed frontend factor keys', () => {
    const a = mapGeminiToAnalysis(validResult, video)
    const keys = a.factors.map((f) => f.key)
    expect(keys).toEqual(expect.arrayContaining(['hook', 'pacing', 'engagement', 'format', 'novelty']))
    const hook = a.factors.find((f) => f.key === 'hook')!
    expect(hook.label).toBe('Сила хука')
    expect(hook.strength).toBe('strong')
    expect(hook.explanation).toBe('Обещание результата в первых секундах.')
  })

  it('falls back to recommendations when change is missing', () => {
    const { change: _c, ...rest } = validResult
    const a = mapGeminiToAnalysis(rest, video)
    expect(a.change).toEqual(validResult.recommendations)
  })

  it('uses LOW_POTENTIAL verdict -> not adaptable', () => {
    const a = mapGeminiToAnalysis({ ...validResult, verdict: 'LOW_POTENTIAL', score: 20 }, video)
    expect(a.tier).toBe('low')
    expect(a.adaptable).toBe(false)
    expect(a.verdict).toBe('Слабая база для повторения')
  })

  it('adds an evidence-aware caveat by default', () => {
    const { caveat: _c, ...rest } = validResult
    const a = mapGeminiToAnalysis(rest, video)
    expect(a.caveat).toContain('не смотрел само видео')
    expect(a.caveat).toContain('просмотры, лайки, retention')
  })

  it('mentions engagement stats in the caveat when present', () => {
    const { caveat: _c, ...rest } = validResult
    const a = mapGeminiToAnalysis(rest, { ...video, views: 1000, likes: 100 })
    expect(a.caveat).toContain('Учтены просмотры/лайки/репосты')
  })

  it('builds a duration-proportional scenario when Gemini omits it', () => {
    const { scenario: _s, ...rest } = validResult
    const a = mapGeminiToAnalysis(rest, { ...video, duration: 40 })
    expect(a.scenario).toHaveLength(4)
    expect(a.scenario[0].phase).toBe('HOOK')
    expect(a.scenario[0].time).toBe('0–6с')
    expect(a.scenario[1].time).toBe('6–22с')
    expect(a.scenario[2].time).toBe('22–34с')
    expect(a.scenario[3].time).toBe('34–40с')
  })
})

describe('helpers', () => {
  it('tierForScore thresholds', () => {
    expect(tierForScore(75)).toBe('high')
    expect(tierForScore(55)).toBe('medium')
    expect(tierForScore(54)).toBe('low')
  })

  it('strengthForScore thresholds', () => {
    expect(strengthForScore(80)).toBe('strong')
    expect(strengthForScore(65)).toBe('above-average')
    expect(strengthForScore(50)).toBe('average')
    expect(strengthForScore(49)).toBe('weak')
  })

  it('defaultCaveat reflects evidence level', () => {
    expect(defaultCaveat('METADATA_ONLY')).toContain('не смотрел само видео')
    expect(defaultCaveat('FULL_ANALYTICS')).toContain('полные данные')
  })
})

describe('analyzeWithGemini (SDK)', () => {
  const video = {
    id: '7572995879557139742',
    rank: 1,
    title: 'gifting a support cat',
    cover: 'https://cover',
    duration: 159,
    itemUrl: 'https://www.tiktok.com/@mnm_pipi/video/7572995879557139742',
    countryCode: 'US',
    region: 'United States',
  }

  beforeEach(() => {
    resetGeminiClient()
    mockGenerateContent.mockReset()
  })

  it('parses a valid SDK response into the strict contract', async () => {
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(validResult) })
    const result = await analyzeWithGemini(video)
    expect(result).toEqual(validResult)
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.any(String),
        config: expect.objectContaining({ responseMimeType: 'application/json' }),
      }),
    )
  })

  it('fails on invalid JSON from the model', async () => {
    mockGenerateContent.mockResolvedValue({ text: 'not json at all' })
    await expect(analyzeWithGemini(video)).rejects.toThrow(/invalid JSON/)
  })

  it('fails when the model returns no text', async () => {
    mockGenerateContent.mockResolvedValue({ text: undefined })
    await expect(analyzeWithGemini(video)).rejects.toThrow(/no text content/)
  })

  it('maps SDK HTTP errors to GeminiApiError', async () => {
    const { ApiError } = await import('@google/genai')
    mockGenerateContent.mockRejectedValue(
      new (ApiError as unknown as new (message: string, status: number) => Error)('rate limited', 429),
    )
    await expect(analyzeWithGemini(video)).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
    })
  })

  it('wraps generic SDK errors as UPSTREAM', async () => {
    mockGenerateContent.mockRejectedValue(new Error('network down'))
    await expect(analyzeWithGemini(video)).rejects.toBeInstanceOf(GeminiApiError)
    await expect(analyzeWithGemini(video)).rejects.toMatchObject({ code: 'UPSTREAM' })
  })

  it('enforces the strict contract on the model output', async () => {
    const { score: _s, ...missingScore } = validResult
    mockGenerateContent.mockResolvedValue({ text: JSON.stringify(missingScore) })
    await expect(analyzeWithGemini(video)).rejects.toThrow(/failed validation/)
  })
})