import '@/features/investor-intelligence/intelligence.css'
import { IntelligenceFrame } from '@/features/investor-intelligence/components/IntelligenceFrame'

export default function InvestorIntelligenceLayout({ children }: { children: React.ReactNode }) {
  return <IntelligenceFrame>{children}</IntelligenceFrame>
}
