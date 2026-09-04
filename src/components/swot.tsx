import type React from "react"
import type { Component } from "@/ir"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk } from "../render/ink"
import { mixHex } from "./color-mix"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type SwotComponent = Extract<Component, { type: "swot" }>
type QuadrantKey = "strengths" | "weaknesses" | "opportunities" | "threats"

/**
 * Named 2×2 SWOT quadrant grid (structure-components wave task 1, decision
 * 3): a full-body component (`FULL_BODY_TYPES`, `component-traits.ts`) — the
 * only component `svg-content.tsx` ever hands this to fills the whole content
 * rect, no sibling components on the same slide (enforced by
 * `checkFullBodyExclusivity`, `api.ts`).
 *
 * Reading order is the classic SWOT convention — internal factors on top
 * (Strengths left, Weaknesses right), external factors on the bottom
 * (Opportunities left, Threats right). Each quadrant is a letter badge (S/W/
 * O/T) + title (fixed English full word, or `component.labels`' override)
 * + a bulleted item list, `fitSvgLine`-fit per item (single line,
 * shrink-then-truncate — matches `matrix.tsx`/`roadmap.tsx`'s own item-text
 * convention, deliberately not a multi-line wrap: a SWOT quadrant reads as a
 * short-phrase list, not paragraphs).
 *
 * Quadrant panels are tinted per-quadrant (`mixHex(colors.surface,
 * <token>, t)`, the same primitive `matrix.tsx`'s `toneFill` already uses)
 * so the four quadrants read as visually distinct at a glance — the whole
 * point of a SWOT chart. Every token used is a theme color (accent/primary/
 * muted, or a 50/50 blend of the latter two for Threats — there is no 4th
 * semantic theme token to spend, and this repo's convention is theme-token-
 * derived color only, never a hardcoded semantic red/green), so the four
 * quadrants automatically stay in each theme's own palette. The badge letter
 * renders unboxed, directly on the panel (see `renderQuadrant`'s own comment
 * for why — a boxed badge would be too small for `deck-audit.ts` to ever
 * attribute it its own background). Title/item ink and the badge letter's
 * ink all route through `accessibleInk` against the *real* panel fill they
 * render on (self-healing on every theme by construction) rather than
 * assuming `colors.text`/a strong token always clears contrast on a
 * mixed-in tint — see the dedicated 13-theme sweep in
 * `../audit/full-matrix-contrast.test.ts` ("swot/bmc tinted-panel contrast")
 * that locks this empirically, not just by construction.
 *
 * **Undersized-box shrink** (fix round, post-review: `bmc.tsx`'s bench-
 * driven fix-round defect F, the same mechanism `pest.tsx`/`five-forces.tsx`
 * carry — `swot.tsx` is this whole family's original ancestor and had never
 * gotten the fix itself, only ever the `Math.max(cellH, ...)` floor below,
 * which grows a row but never shrinks it below its own unstretched natural
 * height). A full-body component gets the layout's *fixed* content-rect
 * height verbatim (`svg-content.tsx`), never a box sized to its own
 * `measure()` value, and schema-max content (5 items in every one of the 4
 * quadrants) combined with a heading long enough to force a 2-line wrap can
 * shrink that fixed rect below what an unshrinkable natural cell needs — an
 * independent reviewer stress matrix (13 themes × 5 heading lengths, real
 * validate→render→audit CLI pipeline) confirmed this. `render` now mirrors
 * `bmc.tsx`/`pest.tsx`/`five-forces.tsx`'s exact two-stage fix: a
 * `rhythmScale` (< 1 only when `box.h` is short of the natural total,
 * floored at `MIN_RHYTHM_SCALE`) closes up every quadrant's vertical rhythm
 * uniformly before geometry is derived, and the pre-existing `Math.max`
 * grow path still handles `box.h` exceeding the natural total — the two
 * never engage at once. Unlike `five-forces.tsx`'s own admitted residual,
 * this file's dedicated 13-theme schema-max + long-heading sweep (same
 * fixture shape `pest.tsx`'s own sweep uses) found zero remaining findings
 * at the font-scale floor — the 2×2, 2-row geometry here has more headroom
 * relative to its own natural content than five_forces' 3-band cross, so
 * this fix fully absorbs the compound case rather than leaving a residual.
 */

const DEFAULT_LABELS: Record<QuadrantKey, string> = {
  strengths: "Strengths",
  weaknesses: "Weaknesses",
  opportunities: "Opportunities",
  threats: "Threats",
}
const LETTERS: Record<QuadrantKey, string> = {
  strengths: "S",
  weaknesses: "W",
  opportunities: "O",
  threats: "T",
}
// Row-major reading order: [Strengths, Weaknesses] top row, [Opportunities, Threats] bottom row.
const QUADRANTS: readonly QuadrantKey[] = ["strengths", "weaknesses", "opportunities", "threats"]

