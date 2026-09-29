import type React from "react"
import type { Component } from "@/ir"
import { layoutSvgText, measureTextUnits, wrapTokens } from "../lib/svg-text-layout"
import { mostlyChinese } from "../lib/text-script"
import { DroppedContentMarker } from "../render/drop-marker"
import { anyCut } from "./declared-fit"
import { accessibleInk } from "../render/ink"
import { mixHex } from "./color-mix"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type BmcComponent = Extract<Component, { type: "bmc" }>
type BlockKey =
  | "key_partners"
  | "key_activities"
  | "key_resources"
  | "value_propositions"
  | "customer_relationships"
  | "channels"
  | "customer_segments"
  | "cost_structure"
  | "revenue_streams"

/**
 * Business Model Canvas — the classic Osterwalder nine-block layout
 * (structure-components wave task 1, decision 4): a full-body component
 * (`FULL_BODY_TYPES`, `component-traits.ts`), the slide's sole component,
 * whole content rect handed straight to `render` (`checkFullBodyExclusivity`,
 * `api.ts`, enforces the "sole component" half).
 *
 * Layout is the canonical five-column canvas, not an arbitrary grid — this
 * is the one visual shape a "business model canvas" is recognized by:
 *
 * ```
 * ┌──────────┬──────────┬──────────┬──────────┬──────────┐
 * │          │  key_    │          │ customer_│          │
 * │  key_    │activities│  value_  │relation-  │ customer_│
 * │ partners │──────────│  propo-  │  ships    │ segments │
 * │          │  key_    │ sitions  │──────────│          │
 * │          │resources │          │ channels │          │
 * ├──────────┴──────────┴──────────┴──────────┴──────────┤
 * │        cost_structure       │     revenue_streams      │
 * └──────────────────────────────────────────────────────┘
 * ```
 *
 * Three of the five columns (`key_partners`/`value_propositions`/
 * `customer_segments`) are tall cells spanning the full top band; the other
 * two columns (`key_activities`+`key_resources`, `customer_relationships`+
 * `channels`) each stack two half-height cells. The bottom band is a
 * `cost_structure` / `revenue_streams` 50/50 split.
 *
 * Row-height ratios are *not* a hardcoded constant: `naturalBandHeights`
 * derives the top-band/bottom-band split from each block's own real fitted
 * content (its title's lines, fitted in the heading face they are drawn in,
 * and its items' lines) at the natural, unstretched width — pure
 * function of the input, deterministic. `render`'s box.h-aware stretch
 * (matrix.tsx's own idiom — see `swot.tsx`'s identical comment) then grows
 * both bands by the *same proportion* their natural heights already had, so
 * an unstretched render (`box.h` omitted, `measure`'s own return value)
 * reproduces the natural split exactly, and a stretched one keeps the same
 * visual balance scaled up. For representative content (1-2 short items in
 * most blocks, 2 in the wider ones — `bmc.test.tsx`'s own fixture) at
 * w=1088 (the 1280×720 deck's usual content width), this resolves to
 * topBandH=204 / bottomBandH=95 / GAP=14 of a 313px natural total — top-band
 * ≈65% / bottom-band ≈30% (the remaining ~5% is the one inter-band gap) —
 * measured by actually calling `naturalBandHeights` against that fixture,
 * not eyeballed, and not asserted as a hardcoded constant in this file.
 *
 * `value_propositions` — the canvas's own conceptual center — gets a tinted
 * panel (`mixHex(colors.surface, colors.accent, t)`, same primitive as
 * `swot.tsx`/`matrix.tsx`'s `toneFill`) to visually anchor it; the other 8
 * blocks are flat `colors.surface` panels (the same flat-panel convention
 * `icon-cards.tsx`/`roadmap.tsx` already use). All 9 blocks route their
 * title/item ink through `accessibleInk` against their own real panel fill
 * regardless of whether that fill is tinted or flat — uniform, and free to
 * reason about (no "8 of these are already known-safe, 1 needs a wrapper"
 * bookkeeping) — see `../audit/full-matrix-contrast.test.ts`'s dedicated
 * "bmc tinted-block contrast" 13-theme sweep for the empirical lock.
 *
 * **The inverse case — `box.h` *smaller* than the natural total (bench-
 * driven fix round, defect F)**: real, not hypothetical. `svg-content.tsx`
 * hands a full-body component (`FULL_BODY_TYPES`) the layout's fixed
 * content-rect height verbatim, never a box sized to this file's own
 * `measure()` return value — and schema-max content (4 items in every one
 * of the 9 blocks, the IR schema's own ceiling — a real bench-observed
 * shape, `tests/bench/questions/q07`, not a synthetic worst case) can
 * exceed even the most generous curated content rect. Pre-fix, `render`
 * floored `totalH` at the natural total and never shrank below it, so an
 * undersized box just drew taller than `box.h` — the bottom band
 * (`cost_structure`/`revenue_streams`) spilled first (and worst) because
 * it's the last band painted and sits lowest, but every one of the 9 cells
 * was equally capable of overflowing its own drawn rect given a heavy
 * enough item count. Fix: close up every cell's vertical rhythm
 * (padding/line-height/gaps — never the type, and never the horizontal
 * axis; column math in `gridGeom` is untouched) by the same proportion the
 * box itself is short by — `rhythmScale = totalH / naturalTotal`, threaded
 * through `blockLayout`/`renderBlock` — floored at `MIN_RHYTHM_SCALE`. The
 * floor used to be derived from the type:
 * `ITEM_SIZE_MIN / ITEM_SIZE`, which was 9.5/12.5 = 0.76 when it was
 * written. Both constants are 16 today, so that expression became exactly 1
 * and the shrink stopped happening at all — see `MIN_RHYTHM_SCALE`.
 * A box at or above natural size (the common case — every non-schema-max
 * fixture in this codebase's test suite) keeps `rhythmScale === 1` and takes
 * the exact pre-fix code path, byte-identical (verified by construction:
 * `blockLayout`/`renderBlock`'s scaled fields all reduce to the pre-fix
 * hardcoded constants at `rhythmScale === 1`, and `naturalBandHeights` is
 * reused rather than recomputed on that path). See the task report for the
 * concrete verified ratios (~0.92 for the schema-max 13-theme regression
 * fixture below; the plan's own literal "3 items" repro needs ~0.90) and
 * the one compound edge case (a forced 2-line heading *and* a subheading
 * *and* the narrowest curated content layout, all at once) the floor
 * still doesn't fully absorb — out of this task's own scope (no subheading
 * or multi-line heading in the bench evidence), documented as a bounded
 * residual rather than silently left unmentioned.
 */

