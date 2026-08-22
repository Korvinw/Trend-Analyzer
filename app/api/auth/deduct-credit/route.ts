import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/auth/deduct-credit
 *
 * Atomically deducts 1 credit from the authenticated user's profile.
 * Returns the remaining credit count.
 */
export async function POST() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'AUTH', message: 'Необходима авторизация' } },
      { status: 401 },
    )
  }

  const { data, error } = await supabase.rpc('deduct_credit')

  if (error || !data) {
    return NextResponse.json(
      { error: { code: 'CREDITS', message: 'Недостаточно кредитов или ошибка списания' } },
      { status: 402 },
    )
  }

  return NextResponse.json({ data: { credits: data } })
}
