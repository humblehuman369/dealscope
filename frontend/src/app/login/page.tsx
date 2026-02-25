import type { Metadata } from 'next'
import LoginContent from './LoginContent'

export const metadata: Metadata = {
  title: 'Sign In — DealGapIQ',
  description:
    'Sign in to your DealGapIQ account to access real estate investment analytics across 6 strategies.',
}

export default function LoginPage() {
  return <LoginContent />
}