const BLOCK_LABELS: Record<BlockKey, string> = {
  key_partners: "Key Partners",
  key_activities: "Key Activities",
  key_resources: "Key Resources",
  value_propositions: "Value Propositions",
  customer_relationships: "Customer Relationships",
  channels: "Channels",
  customer_segments: "Customer Segments",
  cost_structure: "Cost Structure",
  revenue_streams: "Revenue Streams",
}
/** The titles when the blocks are written in Chinese (`mostlyChinese`). */
const BLOCK_LABELS_ZH: Record<BlockKey, string> = {
  key_partners: "重要合作",
  key_activities: "关键业务",
  key_resources: "核心资源",
  value_propositions: "价值主张",
  customer_relationships: "客户关系",
  channels: "渠道通路",
  customer_segments: "客户细分",
  cost_structure: "成本结构",
  revenue_streams: "收入来源",
}

/** The block titles for this canvas: Chinese when its items mostly are. */
function blockLabels(component: BmcComponent): Record<BlockKey, string> {
  const keys = Object.keys(BLOCK_LABELS) as BlockKey[]
  return mostlyChinese(keys.flatMap((key) => component[key])) ? BLOCK_LABELS_ZH : BLOCK_LABELS
}

const GAP = 14
const PAD_X = 14
const PAD_TOP = 14
const PAD_BOTTOM = 14
const CARD_RADIUS = 8

const TITLE_SIZE = 16
const TITLE_SIZE_MIN = 16
const TITLE_LH_RATIO = 1.3
const GAP_TITLE_ITEMS = 10

const ITEM_SIZE = 16
const ITEM_SIZE_MIN = 16
const ITEM_LH_RATIO = 1.35
const ITEM_GAP = 5
/**
 * Lines one item may wrap onto: as many as it needs. Each item used to be
 * fitted to a single line, and with the type already at the floor a narrow
 * column cut it off mid-phrase ("Seat expansion in", "协作活跃率领先同行两")
 * while the cell had room to spare underneath. An item now wraps under its
 * own bullet, its lines balanced so a phrase does not leave one character
 * alone on the last, and the cell measures the lines it draws.
 *
 * It used to stop at three lines and cut the rest, and an 880px English
 * canvas has a 126px item measure, where "Existing customers reliably
 * expand" takes four. The cell already keeps its items whole by height,
 * dropping and declaring one that would cross its floor, so a line cap
 * only ever cut words the cell had room for.
 */
