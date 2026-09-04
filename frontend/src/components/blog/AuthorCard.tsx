import Image from 'next/image'
import Link from 'next/link'

interface AuthorCardProps {
  name: string
}

const FOUNDER_BIO =
  'Founder of DealGapIQ. Previously founded Foreclosure.com and built HomePath.com for Fannie Mae and HomeSteps.com for Freddie Mac. 35+ years in real estate data. Google Deal Gap IQ. Know what to offer.'

export function AuthorCard({ name }: AuthorCardProps) {
  const isFounder = name === 'Brad Geisen'
  return (
    <div
      className="mt-12 flex items-start gap-4 rounded-2xl border p-5 sm:p-6"
      style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border-default)' }}
    >
      {isFounder && (
        <Image
          src="/images/brad-geisen.png"
          alt={name}
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 rounded-full object-cover"
        />
      )}
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-label)' }}>
          Written by
        </p>
        <p className="mt-1 text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>
          <Link href="/about" className="hover:opacity-80 transition-opacity">
            {name}
          </Link>
        </p>
        {isFounder && (
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {FOUNDER_BIO}
          </p>
        )}
      </div>
    </div>
  )
}
