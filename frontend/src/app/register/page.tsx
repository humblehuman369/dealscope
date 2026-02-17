import type { Metadata } from 'next'
import RegistrationContent from './RegistrationContent'

export const metadata: Metadata = {
  title: 'Register — DealGapIQ',
  description:
    'Create your DealGapIQ account. Start free or begin a 7-day Pro trial with full access to investment analytics.',
}

export default function RegisterPage() {
  return <RegistrationContent />
}
