import type { Component } from "@/ir"
import { fitSvgLine, layoutSvgText, measureTextUnits } from "@/lib/svg-text-layout"
import { readableOn } from "../render/ink"
import { DroppedContentMarker } from "../render/drop-marker"
import { TEXT_INK_ASCENT, TEXT_INK_DESCENT } from "../render/depth-contract/geometry"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"
import {
  FORM_BODY_FLOOR,
  FORM_TITLE_FLOOR,
  formLineHeight,
  formTextClipMarker,
  formTextOmissionMarker,
} from "./legibility"

type NumberedCardsComponent = Extract<Component, { type: "numbered_cards" }>

const COL_GAP = 24
const PILL_GAP = 14
/**
 * How far the air between pills may close up when a box too short for the
 * pills' words would otherwise cut a body to its first line. Air carries no
 * meaning; the second line of a sentence does.
 */
const PILL_GAP_TIGHT = 6
const PAD = 6
const STACK_CAP = 440
const BASELINE_FUDGE = 0.35
const BODY_PILL_MIN = 72
const LEFT_CAP = 96
const MIN_PILL_W = 72
const BADGE_DIAMETER_RATIO = 0.8
const BADGE_TEXT_GAP = 14
const TEXT_PAD = 14
const TITLE_BODY_GAP = 4
const SOFT_LEFT = 88
const WRAP_PROBE_LINES = 64
const TITLE_MAX_LINES = 2
const BODY_MAX_LINES = 4
/**
 * Air between a pill's edge and the ink of the words inside it, top and
 * bottom. The rubric's floor for a title against a card's top edge is 8px
 * (`evals/gallery/rubric/breathing.md`), and a pill's own title is no less a
 * title against a card edge. The words used to be centred by their line
 * boxes with 2px to spare, which left a title's caps 5-6px under the pill's
 * top once the pills had closed up to fit a short box.
 */
const TEXT_INK_AIR = 8
/** Where a line's baseline sits below the top of its line box. */
const BASELINE_DROP = 0.85

/**
 * `items[].sub` — the qualifier an author hangs on a card: a quarter, a
 * region, a version. The schema has carried it since this component existed
 * and this renderer never read it, so every one of those words was written
 * into the deck and painted nowhere. No ellipsis, no validate error, nothing
 * in the audit: the plainest kind of forgotten field.
 *
 * It sets right-aligned on the pill, in the body register, and takes its
 * width out of the title/body column so it can never sit on top of them.
 * Capped, because a sub is a qualifier and must not be able to squeeze the
 * card's own title down to nothing.
 */
const SUB_GAP = 16
const SUB_MAX_W = 180
const SUB_MAX_SHARE = 0.34

/** Fully rounded ends unless the theme's own radius token says otherwise. */
function pillRx(pillH: number, ctx: ComponentCtx): number {
  return ctx.shape?.radius ?? pillH / 2
}

/**
 * `padY` is the air above and below the whole stack, inside the box. It has
 * nothing to separate from (the box edge is not drawn), so a box too short
 * for the pills' words closes it after the gaps between pills.
 */
function layoutPills(n: number, w: number, hHint?: number, pillGap = PILL_GAP, padY = PAD) {
  const gaps = Math.max(n - 1, 0) * pillGap
  let pillH = Math.min(
    88,
    Math.max(BODY_PILL_MIN, (STACK_CAP - gaps) / Math.max(n, 1)),
  )
  if (hHint != null && n > 0) {
    const fitted = (hHint - padY * 2 - gaps) / n
    if (Number.isFinite(fitted)) pillH = Math.min(pillH, Math.max(0, fitted))
  }
  const stackH = n <= 0 ? 0 : n * pillH + gaps
  const innerW = Math.max(0, w - COL_GAP - PAD * 2)
  const boxH = hHint != null && hHint > 0 ? hHint : stackH + padY * 2
  const availH = Math.max(0, boxH - padY * 2)
  const maxByW = Math.max(0, innerW - MIN_PILL_W)
  const maxFit = Math.min(LEFT_CAP, availH, maxByW)
  const preferred = Math.min(stackH * 0.42, innerW * 0.16, LEFT_CAP)
  // 软偏好 88，但不把主旨圆撑出剩余列
  let leftSize = Math.min(preferred, maxFit)
  if (leftSize < SOFT_LEFT) leftSize = Math.min(SOFT_LEFT, maxFit)
  leftSize = Math.max(0, leftSize)
  const pillW = Math.max(MIN_PILL_W, innerW - leftSize)
  const h = Math.max(stackH, leftSize) + padY * 2
  return {
    n,
    pillH,
    pillW,
    pillGap,
    padY,
    stackH,
    leftSize,
    h: hHint != null && hHint > 0 ? hHint : h,
    naturalH: h,
  }
}

