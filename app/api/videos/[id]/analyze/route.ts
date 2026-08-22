import { NextResponse } from 'next/server'
import { GeminiApiError, analyzeWithGemini, geminiModel, isGeminiConfigured, mapGeminiToAnalysis } from '@/lib/api/gemini'
import { analyzeBodySchema } from '@/lib/api/schemas'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * POST /api/videos/:id/analyze
 *
 * Requires authentication. Deducts 1 credit per analysis.
 * Body: { "video": { id, rank?, title, cover, duration, itemUrl, countryCode, region } }
 */
export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params

  // --- Auth check ---
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'AUTH', message: 'Необходима авторизация' } },
      { status: 401 },
    )
  }

  // --- Credit check & deduction ---
  const { data: creditsRemaining, error: creditError } = await supabase.rpc('deduct_credit')

  if (creditError || !creditsRemaining) {
    return NextResponse.json(
      { error: { code: 'CREDITS', message: 'Недостаточно кредитов для анализа' } },
      { status: 402 },
    )
  }

  // --- Validate body ---
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid JSON body' } }, { status: 400 })
  }

  const parsed = analyzeBodySchema.safeParse(body)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
    return NextResponse.json({ error: { code: 'VALIDATION', message: issues.join('; ') } }, { status: 400 })
  }

  const { video } = parsed.data
  if (video.id !== id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', message: 'Path id does not match body video.id' } },
      { status: 400 },
    )
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: 'CONFIG',
          message: 'GEMINI_API_KEY is not configured. Add it to .env to enable analysis.',
        },
      },
      { status: 503 },
    )
  }

  // --- Run analysis ---
  try {
    const result = await analyzeWithGemini(video)
    const analysis = mapGeminiToAnalysis(result, video)
    return NextResponse.json({
      data: analysis,
      meta: {
        evidenceLevel: result.evidenceLevel,
        model: geminiModel(),
        analyzedAt: new Date().toISOString(),
        creditsRemaining,
      },
    })
  } catch (err) {
    if (err instanceof GeminiApiError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status })
    }
    console.error('[api/videos/:id/analyze] unexpected error:', err)
    return NextResponse.json(
      { error: { code: 'GEMINI', message: 'Unexpected error while analyzing the video' } },
      { status: 502 },
    )
  }
}
