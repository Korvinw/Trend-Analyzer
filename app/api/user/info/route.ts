import { NextResponse } from 'next/server'
import { TiktokApiError, fetchUserInfo, isTiktokConfigured } from '@/lib/api/tiktok'

export const dynamic = 'force-dynamic'

/**
 * GET /api/user/info?uniqueId=taylorswift
 *
 * Normalized creator info from the TikTok API. Unknown fields are null —
 * the backend never guesses stats.
 */
export async function GET(request: Request) {
  const uniqueId = new URL(request.url).searchParams.get('uniqueId')?.trim()
  if (!uniqueId) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', message: 'uniqueId query parameter is required' } },
      { status: 400 },
    )
  }
  if (uniqueId.length > 100) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', message: 'uniqueId is too long' } },
      { status: 400 },
    )
  }

  if (!isTiktokConfigured()) {
    return NextResponse.json(
      {
        error: {
          code: 'CONFIG',
          message: 'TIKTOK_RAPIDAPI_KEY is not configured. Add it to .env to enable live data.',
        },
      },
      { status: 503 },
    )
  }

  try {
    const data = await fetchUserInfo(uniqueId)
    return NextResponse.json({
      data,
      meta: { source: 'tiktok-rapidapi' },
    })
  } catch (err) {
    if (err instanceof TiktokApiError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status })
    }
    console.error('[api/user/info] unexpected error:', err)
    return NextResponse.json(
      { error: { code: 'UPSTREAM', message: 'Unexpected error while fetching creator info' } },
      { status: 502 },
    )
  }
}