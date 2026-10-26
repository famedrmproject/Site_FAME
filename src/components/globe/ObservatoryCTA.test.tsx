// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { ObservatoryCTA } from './ObservatoryCTA'
import en from '../../../messages/en.json'

afterEach(cleanup)

function renderCTA(href?: string) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      <ObservatoryCTA href={href} />
    </NextIntlClientProvider>
  )
}

describe('ObservatoryCTA', () => {
  it('links to the separately hosted observatory in a new tab', () => {
    renderCTA('https://observatoire.example')
    const link = screen.getByRole('link', { name: en.home.observatoryCta })
    expect(link.getAttribute('href')).toBe('https://observatoire.example')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('renders nothing while the observatory URL is not configured', () => {
    const { container } = renderCTA(undefined)
    expect(container.innerHTML).toBe('')
  })
})
