import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// État pilotable par test
let isAdmin = true
let request: unknown = { id: 'u1', email: 'ada@example.org', prenom: 'Ada', nom: 'Lovelace', role: 'phd', labo: 'paris' }
const members: Record<string, unknown>[] = []
const deletedRequests: string[] = []
const deletedUsers: string[] = []

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth')
  return {
    ...actual,
    requireAdmin: async () => {
      if (!isAdmin) throw new actual.AuthError(403, 'Admin access required')
      return { session: {}, member: { id: 'admin' } }
    },
  }
})
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: async () => ({
    from: (table: string) => table === 'members'
      ? { insert: (row: Record<string, unknown>) => { members.push(row); return Promise.resolve({ error: null }) } }
      : {
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: request, error: null }) }) }),
          delete: () => ({ eq: (_c: string, id: string) => { deletedRequests.push(id); return Promise.resolve({ error: null }) } }),
        },
    auth: { admin: { deleteUser: (id: string) => { deletedUsers.push(id); return Promise.resolve({ error: null }) } } },
  }),
}))

import { POST } from './route'

const call = (body: unknown) => POST(
  new NextRequest('http://localhost/api/admin/signup-requests/u1', { method: 'POST', body: JSON.stringify(body) }),
  { params: Promise.resolve({ id: 'u1' }) },
)

beforeEach(() => {
  isAdmin = true
  request = { id: 'u1', email: 'ada@example.org', prenom: 'Ada', nom: 'Lovelace', role: 'phd', labo: 'paris' }
  members.length = 0; deletedRequests.length = 0; deletedUsers.length = 0
})

describe('POST /api/admin/signup-requests/[id]', () => {
  it('valide : crée le membre activé avec le rôle choisi et retire la demande', async () => {
    expect((await call({ decision: 'approve', role: 'researcher' })).status).toBe(200)
    expect(members).toHaveLength(1)
    expect(members[0]).toMatchObject({ id: 'u1', email: 'ada@example.org', role: 'researcher', labo: 'paris', is_admin: false })
    expect(members[0]?.activated_at).toEqual(expect.any(String))
    expect(deletedRequests).toEqual(['u1'])
    expect(deletedUsers).toEqual([])
  })
  it('refuse : supprime la demande et l\'utilisateur Auth', async () => {
    expect((await call({ decision: 'reject' })).status).toBe(200)
    expect(deletedUsers).toEqual(['u1'])
    expect(deletedRequests).toEqual(['u1'])
    expect(members).toEqual([])
  })
  it('réservé aux administrateurs (403)', async () => {
    isAdmin = false
    expect((await call({ decision: 'approve' })).status).toBe(403)
    expect(members).toEqual([])
  })
  it('404 si la demande n\'existe plus, 400 si la décision est invalide', async () => {
    expect((await call({ decision: 'maybe' })).status).toBe(400)
    expect((await call({ decision: 'approve', role: 'admin' })).status).toBe(400)
    request = null
    expect((await call({ decision: 'approve' })).status).toBe(404)
  })
})