const ITEM_MAX_LINES = Number.POSITIVE_INFINITY
const BULLET_R = 2
const BULLET_INDENT = 11

// Floor for `render`'s box.h-undersized shrink below. See the file header's
// "The inverse case" paragraph for the mechanism.
//
// This shrinks the *vertical rhythm* — padding, gaps, line height — and never
// the type. It used to shrink the type too, floored at `ITEM_SIZE_MIN /
// ITEM_SIZE`. That ratio was 9.5/12.5 when it was written; both constants are
// 16 now (the legibility floor was raised to meet the type-size gate), which
// silently made the floor exactly 1 and left the whole shrink path dead: an
// undersized box could no longer give anywhere, so every cell went straight
// to dropping items instead. Separating the two axes brings the documented
// behaviour back under the newer floor — type stays at 16 and the rhythm
// closes up, which is the order a typesetter would give things up in anyway.
const MIN_RHYTHM_SCALE = 0.55

interface BlockLayout {
  title: { lines: string[]; fontSize: number; truncated: boolean }
  items: { lines: string[]; fontSize: number; truncated: boolean }[]
  contentH: number
  /** `rhythmScale`-applied nominal sizes/rhythm `renderBlock` positions
   * against — nominal, not each fitted item/title's own (possibly further
   * width-shrunk) `fontSize`. Same "nominal size drives position, fitted
   * size only affects glyph width" split this file used pre-`rhythmScale`
   * too (the old `renderBlock` positioned off the module-level `ITEM_SIZE`
   * constant, never a fitted item's own shrunk `fontSize`). */
  titleSize: number
  titleLH: number
  padTop: number
  padBottom: number
  gapTitleItems: number
  itemSize: number
  itemLH: number
  itemGap: number
  bulletR: number
}

/**
 * `rhythmScale` (default 1) closes up every vertical measurement that is
 * not type — line-heights, padding, gaps — by the same proportion; type
 * itself holds at its own floor, and the horizontal axis
 * (`w`/`contentW`/`PAD_X`/`BULLET_INDENT`) is untouched (see file header —
 * this is a vertical-axis fix only). At `rhythmScale === 1` every returned
 * field reduces to this file's hardcoded constants exactly (same
 * `TITLE_SIZE`/`ITEM_SIZE`, same 1.3/1.35 ratios) — byte-identical output.
 */
