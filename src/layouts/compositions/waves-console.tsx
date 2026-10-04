import type React from "react"
import type { Component } from "@/ir"
import { blockTag, compositionTag, type CompositionProps } from "./shared"
import { fitFixed, paintLines } from "./type"
import { CONSOLE_SPEC, baselineIn, consoleInks, consoleText, fitBanner, fitMono, monoWidth, paintBanner, paintCard, paintIcon, paintMono } from "./console"

type Roadmap = Extract<Component, { type: "roadmap" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * waves, console setting: a roadmap as phases along one line, each a card of
 * what it delivers, and the decision it asks for in a banner under them.
 * terminal's 2026-10 board, its roadmap page (p15).
 *
 * A 2px line runs across the band with a node per phase at the left of its
 * card, the period in mono over it, standing 8px over the band's top. Under the line each phase is a card: its
 * name bold at 22px, its icon at the top right when it has one, and its rows
 * down the card, each a hairline, the row's label in 12px mono and its value
 * at 15px beside it, up to two lines. The phase the author marks has a filled
 * node, its period bold in the mark, and its card on the mark's tint inside an
 * edge of it, its name in the mark. A closing callout is a banner across the
 * foot, a warning on the surface inside an edge of the warning ink.
 *
 * Takes, in the console setting: one `roadmap` of two to five phases,
 * optionally followed by a `callout`.
 *
 * Declines: any other shape, a period, name, label or value past its room,
 * and a band too short for the cards' rows.
 *
 * Reads: the console inks (`./console.tsx`), `fonts.heading`, `fonts.body`,
 * `fonts.mono`.
 */

const GAP = 16
/**
 * The periods stand 8px over the band's top, in the air under the claim's
 * hairline, as the board set them, so the cards keep the board's height.
 */
const LINE = { y: 28, node: { r: 7, x: 8 } } as const
const PERIOD = { top: -8, box: 24, size: 15 } as const
const CARD = { top: 48, pad: 20, icon: 20, name: { top: 18, box: 32, size: 22 }, rows: { top: 64, pitch: 62, label: { box: 22, size: 12, w: 64 }, value: { box: 22, size: 15, maxLines: 2 } }, foot: 12 } as const
const BANNER_BOX = { gap: 16, h: 72, foot: 8 } as const

/** Where a card's rows start: under its name, which takes one line or two. */
function rowsTopOf(name: { lines: readonly string[] } | null): number {
  return CARD.rows.top + Math.max(0, (name?.lines.length ?? 1) - 1) * CARD.name.box
}

export function wavesConsole({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const [roadmap, note, ...rest] = components
  if (roadmap?.type !== "roadmap" || rest.length > 0) return null
  if (note && note.type !== "callout") return null
  return drawWaves(roadmap, note as Callout | undefined, ctx, rect)
}

function drawWaves(roadmap: Roadmap, note: Callout | undefined, ctx: CompositionProps["ctx"], rect: CompositionProps["rect"]): React.ReactElement | null {
  const n = roadmap.items.length
  if (n < 2 || n > 5) return null
  const inks = consoleInks(ctx)
  const ground = inks.ground
  const w = (rect.w - GAP * (n - 1)) / n
  const inner = w - CARD.pad * 2
  const banner = note ? fitBanner(note, rect.w, ctx) : null
  if (note && !banner) return null
  const bannerH = banner ? BANNER_BOX.h + (banner.lines.length - 1) * 28 : 0
  const cardTop = rect.y + CARD.top
  const cardBottom = banner ? rect.y + rect.h - BANNER_BOX.foot - bannerH - BANNER_BOX.gap : rect.y + rect.h - BANNER_BOX.foot
  // The labels' column is the board's 64px, or as wide as the widest label needs, up to half the card.
  const labelW = Math.min(inner / 2, Math.max(CARD.rows.label.w, ...roadmap.items.flatMap((item) => (item.rows ?? []).map((row) => Math.ceil(monoWidth(row.label, CARD.rows.label.size)) + 12))))
  const valueW = inner - labelW
  const phases = roadmap.items.map((item) => {
    const marked = item.emphasis === true
    const period = item.period?.trim() ? fitMono(item.period, { width: w - LINE.node.r * 2 - 8, size: PERIOD.size, lineHeight: PERIOD.box, maxLines: 1 }) : null
    const name = fitFixed(item.title, { width: inner - (item.icon ? CARD.icon + 8 : 0), size: CARD.name.size, lineHeight: CARD.name.box, maxLines: 2, fontFamily: ctx.fonts.heading, bold: true })
    const rows = (item.rows ?? []).map((row) => ({
      label: fitMono(row.label, { width: labelW - 8, size: CARD.rows.label.size, lineHeight: CARD.rows.label.box, maxLines: 1 }),
      value: fitFixed(row.value, { width: valueW, size: CARD.rows.value.size, lineHeight: CARD.rows.value.box, maxLines: CARD.rows.value.maxLines, fontFamily: ctx.fonts.body, bold: false }),
    }))
    const need = rowsTopOf(name) + Math.max(0, rows.length - 1) * CARD.rows.pitch + (rows.length ? 10 + Math.max(...rows.map((r) => (r.value?.lines.length ?? 1) * CARD.rows.value.box)) : 0) + CARD.foot
    const fits = name !== null && (!item.period?.trim() || period !== null) && rows.every((r) => r.label !== null && r.value !== null)
    return { item, marked, period, name, rows, need, fits }
  })
  if (phases.some((p) => !p.fits || cardTop + p.need > cardBottom)) return null
  const lineY = rect.y + LINE.y
  return (
    <g {...compositionTag("waves")}>
      <g {...blockTag(ctx, roadmap)}>
        <rect x={rect.x} y={lineY - 1} width={rect.w} height={2} fill={inks.edge} />
        {phases.map(({ item, marked, period, name, rows }, i) => {
          const x = rect.x + i * (w + GAP)
          const card = { x, y: cardTop, w, h: cardBottom - cardTop }
          const cardGround = marked ? inks.tint : inks.surface
          return (
            <g key={i} data-phase={marked ? "marked" : ""}>
              <circle cx={x + LINE.node.x} cy={lineY} r={LINE.node.r} fill={marked ? inks.mark : ground} stroke={marked ? inks.mark : inks.muted} strokeWidth={2} />
              {period
                ? paintMono(period, {
                    ctx,
                    x,
                    y: baselineIn(rect.y + PERIOD.top, PERIOD.box, PERIOD.size),
                    fill: consoleText(marked ? inks.mark : inks.muted, ground, PERIOD.size),
                    bold: marked,
                    ground,
                  })
                : null}
              {paintCard(card, inks, marked)}
              {item.icon ? paintIcon(item.icon, x + w - CARD.pad - CARD.icon, cardTop + CARD.name.top + (CARD.name.box - CARD.icon) / 2, CARD.icon, marked ? inks.mark : inks.muted, cardGround) : null}
              {paintLines(name!, {
                ctx,
                x: x + CARD.pad,
                y: baselineIn(cardTop + CARD.name.top, CARD.name.box, CARD.name.size),
                fill: consoleText(marked ? inks.mark : inks.text, cardGround, CARD.name.size),
                fontFamily: ctx.fonts.heading,
                fontWeight: "700",
                bg: cardGround,
              })}
              {rows.map((row, r) => {
                const top = cardTop + rowsTopOf(name) + r * CARD.rows.pitch
                return (
                  <g key={r}>
                    <rect x={x + CARD.pad} y={top} width={inner} height={1} fill={inks.edge} />
                    {paintMono(row.label!, { ctx, x: x + CARD.pad, y: baselineIn(top + 10, CARD.rows.label.box, CARD.rows.label.size), fill: consoleText(inks.muted, cardGround, CARD.rows.label.size), ground: cardGround })}
                    {paintLines(row.value!, {
                      ctx,
                      x: x + CARD.pad + labelW,
                      y: baselineIn(top + 10, CARD.rows.value.box, CARD.rows.value.size),
                      fill: consoleText(inks.text, cardGround, CARD.rows.value.size),
                      fontFamily: ctx.fonts.body,
                      fontWeight: "400",
                      bg: cardGround,
                      attrs: { ...CONSOLE_SPEC },
                    })}
                  </g>
                )
              })}
            </g>
          )
        })}
      </g>
      {note && banner ? paintBanner(note, banner, { x: rect.x, y: rect.y + rect.h - BANNER_BOX.foot - bannerH, w: rect.w, h: bannerH }, ctx, blockTag(ctx, note)) : null}
    </g>
  )
}
