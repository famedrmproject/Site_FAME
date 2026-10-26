import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server'
import { checkIpRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  if (!await checkIpRateLimit(req, 'signin', 10, 60_000)) {
    return NextResponse.json({ error: 'Too many attempts' }, { status: 429 })
  }
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }
  const supabase = await createServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }
  // Une demande de compte non encore validée ne doit pas ouvrir de session.
  const service = await createServiceClient()
  const [{ data: member }, { data: pending }] = await Promise.all([
    service.from('members').select('id').eq('id', data.user.id).maybeSingle(),
    service.from('signup_requests').select('id').eq('id', data.user.id).maybeSingle(),
  ])
  if (!member && pending) {
    await supabase.auth.signOut()
    return NextResponse.json({ error: 'pending' }, { status: 403 })
  }
  return NextResponse.json({ ok: true })
}
