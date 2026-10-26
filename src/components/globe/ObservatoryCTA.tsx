'use client'
import { useTranslations } from 'next-intl'

// Le dashboard de l'observatoire est un projet Vercel séparé ; sans URL configurée, rien n'est affiché.
export function ObservatoryCTA({ href }: { href?: string }) {
  const t = useTranslations('home')
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-mono"
      style={{
        position: 'fixed',
        left: '26px',
        bottom: '76px',
        zIndex: 1100,
        fontSize: '11.5px',
        letterSpacing: '0.04em',
        color: '#eef3ff',
        background: 'rgba(31,46,92,0.6)',
        border: '1px solid rgba(150,180,255,0.22)',
        borderRadius: '20px',
        padding: '8px 16px',
        textDecoration: 'none',
        backdropFilter: 'blur(6px)',
      }}
    >
      {t('observatoryCta')}
    </a>
  )
}
