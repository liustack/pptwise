import type { Component } from "@/ir"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, graphicInk } from "../render/ink"
import { HAIRLINE, hairlineInk, isRuled, paperOf, RULE } from "./surfaces"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

/** Tracking on a compare label, budgeted by the fit and set on the text. */
const COMPARE_LABEL_TRACKING = 1

type ImageCompareComponent = Extract<Component, { type: "image_compare" }>

/** 图区高度上限（px），标签条另计。 */
const MAX_IMAGE_H = 320
const GAP = 10
const LABEL_H = 40

function imageAreaH(w: number): number {
  const half = (w - GAP) / 2
  return Math.min(Math.round(half * 0.66), MAX_IMAGE_H)
}

function renderSide({
  asset_id,
  label,
  x,
  w,
  h,
  ctx,
}: {
  asset_id: string
  label: string
  x: number
  w: number
  h: number
  ctx: ComponentCtx
}) {
  const src = ctx.images?.[asset_id]?.src
  // A11Y-01 alt 链路（follow-up）：each side is its own asset, so its own alt.
  const alt = ctx.images?.[asset_id]?.alt
  // bold-metrics fix (round 2, 2026-07-24): this label renders
  // `fontWeight={600}` in `ctx.fonts.body` below -- bold by this codebase's
  // own threshold, and `fonts.body` resolves to Georgia for the brief
  // theme (the same face the reported defect traced to), not just YaHei.
  // `letterSpacing` is budgeted here because the label below is *painted*
  // with it. It is an absolute px advance between glyphs, so it appears in
  // neither `measureTextUnits` nor the font size — a fit that leaves it out
  // reserves room for a narrower string than the one that reaches the page,
  // and the difference is (glyphs - 1) px of overflow that grows with the
  // label. `fitSvgLine` takes the same number the `<text>` sets.
  const fitted = fitSvgLine(label, {
    maxWidth: w - 16,
    fontSize: 16,
    minFontSize: 16,
    bold: true,
    fontFamily: ctx.fonts.body,
    letterSpacing: COMPARE_LABEL_TRACKING,
  })
  return (
    <g transform={`translate(${x},0)`}>
      {src ? (
        <image
          href={src}
          x={0}
          y={0}
          width={w}
          height={h}
          preserveAspectRatio="xMidYMid slice"
          aria-label={alt || undefined}
        />
      ) : (
        <>
          <rect x={0} y={0} width={w} height={h} fill={ctx.colors.surface} />
          <text
            textAnchor="middle"
            x={w / 2}
            y={h / 2}
            fontSize={16}
            fill={ctx.colors.muted}
            fontFamily={ctx.fonts.body}
            dominantBaseline="alphabetic"
          >
            Image missing
          </text>
        </>
      )}
      <rect
        x={0.5}
        y={0.5}
        width={w - 1}
        height={h - 1}
        fill="none"
        stroke={ctx.colors.border}
        strokeWidth={1}
      />
      <text
        data-truncated={fitted.truncated ? "1" : undefined}
        x={w / 2}
        y={h + 22}
        textAnchor="middle"
        fontSize={fitted.fontSize}
        fontFamily={ctx.fonts.body}
        fill={ctx.colors.text}
        fontWeight={600}
        letterSpacing={COMPARE_LABEL_TRACKING}
        dominantBaseline="alphabetic"
      >
        {fitted.text}
      </text>
      <rect x={w / 2 - 14} y={h + 30} width={28} height={3} fill={ctx.colors.accent} />
    </g>
  )
}

