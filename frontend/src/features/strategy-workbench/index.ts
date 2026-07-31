/**
 * Strategy Workbench — public API barrel (R4).
 *
 * The workbench is the full financial deep-dive that used to be the /strategy
 * page. It now renders exclusively as Level 3 of the Discovery page
 * (`/discovery?view=workbench`); the old route 301s there.
 */

export { StrategyWorkbench } from './components/StrategyWorkbench'
export type { StrategyWorkbenchProps } from './components/StrategyWorkbench'