type PillLayout = ReturnType<typeof layoutPills>
type Item = NumberedCardsComponent["items"][number]

/**
 * Where the ink of a pill's words starts below the top of their first line
 * box, and how tall it stands: the title's caps down to the last line's
 * descenders, by the shared ink model (`TEXT_INK_ASCENT`/`_DESCENT`).
 */
function inkExtent(titleLines: number, bodyLines: number): { top: number; h: number } {
  const titleLH = formLineHeight(FORM_TITLE_FLOOR)
  const bodyLH = formLineHeight(FORM_BODY_FLOOR)
  const top = (BASELINE_DROP - TEXT_INK_ASCENT) * FORM_TITLE_FLOOR
  const bottom =
    bodyLines > 0
      ? titleLines * titleLH + TITLE_BODY_GAP + (bodyLines - 1) * bodyLH + (BASELINE_DROP + TEXT_INK_DESCENT) * FORM_BODY_FLOOR
      : (titleLines - 1) * titleLH + (BASELINE_DROP + TEXT_INK_DESCENT) * FORM_TITLE_FLOOR
  return { top, h: bottom - top }
}

/** The pill height `titleLines` and `bodyLines` need with their air. */
function pillHeightFor(titleLines: number, bodyLines: number): number {
  return inkExtent(titleLines, bodyLines).h + TEXT_INK_AIR * 2
}

/** Everything a pill sets inside itself, at the geometry `L` hands it. */
function pillText(item: Item, L: PillLayout, ctx: ComponentCtx, bodyCap = BODY_MAX_LINES) {
  const showText = L.pillH >= BODY_PILL_MIN - 4
  const visualDiam = L.pillH * BADGE_DIAMETER_RATIO
  const badgeR = Math.max(0, visualDiam / 2)
  const badgeInset = Math.max(0, (L.pillH - visualDiam) / 2)
  const badgeRight = badgeInset + 2 * badgeR
  const textX = badgeRight + BADGE_TEXT_GAP
  const textRight = L.pillW - TEXT_PAD
  const subCap = Math.min(SUB_MAX_W, Math.max(0, (textRight - textX) * SUB_MAX_SHARE))
  const sub =
    showText && item.sub?.trim() && subCap > 0
      ? fitSvgLine(item.sub.trim(), {
          maxWidth: subCap,
          fontSize: FORM_BODY_FLOOR,
          minFontSize: FORM_BODY_FLOOR,
          fontFamily: ctx.fonts.body,
        })
      : null
  const subW = sub ? measureTextUnits(sub.text, { fontFamily: ctx.fonts.body }) * sub.fontSize + SUB_GAP : 0
  const textW = Math.max(24, textRight - textX - subW)
  let titleKeep = TITLE_MAX_LINES
  while (titleKeep > 1 && pillHeightFor(titleKeep, 0) > L.pillH) titleKeep -= 1
  const title = wrapPillText(item.title, {
    maxWidth: textW,
    fontSize: FORM_TITLE_FLOOR,
    maxKeep: titleKeep,
    fontFamily: ctx.fonts.heading,
    bold: true,
  })
  const titleBlockH = title.lines.length * title.lineHeight
  let bodyMaxLines = 0
  if (showText && item.text) {
    while (bodyMaxLines < bodyCap && pillHeightFor(title.lines.length, bodyMaxLines + 1) <= L.pillH) bodyMaxLines += 1
  }
  const body =
    bodyMaxLines > 0 && item.text
      ? wrapPillText(item.text, {
          maxWidth: textW,
          fontSize: FORM_BODY_FLOOR,
          maxKeep: bodyMaxLines,
          fontFamily: ctx.fonts.body,
        })
      : null
  // What this pill would need to set its title and all of its body (up to
  // the body's own line cap), measured at this pill's text width.
  const fullBody = item.text
    ? wrapPillText(item.text, { maxWidth: textW, fontSize: FORM_BODY_FLOOR, maxKeep: bodyCap, fontFamily: ctx.fonts.body })
    : null
  const neededH = pillHeightFor(title.lines.length, fullBody?.lines.length ?? 0)
  return { showText, sub, title, titleBlockH, body, neededH }
}

