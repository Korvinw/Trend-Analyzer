import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/favorites — list user's saved videos
 * POST /api/favorites — save a video { videoId, videoData }
 * DELETE /api/favorites?videoId=xxx — remove a saved video
 */

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: { code: 'AUTH', message: 'Unauthorized' } }, { status: 401 })
  }

  const { data, error: dbError } = await supabase
    .from('favorites')
    .select('id, video_id, video_data, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (dbError) {
    return NextResponse.json({ error: { code: 'DB', message: dbError.message } }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: { code: 'AUTH', message: 'Unauthorized' } }, { status: 401 })
  }

  let body
  try { body = await request.json() } catch {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid JSON' } }, { status: 400 })
  }

  const { videoId, videoData } = body ?? {}
  if (!videoId || !videoData) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', message: 'videoId and videoData are required' } },
      { status: 400 },
    )
  }

  const { data, error: dbError } = await supabase
    .from('favorites')
    .upsert(
      { user_id: user.id, video_id: videoId, video_data: videoData },
      { onConflict: 'user_id,video_id' },
    )
    .select('id, video_id')
    .single()

  if (dbError) {
    return NextResponse.json({ error: { code: 'DB', message: dbError.message } }, { status: 500 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return NextResponse.json({ error: { code: 'AUTH', message: 'Unauthorized' } }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const videoId = searchParams.get('videoId')
  if (!videoId) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', message: 'videoId query param is required' } },
      { status: 400 },
    )
  }

  const { error: dbError } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', user.id)
    .eq('video_id', videoId)

  if (dbError) {
    return NextResponse.json({ error: { code: 'DB', message: dbError.message } }, { status: 500 })
  }

  return NextResponse.json({ data: { ok: true } })
}
