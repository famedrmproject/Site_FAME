import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAdmin, authErrorResponse } from '@/lib/auth'

// GET (admin) → demandes de compte en attente, les plus anciennes d'abord.
export async function GET() {
  try { await requireAdmin() } catch (e) { return authErrorResponse(e) }
  const service = await createServiceClient()
  const { data, error } = await service.from('signup_requests')
    .select('id,email,prenom,nom,role,labo,message,created_at')
    .order('created_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