/** Wrap at a frozen floor, then keep the lines that fit. Never ellipsizes. */
function wrapPillText(
  text: string,
  opts: {
    maxWidth: number
    fontSize: number
    maxKeep: number
    fontFamily?: string
    bold?: boolean
  },
): { lines: string[]; fontSize: number; lineHeight: number; truncated: boolean } {
  const fontSize = opts.fontSize
  const lineHeight = formLineHeight(fontSize)
  const content = text?.trim() ?? ""
  if (!content || opts.maxKeep <= 0) {
    return { lines: [], fontSize, lineHeight, truncated: false }
  }
  const laid = layoutSvgText(content, {
    maxWidth: opts.maxWidth,
    fontSize,
    minPt: fontSize,
    maxLines: WRAP_PROBE_LINES,
    fontFamily: opts.fontFamily,
    bold: opts.bold,
  })
  const lines = laid.lines.slice(0, opts.maxKeep)
  return {
    lines,
    fontSize,
    lineHeight,
    truncated: laid.lines.length > lines.length,
  }
}

export const numberedCards: SvgComponent<NumberedCardsComponent> = {
  measure(component, w) {
    return layoutPills(component.items.length, w).naturalH
  },

  render(component, box, ctx) {
  const n = component.items.length
  let L = layoutPills(n, box.w, box.h)
  // A box too short for a pill's body closes up the air between pills first,
  // down to `PILL_GAP_TIGHT`, before any sentence loses its second line.
  // The air above and below the whole stack closes next, since the box edge
  // it keeps the pills from is not drawn.
  if (box.h != null && box.h > 0 && n > 1) {
    const needed = Math.max(...component.items.map((item) => pillText(item, L, ctx).neededH))
    if (needed > L.pillH) {
      const gap = Math.max(PILL_GAP_TIGHT, (box.h - PAD * 2 - n * needed) / (n - 1))
      if (gap < PILL_GAP) L = layoutPills(n, box.w, box.h, gap)
    }
    if (needed > L.pillH) {
      const padY = Math.max(0, (box.h - n * needed - (n - 1) * L.pillGap) / 2)
      if (padY < PAD) L = layoutPills(n, box.w, box.h, L.pillGap, padY)
    }
  }
  // A pill always keeps one line of title. Shorter than that line, it
  // cannot hold even that, so the cards decline the box rather than setting
  // titles over their neighbours and past the box's edges.
  if (n > 0 && L.pillH < formLineHeight(FORM_TITLE_FLOOR) + 4) {
    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <DroppedContentMarker count={1} kind="component" />
      </g>
    )
  }

  const leftFill = ctx.colors.primary
  const leftX = PAD
  const leftCY = L.h / 2
  const leftCX = leftX + L.leftSize / 2
  const count = String(n).padStart(2, "0")
  const countSize = Math.min(44, L.leftSize * 0.32)
  const countInk = readableOn(leftFill)
  const pillsTop = (L.h - L.stackH) / 2
  const pillsLeft = leftX + L.leftSize + COL_GAP
  const surface = ctx.colors.surface
  const border = ctx.colors.border ?? ctx.colors.muted
  const rx = pillRx(L.pillH, ctx)
  const strokeW = 0
  const visualDiam = L.pillH * BADGE_DIAMETER_RATIO
  const badgeR = Math.max(0, (visualDiam - strokeW) / 2)
  const visualR = badgeR + strokeW / 2
  const badgeInset = Math.max(0, (L.pillH - visualDiam) / 2)

  return (
    <g transform={`translate(${box.x},${box.y})`}>
      <circle cx={leftCX} cy={leftCY} r={L.leftSize / 2} fill={leftFill} />
      <text
        x={leftCX}
        y={leftCY + countSize * BASELINE_FUDGE}
        textAnchor="middle"
        fontSize={countSize}
        fontWeight="bold"
        fill={countInk}
        fontFamily={ctx.fonts.heading}
        dominantBaseline="alphabetic"
      >
        {count}
      </text>
      {component.items.map((item, i) => {
        const pillX = pillsLeft
        const pillY = pillsTop + i * (L.pillH + L.pillGap)
        const badgeCx = pillX + badgeInset + visualR
        const badgeCy = pillY + L.pillH / 2
        const badgeFill = ctx.colors.accent
        const num = String(i + 1).padStart(2, "0")
        const badgeFont = Math.min(22, badgeR * 2 * 0.42)
        const badgeInk = readableOn(ctx.colors.accent)
        const badgeRight = badgeCx + badgeR
        const textX = badgeRight + BADGE_TEXT_GAP
        const textRight = pillX + L.pillW - TEXT_PAD
        const { sub, title, titleBlockH, body } = pillText(item, L, ctx)
        // Centred by ink, not by line boxes: a line's leading sits mostly
        // under its baseline, so centring the boxes left the caps closer to
        // the top edge than the last line's descenders were to the bottom.
        const ink = inkExtent(title.lines.length, body?.lines.length ?? 0)
        const textTop = pillY + (L.pillH - ink.h) / 2 - ink.top
        // A short pill (8 items in a constrained slot) turns `showText` off,
        // and the body and the sub then go unbuilt. Both are authored words,
        // so both leave the same mark on the pill they could not fit in —
        // the sub used to leave none at all.
        const omitted =
          formTextOmissionMarker(item.text ?? "", body ?? { lines: [] }) ??
          formTextOmissionMarker(item.sub ?? "", { lines: sub ? [sub.text] : [] })
        return (
          <g key={i} data-truncated={omitted}>
            <rect
              x={pillX}
              y={pillY}
              width={L.pillW}
              height={L.pillH}
              rx={rx}
              fill={surface}
              stroke={border}
              strokeWidth={1}
            />
            <circle cx={badgeCx} cy={badgeCy} r={badgeR} fill={badgeFill} />
            <text
              x={badgeCx}
              y={badgeCy + badgeFont * BASELINE_FUDGE}
              textAnchor="middle"
              fontSize={badgeFont}
              fontWeight="bold"
              fill={badgeInk}
              fontFamily={ctx.fonts.heading}
              dominantBaseline="alphabetic"
            >
              {num}
            </text>
            {title.lines.map((line, li) => (
              <text
                key={`t-${li}`}
                data-truncated={formTextClipMarker(title, li)}
                x={textX}
                y={textTop + li * title.lineHeight + title.fontSize * BASELINE_DROP}
                fontSize={title.fontSize}
                fontWeight="bold"
                fill={ctx.colors.text}
                fontFamily={ctx.fonts.heading}
                dominantBaseline="alphabetic"
              >
                {line}
              </text>
            ))}
            {body
              ? body.lines.map((line, li) => (
                  <text
                    key={`b-${li}`}
                    data-truncated={formTextClipMarker(body, li)}
                    x={textX}
                    y={
                      textTop +
                      titleBlockH +
                      TITLE_BODY_GAP +
                      li * body.lineHeight +
                      body.fontSize * BASELINE_DROP
                    }
                    fontSize={body.fontSize}
                    fill={ctx.colors.muted}
                    fontFamily={ctx.fonts.body}
                    dominantBaseline="alphabetic"
                  >
                    {line}
                  </text>
                ))
              : null}
            {sub && (
              <text
                data-truncated={sub.truncated ? "1" : undefined}
                x={textRight}
                y={pillY + L.pillH / 2 + sub.fontSize * BASELINE_FUDGE}
                textAnchor="end"
                fontSize={sub.fontSize}
                fill={ctx.colors.muted}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {sub.text}
              </text>
            )}
          </g>
        )
      })}
    </g>
  )
  },
}

export const renderDef: RenderDef<NumberedCardsComponent> = {
  type: "numbered_cards",
  measure: numberedCards.measure,
  render: numberedCards.render,
}