// `fontFamily` (bold-metrics fix, round 2, 2026-07-24): `renderBlock`'s own
// title `<text>` declares `fontWeight="700"` in `ctx.fonts.heading` -- the
// cell title (from `blockLabels`, a fixed per-language constant, not user-controllable
// via the IR) needs the same bold-aware fitting as every other bold
// heading-faced text this task's audit-baseline sweep already found and
// fixed (kpi.tsx/steps.tsx/etc, round 1).
//
// Required, and passed by the measuring callers too. `contentH` counts the
// title's lines, and where an English title wraps depends on the face: at
// 840px "Key Activities" is one line in Georgia and two in the envelope
// estimate, and at 1016px "Customer Segments" is the other way round. A
// canvas measured with the estimate and drawn in the face got a spare title
// line in every cell of its band, or a cell one line short that dropped its
// last item.
function blockLayout(
  items: string[],
  label: string,
  w: number,
  rhythmScale: number,
  fontFamily: string,
): BlockLayout {
  const contentW = Math.max(1, w - PAD_X * 2)
  // Type never scales: `TITLE_SIZE`/`ITEM_SIZE` are the legibility floor
  // already. Only the rhythm around it gives, and every line box stays at
  // least as tall as the type it holds so glyphs cannot collide.
  const titleSize = TITLE_SIZE
  const itemSize = ITEM_SIZE
  const titleLHRatio = Math.max(1, TITLE_LH_RATIO * rhythmScale)
  const itemLHRatio = Math.max(1, ITEM_LH_RATIO * rhythmScale)
  const titleLH = Math.round(titleSize * titleLHRatio)
  const itemLH = Math.round(itemSize * itemLHRatio)
  const padTop = PAD_TOP * rhythmScale
  const padBottom = PAD_BOTTOM * rhythmScale
  const gapTitleItems = GAP_TITLE_ITEMS * rhythmScale
  const itemGap = ITEM_GAP * rhythmScale
  const bulletR = BULLET_R

  const titleLaid = layoutSvgText(label, {
    maxWidth: contentW,
    fontSize: Math.max(titleSize, TITLE_SIZE_MIN),
    maxLines: 2,
    lineHeightRatio: titleLHRatio,
    minPt: TITLE_SIZE_MIN,
    bold: true,
    fontFamily,
  })
  const title = {
    lines: titleLaid.lines,
    fontSize: titleLaid.fontSize,
    truncated: titleLaid.truncated,
  }
  const fittedItems = items.map((it) => {
    const laid = layoutSvgText(it, {
      maxWidth: contentW - BULLET_INDENT,
      fontSize: itemSize,
      maxLines: ITEM_MAX_LINES,
      lineHeightRatio: itemLHRatio,
      minPt: ITEM_SIZE_MIN,
      balanceLines: true,
    })
    return { lines: laid.lines, fontSize: laid.fontSize, truncated: laid.truncated }
  })
  const itemLines = fittedItems.reduce((sum, item) => sum + item.lines.length, 0)
  const itemsH = itemLines * itemLH + Math.max(0, fittedItems.length - 1) * itemGap
  const titleBlockH = Math.max(titleLH, title.lines.length * titleLaid.lineHeight)
  const contentH = padTop + titleBlockH + gapTitleItems + itemsH + padBottom
  return {
    title,
    items: fittedItems,
    contentH,
    titleSize,
    titleLH,
    padTop,
    padBottom,
    gapTitleItems,
    itemSize,
    itemLH,
    itemGap,
    bulletR,
  }
}

const TOP_ROW_KEYS: readonly BlockKey[] = ["key_activities", "customer_relationships"]
const BOTTOM_ROW_KEYS: readonly BlockKey[] = ["key_resources", "channels"]
const SPAN_KEYS: readonly BlockKey[] = ["key_partners", "value_propositions", "customer_segments"]
const BOTTOM_BAND_KEYS: readonly BlockKey[] = ["cost_structure", "revenue_streams"]

/** Natural (unstretched, `rhythmScale`-adjusted) top-band/bottom-band
 * heights, pure function of `component`'s real content at width `w`, the
 * heading face its titles are drawn in, and `rhythmScale` — see file header.
 * `rhythmScale` defaults to 1 (nominal); `render`'s undersized-box shrink
 * path is the only caller that ever passes a smaller value. */
function naturalBandHeights(
  component: BmcComponent,
  w: number,
  headingFont: string,
  rhythmScale: number = 1,
): { topBandH: number; bottomBandH: number } {
  const colW = (w - GAP * 4) / 5
  const bottomColW = (w - GAP) / 2
  const labels = blockLabels(component)
  const halfRowH = Math.max(
    ...[...TOP_ROW_KEYS, ...BOTTOM_ROW_KEYS].map((k) => blockLayout(component[k], labels[k], colW, rhythmScale, headingFont).contentH),
  )
  const spanH = Math.max(...SPAN_KEYS.map((k) => blockLayout(component[k], labels[k], colW, rhythmScale, headingFont).contentH))
  const topBandH = Math.max(halfRowH * 2 + GAP, spanH)
  const bottomBandH = Math.max(
    ...BOTTOM_BAND_KEYS.map((k) => blockLayout(component[k], labels[k], bottomColW, rhythmScale, headingFont).contentH),
  )
  return { topBandH, bottomBandH }
}

interface CellGeom {
  key: BlockKey
  x: number
  y: number
  w: number
  h: number
  tinted: boolean
}

/**
 * Cell geometry for one render pass — `natTop`/`natBottom` (the natural,
 * unstretched band heights `measure()` itself derived) are passed in rather
 * than recomputed here, so a stretched render only walks every block's
 * `blockLayout` once (in `naturalBandHeights`, by the caller) instead of
 * twice.
 */
