import type { ContentLayoutId, SvgTemplateProps } from "../types"
import { brandInkOnGround } from "../../render/page-palette"
import * as stage from "./stage"
import * as lecture from "./lecture"
import * as swiss from "./swiss"
import * as memo from "./memo"
import * as museum from "./museum"
import * as luxe from "./luxe"
import * as ink from "./ink"
import * as brief from "./brief"
import * as ledger from "./ledger"
import * as terminal from "./terminal"
import * as vermilion from "./vermilion"
import * as journal from "./journal"
import * as rally from "./rally"
import * as almanac from "./almanac"
import * as thesis from "./thesis"

export type SparseLayoutId = Extract<
  ContentLayoutId,
  "statement" | "pull-quote" | "stat-hero"
>

/**
 * A theme's skin of a shared face. `null` hands the page back to the shared
 * face: a skin whose fixed composition cannot hold what the page carries
 * (a source too long for the room under its quote) steps aside for the
 * shared drawing, which can.
 */
export type SparseSkin = (p: SvgTemplateProps) => React.ReactElement | null

type FaceMap = Partial<Record<SparseLayoutId, SparseSkin>>

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
  },
  swiss: {
    "stat-hero": swiss.statHero,
    statement: swiss.statement,
  },
  memo: {
    "pull-quote": memo.pullQuote,
    "stat-hero": memo.statHero,
    statement: memo.statement,
  },
  museum: {
    statement: museum.statement,
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
  },
  ledger: {
    statement: ledger.statement,
    "stat-hero": ledger.statHero,
    "pull-quote": ledger.pullQuote,
  },
  terminal: {
    "stat-hero": terminal.statHero,
    statement: terminal.statement,
  },
  vermilion: {
    statement: vermilion.statement,
    "stat-hero": vermilion.statHero,
  },
  journal: {
    "pull-quote": journal.pullQuote,
    "stat-hero": journal.statHero,
    statement: journal.statement,
  },
  rally: {
    statement: rally.statement,
    "stat-hero": rally.statHero,
  },
  almanac: {
    statement: almanac.statement,
    "stat-hero": almanac.statHero,
  },
  thesis: {
    "pull-quote": thesis.pullQuote,
    "stat-hero": thesis.statHero,
    statement: thesis.statement,
  },
}

export function sparseFace(layoutId: string, themeId: string | undefined): SparseSkin | undefined {
  if (!themeId) return undefined
  const skin = FACES[themeId]?.[layoutId as SparseLayoutId]
  if (!skin) return undefined
  // Every skin sets its claim, quote or figure straight onto the page in the
  // theme's brand colours, so on a page the author painted those colours are
  // held to the ground the page is painted (`brandInkOnGround`).
  return (props) => {
    const { ctx } = props
    if (!ctx.themeGround || !ctx.defaultBg) return skin(props)
    return skin({ ...props, ctx: { ...ctx, colors: brandInkOnGround(ctx.colors, ctx.themeGround, ctx.defaultBg) } })
  }
}
