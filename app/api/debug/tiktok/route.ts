import { NextResponse } from 'next/server'
import { isTiktokConfigured, tiktokHost } from '@/lib/api/tiktok'

export const dynamic = 'force-dynamic'

/**
 * DEBUG ONLY — returns raw upstream responses from the TikTok API so the
 * real response shapes can be inspected. Remove before production.
 *
 * GET /api/debug/tiktok?kind=trending | kind=userinfo&uniqueId=...
 */
export async function GET(request: Request) {
  if (!isTiktokConfigured()) {
    return NextResponse.json(
      { error: { code: 'CONFIG', message: 'TIKTOK_RAPIDAPI_KEY is not configured' } },
      { status: 503 },
    )
  }

  const kind = new URL(request.url).searchParams.get('kind') ?? 'trending'
  const uniqueId = new URL(request.url).searchParams.get('uniqueId') ?? 'taylorswift'

  const paths: Record<string, string> = {
    trending: '/api/trending/video?page=1&limit=20&period=30&order_by=vv&country=US',
    userinfo: `/api/user/info?uniqueId=${encodeURIComponent(uniqueId)}`,
  }
  const path = paths[kind]
  if (!path) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: `unknown kind: ${kind}` } }, { status: 400 })
  }

  try {
    const res = await fetch(`https://${tiktokHost()}${path}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': process.env.TIKTOK_RAPIDAPI_KEY!,
        'x-rapidapi-host': tiktokHost(),
      },
      cache: 'no-store',
    })
    const raw = await res.text()
    return NextResponse.json({
      kind,
      upstreamStatus: res.status,
      upstreamHeaders: {
        'x-rapidapi-region': res.headers.get('x-rapidapi-region'),
        'x-rapidapi-proxy-response': res.headers.get('x-rapidapi-proxy-response'),
        'content-type': res.headers.get('content-type'),
      },
      raw: raw.slice(0, 3000),
    })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'UPSTREAM', message: err instanceof Error ? err.message : 'fetch failed' } },
      { status: 502 },
    )
  }
}