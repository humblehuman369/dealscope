/**
 * Single mapper for API `deal_structures` → UI `DealStructure[]`.
 * Used by Discovery and Strategy so Options 1–4 stay identical.
 */

import type { DealStructure } from '@/components/iq-verdict/FourPathsPanel'

export function mapDealStructurePath(p: Record<string, unknown>): DealStructure {
  const raw = p as Record<string, any>
  return {
    id: String(raw.id ?? ''),
    family: raw.family,
    familyLabel: (raw.family_label ?? raw.familyLabel ?? '') as string,
    realismLabel: (raw.realism_label ?? raw.realismLabel ?? '') as string,
    headline: (raw.headline ?? '') as string,
    bullets: Array.isArray(raw.bullets) ? (raw.bullets as string[]) : [],
    summary: (raw.summary ?? '') as string,
    levers: (raw.levers ?? []).map((lv: Record<string, unknown>) => ({
      label: String(lv.label ?? ''),
      beforeLabel: String(lv.before_label ?? lv.beforeLabel ?? ''),
      afterLabel: String(lv.after_label ?? lv.afterLabel ?? ''),
      deltaLabel: (lv.delta_label ?? lv.deltaLabel ?? null) as string | null,
    })),
    monthlySavings: (raw.monthly_savings ?? raw.monthlySavings ?? 0) as number,
    cashRequired: (raw.cash_required ?? raw.cashRequired ?? 0) as number,
    rankingScore: (raw.ranking_score ?? raw.rankingScore ?? 0) as number,
    pitchScript: (raw.pitch_script ?? raw.pitchScript ?? null) as string | null,
    caveat: (raw.caveat ?? null) as string | null,
    selectionReason: (raw.selection_reason ?? raw.selectionReason ?? null) as string | null,
    preLoadedRecord: (raw.pre_loaded_record ?? raw.preLoadedRecord ?? null) as Record<
      string,
      unknown
    > | null,
  }
}

export function mapDealStructuresFromApi(
  raw: Record<string, unknown> | null | undefined,
): { paths: DealStructure[]; narrativeParagraphs: string[]; hasPaths: boolean } | null {
  if (!raw) return null
  const paths = (Array.isArray(raw.paths) ? raw.paths : []).map((p) =>
    mapDealStructurePath(p as Record<string, unknown>),
  )
  const hasPathsFlag = raw.has_paths ?? raw.hasPaths
  const hasPaths =
    typeof hasPathsFlag === 'boolean' ? hasPathsFlag : paths.length > 0
  return {
    paths,
    narrativeParagraphs: (raw.narrative_paragraphs ?? raw.narrativeParagraphs ?? []) as string[],
    hasPaths,
  }
}
