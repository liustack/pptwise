import type { Component } from "@/ir"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk, graphicInk, readableOn } from "../render/ink"
import { mixHex } from "./color-mix"
import { anyCut } from "./declared-fit"
import { FORM_BODY_FLOOR, fitFormLine } from "./legibility"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type IcebergComponent = Extract<Component, { type: "iceberg" }>

/**
 * 冰山：水线把画面切成三成之上与七成之下，条目直接印在轮廓里，不另起侧栏。
 * 轮廓是手调过的多边形，尖顶偏左、水下宽而沉，按盒子等比缩放，不随条数变形。
 *
 * 水色和山体都从 primary 往页面底色退，退的程度不同，所以在 24 套主题上都
 * 是同一座山，只是换了纸和墨。
 */

/** Tip outline, x as a share of the width and y as a share of the band above the line. */
const TIP: readonly (readonly [number, number])[] = [
  [0.3895, 0.0625],
  [0.433, 0.5],
  [0.4674, 0.4531],
  [0.6341, 1],
  [0.2083, 1],
  [0.2989, 0.4688],
  [0.337, 0.6563],
]

/** Submerged mass, y as a share of the band below the line. */
const MASS: readonly (readonly [number, number])[] = [
  [0.2083, 0],
  [0.6341, 0],
  [0.7246, 0.2183],
  [0.7754, 0.5704],
  [0.7156, 0.8592],
  [0.5797, 0.9789],
  [0.3442, 0.9718],
  [0.1721, 0.7465],
  [0.1069, 0.3803],
  [0.1522, 0.1408],
]

const NATURAL_H = 400
const WATERLINE_AT = 0.31
const MIN_W = 520
const MIN_H = 300
const ITEM_PX = 18
const LEAD_PX = 19
const SIDE_PX = FORM_BODY_FLOOR
const INSET = 28
const LINE_RATIO = 1.25
/** How far down the tip's own band the lowest line's descender may reach. */
const TIP_FLOOR = 0.98

function points(shape: readonly (readonly [number, number])[], w: number, y0: number, bandH: number): string {
  return shape.map(([fx, fy]) => `${round(fx * w)},${round(y0 + fy * bandH)}`).join(" ")
}

/**
 * The ice at one height, as the list of intervals the outline actually
 * encloses there — not one span from the leftmost crossing to the rightmost.
 *
 * The tip is notched: a scanline through the saddle between its two peaks
 * crosses the outline four times, and the middle stretch is sky. Reading only
 * the extremes handed a line the notch as if it were ice, and the first glyph
 * of a row printed through the silhouette. Crossings are paired in order, the
 * way a fill rule pairs them, so a gap stays a gap.
 */
function intervalsAt(
  shape: readonly (readonly [number, number])[],
  fy: number,
): { left: number; right: number }[] {
  const xs: number[] = []
  for (let i = 0; i < shape.length; i += 1) {
    const [x1, y1] = shape[i]!
    const [x2, y2] = shape[(i + 1) % shape.length]!
    if (y1 === y2) continue
    const lo = Math.min(y1, y2)
    const hi = Math.max(y1, y2)
    // Half-open on the upper end so a vertex is counted once, not twice.
    if (fy < lo || fy >= hi) continue
    xs.push(x1 + ((x2 - x1) * (fy - y1)) / (y2 - y1))
  }
  xs.sort((a, b) => a - b)
  const spans: { left: number; right: number }[] = []
  for (let i = 0; i + 1 < xs.length; i += 2) spans.push({ left: xs[i]!, right: xs[i + 1]! })
  return spans
}

/** Every stretch present in both lists, in order. */
function intersect(
  a: readonly { left: number; right: number }[],
  b: readonly { left: number; right: number }[],
): { left: number; right: number }[] {
  const out: { left: number; right: number }[] = []
  for (const x of a) {
    for (const y of b) {
      const left = Math.max(x.left, y.left)
      const right = Math.min(x.right, y.right)
      if (right > left) out.push({ left, right })
    }
  }
  return out
}

/**
 * The widest unbroken stretch of ice a whole line of type can stand on.
 *
 * A line is a band, not a ray: its glyphs reach up about six sevenths of the
 * font size above the baseline and a little below it, and the berg both
 * tapers and notches, so the widest point of the line can sit where the ice
 * is narrower — or absent. This walks the line's own vertical extent, keeps
 * only the stretches present at every height in it, and returns the widest
 * one that survives. The baseline it is handed is the baseline the text is
 * painted on, not an approximation of it.
 */
const ASCENDER = 0.86
const DESCENDER = 0.22
const REGION_SAMPLES = 5