const GRID_GAP = 16
const PAD_X = 20
const PAD_TOP = 18
const PAD_BOTTOM = 18
const CARD_RADIUS = 10

// `BADGE` is a horizontal reservation for the unboxed letter (see
// `renderQuadrant`'s comment) — no rect this wide is ever painted. Its
// *height* footprint (`Math.max(BADGE, titleSize)` in `quadrantLayout`)
// does shrink with `rhythmScale` below, same as every other vertical
// measurement in this file.
const BADGE = 34
const BADGE_FONT = 22
const GAP_BADGE_TITLE = 12

const TITLE_SIZE = 17
const TITLE_SIZE_MIN = 16
const GAP_HEADER_ITEMS = 14

const ITEM_SIZE = 16
const ITEM_SIZE_MIN = 16
const ITEM_LH_RATIO = 1.4
const ITEM_GAP = 6
const BULLET_R = 2.5
const BULLET_INDENT = 14

// Floor for render's box.h-undersized shrink below, the same repair
// `pest.tsx`/`five-forces.tsx`/`bmc.tsx` carry — see file header.
//
// This closes up the *vertical rhythm* and never the type. The floor used to
// be `ITEM_SIZE_MIN / ITEM_SIZE`, a real fraction when those were 9.5 and
// 12.5. Both are 16 now (the legibility floor was raised to meet the
// type-size gate), which made the expression exactly 1 and left this whole
// stage dead: an undersized box had nothing left to give, so every quadrant
// went straight to dropping items. Type holds at its own declared floor and
// the rhythm closes up instead.
const MIN_RHYTHM_SCALE = 0.55

/** Badge fill (a solid, un-blended theme token) per quadrant — the panel tint
 * below blends this same color toward `colors.surface`, so the badge always
 * reads as the panel's own tint intensified. */
function badgeFill(q: QuadrantKey, ctx: ComponentCtx): string {
  switch (q) {
    case "strengths":
      return ctx.colors.accent
    case "opportunities":
      return ctx.colors.primary
    case "weaknesses":
      return ctx.colors.muted
    case "threats":
      // No 4th semantic token exists — a 50/50 primary/muted blend keeps
      // Threats visually distinct from both Weaknesses (pure muted) and
      // Opportunities (pure primary) while staying entirely theme-derived.
      return mixHex(ctx.colors.primary, ctx.colors.muted, 0.5)
  }
}

function panelFill(q: QuadrantKey, ctx: ComponentCtx): string {
  const t = q === "opportunities" ? 0.1 : 0.14
  return mixHex(ctx.colors.surface, badgeFill(q, ctx), t)
}

interface QuadrantLayout {
  title: { text: string; fontSize: number; truncated: boolean }
  items: { text: string; fontSize: number; truncated: boolean }[]
  contentH: number
  // rhythmScale-applied nominal rhythm — `renderQuadrant` positions against
  // these, not each fitted title/item's own (possibly further width-shrunk)
  // `fontSize`. Same nominal/fitted split `bmc.tsx`'s own `BlockLayout`/
  // `pest.tsx`/`five-forces.tsx`'s own layout structs use.
  badgeSize: number
  badgeFont: number
  titleSize: number
  padTop: number
  padBottom: number
  gapBadgeTitle: number
  gapHeaderItems: number
  itemSize: number
  itemLH: number
  itemGap: number
  bulletR: number
}

/**
 * `rhythmScale` (default 1, nominal) closes up every vertical measurement
 * that is not type — line-height, padding, gaps, the badge's height
 * footprint — by the same proportion, while each type size stops at the
 * floor it declares for itself; `quadW`/`PAD_X`/`BULLET_INDENT` (the
 * horizontal axis) are untouched. At `rhythmScale === 1` every returned field reduces to
 * this file's nominal constants exactly — same as `pest.tsx`'s own
 * `quadrantLayout` (byte-for-byte ported from there).
 */
