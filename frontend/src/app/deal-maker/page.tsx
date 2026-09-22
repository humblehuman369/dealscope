import { Suspense } from 'react'
import { IQLoadingLogo } from '@/components/ui/IQLoadingLogo'
import { DealMakerIndexClient } from './DealMakerIndexClient'

/**
 * Server shell for /deal-maker. The interactive tool reads search params and
 * therefore client-renders; keeping the Suspense boundary here (not in the root
 * `loading.tsx`) lets the layout's H1 + explainer prerender for non-JS crawlers.
 */
export default function DealMakerIndexPage() {
  return (
    <Suspense fallback={<IQLoadingLogo />}>
      <DealMakerIndexClient />
    </Suspense>
  )
}
