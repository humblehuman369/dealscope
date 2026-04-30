/**
 * @deprecated — renamed to FourPathsPanel. This shim exists for one release so
 * external imports don't break mid-migration. Update imports to
 * `@/components/iq-verdict/FourPathsPanel` and remove this file in the next
 * release cycle.
 */

export {
  FourPathsPanel as ThreePathsPanel,
  type DealStructure,
  type DealStructureLever,
  type DealStructuresPayload,
  type StructureFamily,
} from './FourPathsPanel'
