import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { CompositionProps } from "./compositions"
import type { ComponentCtx } from "../components/types"
import { accessibleInk } from "../render/ink"
import { compose } from "./compositions"
import { fitKeepAll, paintLines } from "./compositions/type"
import { NOTICE_HEAD_FIT, NOTICE_LEFT, NOTICE_RIGHT, NoticeSource } from "./notice-shared"
import { noticeBand, noticeSheetPage } from "./content-notice-sheet"
import { stepAside } from "../render/step-aside"

/*
 * notice-statement: bulletin's statement page, drawn to its 2026-10 board
 * (`design/rounds/2026-10-09-bulletin-kinds/`). The page has no claim header:
 * the claim is the sentence the page says, set at 60px bold in the middle of
 * the page over a short bar of the brand colour, the paragraph that backs it
 * under a hairline (`sentence`, in the notice setting), and the source in
 * small type at the foot as on every bulletin page. The motif's steps stay
 * top right.
 *
 * The line under the sentence is the page's one `paragraph`, or its
 * subheading when the page carries no paragraph. A page with both, any other
 * component, or a sentence past three lines goes to the notice sheet, which
 * sets the claim in the ordinary header and the rest under it.
 */

/** The band the sentence is centred in: between the motif and the source line. */
const BAND = { top: 110, bottom: 610 } as const
/** Air the band keeps over the source line's ink when the source sits higher (two lines, or over a footer row). */
const SOURCE_CLEARANCE = 16

/** The claim placed for `sentence`: kept whole word by word, bold, its marked run in the theme's emphasis. */
export function noticeStatementClaim(heading: string, ctx: ComponentCtx): NonNullable<CompositionProps["claim"]> {
  return (column) => {
    const size = column.size ?? 60
    const lineHeight = column.lineHeight ?? Math.round(size * 1.33)
    const layout = fitKeepAll(heading, { width: column.w, size, lineHeight, maxLines: column.maxLines ?? 3, fontFamily: ctx.fonts.heading, bold: true })
    if (!layout || layout.lines.length === 0) return null
    const bg = ctx.defaultBg ?? ctx.colors.bg
    return (
      <g data-notice-statement-claim="">
        {paintLines(layout, {
          ctx,
          x: column.x,
          // Display type sits a little higher in its line than text does: 0.35 of the size under the middle, read off the board at 60px.
          y: Math.round((column.top ?? 0) + lineHeight / 2 + size * 0.35),
          fill: accessibleInk(ctx.colors.text, bg, size),
          fontFamily: ctx.fonts.heading,
          fontWeight: "700",
          runWeight: "700",
        })}
      </g>
    )
  }
}

export function NoticeStatementContent(props: SvgTemplateProps) {
  const { slide, ctx, page } = props
  const heading = slide.heading?.trim()
  const subheading = slide.subheading?.trim()
  const paragraphs = slide.components.filter((c) => c.type === "paragraph")
  const takes = heading && slide.components.length === paragraphs.length && paragraphs.length <= 1 && !(paragraphs.length === 1 && subheading)
  if (takes) {
    const { source } = noticeBand(slide, ctx, page)
    const support: Component[] = paragraphs.length === 1 ? paragraphs : subheading ? [{ type: "paragraph", text: subheading }] : []
    const foot = source ? source.top - SOURCE_CLEARANCE : BAND.bottom
    const bottom = Math.min(BAND.bottom, foot)
    const composed = compose(
      { components: support, ctx, rect: { x: NOTICE_LEFT, y: BAND.top, w: NOTICE_RIGHT - NOTICE_LEFT, h: bottom - BAND.top }, setting: "notice", claim: noticeStatementClaim(slide.heading!, ctx) },
      ["sentence"],
    )
    if (composed) {
      return (
        <>
          {composed}
          <NoticeSource source={source} ctx={ctx} />
        </>
      )
    }
  }
  return noticeSheetPage(props, (bodyRect) => stepAside({ face: "notice-statement", slide, ctx, bodyRect }))
}

export const layoutDef = {
  id: "notice-statement",
  kind: "standard",
  story: {
    name: "Notice Statement",
    story: "One sentence takes the whole page: set large and bold where the claim would sit, over a short bar of the brand colour, the line that backs it under a hairline, and the source in small type at the foot.",
    positioning: "Serves the statement page in the announcement grammar. Choose it when a page exists to say one thing the room should remember, such as a decision or a turn in the story.",
    audience: "A whole organization reading the one sentence the rest of the deck argues for.",
    notFor: "A sentence that needs a chart or a list beside it to stand, which belongs on the notice sheet.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  headingFit: NOTICE_HEAD_FIT,
  // What the notice sheet takes when the page goes to it.
  fullBodyCompanions: ["kpi_cards"],
} satisfies LayoutDefinition
