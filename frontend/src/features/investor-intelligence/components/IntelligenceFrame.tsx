import { IntelligenceFooter, IntelligenceNav } from './IntelligenceChrome'

export function IntelligenceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="ii min-h-screen bg-[var(--surface-base)]">
      <IntelligenceNav />
      <main>{children}</main>
      <IntelligenceFooter />
    </div>
  )
}