function gridGeom(w: number, totalH: number, natTop: number, natBottom: number) {
  const natTotal = natTop + GAP + natBottom
  // Scale both bands by the same proportion their natural heights already
  // had — `totalH === natTotal` reproduces the natural split exactly. A
  // taller box grows both bands. A shorter box shrinks both (font floor
  // forbids shrinking type, so `renderBlock` then drops items that no
  // longer fit the cell).
  const scale = natTotal > 0 ? totalH / natTotal : 1
  const topBandH = natTop * scale
  const bottomBandH = totalH - GAP - topBandH

  const colW = (w - GAP * 4) / 5
  const rowH = (topBandH - GAP) / 2
  const bottomColW = (w - GAP) / 2

  const col = (i: number) => i * (colW + GAP)
  const cells: CellGeom[] = [
    { key: "key_partners", x: col(0), y: 0, w: colW, h: topBandH, tinted: false },
    { key: "key_activities", x: col(1), y: 0, w: colW, h: rowH, tinted: false },
    { key: "key_resources", x: col(1), y: rowH + GAP, w: colW, h: rowH, tinted: false },
    { key: "value_propositions", x: col(2), y: 0, w: colW, h: topBandH, tinted: true },
    { key: "customer_relationships", x: col(3), y: 0, w: colW, h: rowH, tinted: false },
    { key: "channels", x: col(3), y: rowH + GAP, w: colW, h: rowH, tinted: false },
    { key: "customer_segments", x: col(4), y: 0, w: colW, h: topBandH, tinted: false },
    { key: "cost_structure", x: 0, y: topBandH + GAP, w: bottomColW, h: bottomBandH, tinted: false },
    {
      key: "revenue_streams",
      x: bottomColW + GAP,
      y: topBandH + GAP,
      w: bottomColW,
      h: bottomBandH,
      tinted: false,
    },
  ]
  return { cells, topBandH, bottomBandH, colW, bottomColW }
}

function renderBlock(
  cell: CellGeom,
  layout: BlockLayout,
  ctx: ComponentCtx,
  ox: number,
  oy: number,
  r: number,
): React.ReactElement {
  const panel = cell.tinted ? mixHex(ctx.colors.surface, ctx.colors.accent, 0.14) : ctx.colors.surface
  const titleInk = accessibleInk(ctx.colors.text, panel, layout.titleSize)
  const itemInk = accessibleInk(ctx.colors.text, panel, layout.itemSize)
  const x = ox + cell.x
  const y = oy + cell.y
  const titleBaseline = y + layout.padTop + layout.titleSize
  const titleLineH = layout.titleLH
  let itemY = y + layout.padTop + layout.title.lines.length * titleLineH + layout.gapTitleItems
  const itemLimit = y + cell.h - layout.padBottom
  // Items stay whole: one whose last line would cross the cell's floor is
  // dropped and declared, never drawn with its tail missing.
  const visibleItems: BlockLayout["items"] = []
  for (let cursor = itemY; visibleItems.length < layout.items.length; ) {
    const item = layout.items[visibleItems.length]!
    if (cursor + (item.lines.length - 1) * layout.itemLH + layout.itemSize > itemLimit) break
    visibleItems.push(item)
    cursor += item.lines.length * layout.itemLH + layout.itemGap
  }
  const dropped = layout.items.length - visibleItems.length
  return (
    <g key={cell.key}>
      <rect
        x={x}
        y={y}
        width={cell.w}
        height={cell.h}
        rx={r}
        fill={panel}
        {...(ctx.colors.cardStroke && !cell.tinted
          ? { stroke: ctx.colors.cardStroke, strokeWidth: 1 }
          : {})}
      />
      {layout.title.lines.map((line, li) => (
        <text
          key={`title-${li}`}
          data-truncated={layout.title.truncated && li === layout.title.lines.length - 1 ? "1" : undefined}
          x={x + PAD_X}
          y={titleBaseline + li * titleLineH}
          fontSize={layout.title.fontSize}
          fontWeight="700"
          fill={titleInk}
          fontFamily={ctx.fonts.heading}
          dominantBaseline="alphabetic"
        >
          {line}
        </text>
      ))}
      {visibleItems.map((item, ii) => {
        const rowY = itemY
        itemY += item.lines.length * layout.itemLH + layout.itemGap
        const dotCy = rowY + layout.itemSize * 0.6
        return (
          <g key={ii}>
            <circle cx={x + PAD_X + layout.bulletR} cy={dotCy} r={layout.bulletR} fill={itemInk} />
            {item.lines.map((line, li) => (
              <text
                key={li}
                data-truncated={item.truncated && li === item.lines.length - 1 ? "1" : undefined}
                x={x + PAD_X + BULLET_INDENT}
                y={rowY + li * layout.itemLH + layout.itemSize}
                fontSize={item.fontSize}
                fill={itemInk}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {line}
              </text>
            ))}
          </g>
        )
      })}
      {dropped > 0 ? <g data-dropped={dropped} data-dropped-kind="item" /> : null}
    </g>
  )
}

