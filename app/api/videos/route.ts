import { NextResponse } from 'next/server'
import { TiktokApiError, fetchTrendingVideos, isTiktokConfigured, validateQuery } from '@/lib/api/tiktok'

export const dynamic = 'force-dynamic'

/**
 * GET /api/videos?page=1&limit=20&period=30&order_by=vv&country=US
 *
 * Returns trending TikTok videos normalized into the frontend shape.
 * Requires TIKTOK_RAPIDAPI_KEY. Without it returns 503 CONFIG — the
 * frontend falls back to demo data.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams

  let query
  try {
    query = validateQuery(params)
  } catch (err) {
    if (err instanceof TiktokApiError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: 400 })
    }
    throw err
  }

  if (!isTiktokConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: 'CONFIG',
          message: 'TIKTOK_RAPIDAPI_KEY is not configured. Add it to .env to enable live trending data.',
        },
      },
      { status: 503 },
    )
  }

  try {
    const data = await fetchTrendingVideos(query)
    return NextResponse.json({
      data,
      meta: {
        source: 'tiktok-rapidapi',
        evidenceLevel: 'METADATA_ONLY',
      },
    })
  } catch (err) {
    if (err instanceof TiktokApiError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status })
    }
    console.error('[api/videos] unexpected error:', err)
    const detail = err instanceof Error ? err.message : 'unknown error'
    return NextResponse.json(
      { error: { code: 'UPSTREAM', message: `Unexpected error while fetching TikTok data: ${detail}` } },
      { status: 502 },
    )
  }
}