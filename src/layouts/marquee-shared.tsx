import type React from "react"
import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { fitDossierTitle } from "./dossier-shared"
import { MARQUEE_SPEC, Ticket, marqueeBaseline, marqueeInks, marqueeMeta, marqueeText, ticketWidths, type TicketText } from "./compositions/marquee"

/*
 * The marquee frame: the head every rally content page wears and the
 * source line under its body. Settled on rally's 2026-10 board
 * (`design/rounds/2026-10-06-rally/`).
 *
 * The page is one section of a campaign proposal. At the top left, on y30,
 * the section's ticket stub: its number on the accent's stamp, its name
 * (the page's `kicker`) on the stub. The number counts the deck's sections
 * in the order their names first appear on a chapter or content page, so
 * pages that share a name share a number and the author never writes one.
 * The claim bold at 34/46 across the 1152px measure from x64, on one line
 * whenever it fits and broken at a comma when it does not, its last line
 * ending at y172. The body runs from y188 to y640 over a source and to y648
 * without one; the source at 12/16 in the muted ink from y650, up to two
 * lines of 1000px. The confetti and the folio are the motif's
 * (`motifs/motif-rally-motif.tsx`).
 */

export const MARQUEE_LEFT = 64
export const MARQUEE_RIGHT = 1216
export const MARQUEE_W = MARQUEE_RIGHT - MARQUEE_LEFT
/** The ticket's top on a content page. */
export const MARQUEE_TICKET_TOP = 30
/** The claim's box: up to two 46px lines whose last line box ends at y172. */
const HEAD = { size: 34, lineHeight: 46, foot: 172, minPt: 28 } as const
export const MARQUEE_BODY_TOP = 188
const BODY_BOTTOM = { source: 640, bare: 648 } as const
const SOURCE = { top: 650, size: 12, lineHeight: 16, maxLines: 2, w: 1000 } as const

/** The heading fit `MarqueeTitle` runs, in the shape `LayoutDefinition.headingFit` takes. */
export const MARQUEE_HEAD_FIT = { maxWidth: MARQUEE_W, fontSize: HEAD.size, maxLines: 2, minPt: HEAD.minPt, bold: true, lineHeightRatio: HEAD.lineHeight / HEAD.size } as const

const nameOf = (slide: Pick<Slide, "kicker">) => slide.kicker?.trim() ?? ""

/**
 * The page's section number, two digits (「02」), or `null` when the page
 * names no section. Sections are the distinct names (`kicker`) the deck's
 * chapter and content pages carry, numbered in the order each first appears.
 */
export function sectionNumber(ir: Pick<PptxIR, "slides">, slide: Pick<Slide, "kicker">): string | null {
  const name = nameOf(slide)
  if (!name) return null
  const seen: string[] = []
  for (const s of ir.slides) {
    if (s.type !== "content" && s.type !== "chapter") continue
    const n = nameOf(s)
    if (n && !seen.includes(n)) seen.push(n)
  }
  const i = seen.indexOf(name)
  return i < 0 ? null : String(i + 1).padStart(2, "0")
}

/** A content or chapter page's ticket words: its section's number on the stamp and its name on the stub. */
export function sectionTicket(ir: Pick<PptxIR, "slides">, slide: Pick<Slide, "kicker">): TicketText | null {
  const number = sectionNumber(ir, slide)
  return number ? { stamp: number, label: nameOf(slide) } : null
}

/** Whether `text` fits on a ticket that starts at `x` and must end by `right`. */
export function ticketFits(text: TicketText, ctx: ComponentCtx, x: number, right: number): boolean {
  const w = ticketWidths(text, ctx)
  return x + w.stamp + w.label <= right
}

/**
 * The ticket at `x`, `y`, or a declared drop when its words run past
 * `right`. A name the stub cannot hold is never cut.
 */
export function MarqueeTicket({ text, ctx, x = MARQUEE_LEFT, y = MARQUEE_TICKET_TOP, right = MARQUEE_RIGHT }: { text: TicketText | null; ctx: ComponentCtx; x?: number; y?: number; right?: number }): React.ReactElement | null {
  if (!text) return null
  if (!ticketFits(text, ctx, x, right)) return <g data-dropped={1} data-dropped-kind="label" />
  return <Ticket x={x} y={y} text={text} ctx={ctx} />
}

/**
 * A claim fitted to `width` and painted with its last line ending at `foot`.
 * A claim too long for two lines shrinks toward `minPt` and is then cut with
 * `data-truncated` on its last line.
 */
