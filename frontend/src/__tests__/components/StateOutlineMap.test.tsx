import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StateOutlineMap } from '@/components/markets/StateOutlineMap'
import { UsStatesMap } from '@/components/markets/UsStatesMap'
import { US_STATES, getStateByCode } from '@/lib/us-states'

const florida = getStateByCode('FL')!

describe('StateOutlineMap', () => {
  it('renders the state silhouette as a link to the map search', () => {
    render(<StateOutlineMap state={florida} href="/map-search?label=Florida" />)
    const link = screen.getByRole('link', { name: /search florida investment properties on the map/i })
    expect(link).toHaveAttribute('href', '/map-search?label=Florida')
    expect(link.querySelector('svg path')?.getAttribute('d')).toMatch(/^M/)
  })

  it('throws for a state without geometry rather than rendering an empty map', () => {
    const bogus = { code: 'PR', name: 'Puerto Rico', slug: 'puerto-rico' }
    expect(() => render(<StateOutlineMap state={bogus} href="/map-search" />)).toThrow(/PR/)
  })
})

describe('UsStatesMap', () => {
  it('links only indexable states so the map mirrors the sitemap', () => {
    const entries = US_STATES.map((state) => ({ state, indexable: state.code === 'FL' || state.code === 'TX' }))
    render(<UsStatesMap entries={entries} />)
    const links = screen.getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href')).sort()).toEqual(['/markets/florida', '/markets/texas'])
    // Every state is still drawn, linked or not.
    expect(document.querySelectorAll('svg path')).toHaveLength(US_STATES.length)
  })
})
