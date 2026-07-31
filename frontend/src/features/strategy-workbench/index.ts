/**
 * Strategy Workbench — public API barrel (R4 Stage 1).
 *
 * The workbench is the full financial deep-dive previously inlined in
 * `app/strategy/page.tsx`. The `/strategy` route renders it as a thin shell;
 * Stage 2 embeds the same component in Discovery behind progressive disclosure.
 */

export { StrategyWorkbench } from './components/StrategyWorkbench'
export type { StrategyWorkbenchProps } from './components/StrategyWorkbench'
