import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// État pilotable par test
let member: unknown = null
let pending: unknown = null
let signedOut = false

vi.mock('@/lib/rate-limit', () => ({ checkIpRateLimit: async () => true }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: () => Promise.resolve({ data: { user: { id: 'u1' } }, error: null }),
      signOut: () => { signedOut = true; return Promise.resolve({ error: null }) },
    },
  }),
  createServiceClient: async () => ({
    from: (table: string) => ({ select: () => ({ eq: () => ({ maybeSingle: () =>
      Promise.resolve({ data: table === 'members' ? member : pending }) }) }) }),
  }),
}))

import { POST } from './route'

const req = () => new NextRequest('http://localhost/api/auth/sign-in', {
  method: 'POST', body: JSON.stringify({ email: 'ada@example.org', password: 'Password123' }),
})

beforeEach(() => { member = null; pending = null; signedOut = false })

describe('POST /api/auth/sign-in', () => {
  it('ferme la session d\'une demande non validée (403)', async () => {
    pending = { id: 'u1' }
    expect((await POST(req())).status).toBe(403)
    expect(signedOut).toBe(true)
  })
  it('connecte un membre', async () => {
    member = { id: 'u1' }
    expect((await POST(req())).status).toBe(200)
    expect(signedOut).toBe(false)
  })
})
