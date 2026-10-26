import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkIpRateLimit } from '@/lib/rate-limit'
import { parseSignup } from '@/lib/signup'

// POST → demande de compte publique. Le compte reste inactif (aucune ligne
// `members`) jusqu'à la validation par un administrateur dans /admin/requests.
export async function POST(req: NextRequest) {
  if (!await checkIpRateLimit(req, 'signup', 5, 60 * 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }
  const input = parseSignup(await req.json().catch(() => null))
  if (!input) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const service = await createServiceClient()
  const { data: existing } = await service.from('members').select('id').eq('email', input.email).maybeSingle()
  if (existing) return NextResponse.json({ error: 'exists' }, { status: 409 })

  const { data: authData, error: authErr } = await service.auth.admin.createUser({
    email: input.email, password: input.password, email_confirm: true,
  })
  if (authErr || !authData?.user) {
    // Supabase refuse une adresse déjà enregistrée (demande en cours ou invitation).
    if (authErr?.status === 422 || /already/i.test(authErr?.message ?? '')) {
      return NextResponse.json({ error: 'exists' }, { status: 409 })
    }
    console.error('Sign-up auth user creation failed:', authErr)
    return NextResponse.json({ error: 'Sign-up failed' }, { status: 500 })
  }

  const { error: reqErr } = await service.from('signup_requests').insert({
    id: authData.user.id, email: input.email, prenom: input.prenom, nom: input.nom,
    role: input.role, labo: input.labo, message: input.message,
  })
  if (reqErr) {
    await service.auth.admin.deleteUser(authData.user.id) // pas d'utilisateur orphelin
    console.error('Sign-up request insert failed:', reqErr)
    return NextResponse.json({ error: 'Sign-up failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true }, { status: 201 })
}
