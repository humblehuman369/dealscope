export { WorkbenchTour } from './WorkbenchTour'
export { ColdLinkModal } from './ColdLinkModal'
export { TourModal } from './TourModal'
export { DiscoveryColdLanding } from './DiscoveryColdLanding'
export { DiscoveryTourReplayBanner } from './DiscoveryTourReplayBanner'

export function replayWorkbenchTour(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('dealscope:replay-workbench-tour'))
}

export function replayMapSearchTour(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('dealscope:replay-map-tour'))
}
