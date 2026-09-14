import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WhyWeThinkSo } from '@/components/discovery/WhyWeThinkSo'
import { classifySignalKind, type WhySignal } from '@/lib/whyWeThinkSo'

function signal(id: string, title: string, detail: string): WhySignal {
  return { id, kind: classifySignalKind(title), title, detail }
}

const SIGNALS: WhySignal[] = [
  signal(
    'listed',
    'Actively listed — competing buyers',
    'Speed and terms matter when competing with other buyers.',
  ),
  signal(
    'cuts',
    '10 price reductions totaling 21%',
    'Repeated price cuts signal a seller adjusting to the market — a strong opening for a below-ask offer.',
  ),
  signal(
    'dom',
    '224 days on market',
    'Adds to the seller-motivation profile for this property.',
  ),
  signal(
    'occ',
    'Non-owner occupied',
    'High negotiation leverage — typical discount range 8-12%.',
  ),
  signal(
    'calibrated',
    'About 7% of investors close at this discount or deeper (U.S. baseline)',
    'Calibrated regional estimate — not live transaction data. See Methodology.',
  ),
  signal(
    'assumptions',
    'Assumes 20% down · 6.0% · 30yr',
    'Edit financing terms in DealMaker to match your actual loan scenario.',
  ),
]

describe('WhyWeThinkSo', () => {
  it('shows three priority signals and keeps the rest behind the expander', () => {
    render(<WhyWeThinkSo signals={SIGNALS} />)
    expect(screen.getByRole('heading', { name: 'Why we think so' })).toBeInTheDocument()
    expect(screen.getByText('224 days on market')).toBeInTheDocument()
    expect(screen.getByText('10 price reductions totaling 21%')).toBeInTheDocument()
    expect(screen.getByText('Non-owner occupied')).toBeInTheDocument()
    expect(
      screen.queryByText('Calibrated regional estimate — not live transaction data. See Methodology.'),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('Actively listed — competing buyers')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'See 3 more signals' }))
    expect(
      screen.getByText('Calibrated regional estimate — not live transaction data. See Methodology.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Edit financing terms in DealMaker to match your actual loan scenario.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Repeated price cuts signal a seller adjusting to the market — a strong opening for a below-ask offer.',
      ),
    ).toBeInTheDocument()
  })

  it('renders the one-cut seller sentence from the fixture', () => {
    render(
      <WhyWeThinkSo
        signals={[
          signal(
            'one-cut',
            '1 price reduction',
            'One price cut so far. The seller has moved once; watch for a second.',
          ),
        ]}
      />,
    )
    expect(
      screen.getByText('One price cut so far. The seller has moved once; watch for a second.'),
    ).toBeInTheDocument()
  })
})