function regionSpan(
  shape: readonly (readonly [number, number])[],
  fyTop: number,
  fyBottom: number,
): { mid: number; width: number } {
  let live: { left: number; right: number }[] | null = null
  for (let i = 0; i < REGION_SAMPLES; i += 1) {
    const fy = fyTop + ((fyBottom - fyTop) * i) / (REGION_SAMPLES - 1)
    const here = intervalsAt(shape, Math.min(0.9999, Math.max(0, fy)))
    live = live === null ? here : intersect(live, here)
    if (live.length === 0) return { mid: 0.5, width: 0 }
  }
  const widest = (live ?? []).reduce(
    (best, span) => (span.right - span.left > best.right - best.left ? span : best),
    { left: 0.5, right: 0.5 },
  )
  return { mid: (widest.left + widest.right) / 2, width: Math.max(0, widest.right - widest.left) }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Water and ice are steps *away* from the page, not steps *toward* it.
 *
 * Mixing `primary` toward the background works on paper and disappears on a
 * dark theme, where `primary` is already close to the page and the whole berg
 * sank into the background as one flat rectangle. Both tints move from the
 * background toward a blend of the page's own readable ink and the theme's
 * primary instead, so the step is always in the visible direction and the
 * hue is still the theme's.
 */
function tint(ctx: ComponentCtx, t: number): string {
  const away = mixHex(readableOn(ctx.colors.bg), ctx.colors.primary, 0.5)
  return mixHex(ctx.colors.bg, away, t)
}

function waterFill(ctx: ComponentCtx): string {
  return tint(ctx, 0.1)
}

function massFill(ctx: ComponentCtx): string {
  return tint(ctx, 0.3)
}

export const iceberg: SvgComponent<IcebergComponent> = {
  measure() {
    return NATURAL_H
  },

  render(component, box, ctx) {
    const w = box.w
    const h = box.h ?? NATURAL_H
    if (w < MIN_W || h < MIN_H) {
      return <DroppedContentMarker count={component.above.length + component.below.length} kind="item" />
    }

    const lineY = h * WATERLINE_AT
    const above = lineY
    const belowH = h - lineY
    const water = waterFill(ctx)
    const mass = massFill(ctx)
    const outline = graphicInk(ctx.colors.primary, water)
    const tipFill = ctx.colors.surface
    const lineInk = accessibleInk(ctx.colors.primary, water, SIDE_PX)
    const aboveInk = accessibleInk(ctx.colors.text, tipFill, ITEM_PX)
    const belowInk = accessibleInk(ctx.colors.text, mass, ITEM_PX)
    const sideInk = accessibleInk(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg, SIDE_PX)
    const sideMax = w * 0.2

    /**
     * One printed line, fitted to the ice its own glyph band stands on. `y` is
     * the baseline the `<text>` will actually carry, so the precheck and the
     * paint are the same geometry rather than two that nearly agree.
     */
    const row = (
      text: string,
      shape: readonly (readonly [number, number])[],
      y: number,
      bandTop: number,
      bandH: number,
      size: number,
      bold: boolean,
    ) => {
      const at = (dy: number) => (y + dy - bandTop) / bandH
      const region = regionSpan(shape, at(-size * ASCENDER), at(size * DESCENDER))
      const maxWidth = region.width * w - INSET
      return {
        text,
        y,
        size,
        x: region.mid * w,
        maxWidth,
        fit: fitFormLine(text, {
          maxWidth: Math.max(1, maxWidth),
          fontSize: size,
          floor: FORM_BODY_FLOOR,
          bold,
          fontFamily: ctx.fonts.body,
        }),
      }
    }

    // The tip's rows hang from its base rather than sitting at a fraction of
    // it. What a line needs is ice under its whole glyph band, and the band
    // reaches up from the baseline — anchoring the baseline put the top of the
    // line in the part of the tip that is still narrowing, and cost a line
    // more room than the drawing had to give. Anchoring the descender just
    // inside the base puts every line as low, and so as wide, as it can go.
    const tipFloorY = above * TIP_FLOOR - ITEM_PX * DESCENDER
    const aboveRows = component.above.map((text, i) => {
      const y = tipFloorY - (component.above.length - 1 - i) * ITEM_PX * LINE_RATIO
      return { ...row(text, TIP, y, 0, above, ITEM_PX, false), lead: false }
    })
    const belowRows = component.below.map((text, i) => {
      // The berg tapers at both ends of the submerged band, so the rows sit
      // in the middle of it rather than spanning the whole thing.
      const span = 0.46
      const start = 0.24
      const t = component.below.length === 1 ? 0.45 : start + (span * i) / (component.below.length - 1)
      const size = i === 0 ? LEAD_PX : ITEM_PX
      return { ...row(text, MASS, lineY + t * belowH, lineY, belowH, size, i === 0), lead: i === 0 }
    })

    // The waterline's own name and the two band labels sit on the water and
    // the page rather than on ice, so they are fitted against their own
    // widths — but they join the same precheck. They used to be fitted after
    // it and painted cut, which is exactly the silent loss the check exists
    // to stop.
    const waterlineLabel = component.waterline
      ? fitFormLine(component.waterline, {
          maxWidth: w * 0.16,
          fontSize: SIDE_PX,
          floor: FORM_BODY_FLOOR,
          fontFamily: ctx.fonts.body,
        })
      : null
    const aboveLabel = component.above_label
      ? fitFormLine(component.above_label, {
          maxWidth: sideMax,
          fontSize: SIDE_PX,
          floor: FORM_BODY_FLOOR,
          fontFamily: ctx.fonts.body,
        })
      : null
    const belowLabel = component.below_label
      ? fitFormLine(component.below_label, {
          maxWidth: sideMax,
          fontSize: SIDE_PX,
          floor: FORM_BODY_FLOOR,
          fontFamily: ctx.fonts.body,
        })
      : null

    // Every line has to stand on ice wide enough to hold it whole, and two
    // lines have to clear each other. A line the ice cannot hold is declared,
    // not squeezed through the sloping edge of the berg.
    const rows = [...aboveRows, ...belowRows]
    const tooNarrow = rows.some((r) => r.maxWidth < FORM_BODY_FLOOR * 2)
    const crowded = [aboveRows, belowRows].some((group) =>
      group.some((r, i) => i > 0 && r.y - group[i - 1]!.y < Math.max(r.size, group[i - 1]!.size) * LINE_RATIO),
    )
    if (
      anyCut([...rows.map((r) => r.fit), waterlineLabel, aboveLabel, belowLabel]) ||
      tooNarrow ||
      crowded
    ) {
      return <DroppedContentMarker count={component.above.length + component.below.length} kind="item" />
    }

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <rect x={0} y={lineY} width={w} height={belowH} fill={water} />
        <polygon points={points(MASS, w, lineY, belowH)} fill={mass} stroke={outline} strokeWidth={1} />
        <polygon points={points(TIP, w, 0, above)} fill={tipFill} stroke={outline} strokeWidth={1} />
        <line x1={0} y1={lineY} x2={w} y2={lineY} stroke={outline} strokeWidth={1.5} />

        {waterlineLabel ? (
          <text
            data-truncated={waterlineLabel.truncated ? "1" : undefined}
            x={4}
            y={lineY - 8}
            fontSize={waterlineLabel.fontSize}
            fill={lineInk}
            fontFamily={ctx.fonts.body}
            dominantBaseline="alphabetic"
          >
            {waterlineLabel.text}
          </text>
        ) : null}

        {aboveRows.map((row, i) => (
          <text
            key={`a${i}`}
            x={row.x}
            y={row.y}
            textAnchor="middle"
            fontSize={row.fit.fontSize}
            fill={aboveInk}
            fontFamily={ctx.fonts.body}
            dominantBaseline="alphabetic"
          >
            {row.fit.text}
          </text>
        ))}

        {belowRows.map((row, i) => (
          <text
            key={`b${i}`}
            x={row.x}
            y={row.y}
            textAnchor="middle"
            fontSize={row.fit.fontSize}
            fontWeight={row.lead ? "bold" : undefined}
            fill={row.lead ? accessibleInk(ctx.colors.primary, mass, row.fit.fontSize) : belowInk}
            fontFamily={ctx.fonts.body}
            dominantBaseline="alphabetic"
          >
            {row.fit.text}
          </text>
        ))}

        {aboveLabel ? (
          <text
            data-truncated={aboveLabel.truncated ? "1" : undefined}
            x={w}
            y={above * 0.42}
            textAnchor="end"
            fontSize={aboveLabel.fontSize}
            fill={sideInk}
            fontFamily={ctx.fonts.body}
            dominantBaseline="alphabetic"
          >
            {aboveLabel.text}
          </text>
        ) : null}
        {belowLabel ? (
          <text
            data-truncated={belowLabel.truncated ? "1" : undefined}
            x={w}
            y={lineY + belowH * 0.17}
            textAnchor="end"
            fontSize={belowLabel.fontSize}
            fill={accessibleInk(ctx.colors.muted, water, SIDE_PX)}
            fontFamily={ctx.fonts.body}
            dominantBaseline="alphabetic"
          >
            {belowLabel.text}
          </text>
        ) : null}
      </g>
    )
  },
}

export const renderDef: RenderDef<IcebergComponent> = {
  type: "iceberg",
  measure: iceberg.measure,
  render: iceberg.render,
}