export const imageCompare: SvgComponent<ImageCompareComponent> = {
  measure(_component, w) {
    return imageAreaH(w) + LABEL_H
  },
  render(component, box, ctx) {
    const h = Math.min(
      imageAreaH(box.w),
      Math.max(1, (box.h ?? Number.POSITIVE_INFINITY) - LABEL_H),
    )
    const half = Math.floor((box.w - GAP) / 2)
    const isVs = (component.style ?? "vs") === "vs"
    const ruled = isRuled(ctx)
    const paper = paperOf(ctx)
    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {renderSide({ asset_id: component.left.asset_id, label: component.left.label, x: 0, w: half, h, ctx })}
        {renderSide({
          asset_id: component.right.asset_id,
          label: component.right.label,
          x: half + GAP,
          w: half,
          h,
          ctx,
        })}
        {isVs ? (
          // 中缝圆徽章「VS」（压在两图接缝上）。
          // Bench-driven fix round, defect A reclassification (Task 3
          // handoff): identical colors.surface-on-colors.primary pairing as
          // rings.tsx's core label (this component paints its own circle,
          // so contrast must be checked against that circle's own fill, not
          // the ambient page background) — same rally/ledger/homeroom
          // failure, same accessibleInk fix.
          // Ruled: the badge is knocked out of the photographs in the paper,
          // a hairline round it, the letters in the text ink, so nothing on
          // the page is a solid disc of the primary (`./surfaces.ts`).
          <g>
            {ruled ? (
              <circle cx={box.w / 2} cy={h / 2} r={26} fill={paper} stroke={hairlineInk(ctx)} strokeWidth={HAIRLINE} />
            ) : (
              <circle
                cx={box.w / 2}
                cy={h / 2}
                r={26}
                fill={ctx.colors.primary}
                stroke="#FFFFFF"
                strokeWidth={2.5}
              />
            )}
            <text
              x={box.w / 2}
              y={h / 2 + 6}
              textAnchor="middle"
              fontSize={18}
              fontWeight={700}
              fontFamily={ctx.fonts.heading}
              fill={ruled ? ctx.colors.text : accessibleInk(ctx.colors.surface, ctx.colors.primary, 18)}
              dominantBaseline="alphabetic"
            >
              VS
            </text>
          </g>
        ) : (
          // before/after 左上角标（各一枚小色块标签）。
          // Bench-driven fix round, defect A reclassification (Task 3
          // handoff): a small rect (52x24=1,248px^2, well below the area
          // floor `deck-audit.ts` used to gate text-background attribution
          // by) — the AFTER chip (i===1, colors.accent fill) measures
          // ~1:1 on brief/thesis/homeroom/luxe/heritage once
          // correctly attributed to its own chip instead of falling through
          // to a background that always happened to pass. The BEFORE chip
          // (i===0, colors.muted fill) already clears the ratio on every
          // theme — accessibleInk is a no-op there, verified byte-identical.
          <>
            {[0, half + GAP].map((x, i) => {
              // Ruled: each chip is a label knocked out in the paper, BEFORE
              // in the muted ink, AFTER in the text ink over a 2px rule of the
              // accent, where the filled theme fills the chip with each.
              const chipFill = ruled ? paper : i === 0 ? ctx.colors.muted : ctx.colors.accent
              const chipInk = ruled ? (i === 0 ? accessibleInk(ctx.colors.muted, paper, 16) : ctx.colors.text) : accessibleInk(ctx.colors.surface, chipFill, 16)
              return (
                <g key={i} transform={`translate(${x + 10},10)`}>
                  <rect x={0} y={0} width={i === 0 ? 80 : 64} height={28} fill={chipFill} />
                  {ruled && i === 1 ? <rect x={0} y={28 - RULE} width={64} height={RULE} fill={graphicInk(ctx.colors.accent, paper)} /> : null}
                  <text
                    x={i === 0 ? 40 : 32}
                    y={20}
                    textAnchor="middle"
                    fontSize={16}
                    fontWeight={600}
                    fontFamily={ctx.fonts.body}
                    fill={chipInk}
                    dominantBaseline="alphabetic"
                  >
                    {i === 0 ? "BEFORE" : "AFTER"}
                  </text>
                </g>
              )
            })}
          </>
        )}
      </g>
    )
  },
}

export const renderDef: RenderDef<ImageCompareComponent> = { type: "image_compare", measure: imageCompare.measure, render: imageCompare.render }
