import { BUILTIN_THEME_IDS } from "../ir"
import { NARRATIVE_PRESETS, STRATEGY_VALUES } from "../narrative"
import {
  IDENTITY_STRENGTHS,
  OCCASION_VOCAB,
  THEME_OCCASIONS,
  type IdentityStrength,
} from "./occasions"

type BuiltinThemeId = (typeof BUILTIN_THEME_IDS)[number]

/**
 * Inputs for {@link suggestThemes}. Every field is optional. Unknown
 * occasion words and unknown strategy strings are ignored, they do not
 * throw. The function is a pure sort: same input, same output.
 */
export interface ThemeSelectSignals {
  /** Occasion words from {@link OCCASION_VOCAB}. */
  occasions?: readonly string[]
  /** Preferred identity band. Used as a sort key, and as a filter when it is the only live signal. */
  identity?: IdentityStrength
  /**
   * A narrative strategy (`pyramid` / `storytelling` / `instructional` /
   * `showcase` / `briefing`) or a named preset id (`pitch`,
   * `boardroom-report`, and others). Drives the rec-list tie-break and the
   * no-occasion fallback.
   */
  strategy?: string
}

const FALLBACK_THEME_ID: BuiltinThemeId = "consulting"

function vocabOccasions(input: readonly string[] | undefined): string[] {
  if (!input || input.length === 0) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const word of input) {
    if (!Object.hasOwn(OCCASION_VOCAB, word) || seen.has(word)) continue
    seen.add(word)
    out.push(word)
  }
  return out
}

function resolvedIdentity(value: string | undefined): IdentityStrength | undefined {
  if (value === undefined) return undefined
  return (IDENTITY_STRENGTHS as readonly string[]).includes(value) ? (value as IdentityStrength) : undefined
}

/**
 * Named preset id → that preset's recs. Strategy axis value → recs from
 * every preset on that axis, first-seen order in `NARRATIVE_PRESETS`.
 */
function narrativeRecommendations(strategy: string | undefined): string[] {
  if (!strategy) return []
  if (Object.hasOwn(NARRATIVE_PRESETS, strategy)) {
    return [...NARRATIVE_PRESETS[strategy].themeRecommendations]
  }
  if (!(STRATEGY_VALUES as readonly string[]).includes(strategy)) return []
  const recs: string[] = []
  const seen = new Set<string>()
  for (const preset of Object.values(NARRATIVE_PRESETS)) {
    if (preset.axes.strategy !== strategy) continue
    for (const id of preset.themeRecommendations) {
      if (seen.has(id)) continue
      seen.add(id)
      recs.push(id)
    }
  }
  return recs
}

function hitCount(themeId: BuiltinThemeId, occasions: readonly string[]): number {
  const owned = THEME_OCCASIONS[themeId].occasions as readonly string[]
  let n = 0
  for (const word of occasions) {
    if (owned.includes(word)) n++
  }
  return n
}

function identityMatch(themeId: BuiltinThemeId, identity: IdentityStrength | undefined): number {
  if (identity === undefined) return 0
  return THEME_OCCASIONS[themeId].identity === identity ? 1 : 0
}

function recRank(themeId: string, recs: readonly string[]): number {
  const index = recs.indexOf(themeId)
  return index === -1 ? recs.length : index
}

function catalogIndex(themeId: string): number {
  return (BUILTIN_THEME_IDS as readonly string[]).indexOf(themeId)
}

function compareCandidates(
  a: BuiltinThemeId,
  b: BuiltinThemeId,
  occasions: readonly string[],
  identity: IdentityStrength | undefined,
  recs: readonly string[],
): number {
  const byHits = hitCount(b, occasions) - hitCount(a, occasions)
  if (byHits !== 0) return byHits
  const byIdentity = identityMatch(b, identity) - identityMatch(a, identity)
  if (byIdentity !== 0) return byIdentity
  const byRec = recRank(a, recs) - recRank(b, recs)
  if (byRec !== 0) return byRec
  return catalogIndex(a) - catalogIndex(b)
}

/**
 * Deterministic theme router. Rank keys, in order: occasion hit count,
 * identity-band match, narrative preset recs, builtin catalog order.
 *
 * Fallback chain when the higher keys produce no candidates:
 * 1. Occasion hits (non-empty vocab intersection), sorted as above.
 * 2. Narrative recs for `signals.strategy` (preset id or strategy axis).
 * 3. Every builtin on `signals.identity`, catalog order.
 * 4. `consulting`.
 *
 * Theme reachability lives in `src/themes/occasions.ts`. This function
 * is the selection entry. Narrative `themeRecommendations` is a
 * reference signal, not the authority.
 */
export function suggestThemes(signals: ThemeSelectSignals): string[] {
  const occasions = vocabOccasions(signals.occasions)
  const identity = resolvedIdentity(signals.identity)
  const recs = narrativeRecommendations(signals.strategy)

  if (occasions.length > 0) {
    const hits = BUILTIN_THEME_IDS.filter((id) => hitCount(id, occasions) > 0)
    if (hits.length > 0) {
      return [...hits].sort((a, b) => compareCandidates(a, b, occasions, identity, recs))
    }
  }

  if (recs.length > 0) {
    if (identity === undefined) return recs
    return [...recs].sort((a, b) => {
      const aId = identityMatch(a as BuiltinThemeId, identity)
      const bId = identityMatch(b as BuiltinThemeId, identity)
      if (bId !== aId) return bId - aId
      return recRank(a, recs) - recRank(b, recs)
    })
  }

  if (identity !== undefined) {
    return BUILTIN_THEME_IDS.filter((id) => THEME_OCCASIONS[id].identity === identity).slice()
  }

  return [FALLBACK_THEME_ID]
}
