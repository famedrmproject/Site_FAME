'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import type { Lab, Role } from '@/types'
import { VALID_LABS, LAB_LABELS } from '@/lib/constants'
import { ROLES, isStrongPassword } from '@/lib/signup'
import { ROLE_KEY } from '@/components/team/team-shared'

// Même rendu que les champs de la page de connexion.
const fieldClass = 'border border-fame-ecru rounded px-3 py-2 text-sm bg-transparent w-full'

export default function SignupPage() {
  const t = useTranslations('auth')
  const tt = useTranslations('team')
  const { locale } = useParams<{ locale: string }>()
  const [form, setForm] = useState({ prenom: '', nom: '', email: '', role: 'researcher' as Role, labo: 'paris' as Lab, message: '' })
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError(t('passwordMismatch')); return }
    if (!isStrongPassword(password)) { setError(t('passwordTooWeak')); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, password }),
      })
      if (res.ok) setDone(true)
      else setError(res.status === 409 ? t('signupExists') : res.status === 429 ? t('signupTooMany') : t('signupFailed'))
    } catch {
      setError(t('signupFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-fame-navy flex items-center justify-center px-4 py-12">
      {done ? (
        <div className="bg-fame-sand p-10 rounded-xl w-full max-w-sm flex flex-col gap-4">
          <h1 className="font-serif text-2xl text-fame-blue-dark">{t('signupSentTitle')}</h1>
          <p className="text-sm text-fame-text-body">{t('signupSentBody')}</p>
          <Link href={`/${locale}`} className="text-sm text-fame-blue underline underline-offset-2">{t('backHome')}</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-fame-sand p-10 rounded-xl w-full max-w-md flex flex-col gap-4">
          <h1 className="font-serif text-2xl text-fame-blue-dark">{t('signupTitle')}</h1>
          <p className="text-sm text-fame-text-body">{t('signupIntro')}</p>
          {error && <p className="text-fame-red text-sm">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <input aria-label={tt('fFirstName')} placeholder={tt('fFirstName')} value={form.prenom} onChange={set('prenom')} required maxLength={100} className={fieldClass} />
            <input aria-label={tt('fLastName')} placeholder={tt('fLastName')} value={form.nom} onChange={set('nom')} required maxLength={100} className={fieldClass} />
          </div>
          <input type="email" aria-label={t('email')} placeholder={t('email')} value={form.email} onChange={set('email')} required className={fieldClass} />
          <div className="grid grid-cols-[3fr_2fr] gap-3">
            <select aria-label={tt('fRole')} value={form.role} onChange={set('role')} className={fieldClass}>
              {ROLES.map(r => <option key={r} value={r}>{tt(ROLE_KEY[r] as Parameters<typeof tt>[0])}</option>)}
            </select>
            <select aria-label={t('lab')} value={form.labo} onChange={set('labo')} className={fieldClass}>
              {VALID_LABS.map(l => <option key={l} value={l}>{LAB_LABELS[l]}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <input type="password" aria-label={t('password')} aria-describedby="signup-password-rule" placeholder={t('password')} value={password}
              onChange={e => setPassword(e.target.value)} required autoComplete="new-password" className={fieldClass} />
            <p id="signup-password-rule" className="text-xs text-fame-text-muted">{t('passwordRule')}</p>
          </div>
          <input type="password" aria-label={t('confirmPasswordPlaceholder')} placeholder={t('confirmPasswordPlaceholder')} value={confirm}
            onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" className={fieldClass} />
          <textarea aria-label={t('signupMessage')} placeholder={t('signupMessage')} value={form.message} onChange={set('message')}
            maxLength={1000} rows={3} className={`${fieldClass} resize-y`} />
          <button type="submit" disabled={loading}
            className="bg-fame-blue text-white rounded py-2 text-sm font-medium hover:bg-fame-blue-dark disabled:opacity-50">
            {loading ? t('loading') : t('signupSubmit')}
          </button>
          <p className="text-sm text-fame-text-body text-center">
            {t('haveAccount')}{' '}
            <Link href={`/${locale}/auth/login`} className="text-fame-blue underline underline-offset-2">{t('signIn')}</Link>
          </p>
        </form>
      )}
    </div>
  )
}
