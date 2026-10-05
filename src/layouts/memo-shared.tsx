import type React from "react"
import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { ContentRect } from "../render/layout"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, type EmphasisHeadingLayout } from "../render/emphasis"
import { fitMemoTitle, memoBaseline, memoInks, memoMeta, memoText, MEMO_SPEC } from "./compositions/memo"
import { paintMargin } from "./compositions/margin"

/*
 * The memo frame: the header every memo content page wears and the source
 * line under its body. Settled on memo's 2026-10 board
 * (`design/rounds/2026-10-05-memo/`).
 *
 * The page is a typed memorandum. Its running head (MEMORANDUM, the deck's
 * subject, the red double rule) and its folio (the issuing office, 「第 N 页
 * 共 M 页」) belong to the motif (`motifs/motif-memo-motif.tsx`). The face
 * sets the rest: the section's label in the left margin (the page's
 * `kicker`, `./compositions/margin.tsx`), and right of it, from x240, the
 * claim bold in the heading face at 31/42 across the 976px measure, at most
 * two lines, set on its last line so one line and two end on the same
 * baseline, wrapping only when it does not fit; a 1px rule of ink under it at
 * y170; the body from y186 to y640; and the source at 12/16 in the muted ink
 * from y650, up to two lines, with the `memo-spec` exemption the L1 audit
 * knows.
 */

export const MEMO_LEFT = 240
export const MEMO_RIGHT = 1216
export const MEMO_W = MEMO_RIGHT - MEMO_LEFT
/** The margin column the section label stands in. */
export const MARGIN_COL = { x: 64, top: 84, w: 150 } as const
/** The claim's box: up to two 42px lines whose last line box ends at y158. */
const HEAD = { size: 31, lineHeight: 42, foot: 158, minPt: 26, maxLines: 2 } as const
/** The rule of ink under the claim. */
const RULE_Y = 170
export const MEMO_BODY_TOP = 186
export const MEMO_BODY_BOTTOM = 640
const SOURCE = { top: 650, size: 12, lineHeight: 16, maxLines: 2 } as const
/** The subheading, when a page carries one: muted lines at the body's top, the body moved down under them. */
const STANDFIRST = { size: 17, lineHeight: 26, maxLines: 2, gap: 12 } as const

/** The heading fit `MemoHead` runs, in the shape `LayoutDefinition.headingFit` takes. */
export const MEMO_HEAD_FIT = { maxWidth: MEMO_W, fontSize: HEAD.size, maxLines: HEAD.maxLines, minPt: HEAD.minPt, bold: true, lineHeightRatio: HEAD.lineHeight / HEAD.size } as const

/** The margin label (the page's `kicker`), when it has one. */
export function MemoMargin({ slide, ctx }: { slide: Pick<Slide, "kicker">; ctx: ComponentCtx }) {
  const label = slide.kicker?.trim()
  return label ? paintMargin(label, MARGIN_COL.x, MARGIN_COL.top, MARGIN_COL.w, ctx) : null
}

/**
 * The margin label, the claim on its last line, and the rule under it. A
 * claim too long for two lines shrinks toward 26px and is then cut with
 * `data-truncated` on its last line.
 */
export function MemoHead({ slide, ctx }: { slide: Slide; ctx: ComponentCtx }) {
  const inks = memoInks(ctx)
  const title = fitMemoTitle(slide.heading, { maxWidth: MEMO_W, fontSize: HEAD.size, minPt: HEAD.minPt, lineHeight: HEAD.lineHeight, fontFamily: ctx.fonts.heading })
  const ink = memoText(inks.ink, inks.ground, title.fontSize)
  const last = memoBaseline(HEAD.foot - title.lineHeight, title.lineHeight, title.fontSize, "song")
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <g data-memo-head="">
      <MemoMargin slide={slide} ctx={ctx} />
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={MEMO_LEFT}
          y={first + i * title.lineHeight}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
      <rect x={MEMO_LEFT} y={RULE_Y} width={MEMO_W} height={1} fill={inks.ink} />
    </g>
  )
}

