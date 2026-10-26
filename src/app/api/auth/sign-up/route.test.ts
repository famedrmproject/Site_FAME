import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// État pilotable par test
let existingMember: unknown = null
let createError: { status?: number; message: string } | null = null
let insertError: unknown = null
let allowed = true
const inserted: unknown[] = []
const deletedUsers: string[] = []

vi.mock('@/lib/rate-limit', () => ({ checkIpRateLimit: async () => allowed }))
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: async () => ({
    from: (table: string) => table === 'members'
      ? { select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: existingMember }) }) }) }
      : { insert: (row: unknown) => { inserted.push(row); return Promise.resolve({ error: insertError }) } },
    auth: { admin: {
      createUser: () => Promise.resolve(createError ? { data: null, error: createError } : { data: { user: { id: 'u1' } }, error: null }),
      deleteUser: (id: string) => { deletedUsers.push(id); return Promise.resolve({ error: null }) },
    } },
  }),
}))

import { POST } from './route'

const valid = { prenom: ' Ada ', nom: 'Lovelace', email: 'Ada@Example.org', role: 'phd', labo: 'paris', password: 'Password123' }
const req = (body: unknown) =>
  new NextRequest('http://localhost/api/auth/sign-up', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  existingMember = null; createError = null; insertError = null; allowed = true
  inserted.length = 0; deletedUsers.length = 0
})

describe('POST /api/auth/sign-up', () => {
  it('enregistre une demande en attente, sans ligne members', async () => {
    expect((await POST(req(valid))).status).toBe(201)
    expect(inserted).toEqual([{ id: 'u1', email: 'ada@example.org', prenom: 'Ada', nom: 'Lovelace', role: 'phd', labo: 'paris', message: null }])
  })
  it('refuse un mot de passe faible ou un rôle inconnu (400)', async () => {
    expect((await POST(req({ ...valid, password: 'password' }))).status).toBe(400)
    expect((await POST(req({ ...valid, role: 'admin' }))).status).toBe(400)
    expect(inserted).toEqual([])
  })
  it('signale un membre ou une demande existante (409)', async () => {
    existingMember = { id: 'm1' }
    expect((await POST(req(valid))).status).toBe(409)
    existingMember = null
    createError = { status: 422, message: 'A user with this email address has already been registered' }
    expect((await POST(req(valid))).status).toBe(409)
  })
  it('supprime l\'utilisateur Auth si la demande ne peut pas être enregistrée', async () => {
    insertError = { message: 'insert failed' }
    expect((await POST(req(valid))).status).toBe(500)
    expect(deletedUsers).toEqual(['u1'])
  })
  it('limite le débit par IP (429)', async () => {
    allowed = false
    expect((await POST(req(valid))).status).toBe(429)
  })
})
