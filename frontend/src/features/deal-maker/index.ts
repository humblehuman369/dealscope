/**
 * Deal Maker Feature Public API
 *
 * This is the single entry point for all Deal Maker components and types.
 * Import from here instead of deep paths.
 */

export * from './components/types'
export * from './components/strategyDefaults'
export * from './components/DealMakerSlider'
export * from './components/ScoreBadge'
export * from './components/MetricsHeader'
export * from './components/WorksheetTab'
export * from './components/DealMakerPage'
export * from './components/DealMakerScreen'
export * from './components/SliderInput'
export * from './components/DealMakerPopup'

// Default export for the main page
export { DealMakerPage as default } from './components/DealMakerPage'
