import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin, authErrorResponse } from '@/lib/auth'
import { VALID_LABS } from '@/lib/constants'
import { ROLES } from '@/lib/signup'
import type { Lab, Role } from '@/types'

type Params = { params: Promise<{ id: string }> }

// POST (admin) → { decision: 'approve', role?, labo? } crée le membre activé ;
// { decision: 'reject' } supprime la demande et l'utilisateur Auth associé.
export async function POST(req: NextRequest, { params }: Params) {
  try { await requireAdmin() } catch (e) { return authErrorResponse(e) }
  const { id } = await params
  const { decision, role, labo } = await req.json().catch(() => ({}))
  if (decision !== 'approve' && decision !== 'reject') {
    return NextResponse.json({ error: 'decision must be approve or reject' }, { status: 400 })
  }
  if ((role !== undefined && !ROLES.includes(role as Role)) || (labo !== undefined && !VALID_LABS.includes(labo as Lab))) {
    return NextResponse.json({ error: 'Invalid role or lab' }, { status: 400 })
  }

  const service = await createServiceClient()
  const { data: request, error: readErr } = await service.from('signup_requests')
    .select('id,email,prenom,nom,role,labo').eq('id', id).maybeSingle()
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  if (!request) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (decision === 'reject') {
    const { error: authErr } = await service.auth.admin.deleteUser(id)
    if (authErr && authErr.status !== 404) {
      console.error('Sign-up rejection auth delete failed:', authErr)
      return NextResponse.json({ error: 'Rejection failed' }, { status: 500 })
    }
    const { error: delErr } = await service.from('signup_requests').delete().eq('id', id)
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { error: memberErr } = await service.from('members').insert({
    id, email: request.email, prenom: request.prenom, nom: request.nom,
    role: role ?? request.role, labo: labo ?? request.labo,
    domaines: [], is_admin: false, activated_at: new Date().toISOString(),
  })
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })
  const { error: delErr } = await service.from('signup_requests').delete().eq('id', id)
  // Non bloquant : le membre existe, une demande résiduelle est ignorée à la connexion.
  if (delErr) console.error('Sign-up request cleanup failed:', delErr)
  return NextResponse.json({ ok: true })
}
