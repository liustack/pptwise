import type React from "react"
import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { EmphasisHeadingLayout } from "../render/emphasis"
import { kpiValueText } from "../components/kpi"
import { paintTag, tagWidth } from "../components/tag"
import { joinUnit } from "../lib/quantity-format"
import { stepAside } from "../render/step-aside"
import { SEAL_TYPE, sealInks, sealSmall, sealTagInks, sealTagSpec, sealText } from "./compositions/seal"
import { centredBaseline, fitFixed, paintLines } from "./compositions/type"
import { SEAL_HEAD_FIT, SealHead, SealSource, fitSealSource, sealBodyRect } from "./seal-shared"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type KpiItem = KpiCards["items"][number]

/*
 * seal-figure: vermilion's single-figure page, drawn to its 2026-10 board
 * (p08). The seal frame's claim over the page, then on the left the lead
 * figure: its label at 17px, the figure bold in the primary colour at 240px
 * set 8px tight (stepping down to 200, 160 and 128 when it does not fit its
 * column, the tightening with it), its
 * tag filled under it and its note at 18px. On the right, past a hairline, up
 * to three supporting figures, each a label at 15px, the figure bold at 38px
 * (the one the author marks with `**…**` in the mark) and its note at 15px,
 * a hairline between them.
 *
 * Takes: one `kpi_cards` of one to four items. The first is the lead and may
 * carry a tag and a note. The others are plain figures with notes.
 *
 * Steps aside for anything else: a delta, an icon or a source on any figure,
 * a tag on a supporting one, a label or note past its lines, and a column
 * taller than the band.
 */

const LEAD = {
  w: 640,
  label: { top: 10, size: 17, lineHeight: 24, maxLines: 2 },
  figure: { top: 40, box: 250, sizes: [240, 200, 160, 128], dx: -8, tracking: -8 },
  tag: { top: 308 },
  note: { gap: 20, size: 18, lineHeight: 28, maxLines: 3 },
} as const
const SIDE = { x: 680, gap: 40, top: 10, pitch: 142, h: 410 } as const
const SUPPORT = {
  label: { size: SEAL_TYPE.label, lineHeight: 22 },
  figure: { top: 26, size: 38, box: 48 },
  note: { top: 80, size: SEAL_TYPE.label, lineHeight: 22, maxLines: 2 },
} as const

function figurePage(components: readonly Component[]): KpiCards | null {
  const [only, ...rest] = components
  if (only?.type !== "kpi_cards" || rest.length > 0) return null
  if (only.items.length < 1 || only.items.length > 4) return null
  if (only.items.some((item) => item.delta !== undefined || item.icon !== undefined || item.source?.trim())) return null
  if (only.items.slice(1).some((item) => item.tag)) return null
  return only
}

/**
 * Display figures set tight: each glyph after the first drawn `tracking` px
 * closer by a `<tspan dx>`, which the export writes as character spacing.
 */
function trackedGlyphs(text: string, tracking: number): React.ReactNode {
  const [first, ...rest] = Array.from(text)
  if (tracking === 0 || rest.length === 0) return text
  return (
    <>
      {first}
      {rest.map((ch, i) => (
        <tspan key={i} dx={tracking}>
          {ch}
        </tspan>
      ))}
    </>
  )
}

/** The figure as written with its unit: 「17%」, 「2300 亿元」. */
function figureText(item: KpiItem): { text: string; marked: boolean } {
  const { text, marked } = kpiValueText(item.value)
  return { text: joinUnit(text.trim(), item.unit?.trim() || undefined, " "), marked }
}

