import type { ContentLayout, ContentLayoutId } from "../types"
import * as stage from "./stage"
import * as lecture from "./lecture"
import * as swiss from "./swiss"
import * as memo from "./memo"
import * as playbill from "./playbill"
import * as museum from "./museum"
import * as luxe from "./luxe"
import * as ink from "./ink"
import * as brief from "./brief"
import * as ledger from "./ledger"
import * as terminal from "./terminal"
import * as heritage from "./heritage"
import * as vermilion from "./vermilion"
import * as journal from "./journal"
import * as rally from "./rally"
import * as arena from "./arena"
import * as almanac from "./almanac"
import * as thesis from "./thesis"

export type SparseLayoutId = Extract<
  ContentLayoutId,
  "statement" | "pull-quote" | "stat-hero" | "one-evidence" | "mono-bleed"
>

type FaceMap = Partial<Record<SparseLayoutId, ContentLayout>>

/**
 * `(themeId, layoutId)` → theme face. Theme ids live only in this table.
 * Unregistered pairs fall through to the generic face in content-*.tsx.
 */
export const FACES: Partial<Record<string, FaceMap>> = {
  stage: {
    statement: stage.statement,
    "stat-hero": stage.statHero,
    "pull-quote": stage.pullQuote,
  },
  lecture: {
    statement: lecture.statement,
    "stat-hero": lecture.statHero,
    "one-evidence": lecture.oneEvidence,
  },
  swiss: {
    "stat-hero": swiss.statHero,
    statement: swiss.statement,
    "one-evidence": swiss.oneEvidence,
  },
  memo: {
    "pull-quote": memo.pullQuote,
    "stat-hero": memo.statHero,
    statement: memo.statement,
  },
  playbill: {
    statement: playbill.statement,
    "stat-hero": playbill.statHero,
    "mono-bleed": playbill.monoBleed,
  },
  museum: {
    statement: museum.statement,
    "one-evidence": museum.oneEvidence,
    "stat-hero": museum.statHero,
  },
  luxe: {
    "pull-quote": luxe.pullQuote,
    "stat-hero": luxe.statHero,
    statement: luxe.statement,
  },
  ink: {
    statement: ink.statement,
    "stat-hero": ink.statHero,
    "pull-quote": ink.pullQuote,
  },
  brief: {
    statement: brief.statement,
    "stat-hero": brief.statHero,
    "one-evidence": brief.oneEvidence,
  },
  ledger: {
    statement: ledger.statement,
    "stat-hero": ledger.statHero,
    "pull-quote": ledger.pullQuote,
  },
  terminal: {
    "stat-hero": terminal.statHero,
    statement: terminal.statement,
    "one-evidence": terminal.oneEvidence,
  },
  heritage: {
    "pull-quote": heritage.pullQuote,
    statement: heritage.statement,
    "stat-hero": heritage.statHero,
  },
  vermilion: {
    statement: vermilion.statement,
    "stat-hero": vermilion.statHero,
    "one-evidence": vermilion.oneEvidence,
  },
  journal: {
    "pull-quote": journal.pullQuote,
    "stat-hero": journal.statHero,
    statement: journal.statement,
  },
  rally: {
    statement: rally.statement,
    "stat-hero": rally.statHero,
    "one-evidence": rally.oneEvidence,
  },
  arena: {
    "stat-hero": arena.statHero,
    statement: arena.statement,
    "one-evidence": arena.oneEvidence,
  },
  almanac: {
    statement: almanac.statement,
    "stat-hero": almanac.statHero,
    "one-evidence": almanac.oneEvidence,
  },
  thesis: {
    "pull-quote": thesis.pullQuote,
    "stat-hero": thesis.statHero,
    statement: thesis.statement,
  },
}

export function sparseFace(layoutId: string, themeId: string | undefined): ContentLayout | undefined {
  if (!themeId) return undefined
  return FACES[themeId]?.[layoutId as SparseLayoutId]
}