export function MarqueeTitle({ heading, ctx, x = MARQUEE_LEFT, width = MARQUEE_W, size = HEAD.size, lineHeight = HEAD.lineHeight, minPt = HEAD.minPt, foot = HEAD.foot, ground }: { heading: string | undefined; ctx: ComponentCtx; x?: number; width?: number; size?: number; lineHeight?: number; minPt?: number; foot?: number; ground?: string }): React.ReactElement {
  const inks = marqueeInks(ctx)
  const bg = ground ?? inks.ground
  const title = fitDossierTitle(heading, ctx, size, lineHeight, minPt, width)
  const ink = marqueeText(inks.ink, bg, title.fontSize)
  const last = marqueeBaseline(foot - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <g data-marquee-title="">
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true, bg }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={x}
          y={first + i * title.lineHeight}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/** The ticket and the claim under it, as every content page wears them. */
export function MarqueeHead({ ir, slide, ctx }: { ir: Pick<PptxIR, "slides">; slide: Slide; ctx: ComponentCtx }): React.ReactElement {
  return (
    <g data-marquee-head="">
      <MarqueeTicket text={sectionTicket(ir, slide)} ctx={ctx} />
      <MarqueeTitle heading={slide.heading} ctx={ctx} />
    </g>
  )
}

/** The subheading, when a content page carries one: muted lines at the body's top, the body moved down under them. */
const STANDFIRST = { size: 16, lineHeight: 24, maxLines: 2, gap: 12 } as const

export function fitMarqueeStandfirst(slide: Pick<Slide, "subheading">, ctx: ComponentCtx, width = MARQUEE_W): { layout: EmphasisHeadingLayout; h: number } | null {
  const sub = slide.subheading?.trim()
  if (!sub) return null
  const layout = fitEmphasisText(sub, { maxWidth: width, fontSize: STANDFIRST.size, minPt: STANDFIRST.size, maxLines: STANDFIRST.maxLines, lineHeightRatio: STANDFIRST.lineHeight / STANDFIRST.size, fontFamily: ctx.fonts.body, bold: false })
  return { layout, h: layout.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap }
}

export function MarqueeStandfirst({ standfirst, ctx, x = MARQUEE_LEFT, top = MARQUEE_BODY_TOP }: { standfirst: ReturnType<typeof fitMarqueeStandfirst>; ctx: ComponentCtx; x?: number; top?: number }): React.ReactElement | null {
  if (!standfirst) return null
  const inks = marqueeInks(ctx)
  const ink = marqueeText(inks.muted, inks.ground, STANDFIRST.size)
  const { layout } = standfirst
  return (
    <g data-marquee-standfirst="">
      {renderEmphasisHeading(layout, headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          data-truncated={layout.truncated && i === layout.lines.length - 1 ? "1" : undefined}
          x={x}
          y={marqueeBaseline(top + i * STANDFIRST.lineHeight, STANDFIRST.lineHeight, layout.fontSize)}
          fontFamily={ctx.fonts.body}
          fontSize={layout.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/** The source fitted in up to two lines of 1000px from y650, or `null` for an empty source. Too long, its last line is cut with `data-truncated`. */
export function fitMarqueeSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, width: number = SOURCE.w): EmphasisHeadingLayout | null {
  const source = slide.footnote?.trim()
  if (!source) return null
  return fitEmphasisText(source, { maxWidth: width, fontSize: SOURCE.size, minPt: SOURCE.size, maxLines: SOURCE.maxLines, lineHeightRatio: SOURCE.lineHeight / SOURCE.size, fontFamily: ctx.fonts.body, bold: false })
}

/** The source as the author wrote it, 12/16 in the muted ink. */
export function MarqueeSource({ source, ctx, x = MARQUEE_LEFT }: { source: EmphasisHeadingLayout | null; ctx: ComponentCtx; x?: number }): React.ReactElement | null {
  if (!source) return null
  const inks = marqueeInks(ctx)
  const ink = marqueeMeta(inks.muted, inks.ground)
  return (
    <g data-marquee-source="">
      {renderEmphasisHeading(source, headingEmphasisPaint(ctx, source, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          {...MARQUEE_SPEC}
          data-truncated={source.truncated && i === source.lines.length - 1 ? "1" : undefined}
          x={x}
          y={marqueeBaseline(SOURCE.top + i * SOURCE.lineHeight, SOURCE.lineHeight, source.fontSize)}
          fontFamily={ctx.fonts.body}
          fontSize={source.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/** The body band from `top` down to y640 over a source, or y648 on a page without one. */
export function marqueeBodyRect(hasSource: boolean, top = MARQUEE_BODY_TOP): ContentRect {
  return { x: MARQUEE_LEFT, y: top, w: MARQUEE_W, h: (hasSource ? BODY_BOTTOM.source : BODY_BOTTOM.bare) - top }
}