/** The subheading as muted lines at the body's top, and how far it moves the body down. */
export function fitMemoStandfirst(slide: Pick<Slide, "subheading">, ctx: ComponentCtx): { layout: EmphasisHeadingLayout; h: number } | null {
  const sub = slide.subheading?.trim()
  if (!sub) return null
  const layout = fitEmphasisText(sub, {
    maxWidth: MEMO_W,
    fontSize: STANDFIRST.size,
    minPt: STANDFIRST.size,
    maxLines: STANDFIRST.maxLines,
    lineHeightRatio: STANDFIRST.lineHeight / STANDFIRST.size,
    fontFamily: ctx.fonts.body,
    bold: false,
  })
  return { layout, h: layout.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap }
}

export function MemoStandfirst({ standfirst, ctx }: { standfirst: ReturnType<typeof fitMemoStandfirst>; ctx: ComponentCtx }) {
  if (!standfirst) return null
  const inks = memoInks(ctx)
  const ink = memoText(inks.muted, inks.ground, STANDFIRST.size)
  const { layout } = standfirst
  return (
    <g data-memo-standfirst="">
      {renderEmphasisHeading(layout, headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          data-truncated={layout.truncated && i === layout.lines.length - 1 ? "1" : undefined}
          x={MEMO_LEFT}
          y={memoBaseline(MEMO_BODY_TOP + i * STANDFIRST.lineHeight, STANDFIRST.lineHeight, layout.fontSize, "body")}
          fontFamily={ctx.fonts.body}
          fontSize={layout.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

export interface MemoSourceLayout {
  layout: EmphasisHeadingLayout
  /** Where the source's first line box starts. */
  top: number
}

/** The source fitted in up to two lines from y650, or `null` for an empty source. Too long, its last line is cut with `data-truncated`. */
export function fitMemoSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx): MemoSourceLayout | null {
  const source = slide.footnote?.trim()
  if (!source) return null
  const layout = fitEmphasisText(source, {
    maxWidth: MEMO_W,
    fontSize: SOURCE.size,
    minPt: SOURCE.size,
    maxLines: SOURCE.maxLines,
    lineHeightRatio: SOURCE.lineHeight / SOURCE.size,
    fontFamily: ctx.fonts.body,
    bold: false,
  })
  return { layout, top: SOURCE.top }
}

/** The source as the author wrote it, 12/16 in the muted ink. */
export function MemoSource({ source, ctx, x = MEMO_LEFT }: { source: MemoSourceLayout | null; ctx: ComponentCtx; x?: number }): React.ReactElement | null {
  if (!source) return null
  const inks = memoInks(ctx)
  const ink = memoMeta(inks.muted, inks.ground)
  const { layout } = source
  return (
    <g data-memo-source="">
      {renderEmphasisHeading(layout, headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          {...MEMO_SPEC}
          data-truncated={layout.truncated && i === layout.lines.length - 1 ? "1" : undefined}
          x={x}
          y={memoBaseline(source.top + i * SOURCE.lineHeight, SOURCE.lineHeight, layout.fontSize, "body")}
          fontFamily={ctx.fonts.body}
          fontSize={layout.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/** The body band from y186 (or under a standfirst) down to y640. */
export function memoBodyRect(top = MEMO_BODY_TOP): ContentRect {
  return { x: MEMO_LEFT, y: top, w: MEMO_W, h: MEMO_BODY_BOTTOM - top }
}

/**
 * The number the page at `index` gives its first exhibit: one more than the
 * pictures pasted in on the pages before it, every `image` and every
 * `image_grid` picture counted, in deck order.
 */
export function exhibitNumberAt(ir: Pick<PptxIR, "slides">, index: number): number {
  let n = 1
  for (const slide of ir.slides.slice(0, Math.max(0, index))) {
    for (const component of slide.components) {
      if (component.type === "image") n += 1
      else if (component.type === "image_grid") n += component.items.length
    }
  }
  return n
}
