import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid JSON body' } }, { status: 400 })
  }

  const { email, password } = body ?? {}
  if (!email || !password) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', message: 'email and password are required' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: { code: 'AUTH', message: error.message } }, { status: 400 })
  }

  return NextResponse.json({
    data: {
      user: { id: data.user.id, email: data.user.email },
      session: true,
    },
  })
}
