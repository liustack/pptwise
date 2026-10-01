import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { ContentRect } from "../../render/layout"
import { SvgContent } from "../../render/svg-content"
import { GaugeHead, GaugeSource } from "../gauge-shared"
import { sheetCtx, sheetFrame, type SheetModule } from "./frame"
import { sheetRail } from "./rail"
import { sheetRows } from "./rows"
import { sheetTable } from "./table"
import { sheetTree } from "./tree"
import { sheetWaves } from "./waves"

/**
 * The hand-set compositions of the brief board, tried in turn. Each one
 * recognises a single content shape and declines everything else, so at most
 * one of them takes a page.
 */
export const SHEET_MODULES: readonly SheetModule[] = [sheetRows, sheetTable, sheetWaves, sheetTree, sheetRail]

export interface SheetBody {
  /** The subheading, painted, or `null`. */
  standfirst: React.ReactElement | null
  /** The band under the heading rule the body draws in. */
  rect: ContentRect
  /** The module that took the page, or `null` when none did. */
  composed: React.ReactElement | null
  /** The context the body paints with: the theme's, less the highlight in the chart palette. */
  paint: ComponentCtx
}

/** Asks each module in turn whether it takes the page. */
export function composeSheet(slide: Slide, ctx: ComponentCtx): SheetBody {
  const paint = sheetCtx(ctx)
  const { standfirst, rect } = sheetFrame(slide, paint)
  for (const module of SHEET_MODULES) {
    const composed = module({ slide, ctx: paint, rect })
    if (composed) return { standfirst, rect, composed, paint }
  }
  return { standfirst, rect, composed: null, paint }
}

/**
 * A brief content page: the heading band, the standfirst, the body, and the
 * source line. The body is the module that took the page, or the ordinary
 * component renderer in the band when none did. The face decides beforehand
 * whether that band can hold the page at all.
 */
export function GaugeSheetPage({ slide, ctx, sheet }: { slide: Slide; ctx: ComponentCtx; sheet: SheetBody }) {
  return (
    <>
      <GaugeHead heading={slide.heading} ctx={ctx} />
      {sheet.standfirst}
      {sheet.composed ?? <SvgContent components={slide.components} rect={sheet.rect} ctx={sheet.paint} />}
      <GaugeSource text={slide.footnote} ctx={ctx} />
    </>
  )
}
