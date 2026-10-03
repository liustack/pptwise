import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { accessibleInk } from "../render/ink"
import { fitEmphasisHeading, fitEmphasisText } from "../render/emphasis"
import { compose } from "./compositions"
import { centredBaseline } from "./compositions/type"
import { FittedLines, GRID_LEFT, GRID_W, GridSource, fitGridSource, gridBodyRect } from "./grid-shared"

/*
 * grid-statement: swiss's statement page, drawn to its 2026-10 board (p02).
 * The page's conclusion at 56/70 bold across the full measure, set on its
 * last line so a one-line conclusion and a two-line one end on the same
 * baseline at y231, a 2px black rule under it at y284, and under the rule
 * the figures the conclusion rests on: two to four in columns, the marked
 * one in the emphasis ink (`figures` in the grid setting). Anything else the
 * page carries, a paragraph or a list, is drawn by the component renderer in
 * the same band, at its own size. A subheading stands under the rule in
 * muted 20px, over the figures. No chapter line: the statement speaks for
 * the whole deck. The source closes the page at 14px.
 */

const HEAD = { size: 56, lineHeight: 70, foot: 244, maxLines: 2, minPt: 40 }
const RULE = { y: 284, h: 2 }
/** The body starts 38px under the rule (y324 on the board). */
const BODY_TOP = 324
const STANDFIRST = { size: 20, box: 30, maxLines: 2, gap: 20 }

const HEAD_FIT = {
  maxWidth: GRID_W,
  fontSize: HEAD.size,
  maxLines: HEAD.maxLines,
  minPt: HEAD.minPt,
  bold: true,
  lineHeightRatio: HEAD.lineHeight / HEAD.size,
} as const

export function GridStatementContent({ slide, ctx, page }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const source = fitGridSource(slide, ctx, page)
  const sub = slide.subheading?.trim()
  const standfirst = sub
    ? fitEmphasisText(sub, {
        maxWidth: GRID_W,
        fontSize: STANDFIRST.size,
        minPt: STANDFIRST.size,
        maxLines: STANDFIRST.maxLines,
        lineHeightRatio: STANDFIRST.box / STANDFIRST.size,
        fontFamily: fonts.body,
        bold: false,
      })
    : null
  const standfirstTop = BODY_TOP - 8
  const top = standfirst ? standfirstTop + standfirst.lines.length * STANDFIRST.box + STANDFIRST.gap : BODY_TOP
  const rect = gridBodyRect(source, page, top)
  const composed = compose({ components: slide.components, ctx, rect, setting: "grid" }, ["figures"])
  if (!composed) {
    const aside = stepAside({ face: "grid-statement", slide, ctx, bodyRect: rect })
    if (aside) return aside
  }
  const title = fitEmphasisHeading(slide.heading, { ...HEAD_FIT, fontFamily: fonts.heading })
  const lastBaseline = centredBaseline(HEAD.foot - HEAD.lineHeight, HEAD.lineHeight, title.fontSize)
  const firstBaseline = lastBaseline - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <>
      <g data-grid-statement="">
        <FittedLines layout={title} ctx={ctx} x={GRID_LEFT} y={firstBaseline} fill={accessibleInk(colors.text, bg, title.fontSize)} bold />
        <rect x={GRID_LEFT} y={RULE.y} width={GRID_W} height={RULE.h} fill={accessibleInk(colors.text, bg, HEAD.size)} />
        {standfirst && (
          <FittedLines
            layout={{ ...standfirst, lineHeight: STANDFIRST.box }}
            ctx={ctx}
            x={GRID_LEFT}
            y={centredBaseline(standfirstTop, STANDFIRST.box, standfirst.fontSize)}
            fill={accessibleInk(colors.muted, bg, standfirst.fontSize)}
          />
        )}
      </g>
      {composed ?? <SvgContent components={slide.components} rect={rect} ctx={ctx} />}
      <GridSource source={source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  id: "grid-statement",
  kind: "standard",
  story: {
    name: "Grid Statement",
    story: "The conclusion set large and black across the full measure on a heavy rule, with the two to four figures it rests on in columns beneath it, one of them in the signal colour.",
    positioning: "Serves statement as the deck's conclusion with its evidence in figures. Choose it for the page a reader should be able to quote whole.",
    audience: "A board or the public that wants the finding and its numbers before the detail.",
    notFor: "A quotation from a person, which belongs on a quote page.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  headingFit: HEAD_FIT,
} satisfies LayoutDefinition