// `fontFamily` (bold-metrics fix, round 2, 2026-07-24): the rendered title
// `<text>` declares `fontWeight="700"` in `ctx.fonts.heading`
// (`renderQuadrant` below) -- bold-aware fitting needed, same as every
// other bold heading-faced text this task's audit-baseline sweep found and
// fixed. Optional/defaults `undefined` (envelope fallback) -- `contentH`
// (this function's height contribution) is derived from `headerH =
// Math.max(badgeSize, titleSize)`, the fixed declared size, never
// `fittedTitle.fontSize`, so measure/render can't disagree regardless of
// which callers pass a real value. Ported from `pest.tsx`'s identical fix,
// same as this function was originally ported from there.
function quadrantLayout(
  items: string[],
  title: string,
  quadW: number,
  rhythmScale: number = 1,
  fontFamily?: string,
): QuadrantLayout {
  const contentW = quadW - PAD_X * 2
  // Type stops at the floor each size already declares for itself: the item
  // size is the legibility floor outright, the title may still give up its
  // one point down to `TITLE_SIZE_MIN`, and the badge letter and the
  // horizontal reservation it sits in scale together so the letter never
  // outgrows its own space, stopping once the letter reaches `ITEM_SIZE_MIN`.
  // Everything else here is rhythm and gives freely.
  const badgeScale = Math.max(rhythmScale, ITEM_SIZE_MIN / BADGE_FONT)
  const badgeSize = BADGE * badgeScale
  const badgeFont = BADGE_FONT * badgeScale
  const titleSize = Math.max(TITLE_SIZE_MIN, TITLE_SIZE * rhythmScale)
  const padTop = PAD_TOP * rhythmScale
  const padBottom = PAD_BOTTOM * rhythmScale
  const gapBadgeTitle = GAP_BADGE_TITLE * rhythmScale
  const gapHeaderItems = GAP_HEADER_ITEMS * rhythmScale
  const itemSize = ITEM_SIZE
  // Never shorter than the type it holds, so glyphs cannot collide.
  const itemLH = Math.round(itemSize * Math.max(1, ITEM_LH_RATIO * rhythmScale))
  const itemGap = ITEM_GAP * rhythmScale
  const bulletR = BULLET_R

  const fittedTitle = fitSvgLine(title, {
    maxWidth: contentW - badgeSize - gapBadgeTitle,
    fontSize: titleSize,
    minFontSize: TITLE_SIZE_MIN,
    bold: true,
    fontFamily,
  })
  const fittedItems = items.map((it) =>
    fitSvgLine(it, {
      maxWidth: contentW - BULLET_INDENT,
      fontSize: itemSize,
      minFontSize: ITEM_SIZE_MIN,
    }),
  )
  const itemsH = fittedItems.length * itemLH + Math.max(0, fittedItems.length - 1) * itemGap
  const headerH = Math.max(badgeSize, titleSize)
  const contentH = padTop + headerH + gapHeaderItems + itemsH + padBottom
  return {
    title: fittedTitle,
    items: fittedItems,
    contentH,
    badgeSize,
    badgeFont,
    titleSize,
    padTop,
    padBottom,
    gapBadgeTitle,
    gapHeaderItems,
    itemSize,
    itemLH,
    itemGap,
    bulletR,
  }
}

function gridGeom(component: SwotComponent, w: number, rhythmScale: number = 1, fontFamily?: string) {
  const quadW = (w - GRID_GAP) / 2
  const layouts = QUADRANTS.map((q) =>
    quadrantLayout(component[q], component.labels?.[q] ?? DEFAULT_LABELS[q], quadW, rhythmScale, fontFamily),
  )
  const cellH = Math.max(...layouts.map((l) => l.contentH))
  return { quadW, cellH, layouts }
}

