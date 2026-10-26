'use client'
import { useEffect, useState, useCallback } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { useToast } from '@/components/ui/Toast'
import type { Lab, Role } from '@/types'
import { VALID_LABS, LAB_LABELS } from '@/lib/constants'
import { ROLES, type SignupRequest } from '@/lib/signup'
import { ROLE_KEY } from '@/components/team/team-shared'

// Même fond que les autres pages admin (AdminProposalsClient).
const PAGE_BG =
  'radial-gradient(110% 80% at 22% 8%, rgba(181,157,135,0.28) 0%, rgba(181,157,135,0) 52%), ' +
  'radial-gradient(120% 110% at 80% 112%, rgba(113,120,132,0.2) 0%, rgba(113,120,132,0) 60%), ' +
  'radial-gradient(140% 120% at 90% 44%, rgba(47,68,134,0.08) 0%, rgba(47,68,134,0) 55%), ' +
  '#F9F9FA'

const selectStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: 7,
  border: '1px solid rgba(20,40,90,0.18)',
  background: '#fff',
  fontSize: 11,
  cursor: 'pointer',
}

const actionBtn: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 11,
  letterSpacing: '0.04em',
  cursor: 'pointer',
  border: 'none',
}

export function AdminSignupRequestsClient() {
  const t = useTranslations('admin')
  const tt = useTranslations('team')
  const locale = useLocale()
  const { addToast } = useToast()
  const [requests, setRequests] = useState<SignupRequest[] | null>(null)
  const [choices, setChoices] = useState<Record<string, { role: Role; labo: Lab }>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    fetch('/api/admin/signup-requests')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then((data: SignupRequest[]) => setRequests(data))
      .catch(() => addToast(t('actionError'), 'error'))
  }, [t, addToast])

  useEffect(() => { load() }, [load])

  async function decide(request: SignupRequest, decision: 'approve' | 'reject') {
    setBusy(request.id)
    try {
      const choice = choices[request.id] ?? { role: request.role, labo: request.labo }
      const res = await fetch(`/api/admin/signup-requests/${request.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decision === 'approve' ? { decision, ...choice } : { decision }),
      })
      if (res.ok) { addToast(t(decision === 'approve' ? 'requestApproved' : 'requestRejected'), 'success'); load() }
      else addToast(t('actionError'), 'error')
    } catch {
      addToast(t('actionError'), 'error')
    } finally {
      setBusy(null)
    }
  }

  const choiceFor = (r: SignupRequest) => choices[r.id] ?? { role: r.role, labo: r.labo }
  const setChoice = (r: SignupRequest, patch: Partial<{ role: Role; labo: Lab }>) =>
    setChoices(c => ({ ...c, [r.id]: { ...choiceFor(r), ...patch } }))

  return (
    <div className="font-serif" style={{ minHeight: 'calc(100vh - 3rem)', color: '#18244c', background: PAGE_BG }}>
      <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid rgba(20,40,90,0.1)' }}>
        <div className="font-mono text-fame-text-muted"
          style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 3 }}>
          {t('kicker')}
        </div>
        <h1 className="font-serif text-fame-text-dark" style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
          {t('requestsTitle')}
        </h1>
        <a href={`/${locale}/admin/proposals`} className="font-mono text-fame-blue"
          style={{ display: 'inline-block', marginTop: 7, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          ← {t('proposalsTitle')}
        </a>
      </div>

      <div style={{ padding: '28px 16px 48px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {requests?.length === 0 && (
            <p className="font-mono text-fame-text-muted" style={{ fontSize: 12, textAlign: 'center', paddingTop: 50 }}>
              {t('noRequests')}
            </p>
          )}
          {requests?.map(r => (
            <div key={r.id} className="bg-fame-sand"
              style={{ borderRadius: 11, boxShadow: '0 16px 40px -24px rgba(0,5,30,0.4), inset 0 0 0 1px rgba(0,0,0,0.05)', padding: '18px 20px' }}>
              <h3 className="font-serif text-fame-text-dark" style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
                {r.prenom} {r.nom}
              </h3>
              <p className="font-mono" style={{ fontSize: 11, color: '#6b7596', margin: '5px 0 0', overflowWrap: 'anywhere' }}>
                {r.email} · {new Date(r.created_at).toLocaleDateString(locale)}
              </p>
              {r.message && (
                <p className="font-serif" style={{ fontSize: 13.5, color: '#43507a', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: '12px 0 0' }}>
                  {r.message}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 14, marginTop: 14 }}>
                <select aria-label={tt('fRole')} className="font-mono text-fame-text-dark" style={selectStyle}
                  value={choiceFor(r).role} onChange={e => setChoice(r, { role: e.target.value as Role })}>
                  {ROLES.map(role => <option key={role} value={role}>{tt(ROLE_KEY[role] as Parameters<typeof tt>[0])}</option>)}
                </select>
                <select aria-label={t('lab')} className="font-mono text-fame-text-dark" style={selectStyle}
                  value={choiceFor(r).labo} onChange={e => setChoice(r, { labo: e.target.value as Lab })}>
                  {VALID_LABS.map(l => <option key={l} value={l}>{LAB_LABELS[l]}</option>)}
                </select>
                <button className="font-mono bg-fame-teal text-fame-text-light" disabled={busy === r.id}
                  onClick={() => decide(r, 'approve')} style={actionBtn}>{t('approve')}</button>
                <button className="font-mono bg-fame-red text-fame-text-light" disabled={busy === r.id}
                  onClick={() => decide(r, 'reject')} style={actionBtn}>{t('reject')}</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
