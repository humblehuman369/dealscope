import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { VerifyCodeInput } from '@/components/auth/VerifyCodeInput'

describe('VerifyCodeInput', () => {
  it('auto-submits when six digits are entered or pasted', () => {
    const onComplete = vi.fn()
    render(<VerifyCodeInput onComplete={onComplete} pending={false} error={null} locked={false} />)

    fireEvent.change(screen.getByLabelText('Or type the code from the email'), {
      target: { value: '847-291 extra' },
    })

    expect(onComplete).toHaveBeenCalledWith('847291')
  })

  it('shows the lockout copy and does not submit', () => {
    const onComplete = vi.fn()
    render(
      <VerifyCodeInput
        onComplete={onComplete}
        pending={false}
        error="Too many tries. Request a new link below."
        locked
      />,
    )

    fireEvent.change(screen.getByLabelText('Or type the code from the email'), {
      target: { value: '123456' },
    })

    expect(onComplete).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/too many tries/i)
  })
})