function renderQuadrant(
  q: QuadrantKey,
  layout: QuadrantLayout,
  x: number,
  y: number,
  w: number,
  h: number,
  ctx: ComponentCtx,
  r: number,
): React.ReactElement {
  const panel = panelFill(q, ctx)
  const badge = badgeFill(q, ctx)
  // No boxed badge shell: the letter renders straight on the panel, so its
  // ink is computed against `panel`, the background it actually, verifiably
  // sits on — no possible mismatch between what's audited and what's
  // rendered. (Pre-bench-driven-fix-round, defect A, a boxed BADGE×BADGE,
  // 34×34 = 1,156px², rect would have sat below `deck-audit.ts`'s
  // MIN_BG_REGION_AREA and never been attributed its own text — that
  // limitation is gone for text-background *attribution* now, see
  // `PaintedShape`'s own doc comment; MIN_BG_REGION_AREA still gates only
  // the separate, page-level `regions` table.) Locked empirically, not just
  // by construction: this file's own dedicated 13-theme probe
  // (`../audit/full-matrix-contrast.test.ts`'s "swot/bmc tinted-panel
  // contrast") verifies it directly.
  const badgeInk = accessibleInk(badge, panel, layout.badgeFont)
  const titleInk = accessibleInk(ctx.colors.text, panel, layout.titleSize)
  const itemInk = accessibleInk(ctx.colors.text, panel, layout.itemSize)
  const badgeX = x + PAD_X
  const headerBaseline = y + layout.padTop + Math.round(layout.badgeFont * 0.86)
  let itemY = y + layout.padTop + Math.max(layout.badgeSize, layout.titleSize) + layout.gapHeaderItems
  const itemLimit = y + h - layout.padBottom
  const visibleItems = layout.items.filter((_, ii) => {
    const rowY = itemY + ii * (layout.itemLH + layout.itemGap)
    return rowY + layout.itemSize <= itemLimit
  })
  const dropped = layout.items.length - visibleItems.length
  return (
    <g key={q}>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={panel} />
      <text
        x={badgeX}
        y={headerBaseline}
        fontSize={layout.badgeFont}
        fontWeight="800"
        fill={badgeInk}
        fontFamily={ctx.fonts.heading}
        dominantBaseline="alphabetic"
      >
        {LETTERS[q]}
      </text>
      <text
        data-truncated={layout.title.truncated ? "1" : undefined}
        x={badgeX + layout.badgeSize + layout.gapBadgeTitle}
        y={headerBaseline}
        fontSize={layout.title.fontSize}
        fontWeight="700"
        fill={titleInk}
        fontFamily={ctx.fonts.heading}
        dominantBaseline="alphabetic"
      >
        {layout.title.text}
      </text>
      {visibleItems.map((item, ii) => {
        const rowY = itemY
        itemY += layout.itemLH + layout.itemGap
        const dotCy = rowY + layout.itemSize * 0.65
        return (
          <g key={ii}>
            <circle cx={x + PAD_X + layout.bulletR} cy={dotCy} r={layout.bulletR} fill={itemInk} />
            <text
              data-truncated={item.truncated ? "1" : undefined}
              x={x + PAD_X + BULLET_INDENT}
              y={rowY + layout.itemSize}
              fontSize={item.fontSize}
              fill={itemInk}
              fontFamily={ctx.fonts.body}
              dominantBaseline="alphabetic"
            >
              {item.text}
            </text>
          </g>
        )
      })}
      {dropped > 0 ? <g data-dropped={dropped} data-dropped-kind="item" /> : null}
    </g>
  )
}

export const swot: SvgComponent<SwotComponent> = {
  measure(component, w) {
    const { cellH } = gridGeom(component, w)
    return cellH * 2 + GRID_GAP
  },
  render(component, box, ctx) {
    const natural = gridGeom(component, box.w, 1, ctx.fonts.heading)
    const naturalTotal = natural.cellH * 2 + GRID_GAP
    const totalH = box.h ?? naturalTotal

    // fix round (post-review), ported from pest.tsx/five-forces.tsx/
    // bmc.tsx — see file header. A box shorter than the natural total
    // shrinks every quadrant's font size/vertical rhythm by the same
    // proportion the box is short by, floored at MIN_RHYTHM_SCALE, instead of
    // silently drawing past box.h (this file's pre-fix
    // `Math.max(cellH, ...)` floor). A box at or above natural size keeps
    // rhythmScale === 1 and reuses `natural` as-is rather than recomputing.
    const rhythmScale = naturalTotal > 0 && totalH < naturalTotal ? Math.max(MIN_RHYTHM_SCALE, totalH / naturalTotal) : 1
    const scaled = rhythmScale === 1 ? natural : gridGeom(component, box.w, rhythmScale, ctx.fonts.heading)
    const finalTotalH = totalH

    const { quadW, layouts } = scaled
    // Growth-only stretch (this file's own pre-existing idiom, kept
    // byte-identical at rhythmScale===1/no-grow): both rows are always equal
    // height by construction, so an exact `(finalTotalH - GAP) / 2` split
    // both reproduces `scaled.cellH` exactly when finalTotalH ===
    // scaledNaturalTotal (the undersized-box case, nothing left to grow)
    // and grows evenly when box.h exceeds the natural total.
    const rowH = (finalTotalH - GRID_GAP) / 2
    const r = ctx.shape?.radius ?? CARD_RADIUS
    return (
      <g>
        {QUADRANTS.map((q, i) => {
          const col = i % 2
          const row = Math.floor(i / 2)
          const x = box.x + col * (quadW + GRID_GAP)
          const y = box.y + row * (rowH + GRID_GAP)
          return renderQuadrant(q, layouts[i], x, y, quadW, rowH, ctx, r)
        })}
      </g>
    )
  },
}

export const renderDef: RenderDef<SwotComponent> = { type: "swot", measure: swot.measure, render: swot.render }
