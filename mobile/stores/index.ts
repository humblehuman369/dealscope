/**
 * Store barrel exports.
 *
 * All Zustand stores are exported from here for clean imports:
 *   import { useAssumptionsStore, usePropertyStore, useUIStore } from '../stores';
 */

// Assumptions store — default financial assumptions with persistence
export {
  useAssumptionsStore,
  DEFAULT_ASSUMPTIONS,
} from './assumptionsStore';
export type {
  AllAssumptions,
  FinancingAssumptions,
  OperatingAssumptions,
  LTRAssumptions,
  STRAssumptions,
  RehabAssumptions,
  BRRRRAssumptions,
  FlipAssumptions,
  HouseHackAssumptions,
  WholesaleAssumptions,
} from './assumptionsStore';

// Property store — current property + recent searches (transient nav + lightweight history)
// NOTE: Saved/pipeline properties live in SQLite via syncManager, not Zustand.
export {
  usePropertyStore,
  useRecentSearches,
} from './propertyStore';
export type {
  CurrentPropertyInfo,
  RecentSearch,
} from './propertyStore';

// UI store — transient application UI state (no persistence)
export {
  useUIStore,
  useActiveStrategy,
  useToast,
} from './uiStore';

// Deal Maker store — persists deal-maker inputs per property
export {
  useDealMakerStore,
  useDealMakerDerived,
  useDealMakerReady,
} from './dealMakerStore';
export type {
  CachedMetrics,
  DealMakerRecord,
  DealMakerUpdate,
  PriceTarget,
} from './dealMakerStore';

// Worksheet store — persists worksheet inputs per property/strategy
export {
  useWorksheetStore,
  useWorksheetDerived,
} from './worksheetStore';
export type {
  WorksheetMetrics,
  WorksheetEntry,
} from './worksheetStore';
