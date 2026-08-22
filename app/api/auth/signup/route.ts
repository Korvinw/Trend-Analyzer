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

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', message: 'Invalid email format' } },
      { status: 400 },
    )
  }

  if (typeof password !== 'string' || password.length < 6) {
    return NextResponse.json(
      { error: { code: 'VALIDATION', message: 'Password must be at least 6 characters' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: { code: 'AUTH', message: error.message } }, { status: 400 })
  }

  // When email confirmation is disabled, signUp returns a session immediately.
  // When enabled, data.session is null and user must confirm via email.
  return NextResponse.json({
    data: {
      user: data.user
        ? { id: data.user.id, email: data.user.email }
        : null,
      session: data.session ? true : false,
      message: data.session
        ? null
        : 'Check your email for a confirmation link to complete sign up.',
    },
  })
}