export function SealFigureContent({ slide, ctx, page }: SvgTemplateProps) {
  const source = fitSealSource(slide, ctx, page)
  const rect = sealBodyRect(source, page)
  // No place for a subheading between the claim and the figure.
  const drawn = slide.subheading?.trim() ? null : drawFigures(slide.components, rect, ctx)
  if (!drawn) {
    // This face draws one shape only, so anything else goes to the sheet,
    // and a page the sheet cannot hold either is declined here.
    return (
      stepAside({ face: "seal-figure", slide, ctx, cramped: true }) ?? (
        <>
          <SealHead heading={slide.heading} ctx={ctx} />
          <g data-dropped={1} data-dropped-kind="component" />
        </>
      )
    )
  }
  return (
    <>
      <SealHead heading={slide.heading} ctx={ctx} />
      {drawn}
      <SealSource source={source} ctx={ctx} />
    </>
  )
}

function drawFigures(components: readonly Component[], rect: { x: number; y: number; w: number; h: number }, ctx: SvgTemplateProps["ctx"]): React.ReactElement | null {
  const kpis = figurePage(components)
  if (!kpis) return null
  const body = ctx.fonts.body
  const inks = sealInks(ctx)
  const [lead, ...supports] = kpis.items as [KpiItem, ...KpiItem[]]
  const leadW = supports.length > 0 ? LEAD.w : rect.w
  const leadLabel = fitFixed(lead.label, { width: leadW, size: LEAD.label.size, lineHeight: LEAD.label.lineHeight, maxLines: LEAD.label.maxLines, fontFamily: body, bold: false })
  const leadFigure = figureText(lead)
  const figureSize = LEAD.figure.sizes.find(
    (size) => fitFixed(leadFigure.text, { width: leadW, size, lineHeight: size, maxLines: 1, fontFamily: ctx.fonts.heading, bold: true }) !== null,
  )
  const note = lead.note?.trim()
    ? fitFixed(lead.note, { width: leadW, size: LEAD.note.size, lineHeight: LEAD.note.lineHeight, maxLines: LEAD.note.maxLines, fontFamily: body, bold: false })
    : undefined
  if (!leadLabel || figureSize === undefined || note === null) return null
  const tagSpec = sealTagSpec(ctx)
  const labelH = leadLabel.lines.length * LEAD.label.lineHeight
  const figureTop = rect.y + LEAD.figure.top + (labelH - LEAD.label.lineHeight)
  const figureBox = Math.round(LEAD.figure.box * (figureSize / LEAD.figure.sizes[0]))
  const tagTop = figureTop + figureBox + (LEAD.tag.top - LEAD.figure.top - LEAD.figure.box)
  const noteTop = (lead.tag ? tagTop + tagSpec.height : figureTop + figureBox) + LEAD.note.gap
  const leadFoot = note ? noteTop + note.lines.length * LEAD.note.lineHeight : noteTop
  if (leadFoot > rect.y + rect.h) return null

  const sideX = rect.x + SIDE.x + SIDE.gap
  const sideW = rect.x + rect.w - sideX
  const laid: { item: KpiItem; label: EmphasisHeadingLayout; figure: EmphasisHeadingLayout; marked: boolean; note: EmphasisHeadingLayout | undefined }[] = []
  for (const item of supports) {
    const label = fitFixed(item.label, { width: sideW, size: SUPPORT.label.size, lineHeight: SUPPORT.label.lineHeight, maxLines: 1, fontFamily: body, bold: false })
    const { text, marked } = figureText(item)
    const figure = fitFixed(text, { width: sideW, size: SUPPORT.figure.size, lineHeight: SUPPORT.figure.box, maxLines: 1, fontFamily: ctx.fonts.heading, bold: true })
    const itemNote = item.note?.trim()
      ? fitFixed(item.note, { width: sideW, size: SUPPORT.note.size, lineHeight: SUPPORT.note.lineHeight, maxLines: SUPPORT.note.maxLines, fontFamily: body, bold: false })
      : undefined
    if (!label || !figure || itemNote === null) return null
    laid.push({ item, label, figure, marked, note: itemNote })
  }
  if (laid.length > 0 && SIDE.top + (laid.length - 1) * SIDE.pitch + SUPPORT.note.top + SUPPORT.note.lineHeight * 2 > rect.h) return null

  const ground = inks.ground
  const leadMarked = true
  return (
    <g data-seal-figure="">
      {paintLines(leadLabel, {
        ctx,
        x: rect.x,
        y: centredBaseline(rect.y + LEAD.label.top, LEAD.label.lineHeight, LEAD.label.size),
        fill: sealText(inks.muted, ground, LEAD.label.size),
        fontFamily: body,
        fontWeight: "400",
      })}
      <text
        data-seal-lead=""
        x={rect.x + Math.round((LEAD.figure.dx * figureSize) / LEAD.figure.sizes[0])}
        y={centredBaseline(figureTop, figureBox, figureSize)}
        fontFamily={ctx.fonts.heading}
        fontSize={figureSize}
        fontWeight="700"
        fill={sealText(ctx.colors.primary, ground, figureSize)}
        dominantBaseline="alphabetic"
      >
        {trackedGlyphs(leadFigure.text, Math.round((LEAD.figure.tracking * figureSize) / LEAD.figure.sizes[0]))}
      </text>
      {lead.tag &&
        paintTag({
          tag: lead.tag,
          x: rect.x,
          y: tagTop,
          spec: tagSpec,
          width: Math.max(120, tagWidth(lead.tag.text, tagSpec)),
          inks: sealTagInks(ctx, lead.tag, leadMarked, ground),
          attrs: sealSmall(SEAL_TYPE.tag),
        })}
      {note &&
        paintLines(note, {
          ctx,
          x: rect.x,
          y: centredBaseline(noteTop, LEAD.note.lineHeight, LEAD.note.size),
          fill: sealText(inks.ink, ground, LEAD.note.size),
          fontFamily: body,
          fontWeight: "400",
        })}
      {laid.length > 0 && <rect x={rect.x + SIDE.x} y={rect.y + SIDE.top} width={1} height={SIDE.h} fill={inks.rule} />}
      {laid.map((s, i) => {
        const y = rect.y + SIDE.top + i * SIDE.pitch
        return (
          <g key={i} data-figure-marked={s.marked ? "1" : undefined}>
            {i > 0 && <rect x={sideX} y={y - 18} width={sideW} height={1} fill={inks.rule} />}
            {paintLines(s.label, {
              ctx,
              x: sideX,
              y: centredBaseline(y, SUPPORT.label.lineHeight, SUPPORT.label.size),
              fill: sealText(inks.muted, ground, SUPPORT.label.size),
              fontFamily: body,
              fontWeight: "400",
              attrs: sealSmall(SUPPORT.label.size),
            })}
            {paintLines(s.figure, {
              ctx,
              x: sideX,
              y: centredBaseline(y + SUPPORT.figure.top, SUPPORT.figure.box, SUPPORT.figure.size),
              fill: sealText(s.marked ? inks.mark : inks.ink, ground, SUPPORT.figure.size),
              fontFamily: ctx.fonts.heading,
              fontWeight: "700",
            })}
            {s.note &&
              paintLines(s.note, {
                ctx,
                x: sideX,
                y: centredBaseline(y + SUPPORT.note.top, SUPPORT.note.lineHeight, SUPPORT.note.size),
                fill: sealText(inks.ink, ground, SUPPORT.note.size),
                fontFamily: body,
                fontWeight: "400",
                attrs: sealSmall(SUPPORT.note.size),
              })}
          </g>
        )
      })}
    </g>
  )
}

export const layoutDef = {
  id: "seal-figure",
  kind: "standard",
  story: {
    name: "Seal Figure",
    story: "One figure set very large in the brand colour under the claim, its label over it, a filled tag and a sentence under it, and up to three supporting figures standing past a hairline to its right.",
    positioning: "Serves the fact page in a formal report: the one number a page answers with, and the figures it rests on beside it.",
    audience: "A room that will take one number away and wants to see what it stands on.",
    notFor: "Several figures of equal weight, which belong on a data page.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["kpi_cards"], required: true, capacity: 1 },
  ],
  headingFit: SEAL_HEAD_FIT,
} satisfies LayoutDefinition
