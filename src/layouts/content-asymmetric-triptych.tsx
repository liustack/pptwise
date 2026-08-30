import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import type { ContentRect } from "../render/layout"
import { SvgContent } from "../render/svg-content"
import { sectionNameFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { fitEmphasisLine, renderEmphasisText } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { footnoteBaselineFor } from "../render/branding-geometry"
import { tryContentHeadingTreatment } from "../render/heading-treatments/render"

/**
 * asymmetric-triptych content layout (P1 variety wave, task 4 — content-
 * pool expansion, new layout 2 of 3): a three-region body grammar, never
 * a two-region even split — a wide LEAD column carries the first component
 * (a hero item), and a narrower RIGHT column is itself split top/bottom
 * into two framed secondary panels.
 *
 * Composition sketch (geometry, written before this file per the task
 * contract): heading band spans the usual full 1088px content width
 * (x=96..1184, matching `bento-panel`/`two-column`'s own convention of a
 * full-width header sitting above a split body). Below it: LEAD region
 * x=96, w=632 (58%); a vertical divider hairline at the gap's
 * midpoint (x=744) when the right column has content; RIGHT region x=760, w=424 (39% — deliberately equal to
 * `two-column`'s own worst-case half-width at the pool's narrowest 880px
 * single-stack basis, `(880-32)/2=424` — this layout introduces no
 * width narrower than `audit/capacity.ts` already accounts for). RIGHT
 * splits vertically into a TOP and a BOTTOM sub-panel (a
 * horizontal divider between them). A region only paints its outline
 * when it actually holds a component. Empty slots never draw a frame,
 * a divider-to-empty, or a surface shell.
 *
 * Component placement: `components[0]` (if any) goes to LEAD alone — a
 * single hero item at the widest column, the same "one dominant subject"
 * instinct `stacked-poster`'s capacity-1 `hero` slot already encodes, just
 * without that layout's scale-to-fill behavior. The remainder splits
 * across TOP (first half) then BOTTOM (second half). Each region is an
 * independent `SvgContent` call with `arrangement` hardcoded to the
 * default single-stack (never `slide.arrangement` — this layout's
 * three-region split *is* its own arrangement, the same hardcode
 * `bento-panel`/`two-column` already use for their own bespoke grammars),
 * so `layoutContentFit`'s existing gap-tier/drop safety net applies to
 * each region independently.
 *
 * Empty-slot ruling (audit round-1): a 1-component page collapses like
 * `two-column` at n<2 — the lead takes the full body width, and the two
 * right-column outlines are not painted. A 3-component page still frames
 * the filled TOP/BOTTOM panels. Assigned `instructional` (procedural,
 * step-by-step-breakdown strategy — "one lead topic + a secondary
 * breakdown split into two framed panels" reads like a main step with
 * sub-steps) and beat `dense` (three independently-filled regions is this
 * pool's highest *structural* item count after `bento-panel`'s 6-cell
 * grid).
 *
 * Discipline: no theme id, no hex literal — every color is a token or an
 * `../render/ink` call.
 */

const HEADING_MAX_W = 1088
const HEADING_BASELINE = 150
const KICKER_Y = 96

const SUBHEADING_FONT_SIZE = 22
const SUBHEADING_MIN_FONT_SIZE = 16
const SUBHEADING_SLOT = 46

const LEAD_X = 96
const LEAD_W = 632
const COL_GAP = 32
const RIGHT_X = LEAD_X + LEAD_W + COL_GAP // 760
const RIGHT_W = 1184 - RIGHT_X // 424
const DIVIDER_X = LEAD_X + LEAD_W + COL_GAP / 2 // 744

const ROW_GAP = 24
const PANEL_RADIUS = 6

export function AsymmetricTriptychContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const treated = tryContentHeadingTreatment({ ir, slide, index, ctx })
  const { colors, fonts } = ctx
  const section = sectionNameFor(ir.slides, index)
  const kicker = section
    ? fitSvgLine(section, { maxWidth: HEADING_MAX_W, fontSize: 16, minFontSize: 16, letterSpacing: 4 })
    : null

  const heading = fitHeadingLines(slide.heading, {
    maxWidth: HEADING_MAX_W,
    fontSize: 42,
    maxLines: 2,
    minPt: 26,
    fontFamily: fonts.heading,
  })
  const headingLastY =
    HEADING_BASELINE + Math.max(0, heading.lines.length - 1) * heading.lineHeight

  const subheading = slide.subheading
    ? fitEmphasisLine(slide.subheading, {
        maxWidth: HEADING_MAX_W,
        fontSize: SUBHEADING_FONT_SIZE,
        minFontSize: SUBHEADING_MIN_FONT_SIZE,
      })
    : null
  const subheadingY = headingLastY + 42
  const subheadingBudget = subheading ? SUBHEADING_SLOT : 0
  const subheadingFill = subheading
    ? accessibleInk(colors.accent, ctx.defaultBg ?? colors.bg, subheading.fontSize)
    : colors.accent

  const bodyTop = treated ? treated.contentRect.y : headingLastY + 36 + subheadingBudget
  const bodyBottom = slide.footnote ? 616 : 632
  const bodyH = Math.max(120, bodyBottom - bodyTop)

  const [leadComponent, ...rest] = slide.components
  const topHalfCount = Math.ceil(rest.length / 2)
  const topComponents = rest.slice(0, topHalfCount)
  const bottomComponents = rest.slice(topHalfCount)
  const hasTop = topComponents.length > 0
  const hasBottom = bottomComponents.length > 0
  const collapseRight = !hasTop && !hasBottom
  const leadW = collapseRight ? 1184 - LEAD_X : LEAD_W
  const leadRect: ContentRect = { x: LEAD_X, y: bodyTop, w: leadW, h: bodyH }
  // With exactly one secondary component, TOP claims the full right-column
  // height. BOTTOM's frame and the row divider stay unpainted.
  const bottomStarved = hasTop && !hasBottom
  const halfRowH = Math.max(60, (bodyH - ROW_GAP) / 2)
  const rowH = bottomStarved ? bodyH : halfRowH
  const topRect: ContentRect = { x: RIGHT_X, y: bodyTop, w: RIGHT_W, h: rowH }
  const dividerY = bodyTop + rowH + ROW_GAP / 2
  const bottomRect: ContentRect = { x: RIGHT_X, y: bodyTop + rowH + ROW_GAP, w: RIGHT_W, h: halfRowH }
  const panelStroke = colors.border ?? colors.muted
  const panelRadius = ctx.shape?.radius ?? PANEL_RADIUS

  const footnote = slide.footnote
    ? fitSvgLine(slide.footnote, { maxWidth: HEADING_MAX_W, fontSize: 16, minFontSize: 16 })
    : null

  const triptychBody = (
    <>
      {!collapseRight && (
        <line
          x1={DIVIDER_X}
          y1={bodyTop}
          x2={DIVIDER_X}
          y2={bodyTop + bodyH}
          stroke={panelStroke}
          strokeWidth={1}
          strokeOpacity={0.6}
        />
      )}
      {hasTop && (
        <rect
          x={topRect.x}
          y={topRect.y}
          width={topRect.w}
          height={topRect.h}
          rx={panelRadius}
          fill="none"
          stroke={panelStroke}
          strokeOpacity={0.45}
          strokeWidth={1}
        />
      )}
      {hasBottom && (
        <>
          <rect
            x={bottomRect.x}
            y={bottomRect.y}
            width={bottomRect.w}
            height={bottomRect.h}
            rx={panelRadius}
            fill="none"
            stroke={panelStroke}
            strokeOpacity={0.45}
            strokeWidth={1}
          />
          <line
            x1={RIGHT_X}
            y1={dividerY}
            x2={RIGHT_X + RIGHT_W}
            y2={dividerY}
            stroke={panelStroke}
            strokeWidth={1}
            strokeOpacity={0.3}
          />
        </>
      )}
      {leadComponent && (
        <SvgContent arrangement={undefined} components={[leadComponent]} rect={leadRect} ctx={ctx} />
      )}
      {hasTop && (
        <SvgContent arrangement={undefined} components={topComponents} rect={topRect} ctx={ctx} />
      )}
      {hasBottom && (
        <SvgContent arrangement={undefined} components={bottomComponents} rect={bottomRect} ctx={ctx} />
      )}
      {footnote && (
        <text
          data-truncated={footnote.truncated ? "1" : undefined}
          x="96"
          y={footnoteBaselineFor(footnote.fontSize)}
          fontFamily={fonts.body}
          fontSize={footnote.fontSize}
          fill={colors.muted}
          fontStyle="italic"
          dominantBaseline="alphabetic"
        >
          {footnote.text}
        </text>
      )}
    </>
  )

  if (treated) {
    return (
      <>
        {treated.chrome}
        {triptychBody}
      </>
    )
  }

  return (
    <>
      {kicker && (
        <text
          data-truncated={kicker.truncated ? "1" : undefined}
          x="96"
          y={KICKER_Y}
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={colors.muted}
          letterSpacing="4"
          dominantBaseline="alphabetic"
        >
          {kicker.text}
        </text>
      )}

      {heading.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
          x="96"
          y={HEADING_BASELINE + i * heading.lineHeight}
          fontFamily={fonts.heading}
          fontSize={heading.fontSize}
          fontWeight="700"
          fill={colors.text}
          dominantBaseline="alphabetic"
        >
          {line}
        </text>
      ))}

      {subheading &&
        renderEmphasisText(
          subheading.segments,
          {
            accent: colors.text,
            padFill: colors.accent,
            baseFill: subheadingFill,
            fontWeight: "700",
            themeId: ctx.themeId,
          },
          <text
            x="96"
            y={subheadingY}
            fontFamily={fonts.body}
            fontSize={subheading.fontSize}
            fill={subheadingFill}
            dominantBaseline="alphabetic"
          />,
        )}

      {triptychBody}
    </>
  )
}

