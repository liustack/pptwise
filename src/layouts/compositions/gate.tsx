import type React from "react"
import type { Component } from "@/ir"
import { blendOver } from "../../render/ink"
import {
  dossierInks,
  dossierText,
  fitDossier,
  paintDossier,
  paintDossierCard,
  paintDossierIcon,
  paintDossierLine,
  paintTopEdge,
} from "./dossier"
import { blockTag, compositionTag, type Composition } from "./shared"

type Steps = Extract<Component, { type: "steps" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * gate: a check run in steps, where some steps can stop it, clinic's
 * 2026-10 board (the prescription review page, p15). The steps stand as cards
 * in a row, each with its number in the accent, its icon in the mark at the
 * top right, its title bold and its text muted, a 3px top edge of the mark,
 * small arrowheads in the mark between them. A step that can stop the
 * process (`tone: "danger"`) sends a dashed line down in the danger ink;
 * the lines join and run on into the stop box: the warning callout, set in
 * the danger ink on its pale tint with its icon. Beside the stop box an
 * informational callout may stand as a plain card with its icon.
 *
 * Takes, in the dossier setting: a `steps` of two to five items, then up to
 * one `warn` callout and one `info` or `tip` callout, in either order.
 *
 * Declines: a title past one line, text past three lines, a box's text past
 * its lines, steps that can stop the process with no box to stop in, a join
 * that falls outside the stop box, and anything past the band.
 *
 * Reads: the dossier inks (`./dossier.tsx`), the page's tag band
 * (`tagBand`), the body and heading faces.
 */

const ROW = { top: 42, h: 176, gap: 20, pad: 20, r: 10 } as const
const NUMBER = { baseline: 34, size: 14 } as const
const ICON = { top: 16, right: 44, size: 24 } as const
const TITLE = { top: 50, size: 21, lineHeight: 30 } as const
const TEXT = { top: 90, size: 15, lineHeight: 24, maxLines: 3, trail: 16 } as const
const ARROW = { gap: 4, w: 12, top: 94, h: 12 } as const
const DROP = { join: 46, stem: 20, head: 8, half: 6 } as const
const BOX = { top: 296, h: 96, gap: 32, r: 10, pad: 60, icon: { x: 20, size: 24 }, stop: { size: 17, lineHeight: 28, maxLines: 2 }, note: { size: 15, lineHeight: 24, maxLines: 3 } } as const
const DANGER_TINT = 0.08

export const gateComposition: Composition = ({ components, ctx, rect, setting, tagBand = 0 }) => {
  if (setting !== "dossier") return null
  const [steps, ...callouts] = components
  if (steps?.type !== "steps" || callouts.length > 2 || callouts.some((c) => c.type !== "callout")) return null
  const s = steps as Steps
  const n = s.items.length
  if (n < 2 || n > 5 || ROW.top < tagBand) return null
  const warn = (callouts as Callout[]).find((c) => c.variant === "warn")
  const info = (callouts as Callout[]).find((c) => c.variant !== "warn")
  if (callouts.length === 2 && (!warn || !info)) return null
  const gated = s.items.flatMap((item, i) => (item.tone === "danger" ? [i] : []))
  if (gated.length > 0 && !warn) return null
  if (s.items.some((item) => item.tone && item.tone !== "danger")) return null
  if (BOX.top + BOX.h > rect.h) return null
  const inks = dossierInks(ctx)
  const w = (rect.w - ROW.gap * (n - 1)) / n
  const fitted = s.items.map((item) => ({
    title: fitDossier(item.title, { width: w - ROW.pad - (item.icon ? ICON.right + 4 : ROW.pad), size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: 1, bold: true }, ctx),
    text: fitDossier(item.text, { width: w - ROW.pad - TEXT.trail, size: TEXT.size, lineHeight: TEXT.lineHeight, maxLines: TEXT.maxLines }, ctx),
  }))
  if (fitted.some((f) => !f.title || !f.text)) return null
  const top = rect.y + ROW.top
  const boxTop = rect.y + BOX.top
  const half = (rect.w - BOX.gap) / 2
  const stopW = info ? half : rect.w
  const stopText = warn ? fitDossier(warn.text, { width: stopW - BOX.pad - 20, size: BOX.stop.size, lineHeight: BOX.stop.lineHeight, maxLines: BOX.stop.maxLines, bold: true }, ctx) : null
  const noteText = info ? fitDossier(info.text, { width: (warn ? half : rect.w) - BOX.pad - 20, size: BOX.note.size, lineHeight: BOX.note.lineHeight, maxLines: BOX.note.maxLines }, ctx) : null
  if ((warn && !stopText) || (info && !noteText)) return null
  const centre = (i: number) => rect.x + i * (w + ROW.gap) + w / 2
  const joinY = top + ROW.h + DROP.join
  const joinX = gated.length > 0 ? (centre(gated[0]!) + centre(gated[gated.length - 1]!)) / 2 : 0
  if (gated.length > 0 && (joinX < rect.x + 20 || joinX > rect.x + stopW - 20)) return null
  const dangerTint = blendOver(inks.danger, inks.paper, DANGER_TINT)
  const noteX = warn ? rect.x + half + BOX.gap : rect.x
  const numberInk = dossierText(inks.accent, inks.paper, NUMBER.size)

  return (
    <g {...compositionTag("gate")}>
      <g {...blockTag(ctx, s)}>
        {s.items.map((item, i) => {
          const x = rect.x + i * (w + ROW.gap)
          const f = fitted[i]!
          return (
            <g key={i} data-dossier-step={item.tone ?? ""}>
              {paintDossierCard({ x, y: top, w, h: ROW.h }, inks, { r: ROW.r })}
              {paintTopEdge({ x, y: top, w }, inks.mark, ROW.r)}
              {paintDossierLine(String(i + 1).padStart(2, "0"), { ctx, x: x + ROW.pad, top: 0, lineHeight: 0, baseline: top + NUMBER.baseline, size: NUMBER.size, bold: true, fill: numberInk })}
              {item.icon ? paintDossierIcon(item.icon, x + w - ICON.right, top + ICON.top, ICON.size, inks.mark, inks.paper) : null}
              {paintDossier(f.title!, { ctx, x: x + ROW.pad, top: top + TITLE.top, bold: true, fill: dossierText(inks.ink, inks.paper, TITLE.size), ground: inks.paper })}
              {paintDossier(f.text!, { ctx, x: x + ROW.pad, top: top + TEXT.top, fill: dossierText(inks.muted, inks.paper, TEXT.size), ground: inks.paper })}
              {i < n - 1 ? (
                <polygon
                  points={`${x + w + ARROW.gap},${top + ARROW.top} ${x + w + ARROW.gap + ARROW.w},${top + ARROW.top + ARROW.h / 2} ${x + w + ARROW.gap},${top + ARROW.top + ARROW.h}`}
                  fill={inks.mark}
                />
              ) : null}
            </g>
          )
        })}
        {gated.length > 0 ? (
          <g data-dossier-gate="">
            {gated.map((i) => (
              <line key={i} x1={centre(i)} y1={top + ROW.h} x2={centre(i)} y2={joinY} stroke={inks.danger} strokeWidth={1.5} strokeDasharray="4 3" />
            ))}
            {gated.length > 1 ? <line x1={centre(gated[0]!)} y1={joinY} x2={centre(gated[gated.length - 1]!)} y2={joinY} stroke={inks.danger} strokeWidth={1.5} strokeDasharray="4 3" /> : null}
            <line x1={joinX} y1={joinY} x2={joinX} y2={joinY + DROP.stem} stroke={inks.danger} strokeWidth={1.5} />
            <polygon points={`${joinX - DROP.half},${joinY + DROP.stem - 2} ${joinX},${joinY + DROP.stem + DROP.head} ${joinX + DROP.half},${joinY + DROP.stem - 2}`} fill={inks.danger} />
          </g>
        ) : null}
      </g>
      {warn && stopText ? (
        <g {...blockTag(ctx, warn)} data-dossier-stop="">
          <rect x={rect.x + 0.75} y={boxTop + 0.75} width={stopW - 1.5} height={BOX.h - 1.5} rx={BOX.r} fill={dangerTint} stroke={inks.danger} strokeWidth={1.5} />
          {warn.icon ? paintDossierIcon(warn.icon, rect.x + BOX.icon.x, boxTop + (BOX.h - BOX.icon.size) / 2, BOX.icon.size, inks.danger, dangerTint) : null}
          {paintDossier(stopText, { ctx, x: rect.x + BOX.pad, top: boxTop + (BOX.h - stopText.lines.length * BOX.stop.lineHeight) / 2, bold: true, fill: dossierText(inks.danger, dangerTint, BOX.stop.size), ground: dangerTint })}
        </g>
      ) : null}
      {info && noteText ? (
        <g {...blockTag(ctx, info)} data-dossier-aside="">
          {paintDossierCard({ x: noteX, y: boxTop, w: warn ? half : rect.w, h: BOX.h }, inks, { r: BOX.r })}
          {info.icon ? paintDossierIcon(info.icon, noteX + BOX.icon.x, boxTop + (BOX.h - BOX.icon.size) / 2, BOX.icon.size, inks.mark, inks.paper) : null}
          {paintDossier(noteText, { ctx, x: noteX + BOX.pad, top: boxTop + (BOX.h - noteText.lines.length * BOX.note.lineHeight) / 2, fill: dossierText(inks.ink, inks.paper, BOX.note.size), ground: inks.paper })}
        </g>
      ) : null}
    </g>
  )
}
