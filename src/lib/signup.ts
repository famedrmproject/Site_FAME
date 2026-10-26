import type { Lab, Role } from '@/types'
import { VALID_LABS } from '@/lib/constants'
import { ROLES } from '@/components/team/team-shared'

export { ROLES }

export type SignupRequest = {
  id: string
  email: string
  prenom: string
  nom: string
  role: Role
  labo: Lab
  message: string | null
  created_at: string
}

// Même règle que l'activation par invitation : ≥8 caractères, une majuscule, un chiffre.
export function isStrongPassword(password: unknown): password is string {
  return typeof password === 'string' && password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
}

export type SignupInput = Omit<SignupRequest, 'id' | 'created_at'> & { password: string }

// Valide et normalise le corps de POST /api/auth/sign-up ; null si invalide.
export function parseSignup(body: unknown): SignupInput | null {
  if (!body || typeof body !== 'object') return null
  const { email, prenom, nom, role, labo, message, password } = body as Record<string, unknown>
  const text = (value: unknown, max: number) =>
    typeof value === 'string' && value.trim() && value.trim().length <= max ? value.trim() : null
  const cleanEmail = text(email, 254)?.toLowerCase() ?? null
  const cleanPrenom = text(prenom, 100)
  const cleanNom = text(nom, 100)
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || !cleanPrenom || !cleanNom) return null
  if (!ROLES.includes(role as Role) || !VALID_LABS.includes(labo as Lab) || !isStrongPassword(password)) return null
  if (message != null && (typeof message !== 'string' || message.trim().length > 1000)) return null
  return {
    email: cleanEmail, prenom: cleanPrenom, nom: cleanNom, role: role as Role, labo: labo as Lab,
    message: typeof message === 'string' && message.trim() ? message.trim() : null, password,
  }
}
