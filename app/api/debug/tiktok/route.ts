import { NextResponse } from 'next/server'
import { isTiktokConfigured, tiktokHost } from '@/lib/api/tiktok'

export const dynamic = 'force-dynamic'

/**
 * DEBUG ONLY — returns raw upstream responses from the TikTok API so the
 * real response shapes can be inspected. Remove before production.
 *
 * GET /api/debug/tiktok?path=/api/trending/creator
 * GET /api/debug/tiktok?path=/api/user/info&params=uniqueId%3Dtaylorswift
 */
export async function GET(request: Request) {
  if (!isTiktokConfigured()) {
    return NextResponse.json(
      { error: { code: 'CONFIG', message: 'TIKTOK_RAPIDAPI_KEY is not configured' } },
      { status: 503 },
    )
  }

  const url = new URL(request.url)
  const path = url.searchParams.get('path') ?? '/api/trending/video'
  const params = url.searchParams.get('params') ?? ''
  const full = `${path}${params ? `?${params}` : ''}`

  try {
    const res = await fetch(`https://${tiktokHost()}${full}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': process.env.TIKTOK_RAPIDAPI_KEY!,
        'x-rapidapi-host': tiktokHost(),
      },
      cache: 'no-store',
    })
    const raw = await res.text()
    return NextResponse.json({
      probed: full,
      upstreamStatus: res.status,
      upstreamHeaders: {
        'x-rapidapi-region': res.headers.get('x-rapidapi-region'),
        'x-rapidapi-proxy-response': res.headers.get('x-rapidapi-proxy-response'),
        'content-type': res.headers.get('content-type'),
      },
      raw: raw.slice(0, 4000),
    })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'UPSTREAM', message: err instanceof Error ? err.message : 'fetch failed' } },
      { status: 502 },
    )
  }
}