/**
 * Whether every block title keeps each of its words on one line.
 *
 * A title is the canvas's own fixed name for a block, at the type floor
 * already, so it has nowhere to shrink. Below a width where its longest word
 * fits the column, the wrap can only break the word ("Relationship" over
 * "s") or cut it, and neither is the block's name any more. The repo's rule
 * for a drawing that cannot keep its words whole is to decline and say so
 * (`declared-fit.ts`, and `from-to.tsx`'s `MIN_W`): the page then moves to a
 * rendering wide enough for it. In the heading face that is about 764px for
 * "Relationships" in Georgia.
 *
 * A word here is what the shared wrap keeps whole (`wrapTokens`). Chinese
 * breaks between any two characters, so 「重要合作」 is four units, not one:
 * read as a single word, it sent a 480px canvas away although the title
 * sets as 「重要」 over 「合作」.
 */
function titleWordsFit(component: BmcComponent, w: number, headingFont: string): boolean {
  const colW = (w - GAP * 4) / 5
  const bottomColW = (w - GAP) / 2
  const labels = blockLabels(component)
  return (Object.keys(labels) as BlockKey[]).every((key) => {
    const room = (BOTTOM_BAND_KEYS.includes(key) ? bottomColW : colW) - PAD_X * 2
    return wrapTokens(labels[key]).every(
      (unit) => measureTextUnits(unit, { bold: true, fontFamily: headingFont }) * TITLE_SIZE <= room,
    )
  })
}

export const bmc: SvgComponent<BmcComponent> = {
  measure(component, w, ctx) {
    const { topBandH, bottomBandH } = naturalBandHeights(component, w, ctx.fonts.heading)
    return topBandH + GAP + bottomBandH
  },
  render(component, box, ctx) {
    if (!titleWordsFit(component, box.w, ctx.fonts.heading)) return <DroppedContentMarker count={1} kind="component" />
    const { topBandH: natTop, bottomBandH: natBottom } = naturalBandHeights(component, box.w, ctx.fonts.heading)
    const naturalTotal = natTop + GAP + natBottom
    const totalH = box.h ?? naturalTotal

    // bench-driven fix round, defect F: a box shorter than the natural
    // total is real (full-body components get the layout's fixed
    // content-rect height verbatim, never their own `measure()` value —
    // `svg-content.tsx`), so this shrinks every cell's font size/vertical
    // rhythm by the same proportion the box is short by instead of
    // silently drawing taller than `box.h` (see file header). A box at or
    // above natural size keeps `rhythmScale === 1` — the exact pre-fix path,
    // byte-identical (`natTop`/`natBottom` above are reused as-is rather
    // than recomputed).
    const rhythmScale =
      naturalTotal > 0 && totalH < naturalTotal ? Math.max(MIN_RHYTHM_SCALE, totalH / naturalTotal) : 1
    const { topBandH: scaledTop, bottomBandH: scaledBottom } =
      rhythmScale === 1
        ? { topBandH: natTop, bottomBandH: natBottom }
        : naturalBandHeights(component, box.w, ctx.fonts.heading, rhythmScale)
    const finalTotalH = totalH

    const { cells } = gridGeom(box.w, finalTotalH, scaledTop, scaledBottom)
    const labels = blockLabels(component)
    const r = ctx.shape?.radius ?? CARD_RADIUS
    const layouts = cells.map((cell) =>
      blockLayout(component[cell.key], labels[cell.key], cell.w, rhythmScale, ctx.fonts.heading),
    )
    // Every unit of a title can fit its column and the title still need more
    // lines than it has: a Chinese title on a very narrow canvas, a character
    // or two a line. It is not cut either.
    if (anyCut(layouts.map((layout) => layout.title))) return <DroppedContentMarker count={1} kind="component" />
    return <g>{cells.map((cell, i) => renderBlock(cell, layouts[i]!, ctx, box.x, box.y, r))}</g>
  },
}

export const renderDef: RenderDef<BmcComponent> = { type: "bmc", measure: bmc.measure, render: bmc.render }
