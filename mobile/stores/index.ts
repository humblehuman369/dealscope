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

// Property store — current property + search history with persistence
export {
  usePropertyStore,
  useRecentSearches,
  useSavedByStatus,
  useIsPropertySaved,
} from './propertyStore';
export type {
  CurrentPropertyInfo,
  RecentSearch,
  SavedProperty,
} from './propertyStore';

// UI store — transient application UI state (no persistence)
export {
  useUIStore,
  useActiveStrategy,
  useToast,
} from './uiStore';
