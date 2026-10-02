import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { ContentRect } from "../../render/layout"
import { SvgContent } from "../../render/svg-content"
import { compose, type CompositionInks } from "../compositions"
import { GAUGE_DARK_META, GaugeHead, GaugeSource } from "../gauge-shared"
import { sheetCtx, sheetFrame } from "./frame"

/**
 * The board's own colour for the role under the owner's name on the team
 * page, the same grey the dark chapter sets its meta in.
 */
const SHEET_INKS: CompositionInks = { quietOnPrimary: GAUGE_DARK_META }

export interface SheetBody {
  /** The subheading, painted, or `null`. */
  standfirst: React.ReactElement | null
  /** The band under the heading rule the body draws in. */
  rect: ContentRect
  /** The composition that took the page, or `null` when none did. */
  composed: React.ReactElement | null
  /** The context the body paints with: the theme's, less the highlight in the chart palette. */
  paint: ComponentCtx
}

/**
 * Frames the page and asks the shared compositions (`layouts/compositions/`)
 * whether one of them takes its body band.
 */
export function composeSheet(slide: Slide, ctx: ComponentCtx): SheetBody {
  const paint = sheetCtx(ctx)
  const { standfirst, rect } = sheetFrame(slide, paint)
  const composed = compose({ components: slide.components, ctx: paint, rect, inks: SHEET_INKS })
  return { standfirst, rect, composed, paint }
}

/**
 * A brief content page: the heading band, the standfirst, the body, and the
 * source line. The body is the composition that took the page, or the ordinary
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
