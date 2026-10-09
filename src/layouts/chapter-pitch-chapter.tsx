import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { Component } from "@/ir"
import { chapterNumberFor } from "../lib/derive"
import { boundarySlotBlock } from "./boundary-content"
import { blockTag } from "./compositions/shared"
import { Fire, fitPitch, paintPitch, paintPitchIcon, PitchScrim, pitchBaseline, pitchInks, pitchText } from "./compositions/pitch"
import { PitchTitle } from "./pitch-shared"

type RowCards = Extract<Component, { type: "row_cards" }>

/**
 * pitch-chapter：路演的一幕，ember 2026-10 定稿（p02、p07）重画。
 *
 * 一张满版照片（页面自己的 `background` 资产），从左往右压一层页面底色的
 * 渐暗（96% → 46% 处 85% → 15%），字都站在左边暗的那半。左上一个只描边不
 * 填色的火橙巨号（这一幕的序号，「01」「02」，200px，2px 火橙描边），下面
 * 标题 46/60 米白粗体，底对齐在 y460，最多两行；再下面列这一幕的要点（页面的
 * `row_cards`，最多四条），每条一个暖灰图标、一行 17px 米白字。
 *
 * 没有照片时字照样站在原处，底就是页面颜色。不画 motif、不画段落导轨：
 * 一幕的开场页只说这一幕讲什么。火橙只亮在巨号上。页脚不画：共享页脚只
 * 上内容页（`ir/footer.ts`）。零 theme id、零 hex。
 */

const LEFT = 64
const NUMERAL = { top: 120, size: 200, lineHeight: 200, stroke: 2, tracking: -6 } as const
const TITLE = { foot: 460, size: 46, lineHeight: 60, minPt: 36, w: 700 } as const
const POINTS = { top: 494, pitch: 44, max: 4, icon: { size: 20, dy: 4 }, text: { x: 98, size: 17, lineHeight: 28, w: 620 } } as const
const SCRIM = [
  { offset: "0%", opacity: 0.96 },
  { offset: "46%", opacity: 0.85 },
  { offset: "100%", opacity: 0.15 },
] as const

export function PitchChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const inks = pitchInks(ctx)
  const photo = slide.background?.kind === "asset"
  const number = String(Math.max(1, chapterNumberFor(ir.slides, index))).padStart(2, "0")
  const block = boundarySlotBlock(slide, ["row_cards"]) as RowCards | undefined
  const items = block?.items ?? []
  const points = items.map((item) => fitPitch(item.title, { width: POINTS.text.w, size: POINTS.text.size, lineHeight: POINTS.text.lineHeight, maxLines: 1 }, ctx))
  const pointsFit = items.length <= POINTS.max && points.every(Boolean) && items.every((item) => !item.text?.trim() && !item.sub?.trim() && !item.tone && !item.highlight)
  const numeralBaseline = pitchBaseline(NUMERAL.top, NUMERAL.lineHeight, NUMERAL.size)
  return (
    <>
      {photo ? <PitchScrim id={`pitch-chapter-scrim-${index}`} ink={inks.ground} axis="x" stops={SCRIM} /> : null}
      <Fire id="numeral">
        {/* The fire's own mark, not a ghost behind the page: it stays in the
            foreground at full strength (`data-depth`), where a numeral this
            large on a chapter page would otherwise be read as a watermark and
            recessed. */}
        <text
          data-depth="fg"
          data-pitch-numeral=""
          x={LEFT}
          y={numeralBaseline}
          fontFamily={ctx.fonts.heading}
          fontSize={NUMERAL.size}
          fontWeight="700"
          letterSpacing={NUMERAL.tracking}
          fill="none"
          stroke={inks.fire}
          strokeWidth={NUMERAL.stroke}
          dominantBaseline="alphabetic"
        >
          {number}
        </text>
      </Fire>
      <PitchTitle heading={slide.heading} ctx={ctx} width={TITLE.w} size={TITLE.size} lineHeight={TITLE.lineHeight} minPt={TITLE.minPt} foot={TITLE.foot} />
      {block ? (
        pointsFit ? (
          <g {...blockTag(ctx, block)} data-pitch-chapter-points="">
            {items.map((item, i) => {
              const top = POINTS.top + i * POINTS.pitch
              return (
                <g key={i}>
                  {item.icon ? paintPitchIcon(item.icon, LEFT, top + POINTS.icon.dy, POINTS.icon.size, inks.muted, inks.ground) : null}
                  {paintPitch(points[i]!, { ctx, x: item.icon ? POINTS.text.x : LEFT, top, fill: pitchText(inks.ink, inks.ground, POINTS.text.size), ground: inks.ground })}
                </g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={items.length} data-dropped-kind="item" />
        )
      ) : null}
    </>
  )
}

export const layoutDef = {
  // chapter-pitch-chapter.tsx: ember's act of a pitch. A photograph darkened
  // from the left, the act's number outlined huge in the fire, its title and
  // what the act covers, a line each with an icon.
  id: "pitch-chapter",
  kind: "standard",
  story: {
    name: "Pitch Act",
    story: "A photograph darkens toward the left, where the act's number stands huge in an outline of the single fire colour, then the act's title and what it covers, a line each with an icon.",
    positioning: "Opens each act of a pitch. Choose it when the room should know what the next few pages will prove before they start.",
    audience: "Investors partway through a pitch, about to hear its next act.",
    notFor: "A chapter of a report, which wants a divider with no stage lighting.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["row_cards"], capacity: 1, itemCapacity: POINTS.max },
  ],
  drawsPhoto: true,
  suppressMotif: true,
  subheading: { none: "list what the act covers as its row_cards, or fold it into the heading" },
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