// T1d (src domain reorg wave 1): inlined verbatim from registry.ts's former
// CONTENT_LAYOUT_DEFS["asymmetric-triptych"] entry. Slot `accepts: []` means the slot is not fed by an authored
// component. That empty array used to live as a private alias in registry.ts
// and is inlined here as the literal `[]` it always held, to avoid a
// value-import cycle with the registry aggregator (which value-imports this
// export) — see registry.ts's slot-`accepts` convention doc for what `[]`
// means. The body slot's capacity comment is reworded from "see file header
// derivation" to name registry.ts explicitly, since that derivation essay
// lives in registry.ts's CONTENT_LAYOUT_DEFS aggregation block, not in this file.
export const layoutDef: LayoutDefinition = {
  // content-asymmetric-triptych.tsx: full-width kicker/heading/subheading
  // heading band above a three-region body — a wide `lead` column (the first
  // component alone) plus a narrower right column split into `top`/
  // `bottom` framed secondary panels. All three internal SvgContent calls
  // hardcode arrangement to the default single-stack (never
  // `slide.arrangement` — the three-region split is this layout's own
  // grammar, same hardcode convention as bento-panel/two-column).
  // Empty regions skip their frame and divider. A 1-component page
  // collapses the lead to full body width.
  id: "asymmetric-triptych",
  kind: "standard",
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 }, // 1 lead + up to 3 secondary — see registry.ts's CONTENT_LAYOUT_DEFS header for the derivation
    { name: "lead", accepts: "any", capacity: 1 },
    { name: "top", accepts: "any" },
    { name: "bottom", accepts: "any" },
    { name: "meta", accepts: [] },
  ],
  arrangements: ["single"],
}
