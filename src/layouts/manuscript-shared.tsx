import type React from "react"
import type { Component, PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { stageIndex } from "../render/course-marks"
import { fitMemoTitle } from "./compositions/memo"
import {
  MANUSCRIPT_SPEC,
  exhibitWord,
  manuscriptBaseline,
  manuscriptInks,
  manuscriptMeta,
  manuscriptText,
  manuscriptTrackedWidth,
  manuscriptWidth,
  paintManuscriptTracked,
} from "./compositions/manuscript"

/*
 * The manuscript frame: the head every thesis content page wears and the
 * notes under its body. Settled on thesis's 2026-10 board
 * (`design/rounds/2026-10-06-thesis/`).
 *
 * The page is a page of a thesis. Its running head is a line of small type
 * at the top: the deck's label at the left (the motif's,
 * `motifs/motif-rail-motif.tsx`), the page's section at the right, written
 * 「§2 文献与缺口」 in emerald (the face's: the page's `stage`, numbered by
 * where it stands in the deck's `course`), and a 1px gold rule under both at
 * y52. The claim is set in the heading serif, bold at 30/42 in the ink,
 * across the whole 1152px measure from x64, on one line whenever it fits and
 * broken at a comma or a colon when it does not, its last line ending at
 * y150. The body runs from y168. The page's sources are numbered footnotes
 * under a short rule (`ManuscriptNotes`): the author writes one note a line
 * of the page's `footnote`, and the text points at each with a superscript
 * (¹, ², ³). The folio, centred at the foot, is the motif's.
 */

export const MANUSCRIPT_LEFT = 64
export const MANUSCRIPT_RIGHT = 1216
export const MANUSCRIPT_W = MANUSCRIPT_RIGHT - MANUSCRIPT_LEFT
/** The gold rule under the running head. */
export const HEAD_RULE = { y: 52, w: 1 } as const
/** The section at the right of the running head: 12/18 bold in emerald, its characters 1px apart. */
const SECTION = { top: 26, lineHeight: 18, size: 12, tracking: 1 } as const
/** The claim's box: up to two 42px lines whose last line box ends at y150. */
const HEAD = { size: 30, lineHeight: 42, foot: 150, minPt: 24, maxLines: 2 } as const
export const MANUSCRIPT_BODY_TOP = 168
const BODY_BOTTOM = 648
/** The notes: 11/17 in the muted ink over the folio, a short pebble rule 6px over the first. */
const NOTES = { size: 11, lineHeight: 17, foot: 676, max: 3, maxLines: 2, rule: { w: 180, gap: 6, stroke: 0.8 }, bodyGap: 16 } as const
/** The subheading, when a content page carries one: muted lines at the body's top. */
const STANDFIRST = { size: 16, lineHeight: 24, maxLines: 2, gap: 12 } as const

/** The heading fit `ManuscriptHead` runs, in the shape `LayoutDefinition.headingFit` takes. */
export const MANUSCRIPT_HEAD_FIT = { maxWidth: MANUSCRIPT_W, fontSize: HEAD.size, maxLines: HEAD.maxLines, minPt: HEAD.minPt, bold: true, lineHeightRatio: HEAD.lineHeight / HEAD.size } as const

/** The section a page stands in: its number in the deck's course and its name, or `null`. */
export function manuscriptSection(ir: Pick<PptxIR, "course">, slide: Pick<Slide, "stage">): { n: number; label: string } | null {
  if (!ir.course || !slide.stage) return null
  const at = stageIndex(ir.course, slide.stage)
  return at < 0 ? null : { n: at + 1, label: ir.course.stages[at]!.label.trim() }
}


/** The section at the right of the running head, in emerald. Declared dropped when it would run into the label's half. */
export function ManuscriptSection({ ir, slide, ctx }: { ir: Pick<PptxIR, "course">; slide: Pick<Slide, "stage">; ctx: ComponentCtx }): React.ReactElement | null {
  const section = manuscriptSection(ir, slide)
  if (!section) return null
  const inks = manuscriptInks(ctx)
  // The number and the name a full em apart, as 「§2 文献与缺口」 is set.
  const number = `§${section.n}`
  const numberW = manuscriptTrackedWidth(number, SECTION.size, SECTION.tracking, ctx, { bold: true }) + SECTION.tracking
  const gap = SECTION.size + SECTION.tracking
  const nameW = manuscriptTrackedWidth(section.label, SECTION.size, SECTION.tracking, ctx, { bold: true })
  const w = numberW + gap + nameW
  if (w > MANUSCRIPT_W / 2) return <g data-dropped={1} data-dropped-kind="label" />
  const y = manuscriptBaseline(SECTION.top, SECTION.lineHeight, SECTION.size)
  const fill = manuscriptText(inks.deep, inks.ground, SECTION.size)
  const x = MANUSCRIPT_RIGHT - w
  return (
    <g data-manuscript-section={section.n}>
      {paintManuscriptTracked({ ctx, text: number, x, y, size: SECTION.size, tracking: SECTION.tracking, bold: true, fill })}
      {paintManuscriptTracked({ ctx, text: section.label, x: x + numberW + gap, y, size: SECTION.size, tracking: SECTION.tracking, bold: true, fill })}
    </g>
  )
}

/** The claim fitted to the measure, broken at a comma or a colon when it takes two lines. */
export function fitManuscriptTitle(heading: string | undefined, ctx: ComponentCtx, size: number = HEAD.size, lineHeight: number = HEAD.lineHeight, minPt: number = HEAD.minPt, width: number = MANUSCRIPT_W): EmphasisHeadingLayout {
  return fitMemoTitle(heading, { maxWidth: width, fontSize: size, minPt, lineHeight, fontFamily: ctx.fonts.heading })
}

/**
 * A claim painted with its last line ending at `foot`. A claim too long for
 * two lines shrinks toward `minPt` and is then cut with `data-truncated` on
 * its last line.
 */
export function ManuscriptTitle({ heading, ctx, x = MANUSCRIPT_LEFT, width = MANUSCRIPT_W, size = HEAD.size, lineHeight = HEAD.lineHeight, minPt = HEAD.minPt, foot = HEAD.foot, top, ground, fill }: { heading: string | undefined; ctx: ComponentCtx; x?: number; width?: number; size?: number; lineHeight?: number; minPt?: number; foot?: number; top?: number; ground?: string; fill?: string }): React.ReactElement {
  const inks = manuscriptInks(ctx)
  const bg = ground ?? inks.ground
  const title = fitManuscriptTitle(heading, ctx, size, lineHeight, minPt, width)
  const ink = manuscriptText(fill ?? inks.ink, bg, title.fontSize)
  // Set from its top when the face gives one, otherwise on its last line.
  const first =
    top !== undefined
      ? manuscriptBaseline(top, title.lineHeight, title.fontSize, true)
      : manuscriptBaseline(foot - title.lineHeight, title.lineHeight, title.fontSize, true) - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <g data-manuscript-title="">
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

/** The section, the gold rule and the claim, as every content page wears them. */
export function ManuscriptHead({ ir, slide, ctx }: { ir: Pick<PptxIR, "course">; slide: Slide; ctx: ComponentCtx }): React.ReactElement {
  const inks = manuscriptInks(ctx)
  return (
    <g data-manuscript-head="">
      <ManuscriptSection ir={ir} slide={slide} ctx={ctx} />
      <rect data-manuscript-rule="" x={MANUSCRIPT_LEFT} y={HEAD_RULE.y} width={MANUSCRIPT_W} height={HEAD_RULE.w} fill={inks.gold} />
      <ManuscriptTitle heading={slide.heading} ctx={ctx} />
    </g>
  )
}

export function fitManuscriptStandfirst(slide: Pick<Slide, "subheading">, ctx: ComponentCtx, width = MANUSCRIPT_W): { layout: EmphasisHeadingLayout; h: number } | null {
  const sub = slide.subheading?.trim()
  if (!sub) return null
  const layout = fitEmphasisText(sub, { maxWidth: width, fontSize: STANDFIRST.size, minPt: STANDFIRST.size, maxLines: STANDFIRST.maxLines, lineHeightRatio: STANDFIRST.lineHeight / STANDFIRST.size, fontFamily: ctx.fonts.body, bold: false })
  return { layout, h: layout.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap }
}

export function ManuscriptStandfirst({ standfirst, ctx, top = MANUSCRIPT_BODY_TOP }: { standfirst: ReturnType<typeof fitManuscriptStandfirst>; ctx: ComponentCtx; top?: number }): React.ReactElement | null {
  if (!standfirst) return null
  const inks = manuscriptInks(ctx)
  const ink = manuscriptText(inks.muted, inks.ground, STANDFIRST.size)
  const { layout } = standfirst
  return (
    <g data-manuscript-standfirst="">
      {renderEmphasisHeading(layout, headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          data-truncated={layout.truncated && i === layout.lines.length - 1 ? "1" : undefined}
          x={MANUSCRIPT_LEFT}
          y={manuscriptBaseline(top + i * STANDFIRST.lineHeight, STANDFIRST.lineHeight, layout.fontSize)}
          fontFamily={ctx.fonts.body}
          fontSize={layout.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

// ── Notes ──────────────────────────────────────────────────────────────

export interface FittedNotes {
  notes: { n: number; layout: EmphasisHeadingLayout; text: string }[]
  /** The first note's line box top. */
  top: number
  /** Where the short rule over the notes runs. */
  ruleY: number
  /** Notes past the third, which have no place: declared dropped. */
  dropped: number
}

/** The page's notes as the author wrote them, one a line of `footnote`. */
export function noteLines(slide: Pick<Slide, "footnote">): string[] {
  return (slide.footnote ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * The notes fitted over the folio: each its number, a full-width space and
 * its words on a line of 1150px, a second line when it needs one, the last
 * line of the last note on y676. Three at most.
 */
export function fitManuscriptNotes(slide: Pick<Slide, "footnote">, ctx: ComponentCtx): FittedNotes | null {
  const lines = noteLines(slide)
  if (lines.length === 0) return null
  const kept = lines.slice(0, NOTES.max)
  const notes = kept.map((text, i) => {
    const lead = `${i + 1}\u3000`
    const indent = manuscriptWidth(lead, NOTES.size, ctx, { bold: true })
    const layout = fitEmphasisText(text, { maxWidth: MANUSCRIPT_W - 2 - indent, fontSize: NOTES.size, minPt: NOTES.size, maxLines: NOTES.maxLines, lineHeightRatio: NOTES.lineHeight / NOTES.size, fontFamily: ctx.fonts.body, bold: false })
    return { n: i + 1, layout: { ...layout, lineHeight: NOTES.lineHeight }, text }
  })
  const count = notes.reduce((sum, note) => sum + note.layout.lines.length, 0)
  const top = NOTES.foot - count * NOTES.lineHeight
  return { notes, top, ruleY: top - NOTES.rule.gap, dropped: lines.length - kept.length }
}

/** The notes under their short rule, each number in emerald bold. */
export function ManuscriptNotes({ notes, ctx }: { notes: FittedNotes | null; ctx: ComponentCtx }): React.ReactElement | null {
  if (!notes) return null
  const inks = manuscriptInks(ctx)
  const ink = manuscriptMeta(inks.muted, inks.ground)
  const number = manuscriptText(inks.deep, inks.ground, NOTES.size)
  let line = 0
  return (
    <g data-manuscript-notes={notes.notes.length}>
      <rect x={MANUSCRIPT_LEFT} y={notes.ruleY - NOTES.rule.stroke / 2} width={NOTES.rule.w} height={NOTES.rule.stroke} fill={inks.pebble} />
      {notes.notes.map((note) => {
        const lead = `${note.n}\u3000`
        const indent = manuscriptWidth(lead, NOTES.size, ctx, { bold: true })
        const out = note.layout.lines.map((_l, i) => {
          const y = manuscriptBaseline(notes.top + (line + i) * NOTES.lineHeight, NOTES.lineHeight, NOTES.size)
          return (
            <g key={i}>
              {i === 0 ? (
                <text {...MANUSCRIPT_SPEC} x={MANUSCRIPT_LEFT} y={y} fontFamily={ctx.fonts.body} fontSize={NOTES.size} fontWeight="700" fill={number} dominantBaseline="alphabetic">
                  {String(note.n)}
                </text>
              ) : null}
            </g>
          )
        })
        const top = notes.top + line * NOTES.lineHeight
        line += note.layout.lines.length
        return (
          <g key={note.n} data-manuscript-note={note.n}>
            {out}
            {renderEmphasisHeading(note.layout, headingEmphasisPaint(ctx, note.layout, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_l, i) => (
              <text
                key={i}
                {...MANUSCRIPT_SPEC}
                data-truncated={note.layout.truncated && i === note.layout.lines.length - 1 ? "1" : undefined}
                x={MANUSCRIPT_LEFT + indent}
                y={manuscriptBaseline(top + i * NOTES.lineHeight, NOTES.lineHeight, NOTES.size)}
                fontFamily={ctx.fonts.body}
                fontSize={NOTES.size}
                fill={ink}
                dominantBaseline="alphabetic"
              />
            ))}
          </g>
        )
      })}
      {notes.dropped > 0 ? <g data-dropped={notes.dropped} data-dropped-kind="footnote" /> : null}
    </g>
  )
}

/** The body band from `top` down to 16px over the notes' rule, or y648 on a page without notes. */
export function manuscriptBodyRect(notes: FittedNotes | null, top = MANUSCRIPT_BODY_TOP): ContentRect {
  const bottom = notes ? notes.ruleY - NOTES.bodyGap : BODY_BOTTOM
  return { x: MANUSCRIPT_LEFT, y: top, w: MANUSCRIPT_W, h: bottom - top }
}

// ── Figures and tables numbered across the deck ────────────────────────

type Exhibit = "figure" | "table"

/**
 * What a component counts as on a manuscript page: a figure (a chart or a
 * timeline with a title, a captioned photograph on a photo page) or a table
 * (a table, a comparison or a grid with a title), or nothing. A block only
 * takes a number when its author gave it a title; a photograph only on a
 * page whose kind says the photograph is what the page shows.
 */
export function exhibitKind(component: Component, slide: Pick<Slide, "type"> & { kind?: string }): Exhibit | null {
  const titled = (title: string | undefined) => Boolean(title?.trim())
  switch (component.type) {
    case "chart":
    case "timeline":
      return titled(component.title) ? "figure" : null
    case "image":
      return slide.type === "content" && slide.kind === "photo" && titled(component.caption) ? "figure" : null
    case "data_table":
    case "comparison":
    case "matrix":
      return titled(component.title) ? "table" : null
    default:
      return null
  }
}

/**
 * The number each figure and table on the page at `index` takes, counted
 * across the deck: one more than the figures (or tables) on the pages
 * before it and before it on its own page, in reading order. 「图 3」 and
 * 「表 1」 in a Chinese deck, "Figure 3" and "Table 1" in any other.
 */
export function exhibitLabels(ir: Pick<PptxIR, "slides">, index: number, chinese: boolean): Map<Component, string> {
  const counts: Record<Exhibit, number> = { figure: 0, table: 0 }
  const labels = new Map<Component, string>()
  ir.slides.slice(0, index + 1).forEach((slide, at) => {
    if (slide.type !== "content") return
    for (const component of slide.components) {
      const kind = exhibitKind(component, slide)
      if (!kind) continue
      counts[kind] += 1
      if (at === index) labels.set(component, exhibitWord(kind, counts[kind], chinese))
    }
  })
  return labels
}

/** The pages a section's content pages run over, first and last, counted from 1, or `null`. */
export function sectionPages(ir: Pick<PptxIR, "slides">, stage: string): { first: number; last: number } | null {
  const pages = ir.slides.flatMap((slide, i) => (slide.type === "content" && slide.stage?.trim() === stage.trim() ? [i + 1] : []))
  return pages.length > 0 ? { first: pages[0]!, last: pages[pages.length - 1]! } : null
}
